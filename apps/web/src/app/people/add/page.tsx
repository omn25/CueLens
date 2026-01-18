import Link from 'next/link';
import Image from 'next/image';

export default function AddPersonPage() {
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
              <Link href="#" className="hover:text-white transition-colors">
                Settings
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div
              className="h-8 w-8 rounded-full bg-cover bg-center ring-2 ring-[#2e373d]"
              style={{
                backgroundImage:
                  "url('https://lh3.googleusercontent.com/aida-public/AB6AXuB3_zph7171dbi4lwhcl5l8KL4KNL2oHEjETc2zG6zMHGVQOu7tT6djmrAvMJ6Zl2pLjCjINRtLZSup5cdJ5uWmjFy040077fdPib8WJS1vKC3w2rFOsmJ24ibNjWRm_u2C6VWSxECxvRiLSm0VClHRiDkURMTE5nXm6q2aP0GpC2NB-kXVzVCaDIDkvIDL7YrljLQ46uA_RdQoTHUn7zdcInN4rFVq-WMRmQEsxGUzbjo8WLaghyndTObYEGpJVkcP8Yu_-Zq4JHsh')",
              }}
            ></div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1200px] px-6 py-8">
          {/* Progress Stepper */}
          <div className="mb-10 max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-primary">Step 2 of 3</span>
              <span className="text-sm text-[#a2afb9]">Next: Review & Confirm</span>
            </div>
            <div className="relative h-2 w-full rounded-full bg-[#2e373d]">
              <div className="absolute top-0 left-0 h-full w-2/3 rounded-full bg-primary transition-all duration-500 ease-out"></div>
              {/* Step Markers */}
              <div className="absolute top-1/2 -translate-y-1/2 left-0 h-4 w-4 rounded-full bg-primary border-4 border-[#272a30]"></div>
              <div className="absolute top-1/2 -translate-y-1/2 left-1/3 h-4 w-4 rounded-full bg-primary border-4 border-[#272a30]"></div>
              <div className="absolute top-1/2 -translate-y-1/2 left-2/3 h-4 w-4 rounded-full bg-white border-4 border-primary shadow-[0_0_0_4px_rgba(73,120,156,0.3)]"></div>
              <div className="absolute top-1/2 -translate-y-1/2 right-0 h-4 w-4 rounded-full bg-[#2e373d] border-4 border-[#272a30]"></div>
            </div>
            <div className="flex justify-between mt-2 text-xs font-medium text-[#a2afb9]">
              <span className="text-primary w-1/3">Basic Info</span>
              <span className="text-white w-1/3 text-center">Reference Photos</span>
              <span className="w-1/3 text-right">Review</span>
            </div>
          </div>

          {/* Page Header */}
          <div className="mb-10 text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold tracking-tight text-white mb-3">Capture Reference Photos</h2>
            <p className="text-[#a2afb9] text-lg leading-relaxed">
              We need to learn what <span className="text-white font-semibold">Arthur</span> looks like. Capture 3 photos
              from different angles to ensure accurate recognition.
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
                    <span className="material-symbols-outlined text-red-500 animate-pulse text-[10px]">circle</span>
                    <span className="text-sm font-semibold text-white tracking-wide uppercase">Live Feed</span>
                  </div>
                  <button className="text-[#a2afb9] hover:text-white text-sm flex items-center gap-1 transition-colors">
                    <span className="material-symbols-outlined text-lg">settings</span>
                    <span>Settings</span>
                  </button>
                </div>

                {/* Video Feed Area */}
                <div className="relative aspect-[4/3] bg-black w-full flex items-center justify-center overflow-hidden">
                  {/* Placeholder for video stream */}
                  <div className="absolute inset-0 bg-[#000] opacity-40"></div>
                  {/* Fake person silhouette overlay */}
                  <div className="absolute inset-0 flex items-end justify-center pointer-events-none opacity-20">
                    <svg className="h-4/5 w-auto fill-white" viewBox="0 0 200 200">
                      <path d="M100 0C70 0 50 20 50 60C50 100 70 110 70 110C30 120 10 160 10 200H190C190 160 170 120 130 110C130 110 150 100 150 60C150 20 130 0 100 0Z"></path>
                    </svg>
                  </div>
                  {/* Face Guide Frame */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-64 h-80 border-2 border-white/30 rounded-[3rem] relative">
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-xs font-medium text-white border border-white/10">
                        Center Face Here
                      </div>
                      {/* Corner accents */}
                      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary rounded-tl-xl -mt-0.5 -ml-0.5"></div>
                      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary rounded-tr-xl -mt-0.5 -mr-0.5"></div>
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary rounded-bl-xl -mb-0.5 -ml-0.5"></div>
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary rounded-br-xl -mb-0.5 -mr-0.5"></div>
                    </div>
                  </div>
                  {/* Quality Indicators Overlay */}
                  <div className="absolute top-4 right-4 flex flex-col gap-2">
                    <div className="glass-panel px-3 py-1.5 rounded-full flex items-center gap-2">
                      <span className="material-symbols-outlined text-green-400 text-sm">check_circle</span>
                      <span className="text-xs font-medium text-white">Good Lighting</span>
                    </div>
                    <div className="glass-panel px-3 py-1.5 rounded-full flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-sm">face</span>
                      <span className="text-xs font-medium text-white">Face Detected</span>
                    </div>
                  </div>
                  {/* Main Video Image */}
                  <Image
                    alt="Live camera feed showing a person's face"
                    className="w-full h-full object-cover opacity-80 mix-blend-overlay"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuA_7zKLlKnOUeJlyQgz4vd_Z0QcPRmOKVRNecpv8zqoxXC4j8v59aTSu8bH_-tvqmpKcB8GCmvF4REM8OvGIv747vR-IA__W_2MyGfP3R6k4nWPFjbw0zZWld4xof76xNESONylemrsWQz-lKQFirXGrLuWKy7djXsYwymLoWjzlzN7sPy7bnxLbMeq9pvpCpYYMq8sKRRILGdouj5tA962-FT83f8R0zzpmydRcmjmuW9uU6ydUK3CnNJAy2NV4pxyQQAZZg1ldNLT"
                    width={1280}
                    height={960}
                    unoptimized
                  />
                </div>

                {/* Camera Controls Footer */}
                <div className="p-6 bg-[#161a1d] flex flex-col md:flex-row items-center justify-between gap-4 border-t border-[#2e373d]">
                  <div className="text-[#a2afb9] text-sm hidden md:block">
                    <p>Ensure the face is clearly visible.</p>
                  </div>
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <button className="flex-1 md:flex-none h-12 px-6 rounded-xl bg-[#2e373d] hover:bg-[#38444d] text-white font-medium transition-all flex items-center justify-center gap-2 border border-transparent hover:border-[#49789c]">
                      <span className="material-symbols-outlined">upload_file</span>
                      <span>Upload</span>
                    </button>
                    <button className="flex-1 md:flex-none h-12 px-8 rounded-xl bg-primary hover:bg-[#5a8bb0] text-white font-bold shadow-[0_0_15px_rgba(73,120,156,0.3)] hover:shadow-[0_0_20px_rgba(73,120,156,0.5)] transition-all flex items-center justify-center gap-2 group/btn">
                      <span className="material-symbols-outlined group-hover/btn:scale-110 transition-transform">
                        camera
                      </span>
                      <span>Capture Photo</span>
                    </button>
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

            {/* Right Column: The "Slots" */}
            <div className="lg:col-span-5 flex flex-col h-full">
              <div className="sticky top-24 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-white">Required Angles</h3>
                  <span className="text-xs font-semibold bg-[#2e373d] text-[#a2afb9] px-2 py-1 rounded">
                    1 of 3 Captured
                  </span>
                </div>

                {/* Slot 1: Front (Completed) */}
                <div className="relative group cursor-pointer">
                  <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-12 bg-accent-green rounded-r hidden group-hover:block"></div>
                  <div className="flex items-center p-3 rounded-xl bg-[#21272c] border border-accent-green/30 hover:bg-[#282f36] transition-colors gap-4">
                    <div className="relative w-20 h-20 shrink-0">
                      <div
                        className="w-full h-full rounded-lg bg-cover bg-center overflow-hidden border-2 border-accent-green"
                        style={{
                          backgroundImage:
                            "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDMz-PlPv3Wru_q3U0Fl64RXAhVEd06emkiGa4Jl9SVOdJur4gufctB7Q4kjTLTcIWk3uTFBHigkiH-krOpzhT1FHU5Z1_cm7PLhRvQqm7PU4QkmizZ9C_DwvHtKcjIfVWFXT39KoUdHjCkkgR4nLvh2dG_-szWRO6LA5bfKCA2J-ebixAn__-kDPV3mFL6Zo29TWk8Gu8azbiz3uv6tH20PZKm0qoqAgINf1VstMKhXKtisFv_Phhzs8fg_Rx3tRDqqnV_MP60mp88')",
                        }}
                      ></div>
                      <div className="absolute -top-2 -right-2 bg-accent-green text-white rounded-full p-0.5 shadow-md">
                        <span className="material-symbols-outlined text-sm font-bold">check</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-white font-semibold flex items-center gap-2">
                        Front View
                        <span className="text-[10px] uppercase tracking-wider text-accent-green bg-accent-green/10 px-1.5 py-0.5 rounded font-bold">
                          Ready
                        </span>
                      </h4>
                      <p className="text-sm text-[#a2afb9] mt-0.5">Photo captured successfully.</p>
                    </div>
                    <button
                      className="p-2 rounded-lg hover:bg-[#2e373d] text-[#a2afb9] hover:text-white transition-colors"
                      title="Retake"
                    >
                      <span className="material-symbols-outlined">refresh</span>
                    </button>
                  </div>
                </div>

                {/* Slot 2: Left Profile (Active) */}
                <div className="relative group cursor-pointer ring-2 ring-primary ring-offset-2 ring-offset-[#272a30] rounded-xl">
                  <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1.5 h-16 bg-primary rounded-r shadow-[0_0_10px_rgba(73,120,156,0.6)]"></div>
                  <div className="flex items-center p-3 rounded-xl bg-[#2e373d] border border-primary/50 gap-4">
                    <div className="w-20 h-20 shrink-0 rounded-lg bg-[#21272c] border-2 border-dashed border-primary/50 flex flex-col items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-3xl mb-1">person_search</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-white font-bold flex items-center gap-2 text-primary">
                        Left Profile
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                        </span>
                      </h4>
                      <p className="text-sm text-white mt-0.5">Waiting for capture...</p>
                    </div>
                    <div className="px-3 py-1 bg-primary/20 text-primary text-xs font-bold rounded uppercase">Active</div>
                  </div>
                </div>

                {/* Slot 3: Right Profile (Pending) */}
                <div className="relative group cursor-pointer opacity-60 hover:opacity-100 transition-opacity">
                  <div className="flex items-center p-3 rounded-xl bg-[#21272c] border border-[#2e373d] hover:border-[#49789c]/30 gap-4">
                    <div className="w-20 h-20 shrink-0 rounded-lg bg-[#161a1d] border border-[#2e373d] flex flex-col items-center justify-center text-[#a2afb9]">
                      <span className="material-symbols-outlined text-3xl opacity-50">portrait</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-[#a2afb9] font-medium">Right Profile</h4>
                      <p className="text-xs text-[#a2afb9]/60 mt-0.5">Turn head to the right.</p>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-6 mt-6 border-t border-[#2e373d] flex justify-between items-center">
                  <Link
                    href="/people"
                    className="px-6 py-2.5 rounded-lg border border-[#2e373d] text-[#a2afb9] hover:text-white hover:bg-[#2e373d] font-medium transition-colors"
                  >
                    Back
                  </Link>
                  <button
                    className="px-6 py-2.5 rounded-lg bg-[#2e373d] text-[#a2afb9] cursor-not-allowed font-medium flex items-center gap-2"
                    disabled
                  >
                    Next Step
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
