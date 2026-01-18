'use client';

import { useEffect } from 'react';
import type { RoomData } from '@/lib/roomStorage';
import { saveRoom } from '@/lib/roomStorage';
import { extractFeaturesFromDescription } from '@/lib/roomComparison';

interface RoomScanningProps {
  roomName: string;
  onComplete: (roomData: RoomData) => void;
  onCancel: () => void;
}

export default function RoomScanning({ roomName, onComplete, onCancel }: RoomScanningProps) {
  useEffect(() => {
    // Simulate scanning for 3 seconds, then create mock room data
    const timer = setTimeout(() => {
      // Mock description - in real implementation, this would come from vision API
      const mockDescription = `A ${roomName} with furniture, windows, and lighting fixtures.`;
      const features = extractFeaturesFromDescription(mockDescription);
      
      const roomData = saveRoom({
        name: roomName,
        features,
        rawDescription: mockDescription,
      });
      
      onComplete(roomData);
    }, 3000);

    return () => clearTimeout(timer);
  }, [roomName, onComplete]);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-white z-30">
      <div className="text-center">
        <div className="size-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h2 className="text-2xl font-bold mb-2">Scanning {roomName}</h2>
        <p className="text-slate-300">Please hold steady...</p>
        <button
          onClick={onCancel}
          className="mt-6 px-6 py-2 bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
