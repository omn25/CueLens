'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { findMatchingRoom } from '@/lib/roomComparison';
import { getAllRooms } from '@/lib/roomStorage';
import type { RoomData } from '@/lib/roomStorage';
import RoomRecognitionPopup from './RoomRecognitionPopup';
import { captureFrameFromVideo, uploadFrame } from '@/lib/frameCapture';
import { OpenAIRealtimeClient } from '@/lib/openaiRealtimeClient';

export default function WebcamFeed() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overshootSummary, setOvershootSummary] = useState<string>('');
  const [recognizedRoom, setRecognizedRoom] = useState<{ room: RoomData; similarity: number } | null>(null);
  const [transcripts, setTranscripts] = useState<Array<{ text: string; timestamp: number; isFinal: boolean }>>([]);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const streamRef = useRef<MediaStream | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const visionRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const openaiRealtimeRef = useRef<OpenAIRealtimeClient | null>(null);
  const lastCheckTimeRef = useRef<number>(0);
  const sessionIdRef = useRef<string>(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const isConnectingRef = useRef<boolean>(false);

  // Check for room matches
  const checkForRoomMatch = useCallback((description: string) => {
    const savedRooms = getAllRooms();
    if (savedRooms.length === 0) return;

    const match = findMatchingRoom(description, savedRooms, 60);
    
    if (match) {
      console.log('Room match found:', match.room.name, 'Similarity:', match.similarity);
      setRecognizedRoom(match);
    } else {
      // Only clear if we had a match before (to avoid flickering)
      setRecognizedRoom((prev) => {
        if (prev) {
          return null;
        }
        return prev;
      });
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    let cleanupCalled = false;
    
    const initializeWebcam = async () => {
      try {
        // Request webcam and microphone access
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, facingMode: 'user' },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        // Check if component is still mounted before proceeding
        if (!isMounted || cleanupCalled) {
          console.log('⚠️ Component unmounted before initialization completed, cleaning up stream...');
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          streamRef.current = stream;
          setIsStreaming(true);
        }

        // Extract audio track for OpenAI Real-Time API
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length > 0) {
          // Create a separate audio stream for OpenAI Real-Time API
          const audioStream = new MediaStream(audioTracks);
          audioStreamRef.current = audioStream;
          console.log('🎤 Audio capture enabled:', audioTracks[0].label);
          const settings = audioTracks[0].getSettings();
          console.log('   Audio track settings:', settings);
          console.log('   Sample rate (if available):', settings.sampleRate || 'not reported');
          
          // Initialize OpenAI Real-Time API client for streaming STT
          // Note: API key is handled on backend (OPENAI_API_KEY env var) - not needed here
          // Prevent double-connection in React strict mode or during remounts
          if (openaiRealtimeRef.current || isConnectingRef.current) {
            console.log('⚠️ OpenAI Real-Time client already exists or is connecting, skipping...');
            console.log('   This can happen in React StrictMode (development only)');
            return;
          }
          
          // Check again if component is still mounted
          if (!isMounted || cleanupCalled) {
            console.log('⚠️ Component unmounted before OpenAI client initialization, cleaning up...');
            audioStream.getTracks().forEach((track) => track.stop());
            return;
          }
          
          try {
            isConnectingRef.current = true;
            setConnectionStatus('connecting');
            // Get model from env, but validate it's a valid transcription model
            // Default to gpt-4o-mini-transcribe if not set or invalid
            const envModel = process.env.NEXT_PUBLIC_OPENAI_REALTIME_MODEL;
            const validTranscriptionModels = ['gpt-4o-mini-transcribe', 'gpt-4o-transcribe', 'whisper-1'];
            const transcriptionModel = (envModel && validTranscriptionModels.includes(envModel)) 
              ? envModel as any 
              : undefined; // undefined will use default (MINI)
            
            if (envModel && !validTranscriptionModels.includes(envModel)) {
              console.warn(`⚠️ Invalid NEXT_PUBLIC_OPENAI_REALTIME_MODEL: "${envModel}"`);
              console.warn(`   Must be one of: ${validTranscriptionModels.join(', ')}`);
              console.warn(`   Using default: gpt-4o-mini-transcribe`);
            }
            
            const openaiRealtime = new OpenAIRealtimeClient({
              model: transcriptionModel, // Will use default (gpt-4o-mini-transcribe) if undefined
              onTranscript: async (text: string, isFinal: boolean) => {
                // Check if component is still mounted before processing transcript
                if (!isMounted) {
                  console.log('⚠️ Component unmounted, ignoring transcript');
                  return;
                }
                // Store transcript in state for UI display (both partial and final)
                setTranscripts((prev) => {
                  // If it's partial, replace the last partial transcript if it exists
                  // If it's final, add a new entry
                  if (!isFinal) {
                    // Update last partial transcript or add new one
                    const lastIsPartial = prev.length > 0 && !prev[prev.length - 1].isFinal;
                    if (lastIsPartial) {
                      // Replace last partial with new partial
                      const updated = [...prev];
                      updated[updated.length - 1] = { text, timestamp: Date.now(), isFinal: false };
                      return updated;
                    } else {
                      // Add new partial transcript
                      return [...prev, { text, timestamp: Date.now(), isFinal: false }];
                    }
                  } else {
                    // Final transcript - add new entry
                    const newTranscripts = [...prev, { text, timestamp: Date.now(), isFinal: true }];
                    // Keep only last 20 transcripts to avoid memory issues
                    return newTranscripts.slice(-20);
                  }
                });

                // Only process FINAL transcript segments for backend logic (ignore partials)
                if (!isFinal) {
                  return;
                }

                console.log('✅ OpenAI Real-Time transcript (FINAL):', text);
                console.log('📤 Sending final transcript to backend for suggestion detection...');
                
                // Always send final transcripts to backend - backend will handle detection
                // Capture frame to include with transcript (backend decides if it's needed)
                let frameAssetId: string | undefined = undefined;
                
                if (videoRef.current) {
                  const frameBase64 = captureFrameFromVideo(videoRef.current);
                  if (frameBase64) {
                    try {
                      // Upload frame and get frameAssetId
                      frameAssetId = await uploadFrame(frameBase64);
                      console.log('📸 Frame uploaded, frameAssetId:', frameAssetId);
                    } catch (err) {
                      console.warn('⚠️ Failed to upload frame, continuing without it:', err);
                    }
                  } else {
                    console.warn('⚠️ Frame capture returned null - continuing without frame');
                  }
                } else {
                  console.warn('⚠️ Video ref not available for frame capture - continuing without frame');
                }
                
                // Send transcript to backend - backend suggestion engine handles all detection
                try {
                  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
                  const response = await fetch(`${API_BASE_URL}/transcript`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      transcript: text,
                      visionEventId: sessionIdRef.current,
                      frameAssetId: frameAssetId,
                    }),
                  });

                  if (response.ok) {
                    const suggestions = await response.json();
                    if (suggestions.length > 0) {
                      console.log(`✅ Backend created ${suggestions.length} suggestion(s) from transcript`);
                      console.log('   Suggestions:', suggestions.map((s: any) => ({ type: s.type, text: s.text.substring(0, 50) })));
                    } else {
                      console.log('ℹ️ No suggestions generated from this transcript');
                    }
                  } else {
                    const errorText = await response.text();
                    console.error('❌ Failed to process transcript:', response.status, errorText);
                  }
                } catch (err) {
                  console.error('❌ Error sending transcript to backend:', err);
                }
              },
              onError: (error) => {
                console.error('OpenAI Real-Time error:', error);
                setConnectionStatus('disconnected');
                setError(`OpenAI Real-Time error: ${error.message}`);
              },
            });

                // Check if still mounted before setting ref
                if (!isMounted || cleanupCalled) {
                  console.log('⚠️ Component unmounted during OpenAI connection, disconnecting...');
                  openaiRealtime.disconnect();
                  return;
                }
                
                openaiRealtimeRef.current = openaiRealtime;
                
                // Connect to OpenAI Real-Time API
                await openaiRealtime.connect(audioStream);
                
                // Final check before marking as connected
                if (!isMounted || cleanupCalled) {
                  console.log('⚠️ Component unmounted immediately after OpenAI connection, disconnecting...');
                  openaiRealtime.disconnect();
                  return;
                }
                
                console.log('✅ OpenAI Real-Time connected and streaming');
                setConnectionStatus('connected');
                isConnectingRef.current = false;
              } catch (openaiError) {
                console.error('❌ Failed to initialize OpenAI Real-Time API:', openaiError);
                if (isMounted && !cleanupCalled) {
                  setConnectionStatus('disconnected');
                }
                isConnectingRef.current = false;
                // Continue without OpenAI if it fails
              }
            } else {
              console.warn('⚠️ No audio tracks found in media stream');
            }

        // Initialize Overshoot SDK after video is ready
        // CRITICAL: Overshoot is OPTIONAL - failures should NOT kill webcam/mic
        // Wrap entire Overshoot init in try/catch and continue on failure
        try {
          const { RealtimeVision } = await import('@overshoot/sdk');
          
          // Get API key from environment variable (must be NEXT_PUBLIC_* for client-side)
          const apiKey = 
            process.env.NEXT_PUBLIC_OVERSHOOT_API_KEY ||
            (typeof window !== 'undefined' && (window as { __NEXT_DATA__?: { env?: { NEXT_PUBLIC_OVERSHOOT_API_KEY?: string } } }).__NEXT_DATA__?.env?.NEXT_PUBLIC_OVERSHOOT_API_KEY) ||
            null;
          
          if (!apiKey || apiKey.trim() === '') {
            console.warn('⚠️ Overshoot API key not found - continuing without Overshoot vision');
            console.warn('   Webcam and mic will still work normally');
            setOvershootSummary('Overshoot not configured - vision analysis disabled');
            // Continue without Overshoot - don't return
          } else {
            console.log('🎥 Initializing Overshoot SDK...');
            const vision = new RealtimeVision({
              apiUrl: 'https://cluster1.overshoot.ai/api/v0.2',
              apiKey: apiKey,
              prompt: 'Describe all FIXED, permanent features of this room in detail. Include: number of beds and their colors, sheet/bedding colors, floor type and color, wall colors, furniture types and colors, window count and type, door count, lighting fixtures. Focus only on permanent, non-temporary items. Be very specific about colors and counts.',
              source: {
                type: 'camera',
                cameraFacing: 'user',
              },
              onResult: (result) => {
                if (result && result.result) {
                  if (result.ok) {
                    setOvershootSummary(result.result);
                    // Check for room matches (throttle to once per 2 seconds)
                    const now = Date.now();
                    if (now - lastCheckTimeRef.current > 2000) {
                      lastCheckTimeRef.current = now;
                      checkForRoomMatch(result.result);
                    }
                  } else {
                    setOvershootSummary(`Overshoot error: ${result.error || 'Unknown error'}`);
                  }
                }
              },
              onError: (error) => {
                console.error('⚠️ Overshoot error (non-fatal):', error);
                setOvershootSummary(`Overshoot error: ${error.message || 'Unknown error'}`);
                // Don't throw - just log and continue
              },
              debug: true,
            });

            visionRef.current = vision;
            await vision.start();
            console.log('✅ Overshoot started successfully');
          }
        } catch (overshootError) {
          // CRITICAL: Overshoot failures should NOT abort webcam/mic initialization
          console.error('⚠️ Overshoot SDK initialization failed (non-fatal):', overshootError);
          const errorMessage = overshootError instanceof Error ? overshootError.message : 'Unknown error';
          console.error('   Error:', errorMessage);
          console.warn('   Continuing without Overshoot - webcam and mic will still work');
          setOvershootSummary(`Overshoot unavailable: ${errorMessage}`);
          // Continue execution - don't throw or return
        }
      } catch (err) {
        console.error('Error accessing webcam:', err);
        setError('Unable to access webcam. Please check permissions.');
        setIsStreaming(false);
      }
    };

    initializeWebcam();

    // Cleanup function - runs when component unmounts or dependencies change
    // CRITICAL: In React dev mode (StrictMode/Fast Refresh), cleanup may run multiple times
    // We should NOT disconnect the WS on every cleanup - only on actual page unmount
    return () => {
      console.log('🧹 WebcamFeed cleanup: Component unmounting or dependencies changed');
      console.log('   isMounted:', isMounted);
      console.log('   cleanupCalled:', cleanupCalled);
      console.log('   Has OpenAI client:', !!openaiRealtimeRef.current);
      
      // In dev mode, React StrictMode causes double mount/unmount
      // Fast Refresh also triggers cleanup but shouldn't kill active connections
      // Only fully cleanup if we're actually unmounting (not just remounting)
      
      cleanupCalled = true;
      isMounted = false;
      
      // CRITICAL: Don't disconnect WS on every cleanup in dev mode
      // React StrictMode and Fast Refresh will trigger cleanup, but the connection should persist
      // Only disconnect if explicitly requested or on actual page unload
      
      // For now, we'll be conservative: only cleanup tracks, not WS
      // The WS connection should stay alive across Fast Refresh
      // If you need to explicitly stop, add a "Stop" button that calls disconnect()
      
      // 1. OpenAI Real-Time client - DON'T disconnect on cleanup in dev mode
      // Keep connection alive across Fast Refresh
      // Only disconnect on explicit stop or page unload
      if (openaiRealtimeRef.current) {
        const ws = (openaiRealtimeRef.current as any).ws;
        const wsState = ws?.readyState;
        console.log('   OpenAI WS state:', wsState, '(OPEN=1, CLOSING=2, CLOSED=3)');
        
        // Only disconnect if WS is already closed/closing, or on actual page unload
        if (wsState === WebSocket.CLOSED || wsState === WebSocket.CLOSING) {
          console.log('   WS already closed/closing, cleaning up ref only');
          openaiRealtimeRef.current = null;
        } else {
          console.log('⚠️ Keeping WS connection alive (not disconnecting on cleanup)');
          console.log('   This prevents Fast Refresh from killing the connection');
          console.log('   Connection will persist across dev hot reloads');
          // Don't disconnect - keep ref alive
          // The WS will close naturally if page unloads or component actually unmounts
        }
        isConnectingRef.current = false;
      }
      
      // 2. Stop vision stream (non-blocking, won't affect WS)
      if (visionRef.current) {
        const vision = visionRef.current;
        console.log('   Stopping vision stream (non-blocking)...');
        vision.stop().catch((err) => {
          console.warn('   Error stopping vision (non-fatal):', err);
        });
        visionRef.current = null;
      }
      
      // 3-5. Stop media tracks only if actually unmounting (not Fast Refresh)
      // In dev mode, tracks might be reused, so be conservative
      // For now, we'll still stop tracks on cleanup to prevent leaks
      // But the WS connection stays alive
      
      if (audioStreamRef.current) {
        console.log('   Stopping audio tracks...');
        audioStreamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
        audioStreamRef.current = null;
      }
      
      if (streamRef.current) {
        console.log('   Stopping video/audio tracks...');
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
        streamRef.current = null;
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      
      console.log('✅ WebcamFeed cleanup completed (WS connection kept alive)');
    };
  }, [checkForRoomMatch]);

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
        // muted is kept to prevent audio feedback, but audio is still captured for OpenAI Real-Time API
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-background-dark/80 via-transparent to-black/30"></div>

      {/* Transcription Display */}
      {isStreaming && (
        <div className="absolute bottom-6 left-6 z-30 max-w-lg rounded-xl border-2 border-primary/50 shadow-2xl glass-panel p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-primary text-lg">mic</span>
            <h3 className="text-sm font-semibold text-white">Live Transcription</h3>
            <div className="ml-auto flex items-center gap-2">
              <div 
                className={`size-2 rounded-full ${
                  connectionStatus === 'connected' 
                    ? 'bg-green-500' 
                    : connectionStatus === 'connecting' 
                    ? 'bg-yellow-500 animate-pulse' 
                    : 'bg-red-500'
                }`}
              ></div>
              <span className="text-xs text-white/70 capitalize">{connectionStatus}</span>
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-2">
            {transcripts.length === 0 ? (
              <div className="flex items-center gap-2 text-xs text-white/50">
                <div className="size-2 rounded-full bg-primary animate-pulse"></div>
                <span>Waiting for speech...</span>
              </div>
            ) : (
              transcripts.map((transcript, idx) => (
                <div 
                  key={idx} 
                  className={`text-xs p-2 rounded ${
                    transcript.isFinal 
                      ? 'bg-primary/20 text-white/90' 
                      : 'bg-white/10 text-white/70 italic'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-white/50 text-[10px]">
                      {new Date(transcript.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="flex-1">{transcript.text}</span>
                    {transcript.isFinal && (
                      <span className="text-[10px] text-green-400">✓</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Overshoot Summary Box */}
      {isStreaming && (
        <div className="absolute bottom-6 right-6 z-30 max-w-sm rounded-xl border-2 border-primary/50 shadow-2xl glass-panel p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-primary text-lg">visibility</span>
            <h3 className="text-sm font-semibold text-white">Overshoot View</h3>
          </div>
          {overshootSummary ? (
            <p className="text-xs text-white/90 leading-relaxed">{overshootSummary}</p>
          ) : (
            <div className="flex items-center gap-2 text-xs text-white/50">
              <div className="size-2 rounded-full bg-primary animate-pulse"></div>
              <span>Analyzing scene...</span>
            </div>
          )}
        </div>
      )}

      {/* Room Recognition Popup */}
      {recognizedRoom && (
        <RoomRecognitionPopup
          room={recognizedRoom.room}
          confidence={recognizedRoom.similarity}
          onDismiss={() => setRecognizedRoom(null)}
        />
      )}

      {/* Error Message */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="bg-red-500/90 text-white px-6 py-4 rounded-xl shadow-lg">
            <p className="font-semibold">{error}</p>
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
