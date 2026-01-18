'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useOvershootVision } from '@/hooks/useOvershootVision';
import { ROOM_OBSERVATION_PROMPT, ROOM_OBSERVATION_OUTPUT_SCHEMA } from '@/lib/roomSchema';
import { aggregateObservations } from '@/lib/roomAggregation';
import type { RoomObservation } from '@/types/room';

interface RoomScanCaptureProps {
  onComplete: (observations: RoomObservation[], aggregated: RoomObservation) => void;
  onCancel: () => void;
  showStartButton?: boolean;
  autoStart?: boolean;
}

export default function RoomScanCapture({ onComplete, onCancel, showStartButton = false, autoStart = false }: RoomScanCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(10);
  const [observations, setObservations] = useState<RoomObservation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [webcamReady, setWebcamReady] = useState(false);
  const [visionReady, setVisionReady] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const hasAutoStartedRef = useRef(false);
  const scanStartTimeRef = useRef<number | null>(null);

  // Enable vision as soon as webcam is ready (not just when scanning)
  const { getMediaStream, error: visionError, stop: stopVision, isActive: visionActive, isQueued: visionQueued } = useOvershootVision({
    prompt: ROOM_OBSERVATION_PROMPT,
    outputSchema: ROOM_OBSERVATION_OUTPUT_SCHEMA,
    enabled: webcamReady, // Enable when webcam is ready
    processing: {
      clip_length_seconds: 0.5, // Collect observations every 0.5 seconds
      delay_seconds: 0.5,
    },
    onObservation: (obs) => {
      console.log('[RoomScanCapture] Observation received', {
        isScanning,
        hasStartTime: !!scanStartTimeRef.current,
        startTime: scanStartTimeRef.current,
        now: Date.now(),
      });
      
      // Only collect observations during active scanning (use ref for reliable timing check)
      if (scanStartTimeRef.current !== null) {
        const now = Date.now();
        // Only collect observations that come after scan started
        if (now >= scanStartTimeRef.current) {
          setObservations((prev) => {
            const current = prev || [];
            // Collect up to 25 observations (should get ~20 in 10 seconds with 0.5s intervals)
            const updated = [...current, obs];
            console.log(`[RoomScanCapture] ✅ Collected observation ${updated.length}/${25}:`, {
              room_type: obs.room_type,
              furniture_count: obs.fixed_elements.major_furniture.length,
              lighting_count: obs.fixed_elements.lighting.length,
              decor_count: obs.fixed_elements.large_decor.length,
              markers_count: obs.distinctive_markers.length,
              summary_preview: obs.summary.substring(0, 50) + '...',
            });
            return updated.slice(-25);
          });
        } else {
          console.log('[RoomScanCapture] ⏭️ Skipping observation - before scan start time');
        }
      } else {
        console.log('[RoomScanCapture] ⏭️ Skipping observation - scan not started yet');
      }
    },
  });

  useEffect(() => {
    return () => {
      // Cleanup timers
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (progressRef.current) {
        clearInterval(progressRef.current);
      }
      // Stop camera stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      // Stop vision
      stopVision();
    };
  }, [stopVision]);

  // Initialize webcam feed on mount - but prefer Overshoot's stream
  useEffect(() => {
    let mounted = true;

    const initializeWebcam = async () => {
      try {
        // First try to get Overshoot's stream (if vision is already active)
        const overshootStream = getMediaStream();
        if (overshootStream && videoRef.current && mounted) {
          console.log('[RoomScanCapture] Using Overshoot stream for video');
          videoRef.current.srcObject = overshootStream;
          videoRef.current.play().catch(console.error);
          // Don't store in streamRef since Overshoot manages it
          setWebcamReady(true);
          
          if (autoStart && !isScanning && mounted) {
            const autoStartTimer = setTimeout(() => {
              if (mounted) startScanning();
            }, 1000);
            return () => clearTimeout(autoStartTimer);
          }
          return;
        }

        // Fallback to direct webcam access only if Overshoot stream isn't available
        console.log('[RoomScanCapture] Falling back to direct webcam access');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, facingMode: 'user' },
        });

        if (videoRef.current && mounted) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(console.error);
          streamRef.current = stream;
          setWebcamReady(true);

          if (autoStart && !isScanning && mounted) {
            const autoStartTimer = setTimeout(() => {
              if (mounted) startScanning();
            }, 1000);
            return () => clearTimeout(autoStartTimer);
          }
        }
      } catch (err) {
        if (mounted) {
          console.error('[RoomScanCapture] Error accessing webcam:', err);
          setError('Unable to access webcam. Please check permissions.');
        }
      }
    };

    initializeWebcam();

    return () => {
      mounted = false;
      // Only stop direct webcam stream, not Overshoot's stream
      if (streamRef.current) {
        console.log('[RoomScanCapture] Stopping direct webcam stream');
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      // Don't clear video srcObject here - let cleanup in parent handle it
    };
  }, [autoStart, getMediaStream]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle auto-start separately to avoid circular dependencies
  useEffect(() => {
    if (autoStart && webcamReady && !isScanning && !error && !hasAutoStartedRef.current) {
      hasAutoStartedRef.current = true;
      const autoStartTimer = setTimeout(() => {
        if (!isScanning) {
          startScanning();
        }
      }, 1000);
      return () => clearTimeout(autoStartTimer);
    }
  }, [autoStart, webcamReady, isScanning, error]); // eslint-disable-line react-hooks/exhaustive-deps

  // Track when vision becomes active
  useEffect(() => {
    if (visionActive && !visionReady) {
      console.log('[RoomScanCapture] Vision is now active');
      setVisionReady(true);
    }
  }, [visionActive, visionReady]);

  // Use Overshoot's stream when it becomes available - only update if stream actually changed
  const lastOvershootStreamIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (visionActive && videoRef.current) {
      const overshootStream = getMediaStream();
      const currentStream = videoRef.current.srcObject as MediaStream | null;
      const currentStreamId = currentStream?.id || null;
      
      if (overshootStream) {
        const overshootStreamId = overshootStream.id;
        
        // Only switch if this is a different stream (by ID, not just reference)
        if (overshootStreamId !== currentStreamId && overshootStreamId !== lastOvershootStreamIdRef.current) {
          console.log('[RoomScanCapture] Switching to Overshoot stream');
          // Stop previous stream if it's a direct webcam stream
          if (streamRef.current && streamRef.current.id !== overshootStreamId) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
          }
          videoRef.current.srcObject = overshootStream;
          videoRef.current.play().catch(console.error);
          lastOvershootStreamIdRef.current = overshootStreamId;
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visionActive]); // Removed getMediaStream from deps to prevent unnecessary re-runs

  useEffect(() => {
    // Handle vision errors
    if (visionError) {
      setError(`Vision error: ${visionError}`);
    }
  }, [visionError]);

  const startScanning = useCallback(() => {
    if (isScanning) return; // Prevent multiple starts

    console.log('[RoomScanCapture] Starting scan...', {
      webcamReady,
      visionReady,
      visionActive,
    });

    // Reset observations and record scan start time
    setObservations([]);
    scanStartTimeRef.current = Date.now();
    setScanProgress(0);
    setTimeRemaining(10);
    setError(null);
    
    // Give vision a moment to be ready if it isn't already
    if (!visionReady && !visionActive) {
      console.warn('[RoomScanCapture] Vision not ready yet, waiting 1 second...');
      setTimeout(() => {
        setIsScanning(true);
        console.log('[RoomScanCapture] Scan started after vision wait');
      }, 1000);
    } else {
      setIsScanning(true);
      console.log('[RoomScanCapture] Scan started immediately');
    }

    // Countdown timer
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setIsScanning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Progress bar update
    progressRef.current = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          if (progressRef.current) clearInterval(progressRef.current);
          return 100;
        }
        return prev + 10;
      });
    }, 1000);
  }, [isScanning, webcamReady, visionReady, visionActive]);

  // Finish scanning when timer completes
  useEffect(() => {
    if (!isScanning && timeRemaining === 0 && observations !== null) {
      const finalObservations = observations || [];
      console.log(`[RoomScanCapture] Scan completed. Total observations: ${finalObservations.length}`, {
        observations: finalObservations.map((o, i) => ({
          index: i + 1,
          room_type: o.room_type,
          furniture: o.fixed_elements.major_furniture.length,
          lighting: o.fixed_elements.lighting.length,
          decor: o.fixed_elements.large_decor.length,
          markers: o.distinctive_markers.length,
        })),
      });

      if (finalObservations.length > 0) {
        const aggregated = aggregateObservations(finalObservations);
        console.log('[RoomScanCapture] Aggregated profile:', aggregated);
        onComplete(finalObservations, aggregated);
      } else {
        console.error('[RoomScanCapture] ❌ No observations collected!', {
          webcamReady,
          visionReady,
          visionActive,
          visionError,
        });
        setError('No observations collected. Please ensure your camera is working and try again.');
      }
    }
  }, [isScanning, timeRemaining, observations, onComplete, webcamReady, visionReady, visionActive, visionError]);

  const cancelScanning = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (progressRef.current) clearInterval(progressRef.current);
    setIsScanning(false);
    setObservations(null);
    scanStartTimeRef.current = null;
    setScanProgress(0);
    setTimeRemaining(10);
    onCancel();
  };

  if (error) {
    return (
      <div className="absolute inset-0 flex items-center justify-center z-20">
        <div className="bg-red-500/90 text-white px-6 py-4 rounded-xl shadow-lg max-w-md">
          <p className="font-semibold mb-2">Error</p>
          <p className="text-sm mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setObservations([]);
            }}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={cancelScanning}
            className="ml-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* Video Feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-background-dark/80 via-transparent to-black/30"></div>

      {/* Scanning UI */}
      {isScanning ? (
        <>
          {/* Scanning Grid */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                'linear-gradient(rgba(73, 120, 156, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(73, 120, 156, 0.5) 1px, transparent 1px)',
              backgroundSize: '80px 80px',
            }}
          />

          {/* Guidance Message */}
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-3 px-6 py-3 bg-black/60 backdrop-blur-md border border-white/20 rounded-full shadow-2xl z-20 max-w-2xl mx-4">
            <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
              <span className="material-symbols-outlined text-primary text-xl">pan_tool</span>
            </div>
            <div className="flex flex-col">
              <span className="text-white text-lg font-semibold tracking-wide">
                Move your laptop slowly left and right ({timeRemaining}s remaining)
              </span>
              <span className="text-white/80 text-sm">
                We&apos;re capturing room features - keep moving to get all angles
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-64 z-20">
            <div className="h-2 w-full bg-gray-700/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${scanProgress}%` }}
              ></div>
            </div>
            <p className="text-white text-center text-sm mt-2 font-semibold">
              Scanning... {scanProgress}%
            </p>
          </div>

          {/* Cancel Button */}
          <button
            onClick={cancelScanning}
            className="absolute top-6 right-6 z-20 px-4 py-2 bg-red-500/90 hover:bg-red-600 text-white font-semibold rounded-lg shadow-lg transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined">close</span>
            Cancel
          </button>

          {/* Collected Observations Count */}
          {observations && observations.length > 0 && (
            <div className="absolute top-6 left-6 z-20 glass-panel px-4 py-2 rounded-lg">
              <p className="text-white text-sm font-semibold">
                Captured: {observations.length} frames
              </p>
            </div>
          )}

          {/* Queue Status */}
          {visionQueued && (
            <div className="absolute top-6 right-6 z-20 glass-panel px-4 py-2 rounded-lg border border-amber-500/50">
              <p className="text-white text-sm font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400 animate-pulse">hourglass_empty</span>
                Waiting for stream slot...
              </p>
            </div>
          )}
        </>
      ) : showStartButton ? (
        /* Start Button Overlay - when showStartButton is true */
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none">
          {/* Instructions Overlay */}
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-3 px-6 py-3 bg-black/60 backdrop-blur-md border border-white/20 rounded-full shadow-2xl pointer-events-auto max-w-2xl mx-4">
            <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-2xl">pan_tool</span>
            </div>
            <div className="flex flex-col">
              <span className="text-white text-lg font-semibold tracking-wide">
                Position your laptop and move it slowly left and right
              </span>
              <span className="text-white/80 text-sm">
                This will help us capture all the features of the room
              </span>
            </div>
          </div>

          {/* Start Button */}
          <div className="mt-auto mb-20 pointer-events-auto">
            <button
              onClick={startScanning}
              disabled={!webcamReady}
              className="px-8 py-4 bg-primary hover:bg-primary/90 disabled:bg-slate-500 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-primary/25 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <span className="material-symbols-outlined">camera</span>
              <span>Start 10-Second Room Scan</span>
            </button>
            {!webcamReady && (
              <p className="text-white/70 text-sm text-center mt-2">
                Initializing camera...
              </p>
            )}
          </div>
        </div>
      ) : (
        /* Auto-start mode - show ready state */
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={startScanning}
              className="px-8 py-4 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/25 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined">camera</span>
              <span>Start 10-Second Room Scan</span>
            </button>
            <p className="text-white/70 text-sm text-center max-w-md">
              Move your laptop slowly left and right to capture all room features
            </p>
          </div>
        </div>
      )}

      {/* Instructions when not scanning */}
      {!isScanning && !error && webcamReady && showStartButton && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 px-6 py-3 bg-black/60 backdrop-blur-md border border-white/20 rounded-full shadow-2xl max-w-xl mx-4">
          <p className="text-white text-sm text-center font-medium">
            <span className="material-symbols-outlined text-primary inline-block mr-2 align-middle">info</span>
            Make sure you can see the room clearly. Slowly pan your laptop left and right to capture different angles.
          </p>
        </div>
      )}
    </div>
  );
}
