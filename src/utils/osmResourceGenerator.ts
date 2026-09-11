import { EmergencyPlace, ResourceUnit } from '../types';

/**
 * Converts real-world OpenStreetMap (OSM) Emergency POIs (fire stations, hospitals,
 * police stations, rescue depots, NGOs) surrounding an incident into active,
 * operational Resource Units stationed at those exact lat/lng coordinates.
 */
export function convertEmergencyPlacesToResourceUnits(
  places: EmergencyPlace[]
): ResourceUnit[] {
  if (!places || places.length === 0) return [];

  return places.map((place, index) => {
    let category: ResourceUnit['category'] = 'SEARCH_RESCUE';
    let callsignPrefix = 'UNIT';

    switch (place.type) {
      case 'fire_station':
        category = 'HEAVY_EQUIPMENT';
        callsignPrefix = 'FIRE-ENGINE';
        break;
      case 'hospital':
        category = 'MEDICAL_UNIT';
        callsignPrefix = 'MEDEVAC';
        break;
      case 'police_station':
        category = 'SEARCH_RESCUE';
        callsignPrefix = 'TACTICAL-SQUAD';
        break;
      case 'rescue':
        category = 'SEARCH_RESCUE';
        callsignPrefix = 'USAR-RESCUE';
        break;
      case 'ngo':
        category = 'SUPPLY_CONVOY';
        callsignPrefix = 'RELIEF-CONVOY';
        break;
    }

    const numId = String(index + 101);
    const cleanName = (place.name || 'Station')
      .replace(/Station|Hospital|Center|Dept|Base|Police|Fire|Emergency/gi, '')
      .trim();
    const shortCallsign = `${callsignPrefix}-${numId} (${cleanName.slice(0, 14) || 'Base'})`;

    return {
      id: `RES-OSM-${place.id}`,
      callsign: shortCallsign,
      category,
      status: 'AVAILABLE',
      personnelCount: Math.floor(6 + Math.random() * 10),
      currentLocation: {
        lat: place.latitude,
        lng: place.longitude,
        address: place.address || place.name,
        zone: 'Disaster Support Zone',
      },
      fuelOrSupplyPct: Math.floor(80 + Math.random() * 20),
      contactChannel: `VHF-CH-${(index % 16) + 1}`,
    };
  });
}
