'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import RoomScanCapture from '@/app/components/RoomScanCapture';
import RoomScanReview from '@/app/components/RoomScanReview';
import VideoUploadProcessor from '@/app/components/VideoUploadProcessor';
import { useRoomProfiles } from '@/hooks/useRoomProfiles';
import type { RoomObservation } from '@/types/room';

type ScanState = 'idle' | 'upload' | 'scanning' | 'review' | 'complete';

export default function CapturePage() {
  const router = useRouter();
  const { addProfile } = useRoomProfiles();
  const [scanState, setScanState] = useState<ScanState>('idle'); // Start with choice
  const [_mode, setMode] = useState<'upload' | 'live'>('upload'); // Default to upload
  const [observations, setObservations] = useState<RoomObservation[]>([]);
  const [aggregated, setAggregated] = useState<RoomObservation | null>(null);
  const [savedRoomName, setSavedRoomName] = useState<string>('');

  const handleScanComplete = (obs: RoomObservation[], agg: RoomObservation) => {
    setObservations(obs);
    setAggregated(agg);
    setScanState('review');
  };

  const handleScanCancel = () => {
    setScanState('idle');
    setObservations([]);
    setAggregated(null);
    setMode('upload');
  };

  const handleVideoUploadComplete = (obs: RoomObservation[], agg: RoomObservation) => {
    console.log('[CapturePage] ========== handleVideoUploadComplete called ==========');
    console.log('[CapturePage] Observations count:', obs.length);
    console.log('[CapturePage] Aggregated room type:', agg?.room_type);
    console.log('[CapturePage] Aggregated object:', agg);
    
    // Validate that we have the required data
    if (!obs || obs.length === 0) {
      console.error('[CapturePage] ❌ No observations provided!');
      alert('Error: No observations data received. Please try again.');
      return;
    }
    
    if (!agg) {
      console.error('[CapturePage] ❌ No aggregated data provided!');
      alert('Error: No aggregated data received. Please try again.');
      return;
    }
    
    try {
      // React batches these state updates, so they'll all apply together
      // Set aggregated FIRST to ensure it's available when scanState changes
      console.log('[CapturePage] Setting all state updates...');
      setAggregated(agg);
      setObservations(obs);
      
      // Use functional update to ensure we're setting state based on current values
      // But actually, we can just set it directly since we're passing the values
      setScanState('review');
      
      console.log('[CapturePage] ✅ All state updated - React will re-render with review page');
      console.log('[CapturePage] Current scanState will be: "review"');
      console.log('[CapturePage] Current aggregated will be:', agg);
    } catch (error) {
      console.error('[CapturePage] ❌ Error in handleVideoUploadComplete:', error);
      alert(`Failed to navigate to review page: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleVideoUploadCancel = () => {
    setScanState('idle');
    setMode('upload');
  };

  const handleChooseUpload = () => {
    setMode('upload');
    setScanState('upload');
  };

  const handleChooseLive = () => {
    setMode('live');
    setScanState('scanning');
  };

  const handleSave = (name: string, note: string) => {
    try {
      if (observations.length === 0) {
        alert('No observation data to save. Please try scanning again.');
        return;
      }
      
      console.log('[CapturePage] Saving profile:', { name, note, observationCount: observations.length });
      const savedProfile = addProfile(name, note, observations);
      console.log('[CapturePage] Profile saved:', savedProfile);
      
      setSavedRoomName(name);
      setScanState('complete');
      // Don't clear observations yet - keep them for the success message
      // setObservations([]);
      // setAggregated(null);
    } catch (error) {
      console.error('[CapturePage] Failed to save profile:', error);
      alert(`Failed to save room profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleReviewCancel = () => {
    setScanState('idle');
    setObservations([]);
    setAggregated(null);
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
          {scanState === 'idle' ? (
            /* Mode Selection */
            <div className="max-w-2xl w-full mx-4 space-y-6 p-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">Choose Capture Method</h2>
                <p className="text-white/70">Select how you want to capture this room</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Video Upload Option */}
                <button
                  onClick={handleChooseUpload}
                  className="group bg-white dark:bg-sidebar-surface rounded-xl p-8 border-2 border-slate-200 dark:border-slate-700 hover:border-primary transition-all text-left flex flex-col items-center gap-4"
                >
                  <div className="size-20 rounded-full bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                    <span className="material-symbols-outlined text-primary text-4xl">videocam</span>
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                      Upload Video
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                      Upload a &lt;10 second video. We&apos;ll extract 3 keyframes and analyze them sequentially.
                    </p>
                  </div>
                  <span className="text-xs text-primary font-semibold mt-auto">Recommended</span>
                </button>

                {/* Live Scan Option */}
                <button
                  onClick={handleChooseLive}
                  className="group bg-white dark:bg-sidebar-surface rounded-xl p-8 border-2 border-slate-200 dark:border-slate-700 hover:border-primary transition-all text-left flex flex-col items-center gap-4"
                >
                  <div className="size-20 rounded-full bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                    <span className="material-symbols-outlined text-primary text-4xl">camera</span>
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                      Live Scan
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                      Use your webcam for a 10-second live scan with continuous analysis.
                    </p>
                  </div>
                </button>
              </div>
            </div>
          ) : scanState === 'upload' ? (
            <VideoUploadProcessor
              onComplete={handleVideoUploadComplete}
              onCancel={handleVideoUploadCancel}
            />
          ) : scanState === 'scanning' ? (
            <RoomScanCapture onComplete={handleScanComplete} onCancel={handleScanCancel} />
          ) : scanState === 'review' && aggregated ? (
            <RoomScanReview
              observations={observations}
              aggregated={aggregated}
              onSave={handleSave}
              onCancel={handleReviewCancel}
            />
          ) : scanState === 'complete' ? (
            <div className="absolute inset-0 flex items-center justify-center z-20">
              <div className="bg-white dark:bg-sidebar-surface rounded-2xl p-8 max-w-md text-center shadow-2xl">
                <div className="size-16 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-white text-4xl">check</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  Room Saved Successfully!
                </h2>
                <p className="text-slate-600 dark:text-slate-300 mb-6">
                  {savedRoomName} has been added to your places. CueLens will now recognize this room when you&apos;re in it.
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
            <RoomScanCapture 
              onComplete={handleScanComplete} 
              onCancel={handleScanCancel}
              showStartButton={false}
              autoStart={true}
            />
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

            {/* Instructions */}
            {scanState === 'idle' && (
              <div className="mb-8">
                <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg mb-4">
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    <strong className="text-primary">Instructions:</strong> Click &quot;Start Scan&quot; below to begin a 10-second room scan. Slowly pan your laptop left and right to capture all room features.
                  </p>
                </div>
              </div>
            )}

            {/* Checklist */}
            {scanState !== 'complete' && (
              <div className="flex flex-col gap-3 mb-auto">
                {/* Item 1: Scanning */}
                <div
                  className={`relative overflow-hidden flex items-center justify-between p-4 rounded-xl transition-all ${
                    scanState === 'scanning'
                      ? 'bg-slate-100 dark:bg-slate-700/50 border border-primary/50 shadow-lg ring-1 ring-primary/30'
                      : scanState === 'review'
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-500/50'
                      : 'bg-transparent border border-slate-200 dark:border-slate-700 opacity-60'
                  }`}
                >
                  {scanState === 'scanning' && (
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary"></div>
                  )}
                  {scanState === 'review' && (
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500"></div>
                  )}
                  <div className="flex items-center gap-4 z-10">
                    {scanState === 'scanning' ? (
                      <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin flex items-center justify-center shrink-0"></div>
                    ) : scanState === 'review' ? (
                      <div className="size-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[20px]">check</span>
                      </div>
                    ) : (
                      <div className="size-8 rounded-full border-2 border-slate-300 dark:border-slate-500 flex items-center justify-center shrink-0"></div>
                    )}
                    <div className="flex flex-col">
                      <span className="text-slate-900 dark:text-white font-semibold">Room Scan</span>
                      {scanState === 'scanning' ? (
                        <span className="text-xs text-slate-500 dark:text-slate-400">Capturing features...</span>
                      ) : scanState === 'review' ? (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400">Review & save</span>
                      ) : (
                        <span className="text-xs text-slate-500 dark:text-slate-400">10-second scan</span>
                      )}
                    </div>
                  </div>
                  {scanState === 'scanning' ? (
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-300 bg-slate-200 dark:bg-slate-600 px-2 py-1 rounded uppercase tracking-wider z-10 animate-pulse">
                      Scanning
                    </span>
                  ) : scanState === 'review' ? (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded uppercase tracking-wider z-10">
                      Review
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Pending
                    </span>
                  )}
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
              {scanState === 'idle' && (
                <button
                  onClick={() => setScanState('scanning')}
                  className="px-8 py-3 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold transition-all flex items-center gap-2"
                >
                  Start Scan
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              )}
              {scanState === 'review' && (
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
                  Review the scan on the left, then save your room
                </p>
              )}
              {scanState === 'complete' && (
                <p className="text-sm text-emerald-600 dark:text-emerald-400 text-center">
                  Room saved successfully!
                </p>
              )}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
