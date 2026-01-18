import { useEffect, useRef, useState, useCallback } from 'react';
import type { RoomObservation } from '@/types/room';
import { visionStreamManager } from '@/lib/visionStreamManager';

// Fixed static RoomObservation data when API is down - cached to ensure it's always the same
const STATIC_FAKE_OBSERVATION: RoomObservation = {
  room_type: 'office',
  fixed_elements: {
    major_furniture: [
      { name: 'desk', count: 5, attributes: ['wood', 'rectangular', 'office style'] },
      { name: 'table', count: 8, attributes: ['wood', 'large', 'workspace'] },
      { name: 'conference table', count: 1, attributes: ['large', 'oval', 'wood'] },
      { name: 'chair', count: 12, attributes: ['office chair', 'rolling', 'black'] },
      { name: 'filing cabinet', count: 3, attributes: ['metal', 'gray', 'tall'] },
      { name: 'bookshelf', count: 2, attributes: ['wood', 'tall', 'wall mounted'] },
    ],
    surfaces: {
      floor: {
        material: 'tile',
        color: 'gray',
        pattern: 'square tiles',
      },
      walls: {
        color: 'white',
        pattern: 'smooth',
      },
      ceiling: {
        color: 'white',
      },
    },
    lighting: [
      {
        type: 'fluorescent light',
        count: 6,
        attributes: ['ceiling mounted', 'bright', 'white'],
      },
      {
        type: 'desk lamp',
        count: 5,
        attributes: ['adjustable', 'LED'],
      },
    ],
    large_decor: [
      { name: 'whiteboard', attributes: ['wall mounted', 'large'] },
      { name: 'whiteboard', attributes: ['mobile', 'small'] },
      { name: 'monitor', attributes: ['wall mounted', 'display screen'] },
    ],
  },
  distinctive_markers: [
    'Multiple desks arranged in rows',
    'Conference table in center',
    'Whiteboard on wall',
    'Fluorescent lighting overhead',
    'Many office chairs',
    'Cable management visible',
  ],
  summary: 'This is an office space with many tables - 5 desks, 8 workspace tables, and 1 large conference table. The room has fluorescent lighting, white walls, and gray tile floors. There are 12 office chairs and various office furniture throughout. [FAKE DATA]',
};

// Generate fixed static RoomObservation data when API is down
function generateFakeObservation(): RoomObservation {
  // Always return the same static observation
  return STATIC_FAKE_OBSERVATION;
}

interface UseOvershootVisionOptions {
  prompt: string;
  outputSchema: Record<string, unknown>;
  onObservation: (obs: RoomObservation) => void;
  enabled?: boolean;
  processing?: {
    clip_length_seconds?: number;
    delay_seconds?: number;
    fps?: number;
    sampling_ratio?: number;
  };
}

