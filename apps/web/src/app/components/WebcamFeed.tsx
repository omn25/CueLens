'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useOvershootVision } from '@/hooks/useOvershootVision';
import { useRoomProfiles } from '@/hooks/useRoomProfiles';
import { ROOM_OBSERVATION_PROMPT, ROOM_OBSERVATION_OUTPUT_SCHEMA } from '@/lib/roomSchema';
import { pickBestMatch } from '@/lib/roomMatching';
import type { RoomObservation } from '@/types/room';
import DetectedRoomModal from './DetectedRoomModal';

export default function WebcamFeed() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  // Get room profiles from storage
  const { profiles } = useRoomProfiles();
  
  // Keep profiles ref up to date
  useEffect(() => {
    profilesRef.current = profiles;
  }, [profiles]);

  // API key is loaded from .env.local via useOvershootVision hook
  // No UI needed - key is configured in environment variable

  // Handle observations from Overshoot with stable callback
  const handleObservation = useCallback((obs: RoomObservation) => {
    setLiveObservation(obs);
    observationBufferRef.current.push(obs);
    // Keep only last 5 observations
    if (observationBufferRef.current.length > 5) {
      observationBufferRef.current.shift();
    }

    const currentProfiles = profilesRef.current;
    if (currentProfiles.length === 0) {
      return;
    }

    const now = Date.now();
    
    // Check cooldown
    if (now < cooldownUntilRef.current) {
      return; // Still in cooldown
    }

    // Find best match using deterministic matching
    const best = pickBestMatch(
      obs,
      currentProfiles.map((p) => ({
        profile: p.profile,
        id: p.id,
        name: p.name,
      }))
    );


    // Check if score >= 0.50 (50% similarity threshold as requested)
    if (best.score >= 0.50) {
      // Check if it's the same match as last time
      if (lastMatchRef.current && lastMatchRef.current.id === best.id) {
        consecMatchRef.current += 1;
      } else {
        // Different match, reset counter
        consecMatchRef.current = 1;
      }
      lastMatchRef.current = { id: best.id, name: best.name, score: best.score };

      // If we have 3 consecutive matches, show modal
      if (consecMatchRef.current >= 3) {
        setDetectedRoom({ name: best.name, score: best.score });
        cooldownUntilRef.current = now + 30000; // 30 second cooldown
        consecMatchRef.current = 0; // Reset counter
      }
    } else {
      // Score too low, reset counter
      consecMatchRef.current = 0;
      lastMatchRef.current = null;
    }
  }, []); // Empty deps - stable callback

  // Enable Overshoot vision with room observation schema
  const { getMediaStream, error: visionError, isQueued: visionQueued, getStreamStatus, isActive: visionActive } = useOvershootVision({
    prompt: ROOM_OBSERVATION_PROMPT,
    outputSchema: ROOM_OBSERVATION_OUTPUT_SCHEMA,
    enabled: true, // ENABLED for room recognition
    processing: {
      clip_length_seconds: 1, // Process 1 second clips
      delay_seconds: 1, // Wait 1 second between processing
    },
    onObservation: handleObservation,
  });


  // Use Overshoot's stream or fallback to direct webcam for video display
  useEffect(() => {
    let mounted = true;
    let directWebcamStream: MediaStream | null = null;

    const updateVideoStream = async () => {
      // First try to get Overshoot's stream (if available)
      const overshootStream = getMediaStream();
      if (overshootStream && videoRef.current && mounted) {
        // Only update if stream changed
        if (videoRef.current.srcObject !== overshootStream) {
          console.log('[WebcamFeed] ✅ Setting Overshoot stream to video element');
          // Stop direct webcam stream if we have Overshoot stream
          if (directWebcamStream && directWebcamStream !== overshootStream) {
            directWebcamStream.getTracks().forEach(track => track.stop());
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

      // Fallback: If no Overshoot stream, always try to get direct webcam access
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

    // Try immediately
    updateVideoStream();
    
    // Also try once more after a short delay in case stream becomes available
    const timeout = setTimeout(() => {
      if (mounted) {
        updateVideoStream();
      }
    }, 1000);
    
    return () => {
      mounted = false;
      clearTimeout(timeout);
      // Clean up direct webcam stream if it exists
      if (directWebcamStream) {
        directWebcamStream.getTracks().forEach(track => track.stop());
        directWebcamStream = null;
      }
    };
  }, [visionActive, getMediaStream]);

  // Vision error handling - only show critical errors, not API key warnings
  useEffect(() => {
    if (visionError) {
      // Don't show API key errors or RTCPeerConnection errors since we're using fallback mode
      const isApiKeyError = visionError.includes('API key') || 
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
      
      const isPeerConnectionError = visionError.includes('RTCPeerConnection') ||
                                    visionError.includes('PeerConnection') ||
                                    visionError.includes('Cannot create so many');
      
      // Only show critical errors (like camera access denied), not API/connection errors
      if (!isApiKeyError && !isPeerConnectionError) {
        console.error('[WebcamFeed] Vision error:', visionError);
        setError(`Vision error: ${visionError}`);
      } else {
        // API/connection error but we have fallback - just clear any existing error
        setError(null);
      }
    } else {
      // Clear error when visionError is cleared
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

      {/* Overshoot Output Indicator - Bottom Right - ALWAYS VISIBLE */}
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
                // Full JSON View - DEFAULT
                <div className="text-[10px] text-white/90 max-h-[500px] overflow-y-auto bg-slate-900/80 rounded-lg p-3 border border-white/20">
                  <pre className="text-white font-mono leading-relaxed whitespace-pre-wrap break-words">
                    {JSON.stringify(liveObservation, null, 2)}
                  </pre>
                </div>
              ) : (
                // Summary View
                <div className="text-[10px] text-white/80 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">Room:</span>
                    <span className="text-white font-medium capitalize">{liveObservation.room_type.replace('_', ' ')}</span>
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
                  
                  {/* Summary text */}
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
              {visionError && (
                <p className="text-red-400 text-[10px] mt-2">Error: {visionError}</p>
              )}
            </div>
          )}
        
        {/* Stream Status - Always visible for monitoring */}
        {(() => {
          const status = getStreamStatus();
          return (
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="flex items-center justify-between text-[9px]">
                <span className="text-white/50">Streams:</span>
                <span className={status.active === 1 ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-bold'}>
                  {status.active}/{status.max} active
                </span>
                {status.queued > 0 && (
                  <span className="text-amber-400 ml-2">({status.queued} queued)</span>
                )}
              </div>
              {status.active > 1 && (
                <div className="text-red-400 text-[9px] mt-1 font-bold">
                  ⚠️ WARNING: Multiple streams detected!
                </div>
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
