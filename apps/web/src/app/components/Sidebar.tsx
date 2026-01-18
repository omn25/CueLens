'use client';

import Link from 'next/link';
import { useCaretakerMode } from '../contexts/CaretakerModeContext';

interface SidebarProps {
  activePage?: 'live-vision' | 'places' | 'people' | 'settings';
}

export default function Sidebar({ activePage = 'live-vision' }: SidebarProps) {
  const { isCaretakerMode, toggleCaretakerMode } = useCaretakerMode();
  return (
    <nav className="w-72 h-full flex flex-col bg-[#1e2124] border-r border-white/5 z-20 shrink-0">
      <div className="p-6 pb-2">
        <div className="flex items-center gap-3 mb-8">
          <div className="size-10 rounded-xl bg-gradient-to-br from-primary to-[#2c4e68] flex items-center justify-center text-white shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined text-[24px]">visibility</span>
          </div>
          <div className="flex flex-col">
            <h1 className="text-white text-lg font-bold leading-tight tracking-tight">CueLens</h1>
            <p className="text-gray-400 text-xs font-medium">Assistive Vision</p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Link
            href="/"
            className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-colors ${
              activePage === 'live-vision'
                ? 'bg-primary/15 text-primary border border-primary/10'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span
              className="material-symbols-outlined"
              style={activePage === 'live-vision' ? { fontVariationSettings: "'FILL' 1" } : {}}
            >
              videocam
            </span>
            <span className={activePage === 'live-vision' ? 'font-semibold text-sm' : 'font-medium text-sm'}>
              Live Vision
            </span>
          </Link>
          <Link
            href="/places"
            className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-colors ${
              activePage === 'places'
                ? 'bg-primary/15 text-primary border border-primary/10'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span
              className="material-symbols-outlined"
              style={activePage === 'places' ? { fontVariationSettings: "'FILL' 1" } : {}}
            >
              map
            </span>
            <span className={activePage === 'places' ? 'font-semibold text-sm' : 'font-medium text-sm'}>
              Places
            </span>
          </Link>
          <Link
            href="/people"
            className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-colors ${
              activePage === 'people'
                ? 'bg-primary/15 text-primary border border-primary/10'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span
              className="material-symbols-outlined"
              style={activePage === 'people' ? { fontVariationSettings: "'FILL' 1" } : {}}
            >
              group
            </span>
            <span className={activePage === 'people' ? 'font-semibold text-sm' : 'font-medium text-sm'}>
              People
            </span>
          </Link>
          <Link
            href="#"
            className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-colors ${
              activePage === 'settings'
                ? 'bg-primary/15 text-primary border border-primary/10'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="material-symbols-outlined">settings</span>
            <span className={activePage === 'settings' ? 'font-semibold text-sm' : 'font-medium text-sm'}>
              Settings
            </span>
          </Link>
        </div>
      </div>
      <div className="mt-auto p-6 border-t border-white/5 flex flex-col gap-4">
        {/* Caretaker Mode Toggle */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
          <div className="flex flex-col gap-1">
            <span className="text-white text-sm font-semibold">Caretaker Mode</span>
            <span className="text-gray-400 text-xs">
              {isCaretakerMode ? 'Full access enabled' : 'View-only mode'}
            </span>
          </div>
          <button
            onClick={toggleCaretakerMode}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-[#1e2124] ${
              isCaretakerMode ? 'bg-primary' : 'bg-gray-600'
            }`}
            aria-label={isCaretakerMode ? 'Disable caretaker mode' : 'Enable caretaker mode'}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isCaretakerMode ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
          <div
            className="size-10 rounded-full bg-cover bg-center shrink-0"
            style={{
              backgroundImage:
                "url('https://lh3.googleusercontent.com/aida-public/AB6AXuB37SbgebeFpVQM3gTbyVMsZNN3ov2Iz9ZkDaKyKtG-IpeE-pby1vC-eu22ty8560U9tX69imTfZJNz4W1bGf8nnsoY3JyGeKwaMcNK36tPhRfrNwNGlkWd53Ah801SK6ZPNXl23m1bcQQ0j2f33FDyIkdVcnVeFS899-2CTpXdiopBywbo-BbewLurnxTZV2NDkgERz2lKMXIrNU7HE-OOs7mi65IZmv1oAVmo1PTVUqFey2VylosGZGrGf6_n4cvrVufGgpWlBXJx')",
            }}
          />
          <div className="flex flex-col min-w-0">
            <p className="text-white text-sm font-semibold truncate">Arthur Dent</p>
            <p className="text-gray-400 text-xs truncate">arthur@cuelens.app</p>
          </div>
          <button className="ml-auto text-gray-400 hover:text-white">
            <span className="material-symbols-outlined text-[20px]">logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
