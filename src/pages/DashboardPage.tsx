import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useDisasterContext } from '../context/DisasterContext';
import { EmergencyPlace } from '../types';
import { StatCard } from '../components/common/StatCard';
import { SituationMap } from '../components/map/SituationMap';
import { IncidentFeed } from '../components/dashboard/IncidentFeed';
import { ResourceSummary } from '../components/dashboard/ResourceSummary';
import { ShelterOverview } from '../components/dashboard/ShelterOverview';
import { calculateHaversineDistance } from '../utils/aiRecommendationEngine';

import {
  AlertTriangle,
  Users,
  Truck,
  Home,
  RefreshCcw,
  Loader2,
} from 'lucide-react';

/** Hook that flashes a boolean for 600ms whenever `value` changes */
function useFlash(value: unknown): boolean {
  const [flashing, setFlashing] = useState(false);
  const prevRef = useRef(value);
  useEffect(() => {
    if (prevRef.current !== value) {
      prevRef.current = value;
      setFlashing(true);
      const t = setTimeout(() => setFlashing(false), 600);
      return () => clearTimeout(t);
    }
  }, [value]);
  return flashing;
}

export const DashboardPage: React.FC = () => {
  const {
    incidents,
    resources,
    shelters,
    updateIncidentStatus,
    dispatchResource,
    getNearbyEmergencyPlaces,
    resetState,
  } = useDisasterContext();

  const [selectedIncidentId, setSelectedIncidentId] = useState<string | undefined>();
  const [targetResourceId, setTargetResourceId] = useState<string | undefined>();
  const [targetPlace, setTargetPlace] = useState<EmergencyPlace | undefined>();
  const [nearbyPlaces, setNearbyPlaces] = useState<EmergencyPlace[]>([]);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    const selInc = incidents.find((i) => i.id === selectedIncidentId) || incidents[0];
    if (selInc?.location?.lat && selInc?.location?.lng) {
      getNearbyEmergencyPlaces(selInc.location.lat, selInc.location.lng, 5000).then((res) => {
        if (res.success && res.places) {
          setNearbyPlaces(res.places);
        }
      });
    }
  }, [selectedIncidentId, incidents, getNearbyEmergencyPlaces]);

  // Active incident selected
  const activeIncident = useMemo(
    () => incidents.find((i) => i.id === selectedIncidentId) || incidents[0],
    [incidents, selectedIncidentId]
  );

  // Filter mobile units strictly in 5km radius of active incident
  const inRadiusUnits = useMemo(() => {
    if (!activeIncident?.location?.lat) return resources;
    const incLat = activeIncident.location.lat;
    const incLng = activeIncident.location.lng;
    return resources.filter((r) => {
      const resLat = r.currentLocation?.lat ?? 0;
      const resLng = r.currentLocation?.lng ?? 0;
      return calculateHaversineDistance(resLat, resLng, incLat, incLng) <= 5.0;
    });
  }, [resources, activeIncident]);

  const activeInRadiusCount = useMemo(
    () => inRadiusUnits.filter((r) => r.status === 'ON_SITE' || r.status === 'EN_ROUTE').length,
    [inRadiusUnits]
  );

  const availableInRadiusCount = useMemo(
    () => inRadiusUnits.filter((r) => r.status === 'AVAILABLE').length,
    [inRadiusUnits]
  );

  const totalGlobalActiveCount = useMemo(
    () => resources.filter((r) => r.status === 'ON_SITE' || r.status === 'EN_ROUTE').length,
    [resources]
  );

  // ── Derived live metrics (auto-reactive to any context state change) ─────────
  const criticalCount = useMemo(
    () => incidents.filter((i) => i.severity === 'CRITICAL').length,
    [incidents]
  );

  const strandedTotal = useMemo(
    () => incidents.reduce((acc, i) => acc + (i.strandedCount ?? 0), 0),
    [incidents]
  );

  const totalShelterCapacity = useMemo(
    () => shelters.reduce((acc, s) => acc + s.capacity, 0),
    [shelters]
  );

  const totalShelterOccupancy = useMemo(
    () => shelters.reduce((acc, s) => acc + s.currentOccupancy, 0),
    [shelters]
  );

  const shelterPct = useMemo(
    () => Math.round((totalShelterOccupancy / (totalShelterCapacity || 1)) * 100),
    [totalShelterOccupancy, totalShelterCapacity]
  );

  const awaitingDispatch = useMemo(
    () => incidents.filter((i) => i.status === 'REPORTED').length,
    [incidents]
  );

  const injuredTotal = useMemo(
    () => incidents.reduce((acc, i) => acc + (i.injuredCount || 0), 0),
    [incidents]
  );

  // Flash effects — fire when each derived value changes
  const criticalFlash = useFlash(criticalCount);
  const strandedFlash = useFlash(strandedTotal);
  const deployedFlash = useFlash(activeInRadiusCount);
  const shelterFlash = useFlash(shelterPct);

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
      {/* Live Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className={`transition-all duration-300 ${criticalFlash ? 'ring-2 ring-red-500/60 rounded-r-lg scale-[1.01]' : ''}`}>
          <StatCard
            title="Critical Emergencies"
            value={criticalCount}
            subtitle="Life-Threatening Triage Priority"
            icon={AlertTriangle}
            accentColor="red"
            trend={{ value: `${awaitingDispatch} Awaiting Dispatch`, isPositive: false }}
          />
        </div>

        <div className={`transition-all duration-300 ${strandedFlash ? 'ring-2 ring-orange-500/60 rounded-r-lg scale-[1.01]' : ''}`}>
          <StatCard
            title="Stranded Citizens"
            value={strandedTotal}
            subtitle="Awaiting Rescue / Evacuation"
            icon={Users}
            accentColor="orange"
            trend={{ value: `${injuredTotal} Injured Total`, isPositive: false }}
          />
        </div>

        <div className={`transition-all duration-300 ${deployedFlash ? 'ring-2 ring-cyan-500/60 rounded-r-lg scale-[1.01]' : ''}`}>
          <StatCard
            title="Deployed Units (In-Radius)"
            value={`${activeInRadiusCount}/${inRadiusUnits.length}`}
            subtitle={`Within 5km of ${activeIncident?.title ? activeIncident.title.slice(0, 20) + '...' : 'Incident Zone'}`}
            icon={Truck}
            accentColor="cyan"
            trend={{
              value: `${availableInRadiusCount} Ready in Radius | ${totalGlobalActiveCount} Total Global Deployments`,
              isPositive: availableInRadiusCount > 0,
            }}
          />
        </div>

        <div className={`transition-all duration-300 ${shelterFlash ? 'ring-2 ring-emerald-500/60 rounded-r-lg scale-[1.01]' : ''}`}>
          <StatCard
            title="Shelter Capacity"
            value={`${shelterPct}%`}
            subtitle={`${totalShelterOccupancy} / ${totalShelterCapacity} Occupied`}
            icon={Home}
            accentColor="emerald"
            trend={{ value: `${shelters.filter((s) => s.status !== 'CLOSED').length} Safe Shelters Open`, isPositive: true }}
          />
        </div>
      </div>

      {/* Main EOC Command Center Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[750px]">
        {/* Left: Live Incident Stream ranked by zone score */}
        <div className="lg:col-span-4 h-full overflow-hidden">
          <IncidentFeed
            incidents={incidents}
            resources={resources}
            nearbyPlaces={nearbyPlaces}
            radiusMeters={5000}
            selectedIncidentId={selectedIncidentId}
            onSelectIncident={(id) => {
              setSelectedIncidentId(id);
              setTargetResourceId(undefined);
              setTargetPlace(undefined);
            }}
            onSelectResourceForRoute={(incId, resId) => {
              setSelectedIncidentId(incId);
              setTargetResourceId(resId);
              setTargetPlace(undefined);
            }}
            onSelectPlaceForRoute={(incId, place) => {
              setSelectedIncidentId(incId);
              setTargetPlace(place);
              setTargetResourceId(`FACILITY:${place.id}`);
            }}
            onUpdateStatus={updateIncidentStatus}
            onDispatchResource={dispatchResource}
          />
        </div>

        {/* Center: Live Situation Map */}
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
              targetResourceId={targetResourceId}
              targetPlace={targetPlace}
              onSelectIncident={(id) => {
                setSelectedIncidentId(id);
                setTargetResourceId(undefined);
                setTargetPlace(undefined);
              }}
              onUpdateIncidentStatus={updateIncidentStatus}
              height="100%"
            />
          </div>
        </div>

        {/* Right: Resources & Shelters */}
        <div className="lg:col-span-3 h-full flex flex-col gap-3 overflow-hidden">
          <div className="flex-1 min-h-0">
            <ResourceSummary
              resources={resources}
              selectedIncident={activeIncident}
              radiusMeters={5000}
            />
          </div>
          <div className="flex-1 min-h-0">
            <ShelterOverview shelters={shelters} />
          </div>
        </div>
      </div>
    </div>
  );
};
