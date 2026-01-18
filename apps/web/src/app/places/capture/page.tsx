'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import RoomScanning from '@/app/components/RoomScanning';
import type { RoomData } from '@/lib/roomStorage';

export default function CapturePage() {
  const router = useRouter();
  const [roomName, setRoomName] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [savedRoom, setSavedRoom] = useState<RoomData | null>(null);

  const handleStartScan = () => {
    if (!roomName.trim()) {
      alert('Please enter a room name');
      return;
    }
    setIsScanning(true);
  };

  const handleScanComplete = (roomData: RoomData) => {
    setSavedRoom(roomData);
    setScanComplete(true);
    setIsScanning(false);
  };

  const handleCancel = () => {
    setIsScanning(false);
    setRoomName('');
  };

  const handleContinue = () => {
    router.push('/places');
  };

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display overflow-hidden h-screen w-full flex flex-col">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between whitespace-nowrap border-b border-solid border-slate-200 dark:border-slate-700 px-6 lg:px-10 py-4 bg-white dark:bg-[#161a1d] z-20">
        <div className="flex items-center gap-4 text-slate-900 dark:text-white">
          <div className="size-6 text-primary">
            <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M42.4379 44C42.4379 44 36.0744 33.9038 41.1692 24C46.8624 12.9336 42.2078 4 42.2078 4L7.01134 4C7.01134 4 11.6577 12.932 5.96912 23.9969C0.876273 33.9029 7.27094 44 7.27094 44L42.4379 44Z"
                fill="currentColor"
              ></path>
            </svg>
          </div>
          <Link href="/places" className="text-lg font-bold leading-tight tracking-tight">
            CueLens
          </Link>
        </div>
        <div className="flex items-center gap-6">
          <button className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-[20px]">help</span>
            <span className="hidden sm:inline">Help & Guide</span>
          </button>
          <div
            className="bg-center bg-no-repeat bg-cover rounded-full size-9 ring-2 ring-primary/20"
            style={{
              backgroundImage:
                "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAKP84_Ykm4l20AQAarz_9WjsnW8Li6peW2HvF76ZbrtR2AiRak68DwQHCkgEvZpdV42vHbC9QhyV8MHlJKZNpHj3z7b54i5rYq0s487sefh9t_Qg8043DYmnNctXC6GuIqcXGUsX_p2OQavFEMt8EyTiKfmzWAM10bgV9g_5ygNf9iw25vtA5D7d8j3J-yYaZQN2b-Qcu0Rzuj7GIMdPC6KK8awzQzX-HX_TdgVuoqFMZIM_HnAlddnRaXEdWZr-2sSOSpgFTZ6xyd')",
            }}
          ></div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex flex-1 overflow-hidden relative">
        {/* Left: Camera Feed & Overlay */}
        <div className="flex-1 relative bg-black flex flex-col items-center justify-center overflow-hidden">
          {isScanning ? (
            <RoomScanning
              roomName={roomName}
              onComplete={handleScanComplete}
              onCancel={handleCancel}
            />
          ) : scanComplete && savedRoom ? (
            <div className="absolute inset-0 flex items-center justify-center z-20">
              <div className="bg-white dark:bg-sidebar-surface rounded-2xl p-8 max-w-md text-center shadow-2xl">
                <div className="size-16 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-white text-4xl">check</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  Room Saved Successfully!
                </h2>
                <p className="text-slate-600 dark:text-slate-300 mb-6">
                  {savedRoom.name} has been added to your places. CueLens will now recognize this room when you&apos;re in it.
                </p>
                <button
                  onClick={handleContinue}
                  className="px-6 py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg transition-all"
                >
                  Continue to Places
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Placeholder Background */}
              <div
                className="absolute inset-0 bg-cover bg-center opacity-80"
                style={{
                  backgroundImage:
                    "url('https://lh3.googleusercontent.com/aida-public/AB6AXuA-9RNj2wL1tF3CnyZxylDBDZB-wsHjlWs4MoJDNSi2yac0-x_D8_pV9ch2fZyEs3dtdlQu6XoIZhU_0kGsSg4L6JVhClCuniGCktzWe8lKdGXJSyy-xaC85nlE128FOUWz2d1161pWM2rMIWERJDT7RkBz_mscnIteqVoGSuid3Yugetk7tTvUq72-KVZP_noIZHuxWPV0nnSdYg912ghfBvL4AKBULTPGb0JJoZ6jtRR7UOqyVawQFKgr-0Fl0nSXz9YnOjuC7p9P')",
                  filter: 'blur(2px) brightness(0.7)',
                }}
              ></div>

              {/* AR Scanning Overlay Layer */}
              <div className="absolute inset-0 z-10 pointer-events-none">
                {/* Scanning Grid Lines (Subtle) */}
                <div
                  className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage:
                      'linear-gradient(rgba(73, 120, 156, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(73, 120, 156, 0.5) 1px, transparent 1px)',
                    backgroundSize: '80px 80px',
                  }}
                ></div>

                {/* Central Reticle */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                  {/* Outer pulsing ring */}
                  <div className="absolute size-64 rounded-full border border-primary/30 animate-scan"></div>
                  {/* Inner solid ring */}
                  <div className="relative size-56 rounded-full border-2 border-primary/80 shadow-[0_0_15px_rgba(73,120,156,0.5)] flex items-center justify-center">
                    {/* Corner brackets for tech feel */}
                    <div className="absolute top-0 left-0 -mt-1 -ml-1 size-6 border-t-4 border-l-4 border-white rounded-tl-lg"></div>
                    <div className="absolute top-0 right-0 -mt-1 -mr-1 size-6 border-t-4 border-r-4 border-white rounded-tr-lg"></div>
                    <div className="absolute bottom-0 left-0 -mb-1 -ml-1 size-6 border-b-4 border-l-4 border-white rounded-bl-lg"></div>
                    <div className="absolute bottom-0 right-0 -mb-1 -mr-1 size-6 border-b-4 border-r-4 border-white rounded-br-lg"></div>
                    {/* Center Crosshair */}
                    <div className="size-2 bg-white rounded-full"></div>
                  </div>
                </div>

                {/* Guidance HUD Pill */}
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-3 px-6 py-3 bg-black/40 backdrop-blur-md border border-white/10 rounded-full shadow-2xl">
                  <div className="size-8 rounded-full bg-white/10 flex items-center justify-center animate-pulse">
                    <span className="material-symbols-outlined text-white">pan_tool</span>
                  </div>
                  <span className="text-white text-lg font-semibold tracking-wide">
                    Ready to scan - Enter room name to begin
                  </span>
                </div>
              </div>

              {/* Camera Controls (Bottom Left) */}
              <div className="absolute bottom-6 left-6 z-20 flex gap-3">
                <button
                  aria-label="Switch Camera"
                  className="bg-black/50 hover:bg-black/70 backdrop-blur-md text-white p-3 rounded-full transition-all border border-white/10"
                >
                  <span className="material-symbols-outlined">cameraswitch</span>
                </button>
                <button
                  aria-label="Toggle Flash"
                  className="bg-black/50 hover:bg-black/70 backdrop-blur-md text-white p-3 rounded-full transition-all border border-white/10"
                >
                  <span className="material-symbols-outlined">flash_on</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right: Progress Sidebar */}
        <aside className="w-full lg:w-[400px] bg-white dark:bg-sidebar-surface border-l border-slate-200 dark:border-slate-700 flex flex-col z-20 shadow-xl shrink-0">
          <div className="p-8 flex flex-col h-full">
            {/* Progress Stepper */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">Step 2 of 4</span>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">50%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-primary w-1/2 rounded-full"></div>
              </div>
            </div>

            {/* Text Content */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Room Scan</h1>
              <p className="text-slate-600 dark:text-slate-300 text-base leading-relaxed">
                Help CueLens learn this space. Pan slowly to capture key landmarks so we can recognize this room later.
              </p>
            </div>

            {/* Room Name Input */}
            {!isScanning && !scanComplete && (
              <div className="mb-8">
                <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                  Room Name
                </label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="e.g., Bedroom, Kitchen, Living Room"
                  className="w-full bg-white dark:bg-card-dark border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 rounded-lg py-3 px-4 focus:ring-2 focus:ring-primary focus:border-transparent outline-none shadow-sm transition-all"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && roomName.trim()) {
                      handleStartScan();
                    }
                  }}
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Enter a name for this room, then click Start Scan
                </p>
              </div>
            )}

            {/* Checklist */}
            {!scanComplete && (
              <div className="flex flex-col gap-3 mb-auto">
                {/* Item 1: Room Name */}
                <div
                  className={`flex items-center justify-between p-4 rounded-xl transition-all ${
                    roomName.trim()
                      ? 'bg-primary/10 border border-primary/20'
                      : 'bg-transparent border border-slate-200 dark:border-slate-700 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`size-8 rounded-full flex items-center justify-center shrink-0 ${
                        roomName.trim() ? 'bg-primary text-white' : 'border-2 border-slate-300 dark:border-slate-500'
                      }`}
                    >
                      {roomName.trim() ? (
                        <span className="material-symbols-outlined text-[20px]">check</span>
                      ) : null}
                    </div>
                    <span className="text-slate-900 dark:text-white font-semibold">Room Name</span>
                  </div>
                  {roomName.trim() ? (
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded uppercase tracking-wider">
                      Ready
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Pending
                    </span>
                  )}
                </div>

                {/* Item 2: Scanning */}
                <div
                  className={`relative overflow-hidden flex items-center justify-between p-4 rounded-xl transition-all ${
                    isScanning
                      ? 'bg-slate-100 dark:bg-slate-700/50 border border-primary/50 shadow-lg ring-1 ring-primary/30'
                      : 'bg-transparent border border-slate-200 dark:border-slate-700 opacity-60'
                  }`}
                >
                  {isScanning && (
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary"></div>
                  )}
                  <div className="flex items-center gap-4 z-10">
                    {isScanning ? (
                      <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin flex items-center justify-center shrink-0"></div>
                    ) : (
                      <div className="size-8 rounded-full border-2 border-slate-300 dark:border-slate-500 flex items-center justify-center shrink-0"></div>
                    )}
                    <div className="flex flex-col">
                      <span className="text-slate-900 dark:text-white font-semibold">Room Scan</span>
                      {isScanning ? (
                        <span className="text-xs text-slate-500 dark:text-slate-400">Capturing features...</span>
                      ) : (
                        <span className="text-xs text-slate-500 dark:text-slate-400">10-second scan</span>
                      )}
                    </div>
                  </div>
                  {isScanning ? (
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-300 bg-slate-200 dark:bg-slate-600 px-2 py-1 rounded uppercase tracking-wider z-10 animate-pulse">
                      Scanning
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Pending
                    </span>
                  )}
                </div>

                {/* Item 3: Processing */}
                <div className="flex items-center justify-between p-4 bg-transparent border border-slate-200 dark:border-slate-700 rounded-xl opacity-60">
                  <div className="flex items-center gap-4">
                    <div className="size-8 rounded-full border-2 border-slate-300 dark:border-slate-500 flex items-center justify-center shrink-0"></div>
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Processing</span>
                  </div>
                  <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Pending
                  </span>
                </div>
              </div>
            )}

            {/* Action Footer */}
            <div className="pt-6 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between mt-4">
              <Link
                href="/places"
                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white font-medium text-sm transition-colors"
              >
                Cancel Setup
              </Link>
              {!isScanning && !scanComplete && (
                <button
                  onClick={handleStartScan}
                  disabled={!roomName.trim()}
                  className="px-8 py-3 rounded-lg bg-primary hover:bg-primary/90 disabled:bg-slate-200 disabled:dark:bg-slate-700 disabled:text-slate-400 disabled:dark:text-slate-500 text-white font-semibold transition-all flex items-center gap-2 disabled:cursor-not-allowed"
                >
                  Start Scan
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              )}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
