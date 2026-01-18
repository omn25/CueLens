'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

import { useOvershootVision } from '@/hooks/useOvershootVision';
import { useRoomProfiles } from '@/hooks/useRoomProfiles';
import { ROOM_OBSERVATION_PROMPT, ROOM_OBSERVATION_OUTPUT_SCHEMA } from '@/lib/roomSchema';
import { pickBestMatch } from '@/lib/roomMatching';
import type { RoomObservation } from '@/types/room';
import DetectedRoomModal from './DetectedRoomModal';

// STT (from Om branch)
import { captureFrameFromVideo, uploadFrame } from '@/lib/frameCapture';
import { OpenAIRealtimeClient } from '@/lib/openaiRealtimeClient';
import { HTTPSTTClient } from '@/lib/httpSttClient';

export default function WebcamFeed() {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Main branch state
  const [liveObservation, setLiveObservation] = useState<RoomObservation | null>(null);
  const [detectedRoom, setDetectedRoom] = useState<{ name: string; score: number } | null>(null);
  const [showFullOutput, setShowFullOutput] = useState(true); // Default to showing full JSON

  const streamRef = useRef<MediaStream | null>(null);

  // Stability buffer for consecutive matches
  const consecMatchRef = useRef<number>(0);
  const lastMatchRef = useRef<{ id: string; name: string; score: number } | null>(null);
  const cooldownUntilRef = useRef<number>(0);
  const observationBufferRef = useRef<RoomObservation[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profilesRef = useRef<any[]>([]);

  // STT (Om branch) - audio only (no UI)
  const audioStreamRef = useRef<MediaStream | null>(null);
  const openaiRealtimeRef = useRef<OpenAIRealtimeClient | null>(null);
  const httpSttRef = useRef<HTTPSTTClient | null>(null);
  const sessionIdRef = useRef<string>(`session_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  const isConnectingRef = useRef<boolean>(false);

  // Feature flag: USE_REALTIME_STT=true uses WebSocket realtime, else uses HTTP chunk fallback
  const useRealtimeSTT = (process.env.NEXT_PUBLIC_USE_REALTIME_STT || 'false').toLowerCase() === 'true';

  // Get room profiles from storage
  const { profiles } = useRoomProfiles();

  // Keep profiles ref up to date
  useEffect(() => {
    profilesRef.current = profiles;
  }, [profiles]);

  // Handle observations from Overshoot with stable callback
  const handleObservation = useCallback((obs: RoomObservation) => {
    setLiveObservation(obs);

    observationBufferRef.current.push(obs);
    if (observationBufferRef.current.length > 5) {
      observationBufferRef.current.shift();
    }

    const currentProfiles = profilesRef.current;
    if (currentProfiles.length === 0) return;

    const now = Date.now();

    // Cooldown check
    if (now < cooldownUntilRef.current) return;

    // Find best match using deterministic matching
    const best = pickBestMatch(
      obs,
      currentProfiles.map((p) => ({
        profile: p.profile,
        id: p.id,
        name: p.name,
      }))
    );

    // 50% threshold
    if (best.score >= 0.5) {
      if (lastMatchRef.current && lastMatchRef.current.id === best.id) {
        consecMatchRef.current += 1;
      } else {
        consecMatchRef.current = 1;
      }

      lastMatchRef.current = { id: best.id, name: best.name, score: best.score };

      // Need 3 consecutive matches
      if (consecMatchRef.current >= 3) {
        setDetectedRoom({ name: best.name, score: best.score });
        cooldownUntilRef.current = now + 30000; // 30s cooldown
        consecMatchRef.current = 0;
      }
    } else {
      consecMatchRef.current = 0;
      lastMatchRef.current = null;
    }
  }, []);

  // Enable Overshoot vision with room observation schema
  const {
    getMediaStream,
    error: visionError,
    isQueued: visionQueued,
    getStreamStatus,
    isActive: visionActive,
  } = useOvershootVision({
    prompt: ROOM_OBSERVATION_PROMPT,
    outputSchema: ROOM_OBSERVATION_OUTPUT_SCHEMA,
    enabled: true,
    processing: {
      clip_length_seconds: 1,
      delay_seconds: 1,
    },
    onObservation: handleObservation,
  });

  // Use Overshoot's stream or fallback to direct webcam for video display (main behavior)
  useEffect(() => {
    let mounted = true;
    let directWebcamStream: MediaStream | null = null;

    const updateVideoStream = async () => {
      // Prefer Overshoot stream
      const overshootStream = getMediaStream();
      if (overshootStream && videoRef.current && mounted) {
        if (videoRef.current.srcObject !== overshootStream) {
          console.log('[WebcamFeed] ✅ Setting Overshoot stream to video element');

          // Stop direct webcam stream if Overshoot stream is active
          if (directWebcamStream && directWebcamStream !== overshootStream) {
            directWebcamStream.getTracks().forEach((track) => track.stop());
            directWebcamStream = null;
          }

          videoRef.current.srcObject = overshootStream;
          videoRef.current.play().catch((err) => {
            console.error('[WebcamFeed] Error playing video:', err);
          });

          streamRef.current = overshootStream;
          setIsStreaming(true);
        }
        return;
      }

      // Fallback: direct webcam (video only)
      if (!overshootStream && mounted && !directWebcamStream) {
        try {
          directWebcamStream = await navigator.mediaDevices.getUserMedia({
            video: { width: 1280, height: 720, facingMode: 'user' },
          });

          if (videoRef.current && mounted) {
            videoRef.current.srcObject = directWebcamStream;
            videoRef.current.play().catch((err) => {
              console.error('[WebcamFeed] Error playing video:', err);
            });

            streamRef.current = directWebcamStream;
            setIsStreaming(true);
          }
        } catch (err) {
          console.error('[WebcamFeed] ❌ Failed to get webcam stream:', err);
          setError('Camera access denied or unavailable. Please allow camera access.');
        }
      }
    };

    updateVideoStream();

    const timeout = setTimeout(() => {
      if (mounted) updateVideoStream();
    }, 1000);

    return () => {
      mounted = false;
      clearTimeout(timeout);

      if (directWebcamStream) {
        directWebcamStream.getTracks().forEach((track) => track.stop());
        directWebcamStream = null;
      }
    };
  }, [visionActive, getMediaStream]);

  // STT effect (audio-only). Keeps main behavior unchanged.
  useEffect(() => {
    let mounted = true;

    const startSTT = async () => {
      try {
        if (isConnectingRef.current || openaiRealtimeRef.current || httpSttRef.current) return;

        // Request mic only (no video)
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        if (!mounted) {
          audioStream.getTracks().forEach((t) => t.stop());
          return;
        }

        audioStreamRef.current = audioStream;

        const handleFinalTranscript = async (text: string) => {
          if (!mounted) return;
          if (!text || text.trim().length === 0) return;

          console.log(`✅ STT transcript (FINAL): ${text}`);

          // Attach a frame snapshot for backend context (optional)
          let frameAssetId: string | undefined = undefined;
          if (videoRef.current) {
            const frameBase64 = captureFrameFromVideo(videoRef.current);
            if (frameBase64) {
              try {
                const uploadedId = await uploadFrame(frameBase64);
                frameAssetId = uploadedId || undefined;
              } catch (err) {
                console.warn('⚠️ Failed to upload frame:', err);
              }
            }
          }

          // Send to backend suggestion engine
          try {
            const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
            await fetch(`${API_BASE_URL}/transcript`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                transcript: text,
                visionEventId: sessionIdRef.current,
                frameAssetId,
              }),
            });
          } catch (err) {
            console.error('❌ Error sending transcript:', err);
          }
        };

        isConnectingRef.current = true;

        if (useRealtimeSTT) {
          // Realtime WebSocket STT
          const envModel = process.env.NEXT_PUBLIC_OPENAI_REALTIME_MODEL;
          const validTranscriptionModels = ['gpt-4o-mini-transcribe', 'gpt-4o-transcribe', 'whisper-1'];
          const transcriptionModel =
            envModel && validTranscriptionModels.includes(envModel) ? (envModel as any) : undefined;

          if (envModel && !validTranscriptionModels.includes(envModel)) {
            console.warn(`⚠️ Invalid NEXT_PUBLIC_OPENAI_REALTIME_MODEL: "${envModel}"`);
            console.warn(`   Must be one of: ${validTranscriptionModels.join(', ')}`);
            console.warn('   Using default: gpt-4o-mini-transcribe');
          }

          const openaiRealtime = new OpenAIRealtimeClient({
            model: transcriptionModel,
            onTranscript: (text: string, isFinal?: boolean) => {
              // Only handle final transcripts for backend
              if (isFinal === false) return;
              void handleFinalTranscript(text);
            },
            onError: (err) => {
              console.error('OpenAI Real-Time error:', err);
              if (mounted) setError(`OpenAI Real-Time error: ${err.message}`);
            },
          });

          openaiRealtimeRef.current = openaiRealtime;
          await openaiRealtime.connect(audioStream);

          console.log('✅ OpenAI Real-Time connected and streaming');
        } else {
          // HTTP chunk STT fallback
          const httpStt = new HTTPSTTClient({
            onTranscript: (text) => {
              void handleFinalTranscript(text);
            },
            onError: (err) => {
              console.error('HTTP STT error:', err);
              if (mounted) setError(`HTTP STT error: ${err.message}`);
            },
            chunkDurationMs: 2500,
          });

          // Optional: provide frame capture callback for HTTP STT flows that support it
          httpStt.setFrameCaptureCallback(() => {
            if (videoRef.current) return captureFrameFromVideo(videoRef.current);
            return null;
          });

          httpSttRef.current = httpStt;
          await httpStt.start(audioStream);

          console.log('✅ HTTP STT started (chunked recording)');
        }
      } catch (sttError) {
        console.error(`❌ Failed to initialize STT (${useRealtimeSTT ? 'Realtime' : 'HTTP'}):`, sttError);
        // Non-fatal: continue without STT
      } finally {
        isConnectingRef.current = false;
      }
    };

    startSTT();

    return () => {
      mounted = false;

      // Stop HTTP STT
      if (httpSttRef.current) {
        httpSttRef.current.stop();
        httpSttRef.current = null;
      }

      // Disconnect realtime STT (safe default)
      if (openaiRealtimeRef.current) {
        openaiRealtimeRef.current.disconnect?.();
        openaiRealtimeRef.current = null;
      }

      // Stop mic tracks
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((t) => t.stop());
        audioStreamRef.current = null;
      }
    };
  }, [useRealtimeSTT]);

  // Vision error handling - only show critical errors
  useEffect(() => {
    if (visionError) {
      const isApiKeyError =
        visionError.includes('API key') ||
        visionError.includes('Overshoot API key') ||
        visionError.includes('not configured') ||
        visionError.includes('NEXT_PUBLIC_OVERSHOOT_API_KEY') ||
        visionError.includes('revoked') ||
        visionError.includes('authentication failed') ||
        visionError.includes('has been revoked') ||
        visionError.includes('unauthorized') ||
        visionError.includes('401') ||
        visionError.includes('403') ||
        visionError.includes('invalid');

      const isPeerConnectionError =
        visionError.includes('RTCPeerConnection') ||
        visionError.includes('PeerConnection') ||
        visionError.includes('Cannot create so many');

      if (!isApiKeyError && !isPeerConnectionError) {
        console.error('[WebcamFeed] Vision error:', visionError);
        setError(`Vision error: ${visionError}`);
      } else {
        setError(null);
      }
    } else {
      setError(null);
    }
  }, [visionError]);

  // Modal handler
  const handleDismissModal = useCallback(() => {
    setDetectedRoom(null);
  }, []);

  return (
    <div className="relative w-full h-full">
      {/* Main Video Feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }} // Mirror the video
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-background-dark/80 via-transparent to-black/30"></div>

      {/* Detected Room Modal */}
      {detectedRoom && (
        <DetectedRoomModal
          roomName={detectedRoom.name}
          confidence={detectedRoom.score}
          onDismiss={handleDismissModal}
        />
      )}

      {/* Overshoot Output Indicator - Bottom Right */}
      <div className="absolute bottom-6 right-6 z-30 max-w-lg rounded-xl border-2 border-primary/50 shadow-2xl glass-panel p-4 bg-black/95 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-primary text-lg">smart_display</span>
          <h3 className="text-sm font-bold text-white">Live JSON Data</h3>
          <div className="ml-auto flex items-center gap-2">
            {isStreaming ? (
              visionQueued ? (
                <span className="text-amber-400 text-[11px] font-semibold">⏳ Queued</span>
              ) : (
                <span className="text-emerald-400 text-[11px] font-semibold animate-pulse">● Active</span>
              )
            ) : (
              <span className="text-slate-400 text-[11px]">● Inactive</span>
            )}
            <button
              onClick={() => setShowFullOutput(!showFullOutput)}
              className="text-white/60 hover:text-white transition-colors p-1 rounded hover:bg-white/10"
              title={showFullOutput ? 'Show summary' : 'Show full JSON'}
            >
              <span className="material-symbols-outlined text-lg">
                {showFullOutput ? 'unfold_less' : 'unfold_more'}
              </span>
            </button>
          </div>
        </div>

        {liveObservation ? (
          <>
            {showFullOutput ? (
              <div className="text-[10px] text-white/90 max-h-[500px] overflow-y-auto bg-slate-900/80 rounded-lg p-3 border border-white/20">
                <pre className="text-white font-mono leading-relaxed whitespace-pre-wrap break-words">
                  {JSON.stringify(liveObservation, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="text-[10px] text-white/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Room:</span>
                  <span className="text-white font-medium capitalize">
                    {liveObservation.room_type.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Furniture:</span>
                  <span className="text-white">{liveObservation.fixed_elements.major_furniture.length} items</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Lighting:</span>
                  <span className="text-white">{liveObservation.fixed_elements.lighting.length} fixtures</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Markers:</span>
                  <span className="text-white">{liveObservation.distinctive_markers.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Decor:</span>
                  <span className="text-white">{liveObservation.fixed_elements.large_decor.length} items</span>
                </div>

                {liveObservation.summary && (
                  <div className="mt-2 pt-2 border-t border-white/10">
                    <div className="text-white/50 text-[9px] mb-1">Summary:</div>
                    <p className="text-white/70 text-[9px] leading-relaxed">{liveObservation.summary}</p>
                  </div>
                )}
              </div>
            )}

            {detectedRoom && (
              <div className="mt-3 pt-3 border-t border-emerald-500/50">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 text-xs font-bold">✓ MATCH:</span>
                  <span className="text-emerald-400 font-bold text-xs">
                    {detectedRoom.name} ({Math.round(detectedRoom.score * 100)}%)
                  </span>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-2 py-4">
            <p className="text-white/60 text-[11px] font-medium">Waiting for Overshoot observation...</p>
            <p className="text-white/40 text-[10px]">
              {isStreaming
                ? visionActive
                  ? 'Overshoot is analyzing the room. Results will appear here when ready.'
                  : 'Overshoot is initializing...'
                : 'Camera stream not active. Start streaming to see Overshoot output.'}
            </p>
            {visionError && <p className="text-red-400 text-[10px] mt-2">Error: {visionError}</p>}
          </div>
        )}

        {/* Stream Status */}
        {(() => {
          const status = getStreamStatus();
          return (
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="flex items-center justify-between text-[9px]">
                <span className="text-white/50">Streams:</span>
                <span className={status.active === 1 ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-bold'}>
                  {status.active}/{status.max} active
                </span>
                {status.queued > 0 && <span className="text-amber-400 ml-2">({status.queued} queued)</span>}
              </div>
              {status.active > 1 && (
                <div className="text-red-400 text-[9px] mt-1 font-bold">⚠️ WARNING: Multiple streams detected!</div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Error Message */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="bg-red-500/90 text-white px-6 py-4 rounded-xl shadow-lg max-w-md">
            <p className="font-semibold mb-2">Error</p>
            <p className="text-sm">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-4 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {!isStreaming && !error && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="flex flex-col items-center gap-3">
            <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-white font-medium">Initializing camera...</p>
          </div>
        </div>
      )}
    </div>
  );
}
