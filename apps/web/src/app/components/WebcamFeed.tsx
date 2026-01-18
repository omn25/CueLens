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

  // Main branch state - now storing plain text descriptions
  const [liveDescription, setLiveDescription] = useState<string | null>(null);
  const [liveObservation, setLiveObservation] = useState<RoomObservation | null>(null);
  const [detectedRoom, setDetectedRoom] = useState<{ name: string; score: number } | null>(null);
  const [currentMatch, setCurrentMatch] = useState<{ name: string; score: number } | null>(null);

  // KeeretFinal preference: start minimized (summary view)
  const [showFullOutput, setShowFullOutput] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);

  // Stability buffer for consecutive matches
  const consecMatchRef = useRef<number>(0);
  const lastMatchRef = useRef<{ id: string; name: string; score: number } | null>(null);
  const cooldownUntilRef = useRef<number>(0);
  const observationBufferRef = useRef<RoomObservation[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profilesRef = useRef<any[]>([]);
  
  // Throttling for description preview updates (every 10 seconds)
  const latestDescriptionRef = useRef<string | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstObservationRef = useRef<boolean>(true);

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

  // Handle plain text descriptions from Overshoot with stable callback
  // When outputSchema is empty, the hook stores plain text in the summary field
  const handleDescription = useCallback((obs: RoomObservation) => {
    // Extract description from summary field (which contains plain text when no schema)
    const description = obs.summary || JSON.stringify(obs);
    
    // Store the latest description in ref (for throttled UI updates)
    latestDescriptionRef.current = description;

    // Match against room profiles
    const profilesForMatching = profilesRef.current.map((p) => ({
      profile: p.profile,
      id: p.id,
      name: p.name,
    })).filter((p) => p.profile !== null && p.profile !== undefined);
    
    if (profilesForMatching.length > 0) {
      const match = pickBestMatch(obs, profilesForMatching);
      // Show match if score >= 0.4 (40%)
      if (match.score >= 0.4) {
        setCurrentMatch({ name: match.name, score: match.score });
      } else {
        setCurrentMatch(null);
      }
    }

    // Update immediately if this is the first description or if 10 seconds have passed
    const now = Date.now();
    if (isFirstObservationRef.current || now - lastUpdateTimeRef.current >= 10000) {
      setLiveDescription(description);
      setLiveObservation(obs); // Store full observation for JSON view
      lastUpdateTimeRef.current = now;
      isFirstObservationRef.current = false;
    }
  }, []);

  // Update description preview every 10 seconds (throttling - ensures updates even if handleDescription misses some)
  useEffect(() => {
    const updatePreview = () => {
      if (latestDescriptionRef.current) {
        const now = Date.now();
        // Only update if 10 seconds have passed since last update (prevent redundant updates)
        if (now - lastUpdateTimeRef.current >= 10000) {
          setLiveDescription(latestDescriptionRef.current);
          lastUpdateTimeRef.current = now;
        }
      }
    };

    // Set up interval to update every 10 seconds (backup mechanism)
    updateIntervalRef.current = setInterval(updatePreview, 10000);

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
    };
  }, []);

  // Enable Overshoot vision with room observation schema
  const {
    getMediaStream,
    error: visionError,
    isQueued: visionQueued,
    getStreamStatus,
    isActive: visionActive,
  } = useOvershootVision({
    prompt: 'Describe what you see in this room in plain language. Be detailed and describe the furniture, colors, lighting, and any notable features.',
    outputSchema: {}, // No schema - just plain text
    enabled: true,
    processing: {
      clip_length_seconds: 1,
      delay_seconds: 2, // Increased delay for more infrequent updates (cheaper)
      fps: 30,
      sampling_ratio: 0.1, // Low sampling ratio (10% of frames) for cost efficiency
    },
    onObservation: handleDescription,
  });

  // ---- KeeretFinal stream stability additions ----
  const lastStreamIdRef = useRef<string | null>(null);
  const isInitializingRef = useRef(false);
  const directWebcamStreamRef = useRef<MediaStream | null>(null);

  // Use Overshoot's stream or fallback to direct webcam for video display (stable)
  useEffect(() => {
    let mounted = true;

    const updateVideoStream = async () => {
      if (!mounted || !videoRef.current || isInitializingRef.current) return;

      // First try to get Overshoot's stream (if available)
      const overshootStream = getMediaStream();
      const currentStream = videoRef.current.srcObject as MediaStream | null;
      const currentStreamId = currentStream?.id || null;

      // IMPORTANT: If we already have a working stream, preserve it!
      // Only switch streams if we really need to (prevents camera from turning off)
      if (currentStream && currentStream.active && currentStream.getVideoTracks().length > 0) {
        const videoTrack = currentStream.getVideoTracks()[0];
        if (videoTrack && videoTrack.readyState === 'live') {
          // Stream is active and working - don't touch it unless we need to switch to Overshoot
          if (overshootStream && overshootStream.id !== currentStreamId && lastStreamIdRef.current !== overshootStream.id) {
            // Only switch if we have a different Overshoot stream
            isInitializingRef.current = true;
            console.log('[WebcamFeed] ✅ Switching to Overshoot stream');

            // Stop direct webcam stream if we have Overshoot stream
            if (directWebcamStreamRef.current && directWebcamStreamRef.current.id !== overshootStream.id) {
              directWebcamStreamRef.current.getTracks().forEach((track) => track.stop());
              directWebcamStreamRef.current = null;
            }

            try {
              videoRef.current.srcObject = overshootStream;
              await videoRef.current.play();
              streamRef.current = overshootStream;
              lastStreamIdRef.current = overshootStream.id;
              setIsStreaming(true);
              setError(null);
            } catch (err) {
              console.error('[WebcamFeed] Error setting stream:', err);
            } finally {
              isInitializingRef.current = false;
            }
          } else {
            // Stream is working fine - ensure it's playing
            if (videoRef.current.paused) {
              videoRef.current.play().catch(console.error);
            }
          }
          return; // Preserve existing stream
        }
      }

      // No active stream or stream is inactive - need to get one
      if (overshootStream) {
        const overshootStreamId = overshootStream.id;

        // Only update if stream actually changed (by ID, not reference)
        if (currentStreamId !== overshootStreamId && lastStreamIdRef.current !== overshootStreamId) {
          isInitializingRef.current = true;
          console.log('[WebcamFeed] ✅ Setting Overshoot stream to video element');

          // Stop direct webcam stream if we have Overshoot stream
          if (directWebcamStreamRef.current && directWebcamStreamRef.current.id !== overshootStreamId) {
            directWebcamStreamRef.current.getTracks().forEach((track) => track.stop());
            directWebcamStreamRef.current = null;
          }

          try {
            videoRef.current.srcObject = overshootStream;
            await videoRef.current.play();
            streamRef.current = overshootStream;
            lastStreamIdRef.current = overshootStreamId;
            setIsStreaming(true);
            setError(null);
          } catch (err) {
            console.error('[WebcamFeed] Error setting stream:', err);
          } finally {
            isInitializingRef.current = false;
          }
        }
        return;
      }

      // Fallback: If no Overshoot stream and we don't have a stream, get direct webcam access
      if (
        !overshootStream &&
        mounted &&
        !directWebcamStreamRef.current &&
        !currentStream &&
        !streamRef.current &&
        !isInitializingRef.current
      ) {
        isInitializingRef.current = true;
        try {
          const directWebcamStream = await navigator.mediaDevices.getUserMedia({
            video: { width: 1280, height: 720, facingMode: 'user' },
          });

          if (videoRef.current && mounted) {
            const streamId = directWebcamStream.id;
            // Only set if we don't already have this stream
            if (lastStreamIdRef.current !== streamId && !videoRef.current.srcObject) {
              videoRef.current.srcObject = directWebcamStream;
              await videoRef.current.play();
              streamRef.current = directWebcamStream;
              directWebcamStreamRef.current = directWebcamStream;
              lastStreamIdRef.current = streamId;
              setIsStreaming(true);
              setError(null);
            } else {
              // Stream already set, just stop the new one
              directWebcamStream.getTracks().forEach((track) => track.stop());
            }
          }
        } catch (err) {
          console.error('[WebcamFeed] ❌ Failed to get webcam stream:', err);
          // Only set error if we don't already have a stream
          if (!streamRef.current) {
            setError('Camera access denied or unavailable. Please allow camera access.');
          }
        } finally {
          isInitializingRef.current = false;
        }
      }
    };

    // Initial setup and update when visionActive changes
    updateVideoStream();

    return () => {
      mounted = false;
      isInitializingRef.current = false;

      // DON'T stop streams in cleanup - let them persist across renders
      // Only cleanup direct webcam stream if component is unmounting entirely
      // (We'll let React handle unmount detection - this cleanup only runs on unmount)
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visionActive]); // Only re-run when visionActive actually changes

  // STT effect (audio-only). Keeps vision/video logic separate.
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

      if (httpSttRef.current) {
        httpSttRef.current.stop();
        httpSttRef.current = null;
      }

      if (openaiRealtimeRef.current) {
        openaiRealtimeRef.current.disconnect?.();
        openaiRealtimeRef.current = null;
      }

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

      const isCameraError =
        visionError.includes('Camera access denied') ||
        visionError.includes('camera access') ||
        visionError.includes('Permission denied');

      // If camera is working, don't show these errors
      if (isStreaming) {
        setError(null);
      } else if (!isApiKeyError && !isPeerConnectionError && !isCameraError) {
        console.error('[WebcamFeed] Vision error:', visionError);
        setError(`Vision error: ${visionError}`);
      } else {
        setError(null);
      }
    } else {
      setError(null);
    }
  }, [visionError, isStreaming]);

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
        onLoadedMetadata={() => {
          // Only play if not already playing to prevent flickering
          if (videoRef.current && videoRef.current.paused) {
            videoRef.current.play().catch(console.error);
          }
        }}
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-background-dark/80 via-transparent to-black/30"></div>

      {/* Match Message Overlay - Shows when match >= 40% */}
      {currentMatch && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-40 animate-fade-in-up">
          <div className="glass-panel rounded-xl px-6 py-4 shadow-2xl border-2 border-emerald-500/50 bg-emerald-500/10 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-emerald-400 text-2xl">location_on</span>
              <div className="flex flex-col">
                <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider">Matched</span>
                <span className="text-white text-lg font-bold">
                  You are in the {currentMatch.name}
                </span>
                <span className="text-emerald-300/80 text-xs mt-0.5">
                  {Math.round(currentMatch.score * 100)}% match
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detected Room Modal */}
      {detectedRoom && (
        <DetectedRoomModal roomName={detectedRoom.name} confidence={detectedRoom.score} onDismiss={handleDismissModal} />
      )}

      {/* Overshoot Output Indicator - Bottom Right */}
      <div className="absolute bottom-6 right-6 z-30 max-w-lg rounded-xl border-2 border-primary/50 shadow-2xl glass-panel p-4 bg-black/95 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-primary text-lg">smart_display</span>
          <h3 className="text-sm font-bold text-white">Live Description</h3>
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
              title={showFullOutput ? 'Show summary' : 'Show full description'}
            >
              <span className="material-symbols-outlined text-lg">{showFullOutput ? 'unfold_less' : 'unfold_more'}</span>
            </button>
          </div>
        </div>

        {liveDescription ? (
          <div className="text-[11px] text-white/90 max-h-[400px] overflow-y-auto">
            {showFullOutput && liveObservation ? (
              <pre className="text-white leading-relaxed whitespace-pre-wrap break-words font-mono text-[10px]">
                {JSON.stringify(liveObservation, null, 2)}
              </pre>
            ) : (
              <p className="text-white leading-relaxed whitespace-pre-wrap break-words">
                {liveDescription}
              </p>
            )}
          </div>
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

      {/* Error Message - Removed to prevent HTML rendering issues */}
    </div>
  );
}

