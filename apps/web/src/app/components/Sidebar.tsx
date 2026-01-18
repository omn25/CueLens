interface SidebarProps {
  activePage?: string;
}

export default function Sidebar({ activePage }: SidebarProps) {
  return (
    <aside className="w-64 bg-sidebar-dark dark:bg-sidebar-surface border-r border-slate-200 dark:border-slate-700 flex flex-col shrink-0">
      <div className="p-6">
        <h2 className="text-xl font-bold text-white">CueLens</h2>
      </div>
      <nav className="flex-1 px-4">
        <ul className="space-y-2">
          <li>
            <a
              href="/people"
              className={`block px-4 py-2 rounded-lg transition-colors ${
                activePage === 'people'
                  ? 'bg-primary text-white'
                  : 'text-slate-300 hover:bg-white/10'
              }`}
            >
              People
            </a>
          </li>
          <li>
            <a
              href="/places"
              className={`block px-4 py-2 rounded-lg transition-colors ${
                activePage === 'places'
                  ? 'bg-primary text-white'
                  : 'text-slate-300 hover:bg-white/10'
              }`}
            >
              Places
            </a>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
