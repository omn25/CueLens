'use client';

import Sidebar from '../components/Sidebar';
import Link from 'next/link';
import { useCaretakerMode } from '../contexts/CaretakerModeContext';

export default function PeoplePage() {
  const { isCaretakerMode } = useCaretakerMode();
  return (
    <div className="font-display bg-background-light dark:bg-background-dark text-slate-900 dark:text-white antialiased selection:bg-primary selection:text-white overflow-hidden">
      <div className="flex h-screen w-full">
        {/* Sidebar Navigation */}
        <Sidebar activePage="people" />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col h-full overflow-hidden relative">
          {/* Top Gradient Fade */}
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-background-dark to-transparent pointer-events-none z-10"></div>
          <div className="flex-1 overflow-y-auto p-6 lg:p-10 xl:p-14 pb-20 scroll-smooth">
            <div className="max-w-7xl mx-auto flex flex-col gap-10">
              {/* Page Heading */}
              <header className="relative z-20 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="flex flex-col gap-3 max-w-2xl">
                  <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
                    People Directory
                  </h1>
                  <p className="text-lg text-text-muted font-medium leading-relaxed">
                    Manage the friends and family CueLens helps recognize. Keeping this list updated helps improve
                    recognition accuracy.
                  </p>
                </div>
                {isCaretakerMode && (
                  <Link
                    href="/people/add"
                    className="group flex items-center justify-center gap-2 h-12 px-6 bg-primary hover:bg-primary-dark text-white text-base font-bold rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-95 transition-all duration-200 whitespace-nowrap"
                  >
                    <span className="material-symbols-outlined">add_circle</span>
                    <span>Add Person</span>
                  </Link>
                )}
              </header>

              {/* Stats / Filters (Optional Context Bar) */}
              <div className="flex items-center gap-4 text-sm font-medium text-text-muted">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
                  <span className="material-symbols-outlined text-[18px]">face</span>
                  <span>12 People</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
                  <span className="material-symbols-outlined text-[18px]">photo_library</span>
                  <span>148 Ref Photos</span>
                </div>
                <div className="h-4 w-px bg-white/10 mx-2"></div>
                <button className="hover:text-white transition-colors">Last Updated</button>
                <span className="text-white/20">•</span>
                <button className="hover:text-white transition-colors">A-Z</button>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {/* Card 1: Sarah */}
                <div className="group relative flex flex-col bg-surface-dark hover:bg-[#3d4248] rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20 border border-white/5">
                  {isCaretakerMode && (
                    <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="size-8 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm">
                        <span className="material-symbols-outlined text-[18px]">more_horiz</span>
                      </button>
                    </div>
                  )}
                  <div className="aspect-[4/3] w-full overflow-hidden">
                    <div
                      className="w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                      style={{
                        backgroundImage:
                          "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDJ3Eu11JDAgIZeijcrEd1wAwnPAdgFzYXPrlob976f8-G8pEG-6_ZydObkXbG6I9C4-vnVoiBISJ63ldVImy7RKxmd8JUt-m_6iYBB9oYSuCTdi2N8wVD97Z-RoDpaaQY5cYxwGGE-l3SeyWozsB4Qog5lV6hQQu41-G_kBboUWeUs_y5sqW5RK5ucbS3mbAEF8-KtWGLLYy6pp5NlCmstdnJR6uX-_9WhEhNoOyUFQBw9BRadQUmR1nuEsTzu5g8ExiH1O0RVvQAv')",
                      }}
                    ></div>
                  </div>
                  <div className="flex flex-col p-5 gap-1">
                    <div className="flex justify-between items-start">
                      <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors">Sarah</h3>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 text-[10px] font-bold uppercase tracking-wider text-text-muted border border-white/5 group-hover:border-primary/30 transition-colors">
                        12 Photos
                      </span>
                    </div>
                    <p className="text-primary font-medium text-sm">Daughter</p>
                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-2 text-xs text-text-muted">
                      <span className="material-symbols-outlined text-[16px] text-green-400">check_circle</span>
                      <span>Recognition Active</span>
                    </div>
                  </div>
                </div>

                {/* Card 2: Dr. Smith */}
                <div className="group relative flex flex-col bg-surface-dark hover:bg-[#3d4248] rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20 border border-white/5">
                  {isCaretakerMode && (
                    <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="size-8 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm">
                        <span className="material-symbols-outlined text-[18px]">more_horiz</span>
                      </button>
                    </div>
                  )}
                  <div className="aspect-[4/3] w-full overflow-hidden">
                    <div
                      className="w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                      style={{
                        backgroundImage:
                          "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAZNwBo3jFnzw1DKNUk25aP2sLSJBRvlwF-LVlLk7dkAmwTe6lXrERaxc8ZU9OsU_8Hi35nlLosJ5NGC9I4VoY5BdAo_5DeQb5K6NC4_a7muNXRLFHD1wwoYWw9R_0oJB17s7B7gV85MZiYSgtDeNbcmQx_XCqPEG7jKQ469THBT-jG1jLXPXltPEEUktxh4tTPel26qt9CvXirDUVjuPkeTP4IVC8-R6LjCMLKWML8NFleVd3ZMpTJ5_KV2NztvnUhfvagESeCbwq5')",
                      }}
                    ></div>
                  </div>
                  <div className="flex flex-col p-5 gap-1">
                    <div className="flex justify-between items-start">
                      <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors">
                        Dr. Smith
                      </h3>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 text-[10px] font-bold uppercase tracking-wider text-text-muted border border-white/5 group-hover:border-primary/30 transition-colors">
                        4 Photos
                      </span>
                    </div>
                    <p className="text-primary font-medium text-sm">General Practitioner</p>
                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-2 text-xs text-text-muted">
                      <span className="material-symbols-outlined text-[16px] text-green-400">check_circle</span>
                      <span>Recognition Active</span>
                    </div>
                  </div>
                </div>

                {/* Card 3: Tom */}
                <div className="group relative flex flex-col bg-surface-dark hover:bg-[#3d4248] rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20 border border-white/5">
                  {isCaretakerMode && (
                    <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="size-8 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm">
                        <span className="material-symbols-outlined text-[18px]">more_horiz</span>
                      </button>
                    </div>
                  )}
                  <div className="aspect-[4/3] w-full overflow-hidden">
                    <div
                      className="w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                      style={{
                        backgroundImage:
                          "url('https://lh3.googleusercontent.com/aida-public/AB6AXuATwIS4Rr9LJDIMHyWemNzU9dqjhmHewg4WatnBiz9bv0cs7nVbWnpZv2FYaLLr0W7O4Ip619AZbxjdOkeCDArXG95h0bSNbKLy98ewpgjTTwQPndAruiYSoYBaYZUIBI-50Pv6zQTMGDucIoazWsjBoeym98-3Ip5K_cgJazB3m-zPftwenwD3Qapx_80C2K8vKEIR6dnb4Dz84csqiKnblvM4i1ZQsb9jfM-yuKDjMTEol6Ry5PZrJyxV3DtXOKYzKEnmUYxwmZmn')",
                      }}
                    ></div>
                  </div>
                  <div className="flex flex-col p-5 gap-1">
                    <div className="flex justify-between items-start">
                      <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors">Tom</h3>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 text-[10px] font-bold uppercase tracking-wider text-text-muted border border-white/5 group-hover:border-primary/30 transition-colors">
                        6 Photos
                      </span>
                    </div>
                    <p className="text-primary font-medium text-sm">Neighbor (Next Door)</p>
                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-2 text-xs text-text-muted">
                      <span className="material-symbols-outlined text-[16px] text-yellow-500">warning</span>
                      <span>Needs more photos</span>
                    </div>
                  </div>
                </div>

                {/* Card 4: Grandma Joy */}
                <div className="group relative flex flex-col bg-surface-dark hover:bg-[#3d4248] rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20 border border-white/5">
                  {isCaretakerMode && (
                    <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="size-8 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm">
                        <span className="material-symbols-outlined text-[18px]">more_horiz</span>
                      </button>
                    </div>
                  )}
                  <div className="aspect-[4/3] w-full overflow-hidden">
                    <div
                      className="w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                      style={{
                        backgroundImage:
                          "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAkPthCSALIvpFYYjh6Rpb_FAEEejlw7o79GzMJwdVoGNlFCdGCBMRU1cxrx-kNPPakL6r451jWIR1tLAvzD4w_mA97lpBoRqDI7NzUh_4QAsm-ZD6Z5B83GPL_7u_kcWGlcxZ6wmDG_sfsasl-poSqXzDFrCMtgS8ogznBCij6WN0qF3Y4EV1ahFeir1ZHjf0LNnBrRR8JkJr0ChXmz2Sb4WrDl-MPp5a3br5A10occEyp4O6fhZKbjaXue_P1_4lHdgBBVgUpMY5U')",
                      }}
                    ></div>
                  </div>
                  <div className="flex flex-col p-5 gap-1">
                    <div className="flex justify-between items-start">
                      <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors">
                        Grandma Joy
                      </h3>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 text-[10px] font-bold uppercase tracking-wider text-text-muted border border-white/5 group-hover:border-primary/30 transition-colors">
                        8 Photos
                      </span>
                    </div>
                    <p className="text-primary font-medium text-sm">Sister</p>
                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-2 text-xs text-text-muted">
                      <span className="material-symbols-outlined text-[16px] text-green-400">check_circle</span>
                      <span>Recognition Active</span>
                    </div>
                  </div>
                </div>

                {/* Card 5: Michael */}
                <div className="group relative flex flex-col bg-surface-dark hover:bg-[#3d4248] rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20 border border-white/5">
                  {isCaretakerMode && (
                    <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="size-8 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm">
                        <span className="material-symbols-outlined text-[18px]">more_horiz</span>
                      </button>
                    </div>
                  )}
                  <div className="aspect-[4/3] w-full overflow-hidden">
                    <div
                      className="w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                      style={{
                        backgroundImage:
                          "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBFICNzwASq-j2afJJx1RVKApa1vno1LScm1cLKA2nN5knvSAh0saGL3AC7iUIRUDJki9gUUaNvNCJ0vBAmx-0vshdwHpt9X8u0xi99lb1AWhxH7lMrw4wtX0yiTo-j2crjKhIgwFyKazCtCMObfJKGJzUPoi_3MAgCgOOLg9p1OViE3wArquI3E0tSdJtFBPHJX2lWZH1L511o2rbsFVhX5tmZivbqQQ9PvQ3LlYNkbOETVCiR49bXw5ziyXT8FkCP74D-nDwY-wUz')",
                      }}
                    ></div>
                  </div>
                  <div className="flex flex-col p-5 gap-1">
                    <div className="flex justify-between items-start">
                      <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors">Michael</h3>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 text-[10px] font-bold uppercase tracking-wider text-text-muted border border-white/5 group-hover:border-primary/30 transition-colors">
                        5 Photos
                      </span>
                    </div>
                    <p className="text-primary font-medium text-sm">Lawyer</p>
                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-2 text-xs text-text-muted">
                      <span className="material-symbols-outlined text-[16px] text-green-400">check_circle</span>
                      <span>Recognition Active</span>
                    </div>
                  </div>
                </div>

                {/* Card 6: Add Placeholder - Only show in caretaker mode */}
                {isCaretakerMode && (
                  <button className="group relative flex flex-col items-center justify-center bg-surface-dark/30 hover:bg-surface-dark border-2 border-dashed border-white/10 hover:border-primary/50 rounded-2xl overflow-hidden transition-all duration-300 min-h-[300px]">
                    <div className="flex flex-col items-center gap-3 group-hover:scale-105 transition-transform duration-300">
                      <div className="size-16 rounded-full bg-white/5 group-hover:bg-primary flex items-center justify-center transition-colors">
                        <span className="material-symbols-outlined text-white/50 group-hover:text-white" style={{ fontSize: '32px' }}>
                          person_add
                        </span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-lg font-bold text-white/50 group-hover:text-white transition-colors">
                          Add New Person
                        </span>
                        <span className="text-sm text-text-muted">Add photos to train CueLens</span>
                      </div>
                    </div>
                  </button>
                )}
              </div>

              {/* Bottom Tip */}
              <div className="flex items-start gap-4 p-4 rounded-xl bg-primary/10 border border-primary/20 max-w-2xl mx-auto">
                <span className="material-symbols-outlined text-primary mt-0.5">lightbulb</span>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-bold text-white">Tip for better recognition</p>
                  <p className="text-sm text-text-muted">
                    Adding photos from different angles and lighting conditions helps CueLens recognize people more
                    accurately in daily life.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
