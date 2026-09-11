import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';

const MapController: React.FC<{ centerLat?: number; centerLng?: number }> = ({ centerLat, centerLng }) => {
  const map = useMap();
  useEffect(() => {
    if (centerLat && centerLng) {
      map.flyTo([centerLat, centerLng], 14, { duration: 0.8 });
    }
  }, [centerLat, centerLng, map]);
  return null;
};
import { Incident, Shelter, ResourceUnit, EmergencyPlace, EmergencyPlaceType } from '../../types';
import { MAP_DEFAULT_CENTER } from '../../utils/constants';
import { apiService } from '../../services/apiService';
import { SeverityBadge } from '../common/SeverityBadge';
import {
  AlertTriangle,
  Users,
  Home,
  Truck,
  Navigation,
  Phone,
  Activity,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import {
  getRankedResourceRecommendations,
  getFacilityFallbackForIncident,
  calculateHaversineDistance,
} from '../../utils/aiRecommendationEngine';

interface SituationMapProps {
  incidents?: Incident[];
  shelters?: Shelter[];
  resources?: ResourceUnit[];
  selectedIncidentId?: string;
  targetResourceId?: string;
  targetPlace?: EmergencyPlace;
  radiusMeters?: number;
  onRadiusChange?: (radiusMeters: number) => void;
  onSelectIncident?: (id: string) => void;
  onUpdateIncidentStatus?: (id: string, status: any) => void;
  height?: string;
}

// Custom Leaflet DivIcon Generators for Dynamic Colored Markers
const createIncidentIcon = (severity: string, strandedCount: number, isSelected: boolean) => {
  const colorBg =
    severity === 'CRITICAL'
      ? 'bg-red-600 border-red-400 ring-red-500/50'
      : severity === 'HIGH'
      ? 'bg-orange-600 border-orange-400 ring-orange-500/50'
      : severity === 'MEDIUM'
      ? 'bg-amber-500 border-amber-300 ring-amber-500/50 text-slate-950'
      : 'bg-blue-600 border-blue-400 ring-blue-500/50';

  const pulseAnimation = severity === 'CRITICAL' ? '<span class="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></span>' : '';
  const selectedBorder = isSelected ? 'ring-4 ring-cyan-400 scale-110 shadow-lg shadow-cyan-500/60 z-50' : '';

  return L.divIcon({
    className: 'custom-map-icon',
    html: `
      <div class="relative flex items-center justify-center p-2 rounded-full border-2 shadow-xl transition-all ${colorBg} ${selectedBorder}">
        ${pulseAnimation}
        <svg class="w-4 h-4 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
        ${
          strandedCount > 0
            ? `<span class="absolute -bottom-2 bg-slate-950 text-amber-400 font-mono text-[9px] font-extrabold px-1.5 py-0.5 rounded-full border border-amber-500/80 shadow-md whitespace-nowrap">👥 ${strandedCount}</span>`
            : ''
        }
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
};

const createShelterIcon = (occupied: number, capacity: number) => {
  const cap = capacity || 100;
  const pct = Math.min(100, Math.round((occupied / cap) * 100));
  const isFull = pct >= 95;

  const badgeColor = isFull
    ? 'bg-red-600 border-red-400 text-white'
    : pct > 75
    ? 'bg-amber-500 border-amber-300 text-slate-950'
    : 'bg-emerald-600 border-emerald-400 text-white';

  return L.divIcon({
    className: 'custom-map-icon',
    html: `
      <div class="relative flex items-center gap-1.5 px-2 py-1 rounded-lg border-2 shadow-lg font-mono text-[10px] font-bold ${badgeColor}">
        <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
        </svg>
        <span>${pct}% FULL</span>
      </div>
    `,
    iconSize: [70, 26],
    iconAnchor: [35, 13],
  });
};

const createResourceIcon = (status: string, callsign: string) => {
  const statusColor =
    status === 'EN_ROUTE'
      ? 'bg-cyan-600 border-cyan-300 text-white ring-2 ring-cyan-500/50 animate-pulse'
      : status === 'ON_SITE'
      ? 'bg-emerald-600 border-emerald-300 text-white'
      : 'bg-blue-600 border-blue-300 text-white';

  return L.divIcon({
    className: 'custom-map-icon',
    html: `
      <div class="relative flex items-center gap-1.5 px-2 py-1 rounded-md border-2 shadow-lg font-mono text-[10px] font-bold ${statusColor}">
        <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
        </svg>
        <span class="truncate max-w-[70px]">${callsign}</span>
      </div>
    `,
    iconSize: [85, 26],
    iconAnchor: [42, 13],
  });
};

const createEmergencyPlaceIcon = (type: EmergencyPlaceType) => {
  let badgeColor = '';
  let emoji = '';

  switch (type) {
    case 'hospital':
      badgeColor = 'bg-rose-950 border-rose-500 text-rose-300 shadow-rose-900/50';
      emoji = '🏥';
      break;
    case 'fire_station':
      badgeColor = 'bg-orange-950 border-orange-500 text-orange-300 shadow-orange-900/50';
      emoji = '🚒';
      break;
    case 'police_station':
      badgeColor = 'bg-blue-950 border-blue-500 text-blue-300 shadow-blue-900/50';
      emoji = '👮';
      break;
    case 'ngo':
      badgeColor = 'bg-emerald-950 border-emerald-500 text-emerald-300 shadow-emerald-900/50';
      emoji = '🟢';
      break;
    case 'rescue':
      badgeColor = 'bg-amber-950 border-amber-500 text-amber-300 shadow-amber-900/50';
      emoji = '🛟';
      break;
  }

  return L.divIcon({
    className: 'custom-map-icon',
    html: `
      <div class="relative flex items-center justify-center p-1.5 rounded-full border-2 shadow-lg font-sans text-xs ${badgeColor}">
        <span>${emoji}</span>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

export const SituationMap: React.FC<SituationMapProps> = ({
  incidents = [],
  shelters = [],
  resources = [],
  selectedIncidentId,
  targetResourceId,
  targetPlace,
  radiusMeters: radiusMetersProp,
  onRadiusChange,
  onSelectIncident,
  onUpdateIncidentStatus,
  height = '100%',
}) => {
  const [activeRoutePositions, setActiveRoutePositions] = useState<[number, number][]>([]);
  const [activeRouteDetails, setActiveRouteDetails] = useState<{
    resource: ResourceUnit;
    distanceKm: number;
    durationMinutes: number;
  } | null>(null);
  const [activeFacilityDetails, setActiveFacilityDetails] = useState<{
    place: EmergencyPlace;
    distanceKm: number;
    durationMinutes: number;
  } | null>(null);

  const [showIncidents, setShowIncidents] = useState(true);
  const [showShelters, setShowShelters] = useState(true);
  const [showResources, setShowResources] = useState(true);

  // Real-world Emergency Places (OSM Overpass) State
  const [nearbyPlaces, setNearbyPlaces] = useState<EmergencyPlace[]>([]);
  const [isFetchingNearby, setIsFetchingNearby] = useState(false);
  const [nearbyError, setNearbyError] = useState<string | null>(null);
  const [localRadiusMeters, setLocalRadiusMeters] = useState<number>(5000);

  const radiusMeters = radiusMetersProp ?? localRadiusMeters;

  const handleRadiusChange = (newVal: number) => {
    setLocalRadiusMeters(newVal);
    onRadiusChange?.(newVal);
  };

  // Emergency Place Category Toggles
  const [showHospitals, setShowHospitals] = useState(true);
  const [showFireStations, setShowFireStations] = useState(true);
  const [showPolice, setShowPolice] = useState(true);
  const [showNgos, setShowNgos] = useState(true);
  const [showRescue, setShowRescue] = useState(true);

  // ETA Estimates cache map: { [poiId]: { distanceKm, durationMinutes, trafficDelayMinutes, source, loading } }
  const [etaEstimates, setEtaEstimates] = useState<
    Record<
      string,
      { distanceKm: number; durationMinutes: number; trafficDelayMinutes?: number; source?: string; loading?: boolean }
    >
  >({});

  // Selected incident object
  const selectedIncident = incidents.find((i) => i.id === selectedIncidentId) || incidents[0];

  // Filter mobile unit markers strictly inside the selected incident's radius
  const filteredResourcesInRadius = useMemo(() => {
    if (!selectedIncident?.location?.lat || !selectedIncident?.location?.lng) return resources;
    const incLat = selectedIncident.location.lat;
    const incLng = selectedIncident.location.lng;
    const radiusKm = radiusMeters / 1000;

    return resources.filter((res) => {
      if (!res?.currentLocation?.lat || !res?.currentLocation?.lng) return false;
      const dist = calculateHaversineDistance(
        res.currentLocation.lat,
        res.currentLocation.lng,
        incLat,
        incLng
      );
      return dist <= radiusKm;
    });
  }, [resources, selectedIncident, radiusMeters]);

  // Filter shelters strictly inside the selected incident's radius
  const filteredSheltersInRadius = useMemo(() => {
    if (!selectedIncident?.location?.lat || !selectedIncident?.location?.lng) return shelters;
    const incLat = selectedIncident.location.lat;
    const incLng = selectedIncident.location.lng;
    const radiusKm = radiusMeters / 1000;

    return shelters.filter((s) => {
      if (!s?.location?.lat || !s?.location?.lng) return false;
      const dist = calculateHaversineDistance(s.location.lat, s.location.lng, incLat, incLng);
      return dist <= radiusKm;
    });
  }, [shelters, selectedIncident, radiusMeters]);

  // Dynamic telemetry aggregates inside radius
  const totalStranded = useMemo(
    () => incidents.reduce((sum, inc) => sum + (inc.strandedCount || 0), 0),
    [incidents]
  );

  const totalCriticalIncidents = useMemo(
    () => incidents.filter((i) => i.severity === 'CRITICAL').length,
    [incidents]
  );

  const activeInRadiusResourcesCount = useMemo(
    () => filteredResourcesInRadius.filter((r) => r.status === 'EN_ROUTE' || r.status === 'ON_SITE').length,
    [filteredResourcesInRadius]
  );

  // Fetch real-time road route for selected incident (strict radius scan & facility fallback)
  useEffect(() => {
    let isMounted = true;
    const fetchRouteForActiveIncident = async () => {
      if (!selectedIncident || !selectedIncident.location?.lat) {
        if (isMounted) {
          setActiveRoutePositions([]);
          setActiveRouteDetails(null);
          setActiveFacilityDetails(null);
        }
        return;
      }

      const incLat = selectedIncident.location.lat;
      const incLng = selectedIncident.location.lng;

      // Check if target is explicitly an emergency place POI or FACILITY selection
      let selectedFacility: EmergencyPlace | undefined = targetPlace;

      if (!selectedFacility && targetResourceId && targetResourceId.startsWith('FACILITY:')) {
        const facId = targetResourceId.replace('FACILITY:', '');
        selectedFacility = nearbyPlaces.find((p) => p.id === facId);
      }

      // Check mobile resources strictly within radius
      const { inRadiusRecommendations, allRecommendations, hasUnitsInRadius } =
        getRankedResourceRecommendations(selectedIncident, resources, radiusMeters);

      // If no units in radius and no facility explicitly passed, calculate facility fallback
      if (!selectedFacility && !hasUnitsInRadius && !targetResourceId) {
        const fallback = getFacilityFallbackForIncident(selectedIncident, nearbyPlaces, radiusMeters);
        if (fallback) {
          selectedFacility = fallback.place;
        }
      }

      // ── ROUTING PATH 1: Emergency Facility Support POI Fallback ──
      if (selectedFacility) {
        const facLat = selectedFacility.latitude;
        const facLng = selectedFacility.longitude;

        const estimate = await apiService.fetchRouteEstimate(facLat, facLng, incLat, incLng);
        if (!isMounted) return;

        if (estimate && estimate.geometry && estimate.geometry.coordinates) {
          const latLngs: [number, number][] = estimate.geometry.coordinates.map(
            ([lon, lat]: [number, number]) => [lat, lon]
          );
          setActiveRoutePositions(latLngs);
          setActiveFacilityDetails({
            place: selectedFacility,
            distanceKm: estimate.distanceKm,
            durationMinutes: estimate.durationMinutes,
          });
          setActiveRouteDetails(null);
        } else {
          setActiveRoutePositions([
            [facLat, facLng],
            [incLat, incLng],
          ]);
          setActiveFacilityDetails({
            place: selectedFacility,
            distanceKm: selectedFacility.distanceKm || 2.0,
            durationMinutes: Math.round((selectedFacility.distanceKm || 2.0) * 1.8 + 2),
          });
          setActiveRouteDetails(null);
        }
        return;
      }

      // ── ROUTING PATH 2: Mobile Resource Unit (Strictly In-Radius Only) ──
      const targetId =
        targetResourceId ||
        selectedIncident.dispatchedUnitIds?.[0] ||
        (hasUnitsInRadius ? inRadiusRecommendations[0]?.resource.id : undefined);

      const targetResource = targetId
        ? resources.find((r) => r.id === targetId || r.callsign === targetId) || inRadiusRecommendations[0]?.resource
        : undefined;

      if (!targetResource || !targetResource.currentLocation?.lat) {
        if (isMounted) {
          setActiveRoutePositions([]);
          setActiveRouteDetails(null);
          setActiveFacilityDetails(null);
        }
        return;
      }

      const resLat = targetResource.currentLocation.lat;
      const resLng = targetResource.currentLocation.lng;

      const estimate = await apiService.fetchRouteEstimate(resLat, resLng, incLat, incLng);
      if (!isMounted) return;

      if (estimate && estimate.geometry && estimate.geometry.coordinates) {
        const latLngs: [number, number][] = estimate.geometry.coordinates.map(
          ([lon, lat]: [number, number]) => [lat, lon]
        );
        setActiveRoutePositions(latLngs);
        setActiveRouteDetails({
          resource: targetResource,
          distanceKm: estimate.distanceKm,
          durationMinutes: estimate.durationMinutes,
        });
        setActiveFacilityDetails(null);
      } else {
        const recMatch = inRadiusRecommendations.find((r) => r.resource.id === targetResource.id);
        const distKm = recMatch?.distanceKm || 2.5;
        const eta = recMatch?.etaMinutes || 8;
        setActiveRoutePositions([
          [resLat, resLng],
          [incLat, incLng],
        ]);
        setActiveRouteDetails({
          resource: targetResource,
          distanceKm: distKm,
          durationMinutes: eta,
        });
        setActiveFacilityDetails(null);
      }
    };

    fetchRouteForActiveIncident();
    return () => {
      isMounted = false;
    };
  }, [selectedIncidentId, selectedIncident, targetResourceId, targetPlace, resources, nearbyPlaces, radiusMeters]);

  // Fetch real-world nearby POIs from Overpass backend service when selected incident or search radius changes
  useEffect(() => {
    let isMounted = true;
    const fetchNearbyPOI = async () => {
      if (!selectedIncident || !selectedIncident.location?.lat || !selectedIncident.location?.lng) {
        if (isMounted) setNearbyPlaces([]);
        return;
      }

      setIsFetchingNearby(true);
      setNearbyError(null);

      const lat = selectedIncident.location.lat;
      const lng = selectedIncident.location.lng;

      const res = await apiService.fetchNearbyEmergencyPlaces(lat, lng, radiusMeters);

      if (isMounted) {
        setIsFetchingNearby(false);
        if (res.success) {
          setNearbyPlaces(res.places || []);
        } else {
          setNearbyError(res.error || 'Nearby emergency services temporarily unavailable');
          setNearbyPlaces([]);
        }
      }
    };

    fetchNearbyPOI();

    return () => {
      isMounted = false;
    };
  }, [selectedIncidentId, selectedIncident, radiusMeters]);

  // Filter POIs strictly by selected radius limit from selected incident and category toggles
  const filteredNearbyPlaces = useMemo(() => {
    if (!selectedIncident?.location?.lat || !selectedIncident?.location?.lng) return [];
    const incLat = selectedIncident.location.lat;
    const incLng = selectedIncident.location.lng;
    const radiusKm = radiusMeters / 1000;

    return nearbyPlaces.filter((p) => {
      const dist = calculateHaversineDistance(p.latitude, p.longitude, incLat, incLng);
      // Hide facilities outside the selected search radius relative to the selected incident
      if (dist > radiusKm) return false;

      // Hide facilities by category toggle
      if (p.type === 'hospital' && !showHospitals) return false;
      if (p.type === 'fire_station' && !showFireStations) return false;
      if (p.type === 'police_station' && !showPolice) return false;
      if (p.type === 'ngo' && !showNgos) return false;
      if (p.type === 'rescue' && !showRescue) return false;
      return true;
    });
  }, [nearbyPlaces, radiusMeters, selectedIncident, showHospitals, showFireStations, showPolice, showNgos, showRescue]);

  // Calculate Road ETA to external POI
  const handleCalculateETA = async (place: EmergencyPlace) => {
    if (!selectedIncident?.location?.lat || !selectedIncident?.location?.lng) return;

    setEtaEstimates((prev) => ({
      ...prev,
      [place.id]: { distanceKm: place.distanceKm, durationMinutes: 0, loading: true },
    }));

    const originLat = selectedIncident.location.lat;
    const originLon = selectedIncident.location.lng;
    const destLat = place.latitude;
    const destLon = place.longitude;

    const estimate = await apiService.fetchRouteEstimate(originLat, originLon, destLat, destLon);

    if (estimate) {
      setEtaEstimates((prev) => ({
        ...prev,
        [place.id]: {
          distanceKm: estimate.distanceKm,
          durationMinutes: estimate.durationMinutes,
          trafficDelayMinutes: estimate.trafficDelayMinutes,
          source: estimate.source,
          loading: false,
        },
      }));
    } else {
      setEtaEstimates((prev) => ({
        ...prev,
        [place.id]: {
          distanceKm: place.distanceKm,
          durationMinutes: Math.round(place.distanceKm * 2 + 3),
          source: 'FALLBACK',
          loading: false,
        },
      }));
    }
  };

  return (
    <div className="w-full relative border border-slate-800 rounded-lg overflow-hidden" style={{ height }}>
      
      {/* Dynamic Tactical Map HUD Overlay */}
      <div className="absolute top-3 right-3 z-[1000] bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-lg p-2.5 shadow-2xl font-mono text-xs text-slate-200 space-y-2.5 max-w-[280px]">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
          <span className="font-bold text-cyan-400 flex items-center gap-1.5 text-[11px]">
            <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            TACTICAL TELEMETRY
          </span>
          <span className="text-[10px] text-slate-500 font-bold uppercase">LIVE MAP</span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 text-[10px]">
          <div className="p-1.5 bg-red-950/40 border border-red-800/60 rounded">
            <div className="text-red-400 font-bold">CRITICAL</div>
            <div className="text-base font-extrabold text-red-200">{totalCriticalIncidents}</div>
          </div>
          <div className="p-1.5 bg-amber-950/40 border border-amber-800/60 rounded">
            <div className="text-amber-400 font-bold">STRANDED</div>
            <div className="text-base font-extrabold text-amber-200">{totalStranded}</div>
          </div>
          <div className="p-1.5 bg-cyan-950/40 border border-cyan-800/60 rounded">
            <div className="text-cyan-400 font-bold">DEPLOYED ({radiusMeters / 1000}km)</div>
            <div className="text-base font-extrabold text-cyan-200">
              {activeInRadiusResourcesCount}/{filteredResourcesInRadius.length}
            </div>
          </div>
          <div className="p-1.5 bg-emerald-950/40 border border-emerald-800/60 rounded">
            <div className="text-emerald-400 font-bold">SHELTERS ({radiusMeters / 1000}km)</div>
            <div className="text-base font-extrabold text-emerald-200">{filteredSheltersInRadius.length}</div>
          </div>
        </div>

        {/* Dynamic Layer Visibility Toggles */}
        <div className="pt-1 border-t border-slate-800 flex items-center justify-between text-[10px]">
          <button
            onClick={() => setShowIncidents(!showIncidents)}
            className={`px-1.5 py-0.5 rounded border transition-colors flex items-center gap-1 ${
              showIncidents
                ? 'bg-red-600/30 text-red-300 border-red-500/50'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            Incidents
          </button>
          <button
            onClick={() => setShowShelters(!showShelters)}
            className={`px-1.5 py-0.5 rounded border transition-colors flex items-center gap-1 ${
              showShelters
                ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
          >
            <Home className="w-3 h-3" />
            Shelters
          </button>
          <button
            onClick={() => setShowResources(!showResources)}
            className={`px-1.5 py-0.5 rounded border transition-colors flex items-center gap-1 ${
              showResources
                ? 'bg-cyan-600/30 text-cyan-300 border-cyan-500/50'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
          >
            <Truck className="w-3 h-3" />
            Units
          </button>
        </div>

        {/* Real-World Emergency Support POIs Header & Radius Controls */}
        <div className="pt-2 border-t border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-cyan-300 flex items-center gap-1">
              <span>NEARBY SUPPORT (OSM)</span>
              {isFetchingNearby && <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />}
            </span>
            <select
              value={radiusMeters}
              onChange={(e) => handleRadiusChange(parseInt(e.target.value))}
              className="bg-slate-900 text-cyan-300 border border-slate-700 text-[10px] rounded px-1 py-0.5 font-mono outline-none"
            >
              <option value={1000}>1 km</option>
              <option value={2000}>2 km</option>
              <option value={3000}>3 km</option>
              <option value={5000}>5 km (Default)</option>
              <option value={10000}>10 km</option>
              <option value={15000}>15 km</option>
            </select>
          </div>

          {nearbyError && (
            <div className="text-[9px] text-amber-400 bg-amber-950/40 border border-amber-800/60 p-1 rounded flex items-center gap-1">
              <AlertCircle className="w-3 h-3 shrink-0 text-amber-400" />
              <span>{nearbyError}</span>
            </div>
          )}

          {/* Category Filter Checkboxes */}
          <div className="grid grid-cols-2 gap-1 text-[9.5px]">
            <button
              onClick={() => setShowHospitals(!showHospitals)}
              className={`px-1.5 py-0.5 rounded border text-left flex items-center gap-1 transition-colors ${
                showHospitals ? 'bg-rose-950/60 text-rose-300 border-rose-700/60' : 'bg-slate-900 text-slate-500 border-slate-800'
              }`}
            >
              <span>🏥</span>
              <span>Hospitals</span>
            </button>

            <button
              onClick={() => setShowFireStations(!showFireStations)}
              className={`px-1.5 py-0.5 rounded border text-left flex items-center gap-1 transition-colors ${
                showFireStations ? 'bg-orange-950/60 text-orange-300 border-orange-700/60' : 'bg-slate-900 text-slate-500 border-slate-800'
              }`}
            >
              <span>🚒</span>
              <span>Fire</span>
            </button>

            <button
              onClick={() => setShowPolice(!showPolice)}
              className={`px-1.5 py-0.5 rounded border text-left flex items-center gap-1 transition-colors ${
                showPolice ? 'bg-blue-950/60 text-blue-300 border-blue-700/60' : 'bg-slate-900 text-slate-500 border-slate-800'
              }`}
            >
              <span>👮</span>
              <span>Police</span>
            </button>

            <button
              onClick={() => setShowNgos(!showNgos)}
              className={`px-1.5 py-0.5 rounded border text-left flex items-center gap-1 transition-colors ${
                showNgos ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60' : 'bg-slate-900 text-slate-500 border-slate-800'
              }`}
            >
              <span>🟢</span>
              <span>NGOs</span>
            </button>

            <button
              onClick={() => setShowRescue(!showRescue)}
              className={`col-span-2 px-1.5 py-0.5 rounded border text-left flex items-center gap-1 transition-colors ${
                showRescue ? 'bg-amber-950/60 text-amber-300 border-amber-700/60' : 'bg-slate-900 text-slate-500 border-slate-800'
              }`}
            >
              <span>🛟</span>
              <span>Rescue Services</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic Route Trajectory HUD Banner */}
      {activeFacilityDetails && selectedIncident ? (
        <div className="absolute bottom-3 left-3 z-[1000] bg-slate-950/95 backdrop-blur-md border border-amber-500/60 rounded-lg p-2.5 shadow-2xl font-mono text-xs text-slate-100 max-w-[440px] transition-all ring-1 ring-amber-500/30">
          <div className="flex items-center justify-between text-[10px] font-bold text-amber-400 border-b border-slate-800 pb-1 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              EMERGENCY FACILITY ROUTE (RADIUS FALLBACK)
            </span>
            <span className="text-[9px] text-amber-300 bg-amber-950/80 border border-amber-500/40 px-1.5 py-0.5 rounded font-mono">
              STRICT RADIUS SCAN
            </span>
          </div>
          <div className="text-[11px] font-semibold text-slate-200 truncate">
            Facility: <span className="text-amber-300 font-bold">{activeFacilityDetails.place.name}</span> ({activeFacilityDetails.place.type})
            <span className="text-slate-400"> ➔ Target: </span>
            <span className="text-cyan-300 font-bold">{selectedIncident.title}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span>Facility Distance: <strong className="text-slate-200">{activeFacilityDetails.distanceKm} km</strong></span>
            <span>Est. Response Time: <strong className="text-amber-400 font-bold">{activeFacilityDetails.durationMinutes} mins</strong></span>
          </div>
        </div>
      ) : activeRouteDetails && selectedIncident ? (
        <div className="absolute bottom-3 left-3 z-[1000] bg-slate-950/95 backdrop-blur-md border border-cyan-500/50 rounded-lg p-2.5 shadow-2xl font-mono text-xs text-slate-100 max-w-[420px] transition-all">
          <div className="flex items-center justify-between text-[10px] font-bold text-cyan-400 border-b border-slate-800 pb-1 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              SHORTEST DISPATCH ROUTE TRAJECTORY
            </span>
            <span className="text-[9px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-1.5 py-0.5 rounded font-mono">
              TRAFFIC-AWARE ROUTING
            </span>
          </div>
          <div className="text-[11px] font-semibold text-slate-200 truncate">
            Unit: <span className="text-cyan-300 font-bold">{activeRouteDetails.resource.callsign}</span> ({activeRouteDetails.resource.category})
            <span className="text-slate-400"> ➔ Incident: </span>
            <span className="text-amber-300 font-bold">{selectedIncident.title}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span>Road Distance: <strong className="text-slate-200">{activeRouteDetails.distanceKm} km</strong></span>
            <span>Estimated Travel ETA: <strong className="text-cyan-400 font-bold">{activeRouteDetails.durationMinutes} mins</strong></span>
          </div>
        </div>
      ) : null}

      <MapContainer
        center={[MAP_DEFAULT_CENTER.lat, MAP_DEFAULT_CENTER.lng]}
        zoom={MAP_DEFAULT_CENTER.zoom}
        className="w-full h-full tactical-dark-tiles"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={import.meta.env.VITE_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png"}
        />

        {/* Re-center Map and render visual radius circle around selected incident */}
        {selectedIncident?.location?.lat && selectedIncident?.location?.lng && (
          <>
            <MapController
              centerLat={selectedIncident.location.lat}
              centerLng={selectedIncident.location.lng}
            />
            <Circle
              center={[selectedIncident.location.lat, selectedIncident.location.lng]}
              radius={radiusMeters}
              pathOptions={{
                color: '#06B6D4',
                fillColor: '#06B6D4',
                fillOpacity: 0.08,
                weight: 1.5,
                dashArray: '6, 6',
              }}
            />
          </>
        )}

        {/* Active Dispatch Route Polyline */}
        {activeRoutePositions.length > 1 && (
          <Polyline
            positions={activeRoutePositions}
            pathOptions={{
              color: '#06B6D4',
              weight: 4,
              dashArray: '8, 8',
              opacity: 0.9,
            }}
          />
        )}

        {/* Dynamic Incident Markers */}
        {showIncidents &&
          incidents
            .filter((inc) => inc?.location?.lat && inc?.location?.lng && inc.status !== 'RESOLVED' && inc.status !== 'CANCELLED')
            .map((inc) => {
              const isSelected = inc.id === selectedIncidentId;
              const stranded = inc.strandedCount ?? 0;
              const injured = inc.injuredCount ?? 0;

              const affectedCount = Math.max(1, stranded + injured);
              const logComponent = inc.peopleAffectedScore ?? (Math.round(Math.log10(affectedCount) * 20 * 10) / 10);
              const calculatedZoneScore = inc.zoneScore ?? inc.aiPriorityScore ?? 50;

              return (
                <Marker
                  key={inc.id}
                  position={[inc.location.lat, inc.location.lng]}
                  icon={createIncidentIcon(inc.severity, stranded, isSelected)}
                  eventHandlers={{
                    click: () => onSelectIncident?.(inc.id),
                  }}
                >
                  <Popup>
                    <div className="p-3 font-sans text-xs bg-slate-900 text-slate-100 rounded space-y-2 min-w-[240px]">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                        <SeverityBadge severity={inc.severity} size="sm" />
                        <span className="font-mono text-[10px] text-slate-400">{inc.id}</span>
                      </div>

                      <h4 className="font-bold text-sm text-slate-100 leading-tight">{inc.title}</h4>
                      <p className="text-slate-300 text-[11px]">{inc.location.address}</p>

                      <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-slate-950 rounded border border-slate-800 font-mono text-[10px]">
                        <div className="flex items-center gap-1 text-amber-400">
                          <Users className="w-3 h-3" />
                          <span>Stranded: <strong>{stranded}</strong></span>
                        </div>
                        <div className="flex items-center gap-1 text-red-400">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Injured: <strong>{injured}</strong></span>
                        </div>
                      </div>

                      {/* Mathematical Priority & Severity Zone Score breakdown */}
                      <div className="p-2 bg-slate-950/90 rounded border border-cyan-500/40 font-mono text-[10px] space-y-1 shadow-inner">
                        <div className="text-cyan-400 font-bold flex items-center justify-between border-b border-slate-800/80 pb-1">
                          <span className="text-[10px] tracking-wider">ZONE SCORE FORMULA</span>
                          <span className="text-sm font-extrabold text-cyan-300 px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-700">{calculatedZoneScore}</span>
                        </div>
                        <div className="text-[9.5px] text-slate-300 space-y-0.5 pt-0.5">
                          <div className="flex justify-between">
                            <span className="text-slate-400">log10({affectedCount}) × weight_A(20):</span>
                            <span className="text-cyan-300 font-bold">+{logComponent}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Disaster Type ({inc.category}):</span>
                            <span className="text-amber-300 font-bold">+{inc.disasterTypeScore ?? 25}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Urgency Keyword Score:</span>
                            <span className="text-red-300 font-bold">+{inc.urgencyKeywordScore ?? 0}</span>
                          </div>
                        </div>
                        {inc.urgencyReasoning && (
                          <p className="text-[9px] text-slate-400 italic pt-1 border-t border-slate-800 leading-tight">
                            {inc.urgencyReasoning}
                          </p>
                        )}
                      </div>

                      {inc.urgentNeeds?.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {inc.urgentNeeds.map((need) => (
                            <span
                              key={need}
                              className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800/60 font-semibold uppercase"
                            >
                              {need.replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                        <span className="text-[10px] font-mono text-slate-400">
                          Status: <strong className="text-slate-200">{inc.status}</strong>
                        </span>
                        {inc.status !== 'RESOLVED' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateIncidentStatus?.(
                                inc.id,
                                inc.status === 'REPORTED'
                                  ? 'DISPATCHED'
                                  : inc.status === 'DISPATCHED'
                                  ? 'ON_SITE'
                                  : 'RESOLVED'
                              );
                            }}
                            className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/40 transition-colors"
                          >
                            {inc.status === 'REPORTED'
                              ? 'DISPATCH'
                              : inc.status === 'DISPATCHED'
                              ? 'MARK ON-SITE'
                              : 'RESOLVE'}
                          </button>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

        {/* Dynamic Safe Shelter Markers (Strictly In-Radius Only) */}
        {showShelters &&
          filteredSheltersInRadius.map((s) => {
              const occ = s.occupied ?? s.currentOccupancy ?? 0;
              const cap = s.capacity || 100;
              const pct = Math.min(100, Math.round((occ / cap) * 100));

              return (
                <Marker
                  key={s.id}
                  position={[s.location.lat, s.location.lng]}
                  icon={createShelterIcon(occ, cap)}
                >
                  <Popup>
                    <div className="p-3 font-sans text-xs bg-slate-900 text-slate-100 rounded space-y-2 min-w-[210px]">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-600 text-white uppercase">
                          Safe Shelter
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">{s.id}</span>
                      </div>

                      <h4 className="font-bold text-sm text-slate-100 mt-1">{s.name}</h4>
                      <p className="text-slate-300 text-[11px]">{s.location.address}</p>

                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between text-[10px] font-mono">
                          <span className="text-slate-400">Occupancy</span>
                          <span className="text-cyan-400 font-bold">{occ} / {cap} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              pct > 90 ? 'bg-red-500' : pct > 75 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-1 pt-1 text-[10px] font-mono text-slate-400">
                        <div>Water: <strong className="text-slate-200">{s.supplies?.waterDays ?? (s as any).waterSupplyDays ?? 3}d</strong></div>
                        <div>Food: <strong className="text-slate-200">{s.supplies?.foodDays ?? (s as any).foodSupplyDays ?? 3}d</strong></div>
                        <div>Medics: <strong className="text-slate-200">{s.medicalStaffCount ?? 2} staff</strong></div>
                        <div>Status: <strong className="text-emerald-400">{s.status || 'OPEN'}</strong></div>
                      </div>

                      <div className="pt-2 border-t border-slate-800 flex justify-end">
                        <a
                          href={`tel:${s.contactPhone || '108'}`}
                          className="flex items-center gap-1 text-[10px] font-mono font-bold text-cyan-400 hover:underline"
                        >
                          <Phone className="w-3 h-3" />
                          <span>Contact Facility</span>
                        </a>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

        {/* Dynamic Resource Unit Markers (Strictly In-Radius Only) */}
        {showResources &&
          filteredResourcesInRadius.map((res) => (
              <Marker
                key={res.id}
                position={[res.currentLocation.lat, res.currentLocation.lng]}
                icon={createResourceIcon(res.status, res.callsign || res.id)}
              >
                <Popup>
                  <div className="p-3 font-sans text-xs bg-slate-900 text-slate-100 rounded space-y-2 min-w-[210px]">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-600 text-white uppercase">
                        {res.category?.replace('_', ' ') || 'RESOURCE UNIT'}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">{res.id}</span>
                    </div>

                    <h4 className="font-bold text-sm text-slate-100">{res.callsign || res.id}</h4>
                    <p className="text-slate-300 text-[11px]">{res.currentLocation.address}</p>

                    <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-slate-950 rounded border border-slate-800 font-mono text-[10px]">
                      <div>Status: <strong className="text-cyan-400">{res.status}</strong></div>
                      <div>Crew: <strong className="text-slate-200">{res.personnelCount ?? 5} staff</strong></div>
                      <div>Fuel: <strong className="text-emerald-400">{res.fuelOrSupplyPct ?? 100}%</strong></div>
                      <div>Channel: <strong className="text-amber-400">{res.contactChannel || 'CH-16'}</strong></div>
                    </div>

                    {res.assignedIncidentId && (
                      <div className="text-[10px] font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-800/60 p-1 rounded">
                        Assigned to: <strong>{res.assignedIncidentId}</strong>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}

        {/* Real-world Nearby Emergency Support Places (OpenStreetMap Overpass POIs) */}
        {filteredNearbyPlaces.map((place) => {
          const etaInfo = etaEstimates[place.id];

          return (
            <Marker
              key={place.id}
              position={[place.latitude, place.longitude]}
              icon={createEmergencyPlaceIcon(place.type)}
            >
              <Popup>
                <div className="p-3 font-sans text-xs bg-slate-900 text-slate-100 rounded space-y-2 min-w-[230px]">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-slate-800 text-slate-200">
                      {place.type.replace('_', ' ')}
                    </span>
                    <span className="font-mono text-[9px] text-cyan-400 font-bold">OSM POI</span>
                  </div>

                  <h4 className="font-bold text-sm text-slate-100">{place.name}</h4>
                  
                  {place.address && <p className="text-slate-300 text-[11px]">{place.address}</p>}

                  <div className="grid grid-cols-2 gap-1 p-1.5 bg-slate-950 rounded border border-slate-800 font-mono text-[10px]">
                    <div>Distance: <strong className="text-cyan-400">{place.distanceKm} km</strong></div>
                    <div>Source: <strong className="text-slate-300">OpenStreetMap</strong></div>
                    {place.phone && <div className="col-span-2 truncate">Phone: <strong className="text-slate-200">{place.phone}</strong></div>}
                    {place.website && (
                      <div className="col-span-2 truncate">
                        Web: <a href={place.website} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">{place.website}</a>
                      </div>
                    )}
                  </div>

                  {/* ETA Routing Output */}
                  {etaInfo && !etaInfo.loading && (
                    <div className="p-2 bg-cyan-950/60 border border-cyan-800/60 rounded font-mono text-[10px] space-y-0.5">
                      <div className="text-cyan-300 font-bold flex items-center justify-between">
                        <span>ROAD ROUTE ESTIMATE</span>
                        <span className="text-[9px] text-cyan-400">[{etaInfo.source}]</span>
                      </div>
                      <div className="text-slate-200">Distance: <strong>{etaInfo.distanceKm} km</strong></div>
                      <div className="text-emerald-400 font-bold">ETA: <strong>{etaInfo.durationMinutes} min</strong></div>
                      {etaInfo.trafficDelayMinutes !== undefined && etaInfo.trafficDelayMinutes > 0 && (
                        <div className="text-amber-400">Traffic Delay: <strong>+{etaInfo.trafficDelayMinutes} min</strong></div>
                      )}
                    </div>
                  )}

                  {/* Calculate ETA Button */}
                  <div className="pt-1 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleCalculateETA(place)}
                      disabled={etaInfo?.loading}
                      className="w-full py-1.5 bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/50 text-cyan-300 text-[10px] font-mono font-bold rounded flex items-center justify-center gap-1 transition-all disabled:opacity-50"
                    >
                      <Navigation className={`w-3 h-3 ${etaInfo?.loading ? 'animate-spin' : ''}`} />
                      <span>{etaInfo?.loading ? 'CALCULATING ETA...' : 'CALCULATE ROAD ETA'}</span>
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};
