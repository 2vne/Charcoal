import { Incident, ResourceUnit, EmergencyPlace } from '../types';

export interface ResourceRecommendation {
  resource: ResourceUnit;
  distanceKm: number;
  etaMinutes: number;
  isTypeMatch: boolean;
  matchScore: number;
  stationName: string;
  aiReason: string;
  isWithinRadius: boolean;
}

export interface FacilityRecommendation {
  place: EmergencyPlace;
  distanceKm: number;
  etaMinutes: number;
  isFacilityFallback: true;
  aiReason: string;
}

/**
 * Calculates Haversine distance in kilometers between two lat/lng coordinates
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Evaluates a single resource against an incident using disaster classification rules,
 * station matching, distance, and ETA.
 */
export function evaluateResourceForIncident(
  incident: Incident,
  resource: ResourceUnit,
  radiusMeters: number = 5000
): ResourceRecommendation {
  const incLat = incident.location?.lat ?? 19.076;
  const incLng = incident.location?.lng ?? 72.8777;
  const resLat = resource.currentLocation?.lat ?? 19.076;
  const resLng = resource.currentLocation?.lng ?? 72.8777;

  const distanceKm = calculateHaversineDistance(resLat, resLng, incLat, incLng);
  const etaMinutes = Math.max(2, Math.round(distanceKm * 1.8 + 3));
  const radiusKm = radiusMeters / 1000;
  const isWithinRadius = distanceKm <= radiusKm;

  const cat = (incident.category || '').toUpperCase();
  const titleDesc = `${incident.title} ${incident.description || ''}`.toLowerCase();
  const resCat = (resource.category || '').toUpperCase();
  const callsign = (resource.callsign || '').toLowerCase();

  let isTypeMatch = false;
  let stationName = 'Regional Operations Base';

  if (
    cat.includes('FIRE') ||
    cat.includes('WILDFIRE') ||
    cat.includes('HAZMAT') ||
    titleDesc.includes('fire') ||
    titleDesc.includes('blaze') ||
    titleDesc.includes('burn') ||
    titleDesc.includes('explosion')
  ) {
    isTypeMatch =
      resCat.includes('EQUIPMENT') ||
      resCat.includes('FIRE') ||
      resCat.includes('HAZMAT') ||
      callsign.includes('fire') ||
      callsign.includes('engine') ||
      callsign.includes('hazmat');
    stationName = 'Metro Central Fire Station';
  } else if (
    cat.includes('FLOOD') ||
    cat.includes('TSUNAMI') ||
    cat.includes('LANDSLIDE') ||
    titleDesc.includes('water') ||
    titleDesc.includes('flood') ||
    titleDesc.includes('river') ||
    titleDesc.includes('drowning')
  ) {
    isTypeMatch =
      resCat.includes('VESSEL') ||
      resCat.includes('WATER') ||
      callsign.includes('boat') ||
      callsign.includes('water') ||
      callsign.includes('navy') ||
      callsign.includes('coast');
    stationName = 'Water Rescue Port Base';
  } else if (
    cat.includes('EARTHQUAKE') ||
    cat.includes('COLLAPSE') ||
    titleDesc.includes('rubble') ||
    titleDesc.includes('trapped') ||
    titleDesc.includes('building')
  ) {
    isTypeMatch =
      resCat.includes('RESCUE') ||
      resCat.includes('EQUIPMENT') ||
      callsign.includes('rescue') ||
      callsign.includes('usar') ||
      callsign.includes('search') ||
      callsign.includes('k9');
    stationName = 'Urban Search & Heavy Rescue Depot';
  } else if (
    cat.includes('MEDICAL') ||
    titleDesc.includes('injury') ||
    titleDesc.includes('hospital') ||
    titleDesc.includes('bleeding') ||
    titleDesc.includes('casualty')
  ) {
    isTypeMatch =
      resCat.includes('MEDICAL') ||
      resCat.includes('HELICOPTER') ||
      callsign.includes('med') ||
      callsign.includes('ambulance') ||
      callsign.includes('hospital');
    stationName = 'Metro Trauma Center & Field Hospital Base';
  } else {
    isTypeMatch = resource.status === 'AVAILABLE';
    stationName = 'Tactical Rapid Response Station';
  }

  let matchScore = 100 - distanceKm * 2.5 - etaMinutes * 1.5;
  if (isTypeMatch) matchScore += 55;
  if (resource.status === 'AVAILABLE') matchScore += 20;
  if (isWithinRadius) matchScore += 40; // Bonus score for units strictly inside incident radius

  const aiReason = `[Radius AI Dispatch] Unit ${resource.callsign} (${resource.category}) from ${stationName} — ${
    isWithinRadius ? `Inside ${radiusKm}km radius` : `Outside ${radiusKm}km radius`
  }, ${distanceKm} km shortest route, ~${etaMinutes} mins ETA.`;

  return {
    resource,
    distanceKm,
    etaMinutes,
    isTypeMatch,
    matchScore,
    stationName,
    aiReason,
    isWithinRadius,
  };
}

