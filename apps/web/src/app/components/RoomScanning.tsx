'use client';

import { useEffect, useRef, useState } from 'react';
import { extractFeaturesFromDescription } from '@/lib/roomComparison';
import { saveRoom, type RoomData } from '@/lib/roomStorage';

interface RoomScanningProps {
  roomName: string;
  onComplete: (roomData: RoomData) => void;
  onCancel: () => void;
}

export default function RoomScanning({ roomName, onComplete, onCancel: _onCancel }: RoomScanningProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(10);
  const [collectedDescriptions, setCollectedDescriptions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const visionRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (visionRef.current) {
        visionRef.current.stop().catch(() => {});
      }
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startScanning = async () => {
    try {
      // Request webcam access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        streamRef.current = stream;
      }

      // Initialize Overshoot SDK
      const { RealtimeVision } = await import('@overshoot/sdk');
      const apiKey = process.env.NEXT_PUBLIC_OVERSHOOT_API_KEY;
      
      if (!apiKey) {
        setError('Overshoot API key not configured');
        return;
      }

      const descriptions: string[] = [];

      const vision = new RealtimeVision({
        apiUrl: 'https://cluster1.overshoot.ai/api/v0.2',
        apiKey: apiKey,
        prompt: 'Describe all FIXED, permanent features of this room in detail. Include: number of beds and their colors, sheet/bedding colors, floor type and color, wall colors, furniture types and colors, window count and type, door count, lighting fixtures. Focus only on permanent, non-temporary items. Be very specific about colors and counts.',
        source: {
          type: 'camera',
          cameraFacing: 'user',
        },
        onResult: (result) => {
          if (result.result && result.ok && isScanning) {
            descriptions.push(result.result);
            setCollectedDescriptions([...descriptions]);
            console.log('Collected description:', result.result);
          }
        },
        onError: (error) => {
          console.error('Overshoot error:', error);
        },
      });

      visionRef.current = vision;
      await vision.start();

      // Get the media stream from Overshoot and display it
      // Only switch if it's different from what we already have (prevents flickering)
      const mediaStream = vision.getMediaStream();
      if (mediaStream && videoRef.current) {
        const currentStream = videoRef.current.srcObject as MediaStream | null;
        // Only update if stream actually changed (prevents unnecessary updates)
        if (!currentStream || currentStream.id !== mediaStream.id) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play();
          
          // Stop the direct webcam stream now that we're using Overshoot's stream
          if (streamRef.current && streamRef.current.id !== mediaStream.id) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = mediaStream;
          }
        }
      }

      // Start scanning timer
      setIsScanning(true);
      setTimeRemaining(10);
      setScanProgress(0);

      // Countdown timer
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            finishScanning(descriptions);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Progress bar update
      scanIntervalRef.current = setInterval(() => {
        setScanProgress((prev) => {
          if (prev >= 100) {
            if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
            return 100;
          }
          return prev + 10;
        });
      }, 1000);
    } catch (err) {
      console.error('Error starting scan:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to start scanning: ${errorMessage}`);
    }
  };

  const finishScanning = async (descriptions: string[]) => {
    setIsScanning(false);
    
    if (descriptions.length === 0) {
      setError('No descriptions collected. Please try again.');
      return;
    }

    // Combine all descriptions
    const combinedDescription = descriptions.join('. ');
    
    // Extract features from the combined description
    const features = extractFeaturesFromDescription(combinedDescription);
    
    // Save the room
    const roomData = saveRoom({
      name: roomName,
      features,
      rawDescription: combinedDescription,
    });

    console.log('Room saved:', roomData);
    onComplete(roomData);
  };

  return (
    <div className="relative w-full h-full">
      {/* Webcam Feed */}
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

      {/* Scanning Overlay */}
      {isScanning && (
        <div className="absolute inset-0 z-10 pointer-events-none">
          {/* Scanning Grid */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                'linear-gradient(rgba(73, 120, 156, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(73, 120, 156, 0.5) 1px, transparent 1px)',
              backgroundSize: '80px 80px',
            }}
          ></div>

          {/* Guidance Message */}
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-3 px-6 py-3 bg-black/40 backdrop-blur-md border border-white/10 rounded-full shadow-2xl">
            <div className="size-8 rounded-full bg-white/10 flex items-center justify-center animate-pulse">
              <span className="material-symbols-outlined text-white">pan_tool</span>
            </div>
            <span className="text-white text-lg font-semibold tracking-wide">
              Slowly pan left to right ({timeRemaining}s remaining)
            </span>
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
        </div>
      )}

      {/* Start Button / Status */}
      {!isScanning && !error && (
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

      {/* Error Message */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="bg-red-500/90 text-white px-6 py-4 rounded-xl shadow-lg max-w-md">
            <p className="font-semibold mb-2">Error</p>
            <p>{error}</p>
            <button
              onClick={() => {
                setError(null);
                setCollectedDescriptions([]);
              }}
              className="mt-4 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Collected Descriptions Count */}
      {isScanning && collectedDescriptions.length > 0 && (
        <div className="absolute top-4 right-4 z-20 glass-panel px-4 py-2 rounded-lg">
          <p className="text-white text-sm font-semibold">
            Captured: {collectedDescriptions.length} frames
          </p>
        </div>
      )}
    </div>
  );
}
