import React, { useState } from 'react';
import { UserCheck, ShieldCheck, Share2 } from 'lucide-react';

export const SafeCheckin: React.FC = () => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [checkedIn, setCheckedIn] = useState(false);

  const handleCheckin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setCheckedIn(true);
  };

  return (
    <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-3 font-sans">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <UserCheck className="w-5 h-5 text-emerald-400" />
        <h3 className="font-mono text-sm font-bold text-slate-100 uppercase tracking-wider">
          "Mark Myself Safe" Check-In
        </h3>
      </div>

      {checkedIn ? (
        <div className="p-4 bg-emerald-950/50 border border-emerald-500/40 rounded-lg text-emerald-300 font-mono text-xs text-center space-y-2">
          <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto" />
          <p className="font-bold text-sm text-emerald-200">SAFETY STATUS RECORDED</p>
          <p className="text-slate-300">{name} marked SAFE at current location.</p>
          <button
            onClick={() => setCheckedIn(false)}
            className="mt-2 text-[11px] underline text-emerald-400"
          >
            Update Status
          </button>
        </div>
      ) : (
        <form onSubmit={handleCheckin} className="space-y-3">
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">FULL NAME</label>
            <input
              type="text"
              required
              placeholder="Enter your name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs text-slate-100 placeholder-slate-500 font-mono outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">CONTACT PHONE (OPTIONAL)</label>
            <input
              type="tel"
              placeholder="+1 (555) 000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs text-slate-100 placeholder-slate-500 font-mono outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs rounded-lg flex items-center justify-center gap-2 shadow-glow-emerald transition-all uppercase tracking-wider"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>MARK MYSELF SAFE</span>
          </button>
        </form>
      )}
    </div>
  );
};
