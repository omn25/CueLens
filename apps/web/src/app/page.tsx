import Sidebar from './components/Sidebar';
import WebcamFeed from './components/WebcamFeed';

export default function Home() {
  return (
    <div className="bg-background-dark text-white font-display overflow-hidden h-screen flex w-full">
      {/* Sidebar Navigation */}
      <Sidebar activePage="live-vision" />

      {/* Main Content Area / Live Feed */}
      <main className="relative flex-1 h-full bg-black overflow-hidden group">
        {/* Webcam Feed */}
        <WebcamFeed />

        {/* Top Left Status Overlay */}
        <div className="absolute top-8 left-8 flex flex-col gap-2 z-10">
          <div className="flex items-center gap-3 pl-3 pr-4 py-2 rounded-full glass-panel shadow-lg">
            <div className="relative flex items-center justify-center size-3 text-emerald-400 pulse-ring">
              <div className="size-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"></div>
            </div>
            <span className="text-white text-sm font-semibold tracking-wide">Vision: Running</span>
            <div className="h-4 w-px bg-white/20 mx-1"></div>
            <span className="text-gray-400 text-xs font-mono">12ms</span>
          </div>
        </div>

        {/* Top Right Indicators */}
        <div className="absolute top-8 right-8 flex gap-3 z-10">
          <button className="size-10 flex items-center justify-center rounded-full glass-panel hover:bg-white/10 transition text-white">
            <span className="material-symbols-outlined text-[20px]">volume_up</span>
          </button>
          <button className="size-10 flex items-center justify-center rounded-full glass-panel hover:bg-white/10 transition text-white">
            <span className="material-symbols-outlined text-[20px]">fullscreen</span>
          </button>
        </div>

        {/* Center Bottom HUD Card */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-full max-w-3xl px-6 z-20">
          <div className="glass-panel rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col gap-6 animate-fade-in-up">
            {/* Identification Header & Confidence */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/10 pb-6">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-primary text-[24px]">home_pin</span>
                  <span className="text-primary text-xs font-bold uppercase tracking-wider">
                    Location Identified
                  </span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Home – Bedroom</h2>
              </div>
              <div className="flex flex-col gap-2 min-w-[200px]">
                <div className="flex justify-between items-end">
                  <span className="text-gray-400 text-xs font-medium">Confidence</span>
                  <span className="text-primary font-bold text-sm">94%</span>
                </div>
                <div className="h-2 w-full bg-gray-700/50 rounded-full overflow-hidden backdrop-blur-sm">
                  <div
                    className="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(73,120,156,0.5)]"
                    style={{ width: '94%' }}
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
                  You're in your bedroom. Everything is okay.
                </p>
                <p className="text-gray-400 text-sm">
                  It is 2:30 PM. Your daughter, Sarah, is visiting at 4:00 PM.
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
              <button className="h-12 px-6 rounded-xl bg-transparent hover:bg-white/5 text-gray-400 hover:text-white text-sm font-semibold tracking-wide transition-all flex items-center justify-center gap-2 ml-auto">
                <span className="material-symbols-outlined text-[20px]">close</span>
                <span>Dismiss</span>
              </button>
            </div>
          </div>
        </div>

        {/* Optional: Decorative subtle gradient at bottom for text legibility if image is light */}
        <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-background-dark via-background-dark/50 to-transparent pointer-events-none z-0"></div>
      </main>
    </div>
  );
}
