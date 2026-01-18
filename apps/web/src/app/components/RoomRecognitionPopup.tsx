'use client';

import { useEffect, useState } from 'react';
import type { RoomData } from '@/lib/roomStorage';

interface RoomRecognitionPopupProps {
  room: RoomData;
  confidence: number;
  onDismiss: () => void;
}

export default function RoomRecognitionPopup({ room, confidence, onDismiss }: RoomRecognitionPopupProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Auto-dismiss after 10 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onDismiss, 300); // Wait for animation
    }, 10000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!isVisible) return null;

  return (
    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-full max-w-3xl px-6 z-30 animate-fade-in-up">
      <div className="glass-panel rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col gap-6">
        {/* Identification Header & Confidence */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/10 pb-6">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-primary text-[24px]">home_pin</span>
              <span className="text-primary text-xs font-bold uppercase tracking-wider">
                Location Identified
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">{room.name}</h2>
          </div>
          <div className="flex flex-col gap-2 min-w-[200px]">
            <div className="flex justify-between items-end">
              <span className="text-gray-400 text-xs font-medium">Confidence</span>
              <span className="text-primary font-bold text-sm">{Math.round(confidence)}%</span>
            </div>
            <div className="h-2 w-full bg-gray-700/50 rounded-full overflow-hidden backdrop-blur-sm">
              <div
                className="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(73,120,156,0.5)] transition-all duration-300"
                style={{ width: `${confidence}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Reassurance Note */}
        <div className="flex items-start gap-4">
          <div className="mt-1 shrink-0 text-emerald-400">
            <span
              className="material-symbols-outlined text-[28px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              check_circle
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-xl text-white font-medium leading-relaxed">
              You&apos;re in {room.name}. Everything is okay.
            </p>
            <p className="text-gray-400 text-sm">
              Room features matched: {Object.keys(room.features).length} categories identified
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 pt-2">
          <button className="flex-1 sm:flex-none h-12 px-6 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-bold tracking-wide shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2 group/btn">
            <span>Open Details</span>
            <span className="material-symbols-outlined text-[18px] group-hover/btn:translate-x-0.5 transition-transform">
              arrow_forward
            </span>
          </button>
          <button className="h-12 px-6 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-white text-sm font-semibold tracking-wide backdrop-blur-sm transition-all flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[18px]">push_pin</span>
            <span>Pin Location</span>
          </button>
          <button
            onClick={onDismiss}
            className="h-12 px-6 rounded-xl bg-transparent hover:bg-white/5 text-gray-400 hover:text-white text-sm font-semibold tracking-wide transition-all flex items-center justify-center gap-2 ml-auto"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
            <span>Dismiss</span>
          </button>
        </div>
      </div>
    </div>
  );
}
