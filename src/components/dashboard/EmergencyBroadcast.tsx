import React, { useState } from 'react';
import { BroadcastMessage } from '../../types';
import { Radio, Megaphone, Send } from 'lucide-react';
import { formatTimeAgo } from '../../utils/formatters';

interface EmergencyBroadcastProps {
  broadcasts: BroadcastMessage[];
  onAddBroadcast?: (broadcast: Omit<BroadcastMessage, 'id' | 'timestamp'>) => void;
}

export const EmergencyBroadcast: React.FC<EmergencyBroadcastProps> = ({ broadcasts, onAddBroadcast }) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [area, setArea] = useState('ALL ZONES');
  const [priority, setPriority] = useState<BroadcastMessage['priority']>('EMERGENCY');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) return;
    onAddBroadcast?.({
      title,
      message,
      targetArea: area,
      priority,
      issuedBy: 'Command Officer',
    });
    setTitle('');
    setMessage('');
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 flex flex-col h-full">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 mb-2">
        <Radio className="w-4 h-4 text-red-400 animate-pulse" />
        <h3 className="font-mono text-xs font-bold text-slate-100 uppercase tracking-wider">
          Broadcast Command & Advisory Stream
        </h3>
      </div>

      {/* Broadcast Creator Form */}
      <form onSubmit={handleSubmit} className="mb-3 p-2 bg-slate-950/80 border border-slate-800 rounded space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Broadcast Title / Advisory Notice..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 placeholder-slate-500 font-mono focus:border-cyan-500 outline-none"
          />
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as any)}
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-slate-200 outline-none"
          >
            <option value="EMERGENCY">EMERGENCY</option>
            <option value="ADVISORY">ADVISORY</option>
            <option value="UPDATE">UPDATE</option>
          </select>
        </div>
        <textarea
          placeholder="Emergency alert message body..."
          rows={2}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 placeholder-slate-500 font-mono focus:border-cyan-500 outline-none resize-none"
        />
        <div className="flex items-center justify-between">
          <input
            type="text"
            placeholder="Target Area (e.g. Ward 4)"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="w-1/2 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] font-mono text-slate-300 outline-none"
          />
          <button
            type="submit"
            className="px-3 py-1 rounded bg-red-600 hover:bg-red-500 text-white font-mono font-bold text-xs flex items-center gap-1.5 shadow-glow-critical transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>TRANSMIT BROADCAST</span>
          </button>
        </div>
      </form>

      {/* Live Broadcast Feed */}
      <div className="space-y-2 overflow-y-auto pr-1 flex-1">
        {broadcasts.map((b) => (
          <div key={b.id} className="p-2 bg-slate-950/60 border border-slate-800/80 rounded">
            <div className="flex items-center justify-between text-[11px] font-mono mb-1">
              <span
                className={`px-1.5 py-0.5 rounded font-bold ${
                  b.priority === 'EMERGENCY'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                    : b.priority === 'ADVISORY'
                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                }`}
              >
                {b.priority}
              </span>
              <span className="text-slate-500">{formatTimeAgo(b.timestamp)}</span>
            </div>
            <h5 className="font-semibold text-xs text-slate-100">{b.title}</h5>
            <p className="text-[11px] text-slate-300 mt-0.5">{b.message}</p>
            <div className="mt-1 text-[10px] font-mono text-slate-500 flex justify-between">
              <span>Target: {b.targetArea}</span>
              <span>Issued By: {b.issuedBy}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
