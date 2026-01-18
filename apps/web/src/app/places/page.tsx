'use client';

import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Link from 'next/link';
import { useRoomProfiles } from '@/hooks/useRoomProfiles';
import type { RoomProfile } from '@/types/room';

function generateSummaryLine(profile: RoomProfile): string {
  if (!profile.profile) {
    return 'Invalid profile data';
  }
  const rt = profile.profile.room_type?.replace('_', ' ') || 'unknown room';
  const floor = profile.profile.fixed_elements?.surfaces?.floor;
  const furn = profile.profile.fixed_elements?.major_furniture
    ?.slice(0, 3)
    .map((f) => f.name)
    .join(', ');
  const floorInfo = floor ? `${floor.color} ${floor.material} floor` : 'unknown floor';
  return `${rt} · ${floorInfo}${furn ? ` · ${furn}` : ''}`;
}

export default function PlacesPage() {
  const { profiles, removeProfile, exportProfiles, importProfiles } = useRoomProfiles();
  const [searchQuery, setSearchQuery] = useState('');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<RoomProfile | null>(null);
  const [showJsonViewer, setShowJsonViewer] = useState(false);

  const filteredProfiles = profiles.filter((p) => {
    // Filter out invalid profiles that don't have the required profile data
    if (!p.profile) {
      return false;
    }
    return (
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.note?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleExport = () => {
    const json = exportProfiles();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cuelens-room-profiles-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    try {
      setImportError(null);
      importProfiles(importText);
      setShowImportDialog(false);
      setImportText('');
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Failed to import profiles');
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      removeProfile(id);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };
  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display h-screen flex overflow-hidden selection:bg-primary selection:text-white">
      {/* Sidebar Navigation */}
      <Sidebar activePage="places" />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        {/* Mobile Header (Visible only on small screens) */}
        <header className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-sidebar-dark border-b border-slate-200 dark:border-slate-800">
          <span className="text-xl font-bold">CueLens</span>
          <button className="p-2">
            <span className="material-symbols-outlined">menu</span>
          </button>
        </header>

        {/* Main Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 pb-20 scroll-smooth">
          <div className="max-w-7xl mx-auto flex flex-col gap-8">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">Places</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
                  Manage recognized locations for orientation assistance.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleExport}
                  className="flex items-center justify-center gap-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-semibold py-3 px-6 rounded-lg transition-all"
                >
                  <span className="material-symbols-outlined text-[20px]">download</span>
                  <span>Export</span>
                </button>
                <button
                  onClick={() => setShowImportDialog(true)}
                  className="flex items-center justify-center gap-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-semibold py-3 px-6 rounded-lg transition-all"
                >
                  <span className="material-symbols-outlined text-[20px]">upload</span>
                  <span>Import</span>
                </button>
                <Link
                  href="/places/capture"
                  className="flex items-center justify-center gap-2 bg-primary hover:bg-[#3a6280] text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:shadow-primary/20 transition-all active:scale-95 min-w-[160px]"
                >
                  <span className="material-symbols-outlined">add_location_alt</span>
                  <span>Add Place</span>
                </Link>
              </div>
            </div>

            {/* Filters and Search Toolbar */}
            <div className="sticky top-0 z-10 -mx-6 md:-mx-10 px-6 md:px-10 py-4 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-transparent dark:border-white/5 transition-all">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1 max-w-md group">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                    search
                  </span>
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white dark:bg-card-dark border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 rounded-lg py-3 pl-10 pr-4 focus:ring-2 focus:ring-primary focus:border-transparent outline-none shadow-sm transition-all"
                    placeholder="Search places..."
                    type="text"
                  />
                </div>
                {/* Filter Chips */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                  <button className="px-5 py-2.5 rounded-full text-sm font-semibold bg-slate-800 text-white shadow-md whitespace-nowrap">
                    All
                  </button>
                  <button className="px-5 py-2.5 rounded-full text-sm font-medium bg-white dark:bg-card-dark text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 whitespace-nowrap transition-colors">
                    Home
                  </button>
                  <button className="px-5 py-2.5 rounded-full text-sm font-medium bg-white dark:bg-card-dark text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 whitespace-nowrap transition-colors">
                    Clinic
                  </button>
                  <button className="px-5 py-2.5 rounded-full text-sm font-medium bg-white dark:bg-card-dark text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 whitespace-nowrap transition-colors">
                    Outdoors
                  </button>
                </div>
              </div>
            </div>

            {/* Places Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredProfiles.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-16">
                  {profiles.length === 0 ? (
                    <>
                      <div className="w-32 h-32 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6">
                        <span className="material-symbols-outlined text-6xl text-slate-400">location_off</span>
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No places yet</h3>
                      <p className="text-slate-500 dark:text-slate-400 mb-6 text-center max-w-md">
                        Start by scanning a room to create your first place profile.
                      </p>
                      <Link
                        href="/places/capture"
                        className="flex items-center justify-center gap-2 bg-primary hover:bg-[#3a6280] text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:shadow-primary/20 transition-all"
                      >
                        <span className="material-symbols-outlined">add_location_alt</span>
                        <span>Add Your First Place</span>
                      </Link>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-6xl text-slate-400 mb-4">search_off</span>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No matches found</h3>
                      <p className="text-slate-500 dark:text-slate-400">Try a different search query.</p>
                    </>
                  )}
                </div>
              ) : (
                filteredProfiles.map((profile) => (
                  <div
                    key={profile.id}
                    onClick={() => {
                      setSelectedProfile(profile);
                      setShowJsonViewer(true);
                    }}
                    className="group bg-white dark:bg-card-dark rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700/50 hover:border-primary/50 dark:hover:border-primary/50 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 flex flex-col cursor-pointer"
                  >
                    <div className="relative h-48 w-full overflow-hidden bg-gradient-to-br from-primary/20 to-slate-800">
                      {/* Room Type Badge */}
                      <div className="absolute top-4 left-4 z-10">
                        <span className="bg-black/40 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">
                            {profile.profile?.room_type === 'bedroom' ? 'bed' :
                             profile.profile?.room_type === 'living_room' ? 'home' :
                             profile.profile?.room_type === 'kitchen' ? 'restaurant' :
                             profile.profile?.room_type === 'bathroom' ? 'bathtub' :
                             profile.profile?.room_type === 'office' ? 'work' :
                             'location_on'}
                          </span>
                          {profile.profile?.room_type?.replace('_', ' ') || 'unknown room'}
                        </span>
                      </div>
                      {/* Observation Count Badge */}
                      <div className="absolute bottom-4 left-4 z-10">
                        <span className="text-white text-xs font-medium bg-primary/90 backdrop-blur-sm px-2.5 py-1 rounded-md shadow-sm">
                          {profile.observationCount} observations
                        </span>
                      </div>
                      {/* Menu Button */}
                      <div className="absolute top-4 right-4 z-10">
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const menu = document.getElementById(`menu-${profile.id}`);
                              if (menu) {
                                menu.classList.toggle('hidden');
                              }
                            }}
                            className="bg-black/40 backdrop-blur-md text-white p-2 rounded-full border border-white/10 hover:bg-black/60 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[18px]">more_vert</span>
                          </button>
                          <div
                            id={`menu-${profile.id}`}
                            className="hidden absolute right-0 mt-2 w-40 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-20"
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedProfile(profile);
                                setShowJsonViewer(true);
                                const menu = document.getElementById(`menu-${profile.id}`);
                                if (menu) {
                                  menu.classList.add('hidden');
                                }
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                            >
                              <span className="material-symbols-outlined text-[18px]">code</span>
                              View JSON
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(profile.id, profile.name);
                                const menu = document.getElementById(`menu-${profile.id}`);
                                if (menu) {
                                  menu.classList.add('hidden');
                                }
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="p-5 flex flex-col flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                          {profile.name}
                        </h3>
                      </div>
                      {profile.note && (
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-3 line-clamp-2">
                          {profile.note}
                        </p>
                      )}
                      <p className="text-slate-600 dark:text-slate-300 text-sm mb-4 line-clamp-2">
                        {generateSummaryLine(profile)}
                      </p>
                      <div className="mt-auto pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px]">schedule</span>
                          <span>Created {formatDate(profile.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-emerald-400">
                          <span className="material-symbols-outlined text-[16px]">check_circle</span>
                          <span>Saved</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}

              {/* Add New Card Placeholder */}
              {filteredProfiles.length > 0 && (
                <Link
                  href="/places/capture"
                  className="group bg-slate-50 dark:bg-card-dark/30 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-primary/50 dark:hover:border-primary/50 hover:bg-slate-100 dark:hover:bg-card-dark/50 transition-all cursor-pointer flex flex-col items-center justify-center p-8 min-h-[360px]"
                >
                  <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-700/50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-slate-400 group-hover:text-primary text-3xl">
                      add_a_photo
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 group-hover:text-primary mb-1">
                    Add New Place
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-500 text-center max-w-[200px]">
                    Capture a new room or location to assist with orientation.
                  </p>
                </Link>
              )}
            </div>

          </div>
        </div>
      </main>

      {/* JSON Viewer Modal */}
      {showJsonViewer && selectedProfile && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowJsonViewer(false)}
        >
          <div 
            className="bg-white dark:bg-sidebar-surface rounded-2xl p-8 max-w-4xl w-full mx-4 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                  {selectedProfile.name}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Room JSON Data · {selectedProfile.observationCount} observation{selectedProfile.observationCount !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => setShowJsonViewer(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {/* Aggregated Profile JSON */}
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Aggregated Profile JSON
                  </h3>
                  <button
                    onClick={() => {
                      if (selectedProfile.profile) {
                        navigator.clipboard.writeText(JSON.stringify(selectedProfile.profile, null, 2));
                        alert('Aggregated JSON copied to clipboard!');
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">content_copy</span>
                    Copy
                  </button>
                </div>
                <pre className="text-xs text-slate-700 dark:text-slate-300 overflow-auto p-3 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 max-h-96">
                  {selectedProfile.profile ? JSON.stringify(selectedProfile.profile, null, 2) : 'No profile data available'}
                </pre>
              </div>

              {/* Raw Observations JSON */}
              {selectedProfile.rawObservations && selectedProfile.rawObservations.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      Raw Observations JSON ({selectedProfile.rawObservations.length} observation{selectedProfile.rawObservations.length !== 1 ? 's' : ''})
                    </h3>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(selectedProfile.rawObservations, null, 2));
                        alert('Raw observations JSON copied to clipboard!');
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">content_copy</span>
                      Copy
                    </button>
                  </div>
                  <pre className="text-xs text-slate-700 dark:text-slate-300 overflow-auto p-3 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 max-h-96">
                    {JSON.stringify(selectedProfile.rawObservations, null, 2)}
                  </pre>
                </div>
              )}

              {/* Full Profile JSON (everything) */}
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Complete Profile JSON (All Data)
                  </h3>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(selectedProfile, null, 2));
                      alert('Complete profile JSON copied to clipboard!');
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">content_copy</span>
                    Copy
                  </button>
                </div>
                <details className="cursor-pointer">
                  <summary className="text-sm text-primary hover:text-primary/80 font-medium mb-2 cursor-pointer">
                    Click to expand full profile JSON
                  </summary>
                  <pre className="text-xs text-slate-700 dark:text-slate-300 overflow-auto p-3 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 max-h-96 mt-2">
                    {JSON.stringify(selectedProfile, null, 2)}
                  </pre>
                </details>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setShowJsonViewer(false)}
                className="px-6 py-3 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-semibold transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-sidebar-surface rounded-2xl p-8 max-w-2xl w-full mx-4 shadow-2xl">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Import Room Profiles</h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm mb-4">
              Paste the JSON export from a previous backup. This will replace all existing profiles.
            </p>
            {importError && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg">
                <p className="text-red-700 dark:text-red-400 text-sm">{importError}</p>
              </div>
            )}
            <textarea
              value={importText}
              onChange={(e) => {
                setImportText(e.target.value);
                setImportError(null);
              }}
              placeholder="Paste JSON here..."
              rows={12}
              className="w-full bg-white dark:bg-card-dark border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 rounded-lg py-3 px-4 focus:ring-2 focus:ring-primary focus:border-transparent outline-none shadow-sm transition-all resize-none font-mono text-xs"
            />
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowImportDialog(false);
                  setImportText('');
                  setImportError(null);
                }}
                className="px-6 py-3 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                className="px-6 py-3 rounded-lg bg-primary hover:bg-primary/90 text-white font-bold transition-all"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
