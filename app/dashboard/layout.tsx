import { ReactNode } from 'react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#121212] flex overflow-hidden">
      {/* Elastic Dock / Sidebar */}
      <aside className="w-20 border-r border-zinc-800 bg-[#121212]/80 backdrop-blur-xl flex flex-col items-center py-8 gap-8">
        <div className="w-10 h-10 bg-orange-500 rounded-full shadow-[0_0_20px_rgba(249,115,22,0.4)]" />
        <nav className="flex flex-col gap-4">
          <div className="w-10 h-10 bg-zinc-800 rounded-xl" />
          <div className="w-10 h-10 bg-zinc-800 rounded-xl" />
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
