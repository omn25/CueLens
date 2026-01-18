'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePeopleProfiles } from '@/hooks/usePeopleProfiles';
import type { PersonPhoto } from '@/types/person';

type Step = 1 | 2 | 3;
type PhotoAngle = 'front';

export default function AddPersonPage() {
  const router = useRouter();
  const { addPerson } = usePeopleProfiles();
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState<{ [key in PhotoAngle]?: PersonPhoto }>({});
  const [currentAngle] = useState<PhotoAngle>('front');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isInitializingRef = useRef(false);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStream(null);
  }, []);

  // Initialize camera on step 2
  useEffect(() => {
    let mounted = true;

    const initializeCamera = async () => {
      if (step === 2) {
        // Don't re-initialize if we already have an active stream
        if (streamRef.current && videoRef.current?.srcObject) {
          const currentStream = videoRef.current.srcObject as MediaStream;
          if (currentStream.active && currentStream.getVideoTracks().length > 0) {
            const videoTrack = currentStream.getVideoTracks()[0];
            if (videoTrack.readyState === 'live') {
              // Stream is already active - just ensure it's playing
              if (videoRef.current.paused) {
                videoRef.current.play().catch(console.error);
              }
              return; // Preserve existing stream
            }
          }
        }

        // Only initialize if not already initializing
        if (isInitializingRef.current) return;

        // Don't create new stream if one already exists
        if (streamRef.current) return;

        isInitializingRef.current = true;
        try {
          const mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user' },
          });

          if (!mounted) {
            mediaStream.getTracks().forEach((track) => track.stop());
            return;
          }

          streamRef.current = mediaStream;
          setStream(mediaStream);
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
            await videoRef.current.play();
          }
        } catch (err) {
          console.error('Error accessing camera:', err);
          if (mounted) {
            setError('Unable to access camera. Please check permissions.');
          }
        } finally {
          if (mounted) {
            isInitializingRef.current = false;
          }
        }
      } else {
        // Step is not 2 - stop camera
        stopCamera();
      }
    };

    initializeCamera();

    return () => {
      mounted = false;
      // Only stop camera on unmount, not when dependencies change
      // This prevents flickering when step changes
      if (step !== 2) {
        stopCamera();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]); // Only depend on step, not callbacks

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

    const photo: PersonPhoto = {
      id: crypto.randomUUID(),
      dataUrl,
      angle: currentAngle,
      capturedAt: Date.now(),
    };

    setPhotos((prev) => ({ ...prev, [currentAngle]: photo }));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const photo: PersonPhoto = {
        id: crypto.randomUUID(),
        dataUrl,
        angle: currentAngle,
        capturedAt: Date.now(),
      };

      setPhotos((prev) => ({ ...prev, [currentAngle]: photo }));
      setError(null);
    };
    reader.readAsDataURL(file);
    
    // Reset file input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const retakePhoto = () => {
    setPhotos((prev) => {
      const updated = { ...prev };
      delete updated.front;
      return updated;
    });
  };

  const handleNext = () => {
    if (step === 1) {
      if (!name.trim()) {
        setError('Please enter a name');
        return;
      }
      setStep(2);
      setError(null);
    } else if (step === 2) {
      // Allow proceeding even without all 3 photos
      setStep(3);
      setError(null);
    }
  };

  const handleSave = () => {
    const photoArray = Object.values(photos).filter((p): p is PersonPhoto => p !== undefined);
    addPerson(name.trim(), relationship.trim() || undefined, note.trim() || undefined, photoArray);
    router.push('/people');
  };

  const getStepProgress = () => {
    if (step === 1) return { current: 1, total: 3, percent: 0 };
    if (step === 2) return { current: 2, total: 3, percent: 33 };
    return { current: 3, total: 3, percent: 67 };
  };

  const progress = getStepProgress();
  const capturedCount = Object.keys(photos).length;

  return (
    <div className="bg-background-light dark:bg-background-dark font-display antialiased text-slate-900 dark:text-white min-h-screen flex flex-col">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-[#2e373d] bg-[#161a1d]">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
              <span className="material-symbols-outlined text-xl">visibility</span>
            </div>
            <Link href="/" className="text-xl font-bold tracking-tight text-white">
              CueLens
            </Link>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <nav className="flex gap-6 text-sm font-medium text-[#a2afb9]">
              <Link href="/" className="hover:text-white transition-colors">
                Dashboard
              </Link>
              <Link href="/people" className="text-white">
                People
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1200px] px-6 py-8">
          {/* Progress Stepper */}
          <div className="mb-10 max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-primary">
                Step {progress.current} of {progress.total}
              </span>
              {step < 3 && (
                <span className="text-sm text-[#a2afb9]">
                  {step === 1 ? 'Next: Reference Photos' : 'Next: Review & Confirm'}
                </span>
              )}
            </div>
            <div className="relative h-2 w-full rounded-full bg-[#2e373d]">
              <div
                className="absolute top-0 left-0 h-full rounded-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${progress.percent + 33}%` }}
              ></div>
              {/* Step Markers */}
              <div
                className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-4 border-[#272a30] transition-all ${
                  step >= 1 ? 'bg-primary' : 'bg-[#2e373d]'
                }`}
                style={{ left: '0%' }}
              ></div>
              <div
                className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-4 border-[#272a30] transition-all ${
                  step >= 2 ? 'bg-primary' : 'bg-[#2e373d]'
                }`}
                style={{ left: '33%' }}
              ></div>
              <div
                className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-4 border-[#272a30] transition-all ${
                  step >= 3 ? 'bg-primary' : 'bg-[#2e373d]'
                }`}
                style={{ left: '67%' }}
              ></div>
            </div>
            <div className="flex justify-between mt-2 text-xs font-medium text-[#a2afb9]">
              <span className={`w-1/3 ${step >= 1 ? 'text-primary' : ''}`}>Basic Info</span>
              <span className={`w-1/3 text-center ${step >= 2 ? 'text-primary' : ''}`}>Reference Photos</span>
              <span className={`w-1/3 text-right ${step >= 3 ? 'text-primary' : ''}`}>Review</span>
            </div>
          </div>

          {error && (
            <div className="mb-6 max-w-3xl mx-auto p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-red-400">
              {error}
            </div>
          )}

          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="max-w-2xl mx-auto">
              <div className="mb-10 text-center">
                <h2 className="text-3xl font-bold tracking-tight text-white mb-3">Basic Information</h2>
                <p className="text-[#a2afb9] text-lg leading-relaxed">
                  Enter the person&apos;s name and relationship to help CueLens recognize them.
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Sarah, Dr. Smith"
                    className="w-full bg-[#21272c] border border-[#2e373d] text-white placeholder-[#a2afb9] rounded-lg py-3 px-4 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && name.trim()) {
                        handleNext();
                      }
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Relationship (Optional)</label>
                  <input
                    type="text"
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    placeholder="e.g., Daughter, Doctor, Neighbor"
                    className="w-full bg-[#21272c] border border-[#2e373d] text-white placeholder-[#a2afb9] rounded-lg py-3 px-4 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && name.trim()) {
                        handleNext();
                      }
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Note (Optional)</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Any additional information..."
                    rows={4}
                    className="w-full bg-[#21272c] border border-[#2e373d] text-white placeholder-[#a2afb9] rounded-lg py-3 px-4 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center mt-10">
                <Link
                  href="/people"
                  className="px-6 py-2.5 rounded-lg border border-[#2e373d] text-[#a2afb9] hover:text-white hover:bg-[#2e373d] font-medium transition-colors"
                >
                  Cancel
                </Link>
                <button
                  onClick={handleNext}
                  disabled={!name.trim()}
                  className="px-6 py-2.5 rounded-lg bg-primary hover:bg-[#5a8bb0] text-white font-bold transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next: Capture Photos
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Capture Photos */}
          {step === 2 && (
            <>
              <div className="mb-10 text-center max-w-2xl mx-auto">
                <h2 className="text-3xl font-bold tracking-tight text-white mb-3">Capture Reference Photos</h2>
                <p className="text-[#a2afb9] text-lg leading-relaxed">
                  We need to learn what <span className="text-white font-semibold">{name}</span> looks like. Capture a photo
                  to help with recognition.
                </p>
              </div>

              <div className="grid lg:grid-cols-12 gap-8 items-start">
                {/* Left Column: Camera / Capture Zone */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                  {/* Camera Card */}
                  <div className="rounded-2xl bg-[#161a1d] border border-[#2e373d] overflow-hidden shadow-xl relative group">
                    {/* Camera Header */}
                    <div className="flex items-center justify-between px-5 py-3 bg-[#21272c] border-b border-[#2e373d]">
                      <div className="flex items-center gap-2">
                        {stream && <span className="material-symbols-outlined text-red-500 animate-pulse text-[10px]">circle</span>}
                        <span className="text-sm font-semibold text-white tracking-wide uppercase">
                          {stream ? 'Live Feed' : 'Camera Off'}
                        </span>
                      </div>
                    </div>

                    {/* Video Feed Area */}
                    <div className="relative aspect-[4/3] bg-black w-full flex items-center justify-center overflow-hidden">
                      {stream ? (
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-4 text-[#a2afb9] p-8">
                          <span className="material-symbols-outlined text-6xl">videocam_off</span>
                          <p className="text-center">Camera not available</p>
                          <p className="text-sm text-center">Use the &quot;Upload Photo&quot; button to add photos from your device</p>
                        </div>
                      )}

                      {/* Face Guide Frame */}
                      {stream && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-64 h-80 border-2 border-white/30 rounded-[3rem] relative">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-xs font-medium text-white border border-white/10">
                              Center Face Here
                            </div>
                            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary rounded-tl-xl -mt-0.5 -ml-0.5"></div>
                            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary rounded-tr-xl -mt-0.5 -mr-0.5"></div>
                            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary rounded-bl-xl -mb-0.5 -ml-0.5"></div>
                            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary rounded-br-xl -mb-0.5 -mr-0.5"></div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Camera Controls Footer */}
                    <div className="p-6 bg-[#161a1d] flex flex-col md:flex-row items-center justify-between gap-4 border-t border-[#2e373d]">
                      <div className="text-[#a2afb9] text-sm hidden md:block">
                        <p>Upload photos or use camera if available.</p>
                      </div>
                      <div className="flex items-center gap-3 w-full md:w-auto">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <button
                          onClick={() => {
                            setError(null);
                            fileInputRef.current?.click();
                          }}
                          className="flex-1 md:flex-none h-12 px-6 rounded-xl bg-[#2e373d] hover:bg-[#38444d] text-white font-medium transition-all flex items-center justify-center gap-2 border border-transparent hover:border-[#49789c]"
                        >
                          <span className="material-symbols-outlined">upload_file</span>
                          <span>Upload Photo</span>
                        </button>
                        {stream && (
                          <button
                            onClick={() => {
                              setError(null);
                              capturePhoto();
                            }}
                            className="flex-1 md:flex-none h-12 px-8 rounded-xl bg-primary hover:bg-[#5a8bb0] text-white font-bold shadow-[0_0_15px_rgba(73,120,156,0.3)] hover:shadow-[0_0_20px_rgba(73,120,156,0.5)] transition-all flex items-center justify-center gap-2 group/btn"
                          >
                            <span className="material-symbols-outlined group-hover/btn:scale-110 transition-transform">
                              camera
                            </span>
                            <span>Capture</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Guidelines */}
                  <div className="rounded-xl bg-[#2e373d]/30 p-4 border border-[#2e373d] flex items-start gap-3">
                    <span className="material-symbols-outlined text-primary mt-0.5">info</span>
                    <div className="text-sm text-[#a2afb9]">
                      <p className="mb-1 text-white font-medium">Tips for best results:</p>
                      <ul className="list-disc list-inside space-y-1 ml-1">
                        <li>Ensure the background is not too busy.</li>
                        <li>Avoid wearing hats or dark sunglasses.</li>
                        <li>Keep a neutral facial expression.</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Right Column: Photo Slots */}
                <div className="lg:col-span-5 flex flex-col h-full">
                  <div className="sticky top-24 space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-bold text-white">Photo</h3>
                      <span className="text-xs font-semibold bg-[#2e373d] text-[#a2afb9] px-2 py-1 rounded">
                        {capturedCount === 1 ? 'Added' : 'Optional'}
                      </span>
                    </div>

                    {/* Front View Slot */}
                    <PhotoSlot
                      angle="front"
                      photo={photos.front}
                      isActive={true}
                      onRetake={retakePhoto}
                    />

                    {/* Actions Footer */}
                    <div className="pt-6 mt-6 border-t border-[#2e373d] space-y-3">
                      <div className="flex justify-between items-center">
                        <button
                          onClick={() => setStep(1)}
                          className="px-6 py-2.5 rounded-lg border border-[#2e373d] text-[#a2afb9] hover:text-white hover:bg-[#2e373d] font-medium transition-colors"
                        >
                          Back
                        </button>
                        <div className="flex gap-3">
                          {capturedCount === 0 && (
                            <button
                              onClick={handleNext}
                              className="px-4 py-2.5 rounded-lg border border-[#2e373d] text-[#a2afb9] hover:text-white hover:bg-[#2e373d] font-medium transition-colors text-sm"
                            >
                              Skip Photos
                            </button>
                          )}
                          <button
                            onClick={handleNext}
                            className="px-6 py-2.5 rounded-lg bg-primary hover:bg-[#5a8bb0] text-white font-bold transition-all flex items-center gap-2"
                          >
                            Next Step
                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                          </button>
                        </div>
                      </div>
                      {capturedCount === 0 && (
                        <p className="text-xs text-yellow-400 text-center">
                          No photo added. You can add a photo later from the people page.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="max-w-3xl mx-auto">
              <div className="mb-10 text-center">
                <h2 className="text-3xl font-bold tracking-tight text-white mb-3">Review & Confirm</h2>
                <p className="text-[#a2afb9] text-lg leading-relaxed">
                  Review the information and photos before saving.
                </p>
              </div>

              <div className="space-y-6 mb-8">
                <div className="bg-[#21272c] rounded-xl p-6 border border-[#2e373d]">
                  <h3 className="text-lg font-bold text-white mb-4">Basic Information</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm text-[#a2afb9]">Name:</span>
                      <p className="text-white font-medium">{name}</p>
                    </div>
                    {relationship && (
                      <div>
                        <span className="text-sm text-[#a2afb9]">Relationship:</span>
                        <p className="text-white font-medium">{relationship}</p>
                      </div>
                    )}
                    {note && (
                      <div>
                        <span className="text-sm text-[#a2afb9]">Note:</span>
                        <p className="text-white font-medium">{note}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-[#21272c] rounded-xl p-6 border border-[#2e373d]">
                  <h3 className="text-lg font-bold text-white mb-4">Reference Photos ({capturedCount})</h3>
                  {capturedCount === 0 ? (
                    <div className="text-center py-8 text-[#a2afb9]">
                      <span className="material-symbols-outlined text-4xl mb-2 block">photo_library</span>
                      <p>No photo added. You can add a photo later from the people page.</p>
                    </div>
                  ) : (
                    <div className="max-w-md mx-auto">
                      {photos.front && (
                        <div className="relative">
                          <div
                            className="aspect-[4/3] rounded-lg bg-cover bg-center border-2 border-primary"
                            style={{ backgroundImage: `url(${photos.front.dataUrl})` }}
                          ></div>
                          <p className="text-xs text-[#a2afb9] mt-2 text-center">Photo</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-2.5 rounded-lg border border-[#2e373d] text-[#a2afb9] hover:text-white hover:bg-[#2e373d] font-medium transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSave}
                  className="px-6 py-2.5 rounded-lg bg-primary hover:bg-[#5a8bb0] text-white font-bold transition-all flex items-center gap-2"
                >
                  Save Person
                  <span className="material-symbols-outlined text-sm">check</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function PhotoSlot({
  angle,
  photo,
  isActive,
  onRetake,
}: {
  angle: PhotoAngle;
  photo?: PersonPhoto;
  isActive: boolean;
  onRetake: () => void;
}) {
  const angleLabels: { [key in PhotoAngle]: string } = {
    front: 'Photo',
  };

  if (photo) {
    return (
      <div className="relative group">
        <div className="flex items-center p-3 rounded-xl bg-[#21272c] border border-green-500/30 hover:bg-[#282f36] transition-colors gap-4">
          <div className="relative w-20 h-20 shrink-0">
            <div
              className="w-full h-full rounded-lg bg-cover bg-center overflow-hidden border-2 border-green-500"
              style={{ backgroundImage: `url(${photo.dataUrl})` }}
            ></div>
            <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-0.5 shadow-md">
              <span className="material-symbols-outlined text-sm font-bold">check</span>
            </div>
          </div>
          <div className="flex-1">
            <h4 className="text-white font-semibold flex items-center gap-2">
              {angleLabels[angle]}
              <span className="text-[10px] uppercase tracking-wider text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded font-bold">
                Ready
              </span>
            </h4>
            <p className="text-sm text-[#a2afb9] mt-0.5">Photo captured successfully.</p>
          </div>
          <button
            onClick={onRetake}
            className="p-2 rounded-lg hover:bg-[#2e373d] text-[#a2afb9] hover:text-white transition-colors"
            title="Retake"
          >
            <span className="material-symbols-outlined">refresh</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative group ${isActive ? 'ring-2 ring-primary ring-offset-2 ring-offset-[#272a30] rounded-xl' : 'opacity-60 hover:opacity-100 transition-opacity'}`}>
      {isActive && (
        <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1.5 h-16 bg-primary rounded-r shadow-[0_0_10px_rgba(73,120,156,0.6)]"></div>
      )}
      <div className={`flex items-center p-3 rounded-xl gap-4 ${isActive ? 'bg-[#2e373d] border border-primary/50' : 'bg-[#21272c] border border-[#2e373d] hover:border-[#49789c]/30'}`}>
        <div className="w-20 h-20 shrink-0 rounded-lg bg-[#161a1d] border-2 border-dashed border-primary/50 flex flex-col items-center justify-center text-primary">
          <span className="material-symbols-outlined text-3xl mb-1">person_search</span>
        </div>
        <div className="flex-1">
          <h4 className={`font-bold flex items-center gap-2 ${isActive ? 'text-white text-primary' : 'text-[#a2afb9]'}`}>
            {angleLabels[angle]}
            {isActive && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
            )}
          </h4>
          <p className={`text-sm mt-0.5 ${isActive ? 'text-white' : 'text-[#a2afb9]/60'}`}>
            {isActive ? 'Waiting for capture...' : 'Upload or capture a photo.'}
          </p>
        </div>
        {isActive && (
          <div className="px-3 py-1 bg-primary/20 text-primary text-xs font-bold rounded uppercase">Active</div>
        )}
      </div>
    </div>
  );
}