/**
 * Categorizes and ranks resource recommendations for an incident into units strictly inside
 * the radius versus units outside the radius.
 */
export function getRankedResourceRecommendations(
  incident: Incident,
  resources: ResourceUnit[],
  radiusMeters: number = 5000
): {
  inRadiusRecommendations: ResourceRecommendation[];
  outOfRadiusRecommendations: ResourceRecommendation[];
  allRecommendations: ResourceRecommendation[];
  hasUnitsInRadius: boolean;
} {
  if (!resources || resources.length === 0) {
    return {
      inRadiusRecommendations: [],
      outOfRadiusRecommendations: [],
      allRecommendations: [],
      hasUnitsInRadius: false,
    };
  }

  const radiusKm = radiusMeters / 1000;
  const available = resources.filter((r) => r.status === 'AVAILABLE');
  const pool = available.length > 0 ? available : resources;

  const evaluated = pool.map((res) => evaluateResourceForIncident(incident, res, radiusMeters));
  evaluated.sort((a, b) => b.matchScore - a.matchScore);

  const inRadius = evaluated.filter((r) => r.isWithinRadius);
  const outOfRadius = evaluated.filter((r) => !r.isWithinRadius);

  return {
    inRadiusRecommendations: inRadius,
    outOfRadiusRecommendations: outOfRadius,
    allRecommendations: evaluated,
    hasUnitsInRadius: inRadius.length > 0,
  };
}

/**
 * Fallback Engine: When no mobile unit is available inside the incident radius,
 * scans real-world emergency places (OSM POIs: hospital, fire_station, police_station, rescue, ngo)
 * strictly within the radius and selects the next best facility for routing.
 */
export function getFacilityFallbackForIncident(
  incident: Incident,
  nearbyPlaces: EmergencyPlace[],
  radiusMeters: number = 5000
): FacilityRecommendation | null {
  if (!nearbyPlaces || nearbyPlaces.length === 0) return null;
  const radiusKm = radiusMeters / 1000;

  // Filter facilities strictly within radius
  const withinRadius = nearbyPlaces.filter((p) => p.distanceKm <= radiusKm);
  if (withinRadius.length === 0) return null;

  const cat = (incident.category || '').toUpperCase();
  const titleDesc = `${incident.title} ${incident.description || ''}`.toLowerCase();

  let preferredTypes: string[] = [];
  if (
    cat.includes('FIRE') ||
    cat.includes('HAZMAT') ||
    titleDesc.includes('fire') ||
    titleDesc.includes('blaze')
  ) {
    preferredTypes = ['fire_station', 'rescue', 'hospital', 'police_station', 'ngo'];
  } else if (
    cat.includes('MEDICAL') ||
    titleDesc.includes('injury') ||
    titleDesc.includes('hospital')
  ) {
    preferredTypes = ['hospital', 'rescue', 'police_station', 'ngo', 'fire_station'];
  } else if (
    cat.includes('FLOOD') ||
    cat.includes('TSUNAMI') ||
    cat.includes('LANDSLIDE') ||
    titleDesc.includes('water')
  ) {
    preferredTypes = ['rescue', 'ngo', 'fire_station', 'hospital', 'police_station'];
  } else if (
    cat.includes('EARTHQUAKE') ||
    cat.includes('COLLAPSE') ||
    titleDesc.includes('rubble')
  ) {
    preferredTypes = ['rescue', 'fire_station', 'hospital', 'police_station', 'ngo'];
  } else {
    preferredTypes = ['police_station', 'rescue', 'hospital', 'fire_station', 'ngo'];
  }

  const sorted = [...withinRadius].sort((a, b) => {
    const prefA = preferredTypes.indexOf(a.type);
    const prefB = preferredTypes.indexOf(b.type);
    const rankA = prefA === -1 ? 99 : prefA;
    const rankB = prefB === -1 ? 99 : prefB;

    if (rankA !== rankB) return rankA - rankB;
    return a.distanceKm - b.distanceKm;
  });

  const bestPlace = sorted[0];
  if (!bestPlace) return null;

  const etaMinutes = Math.max(2, Math.round(bestPlace.distanceKm * 1.8 + 2));
  const typeLabel =
    bestPlace.type === 'hospital'
      ? 'Hospital'
      : bestPlace.type === 'fire_station'
      ? 'Fire Station'
      : bestPlace.type === 'police_station'
      ? 'Police Station'
      : bestPlace.type === 'rescue'
      ? 'Rescue Depot'
      : 'Emergency NGO';

  return {
    place: bestPlace,
    distanceKm: bestPlace.distanceKm,
    etaMinutes,
    isFacilityFallback: true,
    aiReason: `[Strict Radius Fallback] No mobile units within ${radiusKm}km radius. Auto-routing to nearest ${typeLabel}: ${bestPlace.name} (${bestPlace.distanceKm} km, ~${etaMinutes}m ETA).`,
  };
}
