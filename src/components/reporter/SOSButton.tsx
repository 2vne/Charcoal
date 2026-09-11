import React, { useState } from 'react';
import { AlertCircle, Radio, CheckCircle, PhoneCall } from 'lucide-react';

interface SOSButtonProps {
  onTriggerSOS?: () => void;
}

export const SOSButton: React.FC<SOSButtonProps> = ({ onTriggerSOS }) => {
  const [active, setActive] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSOS = () => {
    setActive(true);
    setTimeout(() => {
      setActive(false);
      setSent(true);
      onTriggerSOS?.();
    }, 2000);
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-slate-900/90 border border-red-900/60 rounded-2xl text-center relative overflow-hidden">
      <div className="absolute inset-0 bg-red-950/20 pointer-events-none" />
      <h2 className="text-lg font-mono font-bold text-red-400 uppercase tracking-widest flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-red-500 animate-pulse" />
        EMERGENCY SOS DISTRESS SIGNAL
      </h2>
      <p className="text-xs text-slate-400 mt-1 max-w-sm">
        Pressing this transmits your GPS coordinates directly to the EOC Command Dispatch center.
      </p>

      {sent ? (
        <div className="mt-6 p-4 bg-emerald-950/60 border border-emerald-500/50 rounded-xl text-emerald-300 font-mono text-xs flex flex-col items-center gap-2">
          <CheckCircle className="w-8 h-8 text-emerald-400 animate-bounce" />
          <span className="font-bold text-sm text-emerald-200">SOS SIGNAL TRANSMITTED</span>
          <span>Emergency units alerted. Dispatching rescue team to your coordinates.</span>
          <button
            onClick={() => setSent(false)}
            className="mt-2 text-[11px] underline text-emerald-400"
          >
            Send Additional Info
          </button>
        </div>
      ) : (
        <button
          onClick={handleSOS}
          disabled={active}
          className={`mt-6 w-36 h-36 rounded-full flex flex-col items-center justify-center font-mono font-extrabold text-2xl transition-all shadow-glow-critical border-4 ${
            active
              ? 'bg-red-700 text-white border-white animate-ping'
              : 'bg-red-600 hover:bg-red-500 text-white border-red-400 active:scale-95'
          }`}
        >
          <Radio className="w-8 h-8 mb-1 animate-pulse" />
          <span>{active ? 'SENDING...' : '1-TAP SOS'}</span>
        </button>
      )}

      <div className="mt-6 flex items-center justify-center gap-4 text-xs font-mono text-slate-400 border-t border-slate-800 pt-4 w-full">
        <a
          href="tel:911"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200"
        >
          <PhoneCall className="w-4 h-4 text-emerald-400" />
          <span>DIRECT HOTLINE 911</span>
        </a>
      </div>
    </div>
  );
};
