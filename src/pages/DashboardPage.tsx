import React, { useState } from 'react';
import { useDisasterContext } from '../context/DisasterContext';
import { StatCard } from '../components/common/StatCard';
import { SituationMap } from '../components/map/SituationMap';
import { IncidentFeed } from '../components/dashboard/IncidentFeed';
import { ResourceSummary } from '../components/dashboard/ResourceSummary';
import { ShelterOverview } from '../components/dashboard/ShelterOverview';

import {
  AlertTriangle,
  Users,
  Truck,
  Home,
  RefreshCcw,
  Loader2,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const {
    incidents,
    resources,
    shelters,
    updateIncidentStatus,
    resetState,
  } = useDisasterContext();

  const [selectedIncidentId, setSelectedIncidentId] = useState<string | undefined>();
  const [isResetting, setIsResetting] = useState(false);

  const criticalCount = incidents.filter((i) => i.severity === 'CRITICAL').length;
  const strandedTotal = incidents.reduce((acc, i) => acc + i.strandedCount, 0);
  const activeResources = resources.filter((r) => r.status === 'ON_SITE' || r.status === 'EN_ROUTE').length;
  const totalShelterCapacity = shelters.reduce((acc, s) => acc + s.capacity, 0);
  const totalShelterOccupancy = shelters.reduce((acc, s) => acc + s.currentOccupancy, 0);

  const handleResetData = async () => {
    if (isResetting) return;
    try {
      setIsResetting(true);
      await resetState();
    } catch (err) {
      console.error('Reset mock state error:', err);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="flex-1 p-3 md:p-4 space-y-4 max-w-[1800px] mx-auto w-full">
      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Critical Emergencies"
          value={criticalCount}
          subtitle="Life-Threatening Triage Priority"
          icon={AlertTriangle}
          accentColor="red"
          trend={{ value: `${incidents.filter((i) => i.status === 'REPORTED').length} Awaiting Dispatch`, isPositive: false }}
        />
        <StatCard
          title="Stranded Citizens"
          value={strandedTotal}
          subtitle="Awaiting Rescue / Evacuation"
          icon={Users}
          accentColor="orange"
          trend={{ value: `${incidents.reduce((acc, i) => acc + (i.injuredCount || 0), 0)} Injured Total`, isPositive: false }}
        />
        <StatCard
          title="Deployed Units"
          value={`${activeResources}/${resources.length}`}
          subtitle="Medevac & Rescue Teams"
          icon={Truck}
          accentColor="cyan"
          trend={{ value: `${resources.filter((r) => r.status === 'AVAILABLE').length} Reserve Units Ready`, isPositive: true }}
        />
        <StatCard
          title="Shelter Capacity"
          value={`${Math.round((totalShelterOccupancy / (totalShelterCapacity || 1)) * 100)}%`}
          subtitle={`${totalShelterOccupancy} / ${totalShelterCapacity} Occupied`}
          icon={Home}
          accentColor="emerald"
          trend={{ value: `${shelters.filter((s) => s.status !== 'CLOSED').length} Safe Shelters Open`, isPositive: true }}
        />
      </div>

      {/* Main EOC Command Center Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[750px]">
        {/* Left Column: Live Incident Stream & Triage */}
        <div className="lg:col-span-4 h-full overflow-hidden">
          <IncidentFeed
            incidents={incidents}
            onSelectIncident={setSelectedIncidentId}
            onUpdateStatus={updateIncidentStatus}
          />
        </div>

        {/* Center Column: Live Situation Map & Tactical Map Controls */}
        <div className="lg:col-span-5 h-full flex flex-col gap-3">
          <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg font-mono text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold">LIVE MAP RADAR & SATELLITE LAYER</span>
            </div>
            <button
              onClick={handleResetData}
              disabled={isResetting}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-slate-700 text-slate-400 hover:text-slate-200 rounded text-[10px] flex items-center gap-1 transition-all"
            >
              {isResetting ? (
                <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />
              ) : (
                <RefreshCcw className="w-3 h-3" />
              )}
              <span>{isResetting ? 'GENERATING MOCK STATE...' : 'RESET MOCK STATE'}</span>
            </button>
          </div>

          <div className="flex-1 min-h-0">
            <SituationMap
              incidents={incidents}
              shelters={shelters}
              resources={resources}
              selectedIncidentId={selectedIncidentId}
              onSelectIncident={setSelectedIncidentId}
              onUpdateIncidentStatus={updateIncidentStatus}
              height="100%"
            />
          </div>
        </div>

        {/* Right Column: Resources & Shelters */}
        <div className="lg:col-span-3 h-full flex flex-col gap-3 overflow-hidden">
          <div className="flex-1 min-h-0">
            <ResourceSummary resources={resources} />
          </div>
          <div className="flex-1 min-h-0">
            <ShelterOverview shelters={shelters} />
          </div>
        </div>
      </div>
    </div>
  );
};
