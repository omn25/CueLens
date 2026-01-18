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
  const [rawResponse, setRawResponse] = useState<string | null>(null); // Store raw response for debugging
  const [detectedRoom, setDetectedRoom] = useState<{ name: string; score: number } | null>(null);
  const [matchList, setMatchList] = useState<{ name: string; score: number }[]>([]);
  const [showFullOutput, setShowFullOutput] = useState(true); // Default to showing full JSON
  const streamRef = useRef<MediaStream | null>(null);
  
  // Stability buffer for consecutive matches
  const consecMatchRef = useRef<number>(0);
  const lastMatchRef = useRef<{ id: string; name: string; score: number } | null>(null);
  const cooldownUntilRef = useRef<number>(0);
  const observationBufferRef = useRef<RoomObservation[]>([]);
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
    console.log('[WebcamFeed] ✅ New observation received from Overshoot:', obs);
    console.log('[WebcamFeed] Observation JSON:', JSON.stringify(obs, null, 2));
    
    setLiveObservation(obs);
    observationBufferRef.current.push(obs);
    // Keep only last 5 observations
    if (observationBufferRef.current.length > 5) {
      observationBufferRef.current.shift();
    }

    const currentProfiles = profilesRef.current;
    if (currentProfiles.length === 0) {
      console.log('[WebcamFeed] No profiles to match against');
      return;
    }

    const now = Date.now();
    
    // Check cooldown
    if (now < cooldownUntilRef.current) {
      console.log('[WebcamFeed] Still in cooldown period');
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

    console.log('[WebcamFeed] Best match:', {
      name: best.name,
      score: best.score,
      scorePercent: Math.round(best.score * 100),
    });

    // Update match list for debug
    setMatchList(
      currentProfiles
        .map((p) => ({
          name: p.name,
          score: pickBestMatch(obs, [{ profile: p.profile, id: p.id, name: p.name }]).score,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
    );

    // Check if score >= 0.50 (50% similarity threshold as requested)
    if (best.score >= 0.50) {
      // Check if it's the same match as last time
      if (lastMatchRef.current && lastMatchRef.current.id === best.id) {
        consecMatchRef.current += 1;
        console.log('[WebcamFeed] Same match detected, consecutive count:', consecMatchRef.current);
      } else {
        // Different match, reset counter
        consecMatchRef.current = 1;
        console.log('[WebcamFeed] New match detected, resetting counter');
      }
      lastMatchRef.current = { id: best.id, name: best.name, score: best.score };

      // If we have 3 consecutive matches, show modal
      if (consecMatchRef.current >= 3) {
        console.log('[WebcamFeed] ✅ Match confirmed! Showing modal for:', best.name, 'with score:', best.score);
        setDetectedRoom({ name: best.name, score: best.score });
        cooldownUntilRef.current = now + 30000; // 30 second cooldown
        consecMatchRef.current = 0; // Reset counter
      }
    } else {
      // Score too low, reset counter
      consecMatchRef.current = 0;
      lastMatchRef.current = null;
      console.log('[WebcamFeed] Score too low (< 50%), resetting match counter');
    }
  }, []); // Empty deps - stable callback

  // Enable Overshoot vision with room observation schema
  const { getMediaStream, error: visionError, stop: stopVision, isQueued: visionQueued, getStreamStatus, isActive: visionActive } = useOvershootVision({
    prompt: ROOM_OBSERVATION_PROMPT,
    outputSchema: ROOM_OBSERVATION_OUTPUT_SCHEMA,
    enabled: true, // ENABLED for room recognition
    processing: {
      clip_length_seconds: 1, // Process 1 second clips
      delay_seconds: 1, // Wait 1 second between processing
    },
    onObservation: handleObservation,
  });

  // Debug: Log vision status
  useEffect(() => {
    console.log('[WebcamFeed] Vision status:', {
      isActive: visionActive,
      isQueued: visionQueued,
      hasError: !!visionError,
      hasMediaStream: !!getMediaStream(),
      liveObservation: !!liveObservation,
    });
  }, [visionActive, visionQueued, visionError, liveObservation, getMediaStream]);

  // Use Overshoot's stream for video display
  useEffect(() => {
    if (!visionActive) return; // Wait for vision to be active
    
    const updateVideoStream = () => {
      const overshootStream = getMediaStream();
      if (overshootStream && videoRef.current) {
        // Only update if stream changed
        if (videoRef.current.srcObject !== overshootStream) {
          console.log('[WebcamFeed] ✅ Setting Overshoot stream to video element');
          videoRef.current.srcObject = overshootStream;
          videoRef.current.play().catch((err) => {
            console.error('[WebcamFeed] Error playing video:', err);
          });
          streamRef.current = overshootStream;
          setIsStreaming(true);
        }
      }
    };

    // Try immediately
    updateVideoStream();
    
    // Also try periodically in case stream becomes available later
    const interval = setInterval(() => {
      updateVideoStream();
    }, 500);
    
    return () => clearInterval(interval);
  }, [visionActive, getMediaStream]);

  // Handle Overshoot stream updates
  useEffect(() => {
    if (videoRef.current && visionActive) {
      const overshootStream = getMediaStream();
      if (overshootStream && videoRef.current.srcObject !== overshootStream) {
        console.log('[WebcamFeed] Switching to Overshoot stream');
        // Stop previous stream if it's a direct webcam stream
        if (streamRef.current && streamRef.current !== overshootStream) {
          streamRef.current.getTracks().forEach((track) => {
            if (track.label !== 'OvershootVision') {
              track.stop();
            }
          });
        }
        videoRef.current.srcObject = overshootStream;
        videoRef.current.play().catch(console.error);
        streamRef.current = overshootStream;
        setIsStreaming(true);
      }
    }
  }, [getMediaStream, visionActive]);

  // Vision error handling
  useEffect(() => {
    if (visionError) {
      console.error('[WebcamFeed] Vision error:', visionError);
      setError(`Vision error: ${visionError}`);
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
          <h3 className="text-sm font-bold text-white">Overshoot Output (Live JSON)</h3>
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
          ) : rawResponse ? (
            // Show raw response if we have one but couldn't parse it
            <div className="space-y-2 py-2">
              <p className="text-amber-400 text-[11px] font-semibold">⚠️ Raw Overshoot Response (Unparsed):</p>
              <div className="text-[9px] text-white/90 max-h-[400px] overflow-y-auto bg-slate-900/80 rounded-lg p-2 border border-amber-500/50">
                <pre className="text-white font-mono leading-relaxed whitespace-pre-wrap break-words">
                  {rawResponse}
                </pre>
              </div>
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
