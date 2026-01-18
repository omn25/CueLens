import Sidebar from '../components/Sidebar';
import Link from 'next/link';

export default function PlacesPage() {
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
              <Link
                href="/places/capture"
                className="flex items-center justify-center gap-2 bg-primary hover:bg-[#3a6280] text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:shadow-primary/20 transition-all active:scale-95 min-w-[160px]"
              >
                <span className="material-symbols-outlined">add_location_alt</span>
                <span>Add Place</span>
              </Link>
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
              {/* Card 1 */}
              <div className="group bg-white dark:bg-card-dark rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700/50 hover:border-primary/50 dark:hover:border-primary/50 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 flex flex-col">
                <div className="relative h-48 w-full overflow-hidden bg-slate-800">
                  {/* Image */}
                  <div
                    className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
                    style={{
                      backgroundImage:
                        "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDP6BxneXlU_RTbg__-oXqpojlLZmeIUqA_NQOLhLtIjTr3fQhdySpnXdVbsrbb-mhDxixBwXCXbjNpAUNkitL5KVDPU1wXQ6Z55skJ3GKooztfyuAirDn0gPu9Ex_QtNUc9wL--LeZhF3sdBqt3DTbpHqaHMz7DWxHNlQjojtVJe3XkWxHiwP2Tcw0_Ps2tkCbW_C9P1o8sF8dgOK3fqQxgincQ8nxDunrn11EPy16BTcOYWtEJsumDy2hxJESxqpJhTWdgkPnjnHH')",
                    }}
                  ></div>
                  {/* Overlay Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80"></div>
                  {/* Badges on Image */}
                  <div className="absolute top-4 left-4">
                    <span className="bg-black/40 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">home</span>
                      Home
                    </span>
                  </div>
                  <div className="absolute bottom-4 left-4">
                    <span className="text-white text-xs font-medium bg-emerald-500/90 backdrop-blur-sm px-2.5 py-1 rounded-md shadow-sm">
                      Quality: Excellent
                    </span>
                  </div>
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                      Living Room
                    </h3>
                    <button className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/10 transition-colors">
                      <span className="material-symbols-outlined">more_horiz</span>
                    </button>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-4 line-clamp-2">
                    Main orientation point. Includes sofa and TV area markers.
                  </p>
                  <div className="mt-auto pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">schedule</span>
                      <span>Last seen 2m ago</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-400">
                      <span className="material-symbols-outlined text-[16px] icon-filled">verified</span>
                      <span>Synced</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2 */}
              <div className="group bg-white dark:bg-card-dark rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700/50 hover:border-primary/50 dark:hover:border-primary/50 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 flex flex-col">
                <div className="relative h-48 w-full overflow-hidden bg-slate-800">
                  <div
                    className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
                    style={{
                      backgroundImage:
                        "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCzoTFEhVdtPfqgDsNy_QEESAR_oZkrvtjfDfzF1hv2E43da7UTH_StzN9uDHuOjgNyb871noS4FY4ZsfQ8skRjiXz-pPrSPtp0TQ_2jPZzyz7Y9j720rRQmcxjPMso2_11IaSKVe2E8HeIYN1e2OS7X3flFV2nx3dnPr_ZR3tndBSncBPhJrEiiy1HFSttBGxufj98v22SeJdioAVKUQrRuBTuqscQ1hb37TenQAXwCQOyCtBEVP4LC6-4el_W07xClX55Otp56uJX')",
                    }}
                  ></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80"></div>
                  <div className="absolute top-4 left-4">
                    <span className="bg-black/40 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">local_hospital</span>
                      Clinic
                    </span>
                  </div>
                  <div className="absolute bottom-4 left-4">
                    <span className="text-slate-900 text-xs font-bold bg-amber-400/90 backdrop-blur-sm px-2.5 py-1 rounded-md shadow-sm">
                      Quality: Fair
                    </span>
                  </div>
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                      Dr. Smith's Waiting Room
                    </h3>
                    <button className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/10 transition-colors">
                      <span className="material-symbols-outlined">more_horiz</span>
                    </button>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-4 line-clamp-2">
                    Low light conditions often detected. Assistance may be needed.
                  </p>
                  <div className="mt-auto pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">schedule</span>
                      <span>Last seen 3d ago</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-amber-400">
                      <span className="material-symbols-outlined text-[16px]">warning</span>
                      <span>Needs Review</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3 */}
              <div className="group bg-white dark:bg-card-dark rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700/50 hover:border-primary/50 dark:hover:border-primary/50 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 flex flex-col">
                <div className="relative h-48 w-full overflow-hidden bg-slate-800">
                  <div
                    className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
                    style={{
                      backgroundImage:
                        "url('https://lh3.googleusercontent.com/aida-public/AB6AXuA7Zt0ORx0t-X8j0p1XseB4ZbddoIPmxyPadjCCm9YwcVNNysHGpl2IdP39CoP4kWXIVpBP9yfPb3fX7HPjzvhjBOmNJV4uHP5DjL6nUkpeQlbpcf4q43MIyEXG7mUa92ozDZdugZWfGuoiCKEG7SZbzb03AnP4KlqdHY4Pa31zIswq7tpBaUMwjBYG-kuKkY6Fjt4OfXrXR2PnV5ZujCwOUa1oZjfdLDtf-e0Uz7JQD6MWfXtJ1UkEwWbxxBkTj8Sajt_eOyEQavfT')",
                    }}
                  ></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80"></div>
                  <div className="absolute top-4 left-4">
                    <span className="bg-black/40 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">home</span>
                      Home
                    </span>
                  </div>
                  <div className="absolute bottom-4 left-4">
                    <span className="text-white text-xs font-medium bg-emerald-500/90 backdrop-blur-sm px-2.5 py-1 rounded-md shadow-sm">
                      Quality: Good
                    </span>
                  </div>
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                      Kitchen
                    </h3>
                    <button className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/10 transition-colors">
                      <span className="material-symbols-outlined">more_horiz</span>
                    </button>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-4 line-clamp-2">
                    High recognition confidence. Contains fridge and stove markers.
                  </p>
                  <div className="mt-auto pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">schedule</span>
                      <span>Last seen 1h ago</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-400">
                      <span className="material-symbols-outlined text-[16px] icon-filled">verified</span>
                      <span>Synced</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 4 */}
              <div className="group bg-white dark:bg-card-dark rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700/50 hover:border-primary/50 dark:hover:border-primary/50 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 flex flex-col">
                <div className="relative h-48 w-full overflow-hidden bg-slate-800">
                  <div
                    className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
                    style={{
                      backgroundImage:
                        "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAej4glUSGhXTrvK8pkYr6hsqFFpGMHWyXPPK3lVc05szTo1pDC0uMU8fWk0gbCP_C2uP6ktdgZlQMoUn-PFYUmlb5Mt-yF35d8G4iRu-Grb-hcGifYfqxbGPKkd6J376O3RcJeYW0LyV29PutHrN4ocA5Hovsy0e_N1yvp-JKxWPYZCo1mePMQ_x19q5qgL_6qo5ps6bdv7lHTvY3Rn0pQcf-3dkejAgG-kB1wfAeT80l8lbEdgDBR6a1ycn9kIaEn2WNkOSA2pKBJ')",
                    }}
                  ></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80"></div>
                  <div className="absolute top-4 left-4">
                    <span className="bg-black/40 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">work</span>
                      Office
                    </span>
                  </div>
                  <div className="absolute bottom-4 left-4">
                    <span className="text-white text-xs font-medium bg-emerald-500/90 backdrop-blur-sm px-2.5 py-1 rounded-md shadow-sm">
                      Quality: Good
                    </span>
                  </div>
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                      Community Center
                    </h3>
                    <button className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/10 transition-colors">
                      <span className="material-symbols-outlined">more_horiz</span>
                    </button>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-4 line-clamp-2">
                    Recreation room. Last visual map update was successful.
                  </p>
                  <div className="mt-auto pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">schedule</span>
                      <span>Last seen 5d ago</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-400">
                      <span className="material-symbols-outlined text-[16px] icon-filled">verified</span>
                      <span>Synced</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Add New Card Placeholder */}
              <div className="group bg-slate-50 dark:bg-card-dark/30 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-primary/50 dark:hover:border-primary/50 hover:bg-slate-100 dark:hover:bg-card-dark/50 transition-all cursor-pointer flex flex-col items-center justify-center p-8 min-h-[360px]">
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
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
