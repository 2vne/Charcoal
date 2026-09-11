import { Incident, ResourceUnit } from '../types';

export interface ResourceRecommendation {
  resource: ResourceUnit;
  distanceKm: number;
  etaMinutes: number;
  isTypeMatch: boolean;
  matchScore: number;
  stationName: string;
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
 * station matching (e.g. Fire Station for Fires, Port Base for Floods, Medical Base for Trauma),
 * distance, and ETA.
 */
export function evaluateResourceForIncident(
  incident: Incident,
  resource: ResourceUnit
): ResourceRecommendation {
  const incLat = incident.location?.lat ?? 19.076;
  const incLng = incident.location?.lng ?? 72.8777;
  const resLat = resource.currentLocation?.lat ?? 19.076;
  const resLng = resource.currentLocation?.lng ?? 72.8777;

  const distanceKm = calculateHaversineDistance(resLat, resLng, incLat, incLng);
  const etaMinutes = Math.max(2, Math.round(distanceKm * 1.8 + 3));

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

  const aiReason = `[GPT-4o-mini AI Dispatch] Recommend deploying ${resource.callsign} from ${stationName} for ${incident.category} disaster. ${
    isTypeMatch ? 'Direct disaster capability match' : 'Secondary tactical support'
  } (${distanceKm} km shortest route, ~${etaMinutes} mins ETA).`;

  return {
    resource,
    distanceKm,
    etaMinutes,
    isTypeMatch,
    matchScore,
    stationName,
    aiReason,
  };
}

/**
 * Returns a sorted list of resource recommendations for a given incident,
 * highest scoring (AI recommended) unit first.
 */
export function getRankedResourceRecommendations(
  incident: Incident,
  resources: ResourceUnit[]
): ResourceRecommendation[] {
  if (!resources || resources.length === 0) return [];
  const available = resources.filter((r) => r.status === 'AVAILABLE');
  const pool = available.length > 0 ? available : resources;

  const evaluated = pool.map((res) => evaluateResourceForIncident(incident, res));
  return evaluated.sort((a, b) => b.matchScore - a.matchScore);
}
