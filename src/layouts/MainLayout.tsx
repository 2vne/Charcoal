import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import { AlertCircle } from 'lucide-react';

export const MainLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#090D16] text-slate-100 font-sans antialiased">
      <Navbar />

      {/* Emergency Operational Alert Ticker */}
      <div className="bg-red-950/40 border-y border-red-800/50 text-red-300 px-4 py-1 flex items-center gap-3 overflow-hidden text-xs font-mono">
        <div className="flex items-center gap-1.5 shrink-0 bg-red-900/60 px-2 py-0.5 rounded text-white font-bold border border-red-500/50">
          <AlertCircle className="w-3.5 h-3.5 text-red-400 animate-pulse" />
          <span>LIVE TICKER</span>
        </div>
        <div className="whitespace-nowrap overflow-x-auto no-scrollbar scroll-smooth text-slate-300">
          <span className="text-red-400 font-semibold">[CRITICAL ADVISORY]</span> Flash flood warning active in Coastal Ward 4 &bull; 
          <span className="text-yellow-400 font-semibold"> [DISPATCH]</span> Medevac unit RES-102 on-site at Central Hospital &bull; 
          <span className="text-cyan-400 font-semibold"> [SHELTER]</span> Metro Indoor Stadium at 76% capacity (1,140/1,500) &bull; 
          <span className="text-emerald-400 font-semibold"> [LOGISTICS]</span> Clean water convoy approaching Kurla Sector.
        </div>
      </div>

      {/* Page View Container */}
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>

      {/* Tactical Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 px-4 py-3 text-xs font-mono text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-500" />
          <span>PS20 EOC SYSTEM &bull; FRONTEND RELEASE v1.0.0</span>
        </div>
        <div className="text-slate-600 text-[11px]">
          LOCAL STORAGE PERSISTENCE ACTIVE &bull; NO EXTERNAL DATABASE CONNECTED
        </div>
      </footer>
    </div>
  );
};
