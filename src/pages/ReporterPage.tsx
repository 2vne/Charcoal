import React, { useState } from 'react';
import { useIncidents } from '../hooks/useIncidents';
import { useShelters } from '../hooks/useShelters';
import { SOSButton } from '../components/reporter/SOSButton';
import { IncidentForm } from '../components/reporter/IncidentForm';
import { SafeCheckin } from '../components/reporter/SafeCheckin';
import { NearbyShelters } from '../components/reporter/NearbyShelters';
import { ShieldAlert, Send, UserCheck, Home } from 'lucide-react';

export const ReporterPage: React.FC = () => {
  const { addIncident } = useIncidents();
  const { shelters } = useShelters();
  const [activeTab, setActiveTab] = useState<'SOS' | 'REPORT' | 'SAFE' | 'SHELTERS'>('SOS');

  const handleSOS = () => {
    addIncident({
      title: 'CRITICAL 1-TAP SOS DISTRESS SIGNAL',
      category: 'MEDICAL_EMERGENCY',
      severity: 'CRITICAL',
      status: 'REPORTED',
      location: {
        lat: 19.0760,
        lng: 72.8777,
        address: 'GPS Auto-Detected Distress Location',
        zone: 'Metro Sector',
      },
      reportedBy: 'Citizen SOS Mobile App',
      strandedCount: 1,
      injuredCount: 0,
      urgentNeeds: ['EVACUATION', 'PARAMEDIC'],
      description: 'Emergency 1-tap SOS signal triggered by citizen device.',
    });
  };

  const handleFormReport = (data: {
    title: string;
    category: any;
    severity: any;
    address: string;
    lat: number;
    lng: number;
    zone?: string;
    strandedCount: number;
    injuredCount: number;
    urgentNeeds: string[];
    description: string;
  }) => {
    addIncident({
      title: data.title,
      category: data.category,
      severity: data.severity,
      status: 'REPORTED',
      location: {
        lat: data.lat,
        lng: data.lng,
        address: data.address,
        zone: data.zone || 'Field Zone',
      },
      reportedBy: 'Citizen Field Report',
      strandedCount: data.strandedCount,
      injuredCount: data.injuredCount,
      urgentNeeds: data.urgentNeeds,
      description: data.description,
    });
  };

  return (
    <div className="flex-1 bg-[#090D16] p-4 max-w-lg mx-auto w-full space-y-4">
      {/* Header Info */}
      <div className="text-center font-mono space-y-1">
        <span className="px-2 py-0.5 rounded text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 font-bold uppercase tracking-wider">
          CITIZEN DISASTER ASSISTANCE PORTAL
        </span>
        <h1 className="text-xl font-extrabold text-slate-100">Emergency Field Response</h1>
        <p className="text-xs text-slate-400">
          Request immediate rescue, file disaster reports, or locate safe shelters.
        </p>
      </div>

      {/* Mobile Navigation Tabs */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl font-mono text-[10px] font-bold">
        <button
          onClick={() => setActiveTab('SOS')}
          className={`py-2 rounded-lg flex flex-col items-center gap-1 transition-all ${
            activeTab === 'SOS'
              ? 'bg-red-600 text-white shadow-glow-critical'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>1-TAP SOS</span>
        </button>

        <button
          onClick={() => setActiveTab('REPORT')}
          className={`py-2 rounded-lg flex flex-col items-center gap-1 transition-all ${
            activeTab === 'REPORT'
              ? 'bg-cyan-600 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>REPORT</span>
        </button>

        <button
          onClick={() => setActiveTab('SAFE')}
          className={`py-2 rounded-lg flex flex-col items-center gap-1 transition-all ${
            activeTab === 'SAFE'
              ? 'bg-emerald-600 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>MARK SAFE</span>
        </button>

        <button
          onClick={() => setActiveTab('SHELTERS')}
          className={`py-2 rounded-lg flex flex-col items-center gap-1 transition-all ${
            activeTab === 'SHELTERS'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Home className="w-4 h-4" />
          <span>SHELTERS</span>
        </button>
      </div>

      {/* Active Tab Component */}
      <div>
        {activeTab === 'SOS' && <SOSButton onTriggerSOS={handleSOS} />}
        {activeTab === 'REPORT' && <IncidentForm onSubmitReport={handleFormReport as any} />}
        {activeTab === 'SAFE' && <SafeCheckin />}
        {activeTab === 'SHELTERS' && <NearbyShelters shelters={shelters} />}
      </div>
    </div>
  );
};