export function useOvershootVision(opts: UseOvershootVisionOptions) {
  const { prompt, outputSchema, onObservation, enabled = true, processing } = opts;
  const visionRef = useRef<{ stop: () => Promise<void>; getMediaStream: () => MediaStream | null } | null>(null);
  const onObservationRef = useRef(onObservation);
  const initializingRef = useRef(false); // Prevent concurrent initialization
  const streamIdRef = useRef<string | null>(null); // Track stream ID for manager
  const [error, setError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isQueued, setIsQueued] = useState(false);
  const lastObservationTimeRef = useRef<number | null>(null); // Track last successful observation
  const fallbackModeRef = useRef(false); // Track if we're in fallback mode
  const fallbackIntervalRef = useRef<NodeJS.Timeout | null>(null); // Fallback interval

  // Keep the callback ref up to date without causing re-renders
  useEffect(() => {
    onObservationRef.current = onObservation;
  }, [onObservation]);

  useEffect(() => {
    // CRITICAL: If we already have an active stream, NEVER re-initialize
    // Even if dependencies change (prompt, schema, processing), keep using the existing stream
    if (visionRef.current !== null || streamIdRef.current !== null) {
      // Stream exists - do not recreate it, even if config changed
      return;
    }

    // CRITICAL: Prevent duplicate initialization - check multiple conditions
    // If we already have an active vision instance, don't re-initialize
    if (visionRef.current !== null) {
      if (enabled && isActive) {
        // Vision is active and enabled - do nothing (prevent re-initialization on dependency changes)
        return;
      } else if (enabled) {
        // Vision exists but not active - wait for it to become active
        return;
      } else {
        // Vision exists but should be disabled - stop it
        const vision = visionRef.current;
        const streamId = streamIdRef.current;
        visionRef.current = null;
        streamIdRef.current = null;
        vision
          .stop()
          .then(() => {
            setIsActive(false);
            if (streamId) {
              visionStreamManager.releaseStream(streamId);
            }
          })
          .catch((err) => {
            console.error('[useOvershootVision] Error stopping vision:', err);
            setIsActive(false);
            if (streamId) {
              visionStreamManager.releaseStream(streamId);
            }
          });
        return;
      }
    }

    // CRITICAL: Prevent initialization if already initializing
    if (initializingRef.current) {
      console.log('[useOvershootVision] ⚠️ Initialization already in progress, skipping...');
      return;
    }

    // This check is redundant now (we check at the top), but keeping for safety
    // CRITICAL: Prevent initialization if we already have an active stream
    // Even if dependencies changed, don't re-create the stream
    if (visionRef.current !== null || streamIdRef.current !== null) {
      console.log('[useOvershootVision] ⚠️ Stream already exists, skipping re-initialization (duplicate check)');
      return;
    }

    if (!enabled) {
      // No vision instance and disabled - nothing to do
      return;
    }

    let mounted = true;
    let currentStreamId: string | null = null;

    const initializeVision = async () => {
      // CRITICAL: Triple-check we're not already initialized (race condition protection)
      if (visionRef.current !== null) {
        initializingRef.current = false;
        return;
      }
      
      if (initializingRef.current) {
        return;
      }
      
      // Check if we have an active stream already
      const status = visionStreamManager.getStatus();
      if (status.active >= status.max) {
        // Don't set initializing to true if we can't start
        return;
      }
      
      initializingRef.current = true;

      try {
        // Generate unique stream ID
        const streamId = `vision_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        currentStreamId = streamId;
        streamIdRef.current = streamId;

        // Request permission from stream manager (will wait if at capacity)
        setIsQueued(true);
        await visionStreamManager.requestStream(streamId);
        
        // Check if still mounted after waiting
        if (!mounted || currentStreamId !== streamId) {
          visionStreamManager.releaseStream(streamId);
          initializingRef.current = false;
          setIsQueued(false);
          return;
        }
        
        setIsQueued(false);

        // FINAL CHECK: Verify we're still the only active stream and our stream ID is registered
        // This prevents race conditions where another stream might have started
        const finalStatus = visionStreamManager.getStatus();
        if (finalStatus.active > 1) {
          console.warn(`[useOvershootVision] ⚠️ Multiple streams detected! Active: ${finalStatus.active}, IDs: ${finalStatus.activeIds.join(', ')}, Expected: ${streamId}`);
          visionStreamManager.releaseStream(streamId);
          initializingRef.current = false;
          return;
        }
        if (finalStatus.active === 1 && !finalStatus.activeIds.includes(streamId)) {
          console.warn(`[useOvershootVision] ⚠️ Stream ID mismatch! Active ID: ${finalStatus.activeIds[0]}, Expected: ${streamId}`);
          visionStreamManager.releaseStream(streamId);
          initializingRef.current = false;
          return;
        }
        
        // Double-check we don't already have a vision instance (prevent duplicate initialization)
        if (visionRef.current !== null) {
          console.warn('[useOvershootVision] ⚠️ Vision instance already exists - aborting duplicate initialization');
          visionStreamManager.releaseStream(streamId);
          initializingRef.current = false;
          return;
        }

        // FORCE FAKE DATA MODE - Skip Overshoot API entirely
        // Get webcam stream directly for fake data mode
        console.log('[useOvershootVision] 🎭 Forcing fake data mode - skipping Overshoot API');
        
        // Skip all API key checks and RealtimeVision initialization
        // Go directly to fake data mode
        let webcamStream: MediaStream | null = null;
        try {
          webcamStream = await navigator.mediaDevices.getUserMedia({
            video: { width: 1280, height: 720, facingMode: 'user' },
          });
          
          // Create a fake vision object that returns the webcam stream
          const fakeVision = {
            stop: async () => {
              if (webcamStream) {
                webcamStream.getTracks().forEach(track => track.stop());
                webcamStream = null;
              }
              if (fallbackIntervalRef.current) {
                clearInterval(fallbackIntervalRef.current);
                fallbackIntervalRef.current = null;
              }
              fallbackModeRef.current = false;
              setIsActive(false);
            },
            getMediaStream: () => webcamStream,
          };
          
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          visionRef.current = fakeVision as any;
          setIsActive(true);
          setError(null);
          fallbackModeRef.current = true;
          
          // Generate one fake observation (office with many tables)
          const fakeObs = generateFakeObservation();
          onObservationRef.current(fakeObs);
          lastObservationTimeRef.current = Date.now();
          
          console.log('[useOvershootVision] ✅ Fake data mode active - using webcam stream with sample data');
          initializingRef.current = false;
          return; // Exit early - don't create RealtimeVision instance
        } catch (webcamError) {
          console.error('[useOvershootVision] ❌ Failed to get webcam stream:', webcamError);
          setError('Camera access denied or unavailable. Please allow camera access to use the live feed.');
          visionStreamManager.releaseStream(streamId);
          streamIdRef.current = null;
          initializingRef.current = false;
          return;
        }
      } catch (err) {
        if (!mounted) {
          // Release stream if we're unmounted
          if (streamIdRef.current) {
            visionStreamManager.releaseStream(streamIdRef.current);
            streamIdRef.current = null;
          }
          return;
        }
        console.error('[useOvershootVision] Failed to initialize:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setIsActive(false);
        visionRef.current = null;
        initializingRef.current = false;
        
        // Release stream on error
        if (streamIdRef.current) {
          visionStreamManager.releaseStream(streamIdRef.current);
          streamIdRef.current = null;
        }
      } finally {
        if (mounted) {
          initializingRef.current = false;
        }
      }
    };

    initializeVision();

    // Cleanup function - CRITICAL: Prevent duplicate streams
    return () => {
      const statusBefore = visionStreamManager.getStatus();
      console.log('[useOvershootVision] 🧹 Cleanup starting...', {
        hasVision: !!visionRef.current,
        streamId: streamIdRef.current,
        currentStreamId,
        initializing: initializingRef.current,
        streamsBefore: statusBefore.active,
        activeIds: statusBefore.activeIds,
      });
      
      // Set mounted to false IMMEDIATELY to prevent any new operations
      mounted = false;
      
      // Clean up fallback mode
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
        fallbackIntervalRef.current = null;
      }
      fallbackModeRef.current = false;
      
      // Clear API down check timeout if it exists on vision object
      const visionToCheck = visionRef.current;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (visionToCheck && (visionToCheck as any).__apiDownCheckTimeout) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        clearTimeout((visionToCheck as any).__apiDownCheckTimeout);
      }
      
      // Stop initialization immediately
      if (initializingRef.current) {
        console.log('[useOvershootVision] ⚠️ Aborting in-progress initialization...');
        initializingRef.current = false;
      }
      
      // Get references to clean up
      const visionToStop = visionRef.current;
      const streamIdToRelease = currentStreamId || streamIdRef.current;
      
      // Clear refs IMMEDIATELY to prevent any new operations
      visionRef.current = null;
      streamIdRef.current = null;
      
      // Release stream slot FIRST (before stopping vision) to allow queued streams to proceed
      if (streamIdToRelease) {
        visionStreamManager.releaseStream(streamIdToRelease);
        console.log('[useOvershootVision] ✅ Released stream slot:', streamIdToRelease);
      }
      
      // Stop vision instance (with timeout to prevent hanging)
      if (visionToStop) {
        console.log('[useOvershootVision] Stopping vision instance...');
        
        // Set a timeout for stopping vision (don't wait forever)
        const stopTimeout = setTimeout(() => {
          console.warn('[useOvershootVision] ⚠️ Vision stop timeout - forcing cleanup');
          setIsActive(false);
        }, 2000); // 2 second timeout
        
        visionToStop
          .stop()
          .then(() => {
            clearTimeout(stopTimeout);
            console.log('[useOvershootVision] ✅ Vision stopped successfully');
            setIsActive(false);
          })
          .catch((err) => {
            clearTimeout(stopTimeout);
            console.error('[useOvershootVision] Error stopping vision:', err);
            setIsActive(false);
            // Even on error, we're cleaned up
          });
      } else {
        // No vision instance, just update state
        setIsActive(false);
      }
      
      // Final verification - check stream count after cleanup (with delay)
      setTimeout(() => {
        const statusAfter = visionStreamManager.getStatus();
        if (statusAfter.active > statusAfter.max) {
          console.error('[useOvershootVision] 🚨 ERROR: Too many streams after cleanup!', {
            active: statusAfter.active,
            max: statusAfter.max,
            activeIds: statusAfter.activeIds,
            expected: statusAfter.max,
          });
        } else {
          console.log('[useOvershootVision] ✅ Cleanup complete. Active streams:', statusAfter.active, '/', statusAfter.max);
        }
      }, 200); // Longer delay to ensure cleanup completes
    };
    // CRITICAL: Only re-run if truly necessary - don't re-initialize on object/array reference changes
    // Use JSON.stringify for deep comparison of processing config
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    enabled, 
    // Only depend on prompt/processing/outputSchema if they actually change (via JSON.stringify)
    // But avoid re-creating stream if values are the same
    typeof prompt === 'string' ? prompt : JSON.stringify(prompt),
    typeof outputSchema === 'object' ? JSON.stringify(outputSchema) : outputSchema,
    typeof processing === 'object' ? JSON.stringify(processing) : processing,
  ]);

  const getMediaStream = useCallback(() => {
    return visionRef.current?.getMediaStream() || null;
  }, []);

  const stop = useCallback(async () => {
    if (visionRef.current) {
      const streamId = streamIdRef.current;
      await visionRef.current.stop();
      setIsActive(false);
      visionRef.current = null;
      
      // Release stream slot
      if (streamId) {
        visionStreamManager.releaseStream(streamId);
        streamIdRef.current = null;
      }
    }
  }, []);

  // Get stream manager status for debugging
  const getStreamStatus = useCallback(() => {
    return visionStreamManager.getStatus();
  }, []);

  return { error, isActive, isQueued, getMediaStream, stop, getStreamStatus };
}
