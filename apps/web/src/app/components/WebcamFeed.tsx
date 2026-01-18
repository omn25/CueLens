'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { findMatchingRoom } from '@/lib/roomComparison';
import { getAllRooms } from '@/lib/roomStorage';
import type { RoomData } from '@/lib/roomStorage';
import RoomRecognitionPopup from './RoomRecognitionPopup';

export default function WebcamFeed() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overshootSummary, setOvershootSummary] = useState<string>('');
  const [recognizedRoom, setRecognizedRoom] = useState<{ room: RoomData; similarity: number } | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const visionRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const lastCheckTimeRef = useRef<number>(0);

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
    const initializeWebcam = async () => {
      try {
        // Request webcam access
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, facingMode: 'user' },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          streamRef.current = stream;
          setIsStreaming(true);
        }

        // Initialize Overshoot SDK after video is ready
        try {
          const { RealtimeVision } = await import('@overshoot/sdk');
          
          // Get API key from environment variable (must be NEXT_PUBLIC_* for client-side)
          // Try multiple ways to access the env variable
          const apiKey = 
            process.env.NEXT_PUBLIC_OVERSHOOT_API_KEY ||
            (typeof window !== 'undefined' && (window as { __NEXT_DATA__?: { env?: { NEXT_PUBLIC_OVERSHOOT_API_KEY?: string } } }).__NEXT_DATA__?.env?.NEXT_PUBLIC_OVERSHOOT_API_KEY) ||
            null;
          
          console.log('API Key check:', apiKey ? `Found (${apiKey.substring(0, 10)}...)` : 'Not found');
          console.log('All env vars:', Object.keys(process.env).filter(k => k.includes('OVERSHOOT')));
          
          if (!apiKey || apiKey.trim() === '') {
            console.warn('Overshoot API key not found. Please add NEXT_PUBLIC_OVERSHOOT_API_KEY to .env.local and restart the dev server.');
            console.warn('Make sure the file contains: NEXT_PUBLIC_OVERSHOOT_API_KEY=your_key_here (no spaces around =)');
            setOvershootSummary('API key not configured - check console for details');
            return;
          }

          console.log('Initializing Overshoot SDK...');
          const vision = new RealtimeVision({
            apiUrl: 'https://cluster1.overshoot.ai/api/v0.2',
            apiKey: apiKey,
            prompt: 'Describe all FIXED, permanent features of this room in detail. Include: number of beds and their colors, sheet/bedding colors, floor type and color, wall colors, furniture types and colors, window count and type, door count, lighting fixtures. Focus only on permanent, non-temporary items. Be very specific about colors and counts.',
            source: {
              type: 'camera',
              cameraFacing: 'user',
            },
            onResult: (result) => {
              console.log('Overshoot result received:', result);
              console.log('Result ok:', result.ok);
              console.log('Result text:', result.result);
              // Update the summary with the result
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
                  setOvershootSummary(`Error: ${result.error || 'Unknown error'}`);
                }
              } else {
                console.warn('Result missing result field:', result);
              }
            },
            onError: (error) => {
              console.error('Overshoot error callback:', error);
              setOvershootSummary(`Error: ${error.message || 'Unknown error'}`);
            },
            debug: true, // Enable debug logging
          });

          visionRef.current = vision;
          console.log('Starting Overshoot vision stream...');
          await vision.start();
          console.log('Overshoot started successfully. Stream ID:', vision.getStreamId());
          console.log('Overshoot is active:', vision.isActive());
        } catch (overshootError) {
          console.error('Failed to initialize Overshoot SDK:', overshootError);
          const errorMessage = overshootError instanceof Error ? overshootError.message : 'Unknown error';
          console.error('Error details:', errorMessage, overshootError instanceof Error ? overshootError.stack : '');
          setOvershootSummary(`Failed to initialize: ${errorMessage}`);
          // Continue without Overshoot if SDK fails
        }
      } catch (err) {
        console.error('Error accessing webcam:', err);
        setError('Unable to access webcam. Please check permissions.');
        setIsStreaming(false);
      }
    };

    initializeWebcam();

    // Cleanup function
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (visionRef.current) {
        const vision = visionRef.current;
        vision.stop().catch((err) => {
          console.error('Error stopping vision:', err);
        });
        visionRef.current = null;
      }
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
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-background-dark/80 via-transparent to-black/30"></div>

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
