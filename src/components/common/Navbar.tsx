import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  ShieldAlert, 
  Radio, 
  Truck, 
  Home, 
  BarChart3, 
  Clock, 
  AlertTriangle,
  Send
} from 'lucide-react';
import { StatusIndicator } from './StatusIndicator';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) +
        ' UTC'
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const isReporterMode = location.pathname.startsWith('/report');

  return (
    <header className="sticky top-0 z-50 bg-[#090D16]/95 backdrop-blur border-b border-slate-800">
      {/* Top Telemetry Bar */}
      <div className="bg-slate-950 border-b border-slate-800/80 px-4 py-1.5 flex items-center justify-between text-xs font-mono text-slate-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span className="text-red-400 font-bold tracking-wider">DEFCON 2</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-300">DISASTER DISPATCH ACTIVE</span>
          </div>
          <div className="hidden md:flex items-center gap-2 text-slate-400">
            <StatusIndicator status="active" label="AGENTIC TELEMETRY: SYNCED" />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-1 text-slate-400">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-cyan-300 font-bold">{timeStr}</span>
          </div>
          
          {/* Quick Mode Switcher */}
          <NavLink
            to={isReporterMode ? '/' : '/report'}
            className={`px-2.5 py-1 rounded text-xs font-bold transition-all flex items-center gap-1.5 border ${
              isReporterMode
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40 hover:bg-cyan-500/30'
                : 'bg-red-500/20 text-red-400 border-red-500/40 hover:bg-red-500/30 shadow-glow-critical'
            }`}
          >
            {isReporterMode ? (
              <>
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>SWITCH TO COMMAND CENTER</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>FIELD REPORTER PORTAL</span>
              </>
            )}
          </NavLink>
        </div>
      </div>

      {/* Main Nav Items */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
        {/* Brand */}
        <NavLink to="/" className="flex items-center gap-3 group">
          <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 group-hover:scale-105 transition-transform">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-extrabold text-lg tracking-wider text-slate-100">
                PS20
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-semibold">
                TACTICAL EOC
              </span>
            </div>
            <p className="text-[10px] font-mono text-slate-400 hidden sm:block">
              Agentic Disaster Relief & Emergency Logistics
            </p>
          </div>
        </NavLink>

        {/* Navigation Links */}
        <nav className="flex items-center gap-1 md:gap-2">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `px-3 py-1.5 rounded text-xs font-mono font-medium transition-all flex items-center gap-1.5 border ${
                isActive
                  ? 'bg-slate-800 text-cyan-400 border-cyan-500/40'
                  : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/50'
              }`
            }
          >
            <Radio className="w-4 h-4" />
            <span className="hidden md:inline">COMMAND CENTER</span>
          </NavLink>

          <NavLink
            to="/incidents"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded text-xs font-mono font-medium transition-all flex items-center gap-1.5 border ${
                isActive
                  ? 'bg-slate-800 text-cyan-400 border-cyan-500/40'
                  : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/50'
              }`
            }
          >
            <AlertTriangle className="w-4 h-4 text-orange-400" />
            <span className="hidden md:inline">INCIDENTS</span>
          </NavLink>

          <NavLink
            to="/resources"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded text-xs font-mono font-medium transition-all flex items-center gap-1.5 border ${
                isActive
                  ? 'bg-slate-800 text-cyan-400 border-cyan-500/40'
                  : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/50'
              }`
            }
          >
            <Truck className="w-4 h-4 text-emerald-400" />
            <span className="hidden md:inline">RESOURCES</span>
          </NavLink>

          <NavLink
            to="/shelters"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded text-xs font-mono font-medium transition-all flex items-center gap-1.5 border ${
                isActive
                  ? 'bg-slate-800 text-cyan-400 border-cyan-500/40'
                  : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/50'
              }`
            }
          >
            <Home className="w-4 h-4 text-blue-400" />
            <span className="hidden md:inline">SHELTERS</span>
          </NavLink>

          <NavLink
            to="/analytics"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded text-xs font-mono font-medium transition-all flex items-center gap-1.5 border ${
                isActive
                  ? 'bg-slate-800 text-cyan-400 border-cyan-500/40'
                  : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/50'
              }`
            }
          >
            <BarChart3 className="w-4 h-4 text-purple-400" />
            <span className="hidden md:inline">ANALYTICS</span>
          </NavLink>
        </nav>
      </div>
    </header>
  );
};
