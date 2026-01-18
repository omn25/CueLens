import { useEffect, useRef, useState, useCallback } from 'react';
import type { RoomObservation } from '@/types/room';
import { visionStreamManager } from '@/lib/visionStreamManager';

// Fixed static RoomObservation data when API is down - cached to ensure it's always the same
const STATIC_FAKE_OBSERVATION: RoomObservation = {
  room_type: 'bedroom',
  fixed_elements: {
    major_furniture: [
      { name: 'bed', count: 1, attributes: ['queen size', 'wood frame'] },
      { name: 'dresser', count: 1, attributes: ['wood', 'brown'] },
      { name: 'nightstand', count: 2, attributes: ['wood', 'simple'] },
    ],
    surfaces: {
      floor: {
        material: 'carpet',
        color: 'beige',
        pattern: 'solid',
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
        type: 'ceiling light',
        count: 2,
        attributes: ['standard'],
      },
    ],
    large_decor: [
      { name: 'artwork', attributes: ['framed', 'wall mounted'] },
    ],
  },
  distinctive_markers: [
    'Window on left side',
    'Door visible',
  ],
  summary: 'This is a bedroom with 3 main furniture items. The floor is carpet and walls are white. [FAKE DATA - API Down]',
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
    // CRITICAL: Prevent duplicate initialization - check multiple conditions
    if (visionRef.current !== null) {
      if (enabled) {
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

        const { RealtimeVision } = await import('@overshoot/sdk');
        
        // Check multiple sources for API key (similar to OpenAI key pattern)
        // IMPORTANT: Environment variable takes precedence (user wants .env.local)
        // Priority: 1. Environment variable (.env.local), 2. localStorage, 3. window variable
        let apiKey: string | null = null;
        let keySource: string = 'unknown';
        
        // Helper function to clean API key (remove quotes, whitespace, etc.)
        const cleanApiKey = (key: string | null | undefined): string | null => {
          if (!key) return null;
          
          const original = key;
          
          // Remove quotes (single or double) from start/end
          let cleaned = key.trim().replace(/^["']+|["']+$/g, '');
          
          // Remove any remaining whitespace (including newlines, tabs, etc.)
          cleaned = cleaned.replace(/\s+/g, '');
          
          // Remove any non-printable/invisible characters (except alphanumeric, underscore, dash)
          cleaned = cleaned.replace(/[^\x20-\x7E]/g, '');
          
          // Final trim
          cleaned = cleaned.trim();
          
          // Log if we removed anything
          if (cleaned !== original.trim()) {
            const removed = original.length - cleaned.length;
            console.warn('[useOvershootVision] ⚠️ Cleaned API key (removed quotes/whitespace/invisible chars):', {
              originalLength: original.length,
              cleanedLength: cleaned.length,
              charactersRemoved: removed,
              originalPreview: original.substring(0, 20) + '...',
              cleanedPreview: cleaned.substring(0, 20) + '...',
              originalCharCodes: Array.from(original.slice(0, 20)).map(c => c.charCodeAt(0)),
              cleanedCharCodes: Array.from(cleaned.slice(0, 20)).map(c => c.charCodeAt(0)),
            });
          }
          
          return cleaned || null;
        };
        
        // Helper to validate API key format
        const validateApiKeyFormat = (key: string): { valid: boolean; issues: string[] } => {
          const issues: string[] = [];
          
          if (!key) {
            issues.push('Key is empty');
            return { valid: false, issues };
          }
          
          if (key.length < 20) {
            issues.push(`Key too short (${key.length} chars, expected 30+)`);
          }
          
          if (!key.startsWith('ovs_')) {
            issues.push(`Key should start with 'ovs_' (found: ${key.substring(0, 4)})`);
          }
          
          if (key.includes(' ')) {
            issues.push('Key contains spaces (should be trimmed)');
          }
          
          if (/["']/.test(key)) {
            issues.push('Key contains quotes (remove quotes from .env.local)');
          }
          
          if (key.length > 100) {
            issues.push(`Key suspiciously long (${key.length} chars)`);
          }
          
          return {
            valid: issues.length === 0,
            issues,
          };
        };
        
        // 1. Check environment variable FIRST (takes precedence - user wants .env.local)
        const envKey = process.env.NEXT_PUBLIC_OVERSHOOT_API_KEY;
        console.log('[useOvershootVision] 🔍 Checking environment variable...', {
          exists: !!envKey,
          length: envKey?.length || 0,
          startsWith: envKey?.substring(0, 7) || 'none',
          prefix: envKey?.substring(0, 4) || 'none',
          fullValue: envKey || 'undefined',
          isUndefined: envKey === undefined,
          isNull: envKey === null,
          isEmpty: envKey === '',
          hasSpaces: envKey?.includes(' ') || false,
          hasQuotes: envKey?.match(/^["']|["']$/) !== null,
          trimmedLength: envKey?.trim().length || 0,
          allEnvKeys: Object.keys(process.env).filter(k => k.includes('OVERSHOOT')),
        });
        const cleanedEnvKey = cleanApiKey(envKey);
        if (cleanedEnvKey) {
          apiKey = cleanedEnvKey;
          keySource = 'environment (.env.local)';
          console.log('[useOvershootVision] ✅ Using API key from environment variable:', {
            length: apiKey.length,
            prefix: apiKey.substring(0, 10) + '...',
            source: 'apps/web/.env.local',
          });
        } else {
          console.warn('[useOvershootVision] ⚠️ Environment variable NEXT_PUBLIC_OVERSHOOT_API_KEY is empty or missing');
          console.warn('[useOvershootVision] Available NEXT_PUBLIC_ env vars:', 
            Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC_')).join(', ') || 'none'
          );
        }
        
        // 2. Fall back to localStorage (if env var not available)
        if (!apiKey && typeof window !== 'undefined') {
          const savedKey = localStorage.getItem('OVERSHOOT_API_KEY');
          const cleanedLocalKey = cleanApiKey(savedKey);
          if (cleanedLocalKey) {
            apiKey = cleanedLocalKey;
            keySource = 'localStorage';
          }
        }
        
        // 3. Fall back to window variable (if neither env nor localStorage available)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!apiKey && typeof window !== 'undefined' && (window as any).__OVERSHOOT_API_KEY__) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const windowKey = (window as any).__OVERSHOOT_API_KEY__;
          const cleanedWindowKey = cleanApiKey(windowKey);
          if (cleanedWindowKey) {
            apiKey = cleanedWindowKey;
            keySource = 'window variable';
          }
        }

        if (!apiKey || apiKey.trim() === '') {
          console.warn('[useOvershootVision] ⚠️ Overshoot API key not found - using fallback mode with sample data');
          console.log('[useOvershootVision] Debug info:', {
            localStorageKey: typeof window !== 'undefined' ? localStorage.getItem('OVERSHOOT_API_KEY') : 'N/A (server)',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            windowKey: typeof window !== 'undefined' ? (window as any).__OVERSHOOT_API_KEY__ : 'N/A (server)',
            envKey: process.env.NEXT_PUBLIC_OVERSHOOT_API_KEY,
            envKeyExists: !!process.env.NEXT_PUBLIC_OVERSHOOT_API_KEY,
            envKeyLength: process.env.NEXT_PUBLIC_OVERSHOOT_API_KEY?.length || 0,
            allEnvKeys: Object.keys(process.env).filter(k => k.includes('OVERSHOOT')),
            allNextPublicKeys: Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC_')),
          });
          
          // No API key - start fallback mode with direct webcam stream
          // Get webcam stream directly
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
            
            // Generate one fake observation and keep it static (no periodic updates)
            const fakeObs = generateFakeObservation();
            onObservationRef.current(fakeObs);
            lastObservationTimeRef.current = Date.now();
            
            console.log('[useOvershootVision] ✅ Fallback mode active - using webcam stream with sample data');
            initializingRef.current = false;
            return;
          } catch (webcamError) {
            console.error('[useOvershootVision] ❌ Failed to get webcam stream:', webcamError);
            setError('Camera access denied or unavailable. Please allow camera access to use the live feed.');
            visionStreamManager.releaseStream(streamId);
            streamIdRef.current = null;
            initializingRef.current = false;
            return;
          }
        }

        // Validate API key format before proceeding
        const keyValidation = validateApiKeyFormat(apiKey);
        
        if (!keyValidation.valid) {
          console.error('[useOvershootVision] ❌ API key format validation failed:', keyValidation.issues);
          setError(`API key format is invalid:\n${keyValidation.issues.map(i => `  • ${i}`).join('\n')}\n\nPlease check your .env.local file and ensure the key is correct.`);
          visionStreamManager.releaseStream(streamId);
          streamIdRef.current = null;
          initializingRef.current = false;
          return;
        }
        
        // Log the exact key that will be sent (for debugging)
        console.log('[useOvershootVision] ✅ API key found and validated!', {
          source: keySource,
          length: apiKey.length,
          prefix: apiKey.substring(0, 10) + '...',
          suffix: '...' + apiKey.substring(apiKey.length - 4),
          firstChars: apiKey.substring(0, 15),
          lastChars: apiKey.substring(apiKey.length - 5),
          formatValid: true,
          // Show character codes to detect hidden chars
          firstCharCode: apiKey.charCodeAt(0),
          lastCharCode: apiKey.charCodeAt(apiKey.length - 1),
          // Show if it matches expected pattern
          matchesPattern: /^ovs_[a-zA-Z0-9_]+$/.test(apiKey),
        });
        
        // Double-check: Show what we're about to send to Overshoot
        // Removed verbose logging for performance

        console.log('[useOvershootVision] Creating RealtimeVision instance...', {
          apiUrl: 'https://cluster1.overshoot.ai/api/v0.2',
          apiKeyLength: apiKey.length,
          apiKeyPrefix: apiKey.substring(0, 5) + '...',
          hasPrompt: !!prompt,
          hasOutputSchema: !!outputSchema,
          hasProcessing: !!processing,
        });

        // Note: Don't request camera permission here - let Overshoot handle it
        // This prevents conflicts and ensures Overshoot gets the stream it needs

        // Now create vision instance - Overshoot will create its own stream from camera
        const vision = new RealtimeVision({
          apiUrl: 'https://cluster1.overshoot.ai/api/v0.2',
          apiKey: apiKey,
          prompt,
          outputSchema,
          processing,
          source: {
            type: 'camera',
            cameraFacing: 'user',
          },
          onResult: (res) => {
            // If in fallback mode, ignore all real API observations to keep JSON static
            if (fallbackModeRef.current) {
              return; // Block all real observations when in fallback mode
            }
            
            if (!mounted || !visionRef.current) {
              return;
            }
            try {
              // Mark that we received a successful observation (exit fallback mode)
              if (res.result && res.ok) {
                lastObservationTimeRef.current = Date.now();
                if (fallbackModeRef.current) {
                  fallbackModeRef.current = false;
                  if (fallbackIntervalRef.current) {
                    clearInterval(fallbackIntervalRef.current);
                    fallbackIntervalRef.current = null;
                  }
                }
                
                // Parse JSON result - handle cases where result might be wrapped in markdown or have extra text
                let jsonString = res.result.trim();
                
                // Try to extract JSON if wrapped in markdown code blocks
                const jsonMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || 
                                  jsonString.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  jsonString = jsonMatch[1] || jsonMatch[0];
                }
                
                const json = JSON.parse(jsonString);
                
                // Relaxed validation - try to accept even partial observations
                // Convert to RoomObservation format if needed
                let observation: RoomObservation;
                
                // If it already matches our schema, use it directly
                if (json.room_type && json.fixed_elements) {
                  observation = json as RoomObservation;
                } else {
                  // Check if it matches the user's requested format
                  if (json.room_type && (json.major_furniture || json.fixtures_builtins)) {
                    // Convert from user's format to our format
                    observation = {
                      room_type: json.room_type,
                      fixed_elements: {
                        major_furniture: json.major_furniture || [],
                        surfaces: json.surfaces || {
                          floor: { material: 'unknown', color: 'unknown', pattern: 'unknown' },
                          walls: { color: 'unknown', pattern: 'unknown' },
                          ceiling: { color: 'unknown' },
                        },
                        lighting: json.lighting || [],
                        large_decor: json.large_decor || [],
                      },
                      distinctive_markers: json.distinctive_markers || [],
                      summary: json.summary || 'No summary provided',
                    };
                  } else {
                    // Create minimal valid observation with available data
                    observation = {
                      room_type: json.room_type || 'unknown',
                      fixed_elements: {
                        major_furniture: json.major_furniture || json.fixed_elements?.major_furniture || [],
                        surfaces: json.surfaces || json.fixed_elements?.surfaces || {
                          floor: { material: 'unknown', color: 'unknown', pattern: 'unknown' },
                          walls: { color: 'unknown', pattern: 'unknown' },
                          ceiling: { color: 'unknown' },
                        },
                        lighting: json.lighting || json.fixed_elements?.lighting || [],
                        large_decor: json.large_decor || json.fixed_elements?.large_decor || [],
                      },
                      distinctive_markers: json.distinctive_markers || [],
                      summary: json.summary || JSON.stringify(json, null, 2).substring(0, 200),
                    };
                  }
                }
                
                // Use ref to avoid dependency issues
                onObservationRef.current(observation);
              }
                } catch (e) {
                  console.error('[useOvershootVision] ❌ Failed to parse observation JSON:', e);
                  console.error('[useOvershootVision] Raw result that failed:', res.result);
                  // Store raw response so UI can display it even if parsing fails
                  // We can't easily pass this to the component, so log it extensively
                  console.error('[useOvershootVision] 📋 FULL RAW RESPONSE (parse failed):', res.result);
                  // Still try to call onObservation with raw string as summary
                  try {
                    const fallbackObservation: RoomObservation = {
                      room_type: 'unknown',
                      fixed_elements: {
                        major_furniture: [],
                        surfaces: {
                          floor: { material: 'unknown', color: 'unknown', pattern: 'unknown' },
                          walls: { color: 'unknown', pattern: 'unknown' },
                          ceiling: { color: 'unknown' },
                        },
                        lighting: [],
                        large_decor: [],
                      },
                      distinctive_markers: [],
                      summary: `RAW RESPONSE (Parse Error): ${res.result.substring(0, 500)}`,
                    };
                    onObservationRef.current(fallbackObservation);
                  } catch (fallbackError) {
                    console.error('[useOvershootVision] Even fallback observation failed:', fallbackError);
                  }
                }
          },
          onError: (err) => {
            if (!mounted) {
              // Silently ignore errors if unmounted
              return;
            }
            
            // Log the error but DON'T clean up on WebSocket errors
            // WebSocket errors are often transient and Overshoot handles reconnection
            const isWebSocketError = err?.message?.includes('WebSocket') || 
                                    err?.message?.includes('websocket');
            
            if (isWebSocketError) {
              // WebSocket errors are usually transient - log but don't panic
              console.warn('[useOvershootVision] ⚠️ WebSocket error (likely transient):', err?.message || 'Unknown');
              // Don't set error state or clean up - let Overshoot handle reconnection
              return;
            }
            
            // Only handle truly fatal errors
            const isFatal = err?.message?.includes('Fatal') && !isWebSocketError;
            
            if (isFatal) {
              console.error('[useOvershootVision] 🚨 Fatal error (non-WebSocket):', err);
              setError(err?.message || 'Overshoot error occurred');
            } else {
              // Log but don't interrupt service for non-fatal errors
              console.warn('[useOvershootVision] ⚠️ Non-fatal error:', err?.message || 'Unknown');
            }
          },
          debug: false, // Disable debug to reduce noise
        });

        visionRef.current = vision;
        
        // Start vision immediately - Overshoot handles camera access
        console.log('[useOvershootVision] Starting vision...');
        
        // Check if still mounted
        if (!mounted || visionRef.current !== vision) {
          console.log('[useOvershootVision] Component unmounted before start, cleaning up...');
          await vision.stop().catch(() => {});
          if (streamIdRef.current) {
            visionStreamManager.releaseStream(streamIdRef.current);
            streamIdRef.current = null;
          }
          initializingRef.current = false;
          return;
        }
        const startTimeout = setTimeout(() => {
          if (mounted && visionRef.current === vision && !isActive) {
            console.error('[useOvershootVision] ⚠️ Vision start timeout - connection may have failed');
            setError('Vision start timeout. WebSocket connection may have failed. Please check your internet connection.');
            // Clean up on timeout
            visionRef.current = null;
            streamIdRef.current = null;
            initializingRef.current = false;
            if (streamId) {
              visionStreamManager.releaseStream(streamId);
            }
          }
        }, 15000); // 15 second timeout for starting
        
        try {
          await vision.start();
          clearTimeout(startTimeout);
          
          // Final check - make sure we're still mounted and this is still the current instance
          if (!mounted || visionRef.current !== vision) {
            console.log('[useOvershootVision] Component unmounted or vision replaced during init, cleaning up');
            await vision.stop().catch(() => {
              // Ignore errors when stopping during unmount
            });
            if (streamIdRef.current) {
              visionStreamManager.releaseStream(streamIdRef.current);
              streamIdRef.current = null;
            }
            initializingRef.current = false;
            return;
          }
          
          console.log('[useOvershootVision] ✅ Vision started successfully');
          setIsActive(true);
          setError(null);
          
          // Get the stream from Overshoot for display (it may have created its own or reused ours)
          const overshootStream = vision.getMediaStream();
          if (overshootStream) {
            console.log('[useOvershootVision] ✅ Overshoot stream available:', {
              id: overshootStream.id,
              active: overshootStream.active,
            });
          }
          
          // Removed API downtime check to reduce overhead - fallback mode is handled on initial error
        } catch (startError) {
          clearTimeout(startTimeout);
          
          // Extract detailed error information
          const errorMessage = startError instanceof Error ? startError.message : String(startError);
          const errorName = startError instanceof Error ? startError.name : 'Unknown';
          const errorStack = startError instanceof Error ? startError.stack : 'No stack';
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const errorAny = startError as any;
          
          // Log comprehensive error details
          console.error('[useOvershootVision] ❌ Error starting vision:', {
            message: errorMessage,
            name: errorName,
            type: typeof startError,
            constructor: startError?.constructor?.name,
            code: errorAny?.code,
            status: errorAny?.status,
            statusText: errorAny?.statusText,
            response: errorAny?.response,
            data: errorAny?.data,
            details: errorAny?.details,
            stack: errorStack,
          });
          
          // Try to extract more details from the error
          let detailedError = errorMessage;
          if (errorAny?.response) {
            try {
              const responseData = typeof errorAny.response === 'string' 
                ? errorAny.response 
                : JSON.stringify(errorAny.response);
              console.error('[useOvershootVision] Error response data:', responseData);
              detailedError += `\n\nResponse: ${responseData}`;
            } catch (e) {
              console.error('[useOvershootVision] Could not parse error response');
            }
          }
          
          if (errorAny?.data) {
            try {
              const errorData = typeof errorAny.data === 'string' 
                ? errorAny.data 
                : JSON.stringify(errorAny.data);
              console.error('[useOvershootVision] Error data:', errorData);
              detailedError += `\n\nError Data: ${errorData}`;
            } catch (e) {
              console.error('[useOvershootVision] Could not parse error data');
            }
          }
          
          // Clean up on start error
          visionRef.current = null;
          streamIdRef.current = null;
          initializingRef.current = false;
          setIsActive(false);
          
          if (streamId) {
            visionStreamManager.releaseStream(streamId);
          }
          
          // Validate API key format before showing error (use same validation function)
          validateApiKeyFormat(apiKey);
          
          // If API key is revoked/invalid, fall back to fake data mode instead of showing error
          if (errorMessage.includes('revoked') || errorMessage.includes('API key') || errorMessage.includes('invalid') || errorMessage.includes('unauthorized') || errorMessage.includes('401') || errorMessage.includes('403')) {
            console.warn('[useOvershootVision] ⚠️ API key authentication failed - falling back to fake data mode:', errorMessage);
            
            // Clean up failed vision attempt
            visionRef.current = null;
            streamIdRef.current = null;
            initializingRef.current = false;
            
            // Get webcam stream directly for fallback mode
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
              setError(null); // Don't show error - using fallback mode
              fallbackModeRef.current = true;
              
              // Generate one fake observation and keep it static (no periodic updates)
              const fakeObs = generateFakeObservation();
              onObservationRef.current(fakeObs);
              lastObservationTimeRef.current = Date.now();
              
              return; // Exit early - don't set error
            } catch (webcamError: unknown) {
              console.error('[useOvershootVision] ❌ Failed to get webcam stream:', webcamError);
              setError('Camera access denied or unavailable. Please allow camera access to use the live feed.');
              return;
            }
          }
          
          // For other errors (not API key related), show appropriate error messages
          if (errorMessage.includes('setRemoteDescription') || errorMessage.includes('WebRTC')) {
            setError('WebRTC connection failed. This may be due to camera permissions or network issues. Please refresh and try again.');
          } else if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('CORS')) {
            setError(`Network error connecting to Overshoot: ${errorMessage}\n\nCheck your internet connection and try again.`);
          } else {
            // Show the actual error from Overshoot
            let genericError = `Failed to start Overshoot vision: ${errorMessage}`;
            if (detailedError !== errorMessage) {
              genericError += `\n\nDetails: ${detailedError}`;
            }
            setError(genericError);
          }
          
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
        console.error('[useOvershootVision] Failed to initialize Overshoot SDK:', err);
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
    // Remove onObservation from deps - use ref instead
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompt, outputSchema, enabled, processing]);

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
