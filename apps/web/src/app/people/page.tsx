'use client';

import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Link from 'next/link';
import { usePeopleProfiles } from '@/hooks/usePeopleProfiles';

export default function PeoplePage() {
  const { people, removePerson } = usePeopleProfiles();
  const [showDeleteMenu, setShowDeleteMenu] = useState<string | null>(null);

  const totalPhotos = people.reduce((sum, person) => sum + person.photos.length, 0);

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      removePerson(id);
      setShowDeleteMenu(null);
    }
  };
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
                <Link
                  href="/people/add"
                  className="group flex items-center justify-center gap-2 h-12 px-6 bg-primary hover:bg-primary-dark text-white text-base font-bold rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-95 transition-all duration-200 whitespace-nowrap"
                >
                  <span className="material-symbols-outlined">add_circle</span>
                  <span>Add Person</span>
                </Link>
              </header>

              {/* Stats / Filters (Optional Context Bar) */}
              <div className="flex items-center gap-4 text-sm font-medium text-text-muted">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
                  <span className="material-symbols-outlined text-[18px]">face</span>
                  <span>{people.length} {people.length === 1 ? 'Person' : 'People'}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
                  <span className="material-symbols-outlined text-[18px]">photo_library</span>
                  <span>{totalPhotos} Ref {totalPhotos === 1 ? 'Photo' : 'Photos'}</span>
                </div>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {people.length === 0 ? (
                  <div className="col-span-full flex flex-col items-center justify-center py-16">
                    <div className="w-32 h-32 rounded-full bg-white/5 flex items-center justify-center mb-6">
                      <span className="material-symbols-outlined text-6xl text-text-muted">person_off</span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">No people yet</h3>
                    <p className="text-text-muted mb-6 text-center max-w-md">
                      Start by adding a person to create your first profile.
                    </p>
                    <Link
                      href="/people/add"
                      className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-primary/20 transition-all"
                    >
                      <span className="material-symbols-outlined">add_circle</span>
                      <span>Add Your First Person</span>
                    </Link>
                  </div>
                ) : (
                  <>
                    {people.map((person) => {
                      const primaryPhoto = person.photos.find((p) => p.angle === 'front') || person.photos[0];
                      return (
                        <div
                          key={person.id}
                          className="group relative flex flex-col bg-surface-dark hover:bg-[#3d4248] rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20 border border-white/5"
                        >
                          <div className="absolute top-3 right-3 z-10">
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowDeleteMenu(showDeleteMenu === person.id ? null : person.id);
                                }}
                                className="size-8 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <span className="material-symbols-outlined text-[18px]">more_horiz</span>
                              </button>
                              {showDeleteMenu === person.id && (
                                <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-20">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(person.id, person.name);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
                                  >
                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="aspect-[4/3] w-full overflow-hidden">
                            {primaryPhoto ? (
                              <div
                                className="w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                                style={{
                                  backgroundImage: `url(${primaryPhoto.dataUrl})`,
                                }}
                              ></div>
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-slate-800 flex items-center justify-center">
                                <span className="material-symbols-outlined text-6xl text-text-muted">person</span>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col p-5 gap-1">
                            <div className="flex justify-between items-start">
                              <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors">
                                {person.name}
                              </h3>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 text-[10px] font-bold uppercase tracking-wider text-text-muted border border-white/5 group-hover:border-primary/30 transition-colors">
                                {person.photos.length} {person.photos.length === 1 ? 'Photo' : 'Photos'}
                              </span>
                            </div>
                            {person.relationship && (
                              <p className="text-primary font-medium text-sm">{person.relationship}</p>
                            )}
                            <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-2 text-xs text-text-muted">
                              {person.recognitionActive ? (
                                <>
                                  <span className="material-symbols-outlined text-[16px] text-green-400">check_circle</span>
                                  <span>Recognition Active</span>
                                </>
                              ) : (
                                <>
                                  <span className="material-symbols-outlined text-[16px] text-yellow-500">warning</span>
                                  <span>Needs more photos</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Add Placeholder */}
                    <Link
                      href="/people/add"
                      className="group relative flex flex-col items-center justify-center bg-surface-dark/30 hover:bg-surface-dark border-2 border-dashed border-white/10 hover:border-primary/50 rounded-2xl overflow-hidden transition-all duration-300 min-h-[300px]"
                    >
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
                    </Link>
                  </>
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
