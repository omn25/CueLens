'use client';

import { useEffect, useState } from 'react';

interface DetectedRoomModalProps {
  roomName: string;
  confidence: number;
  onDismiss: () => void;
}

export default function DetectedRoomModal({
  roomName,
  confidence,
  onDismiss,
}: DetectedRoomModalProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Auto-dismiss after 15 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onDismiss, 300); // Wait for animation
    }, 15000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-3xl px-6 animate-fade-in-up">
        <div className="glass-panel rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col gap-6 border-2 border-primary/50">
          {/* Header & Confidence */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/10 pb-6">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-primary text-[24px]">home_pin</span>
                <span className="text-primary text-xs font-bold uppercase tracking-wider">
                  Location Identified
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                You are in {roomName}
              </h2>
            </div>
            <div className="flex flex-col gap-2 min-w-[200px]">
              <div className="flex justify-between items-end">
                <span className="text-gray-400 text-xs font-medium">Confidence</span>
                <span className="text-primary font-bold text-sm">≈{Math.round(confidence * 100)}%</span>
              </div>
              <div className="h-2 w-full bg-gray-700/50 rounded-full overflow-hidden backdrop-blur-sm">
                <div
                  className="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(73,120,156,0.5)] transition-all duration-300"
                  style={{ width: `${confidence * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Reassurance Message */}
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
                You&apos;re in {roomName}. Everything is okay.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={() => {
                setIsVisible(false);
                setTimeout(onDismiss, 300);
              }}
              className="h-12 px-6 rounded-xl bg-transparent hover:bg-white/5 text-gray-400 hover:text-white text-sm font-semibold tracking-wide transition-all flex items-center justify-center gap-2 ml-auto"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
              <span>Dismiss</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
