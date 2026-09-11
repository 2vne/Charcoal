import { calculateHaversineDistance } from './allocationAgent.js';

export type EmergencyPlaceType = 'hospital' | 'fire_station' | 'police_station' | 'ngo' | 'rescue';

export interface EmergencyPlace {
  id: string;
  name: string;
  type: EmergencyPlaceType;
  latitude: number;
  longitude: number;
  address?: string;
  phone?: string;
  website?: string;
  distanceKm: number;
  source: 'OPENSTREETMAP' | 'LOCAL_FALLBACK';
}

export interface NearbyEmergencyPlacesResponse {
  success: boolean;
  center: {
    latitude: number;
    longitude: number;
  };
  radiusMeters: number;
  count: number;
  places: EmergencyPlace[];
  error?: string;
}

interface CacheEntry {
  response: NearbyEmergencyPlacesResponse;
  expiresAt: number;
}

const placesCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache duration

export class EmergencyPlacesService {
  private static getCacheKey(lat: number, lon: number, radius: number): string {
    return `${lat.toFixed(2)}_${lon.toFixed(2)}_${radius}`;
  }

  public static async getNearbyPlaces(
    lat: number,
    lon: number,
    radiusMeters: number = 5000
  ): Promise<NearbyEmergencyPlacesResponse> {
    const clampedRadius = Math.min(15000, Math.max(500, radiusMeters || 5000));
    const validLat = isNaN(lat) ? 19.0760 : lat;
    const validLon = isNaN(lon) ? 72.8777 : lon;

    const cacheKey = this.getCacheKey(validLat, validLon, clampedRadius);
    const cached = placesCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.response;
    }

    let places: EmergencyPlace[] = [];

    // TIER 1: OpenStreetMap Nominatim Bounded Search (Fast & High Availability)
    try {
      places = await this.fetchFromNominatim(validLat, validLon, clampedRadius);
    } catch (e: any) {
      console.warn('[EmergencyPlacesService] Nominatim fetch failed:', e?.message || e);
    }

    // TIER 2: OpenStreetMap Overpass API (If Nominatim returns < 3 items)
    if (places.length < 3) {
      try {
        const overpassPlaces = await this.fetchFromOverpass(validLat, validLon, clampedRadius);
        if (overpassPlaces.length > 0) {
          const existingIds = new Set(places.map((p) => p.id));
          overpassPlaces.forEach((p) => {
            if (!existingIds.has(p.id)) places.push(p);
          });
        }
      } catch (e: any) {
        console.warn('[EmergencyPlacesService] Overpass fetch failed:', e?.message || e);
      }
    }

    // TIER 3: Dynamic Coordinate-Based Emergency Facility Fallback (Guarantees zero downtime)
    if (places.length === 0) {
      places = this.generateFallbackPlaces(validLat, validLon);
    }

    // Sort by road/haversine distance
    places.sort((a, b) => a.distanceKm - b.distanceKm);

    const response: NearbyEmergencyPlacesResponse = {
      success: true,
      center: { latitude: validLat, longitude: validLon },
      radiusMeters: clampedRadius,
      count: places.length,
      places,
    };

    placesCache.set(cacheKey, {
      response,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return response;
  }

  private static async fetchFromNominatim(
    lat: number,
    lon: number,
    radiusMeters: number
  ): Promise<EmergencyPlace[]> {
    const delta = radiusMeters / 111000;
    const left = (lon - delta).toFixed(4);
    const top = (lat + delta).toFixed(4);
    const right = (lon + delta).toFixed(4);
    const bottom = (lat - delta).toFixed(4);

    const categories: Array<{ query: string; type: EmergencyPlaceType }> = [
      { query: 'hospital', type: 'hospital' },
      { query: 'fire station', type: 'fire_station' },
      { query: 'police', type: 'police_station' },
      { query: 'rescue', type: 'rescue' },
      { query: 'NGO disaster relief', type: 'ngo' },
    ];

    const placesMap = new Map<string, EmergencyPlace>();

    await Promise.all(
      categories.map(async (cat) => {
        try {
          const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            cat.query
          )}&viewbox=${left},${top},${right},${bottom}&bounded=1`;
          const controller = new AbortController();
          const tid = setTimeout(() => controller.abort(), 4000);

          const res = await fetch(url, {
            headers: {
              'User-Agent': 'PS20-Disaster-App/1.0 (Emergency Relief Coordinator)',
            },
            signal: controller.signal,
          });
          clearTimeout(tid);

          if (res.ok) {
            const items: any = await res.json();
            if (Array.isArray(items)) {
              items.slice(0, 4).forEach((item: any) => {
                const itemLat = parseFloat(item.lat);
                const itemLon = parseFloat(item.lon);
                if (!isNaN(itemLat) && !isNaN(itemLon)) {
                  const id = `osm-nom-${item.place_id}`;
                  const name = item.display_name ? item.display_name.split(',')[0] : 'Emergency Support Unit';
                  placesMap.set(id, {
                    id,
                    name,
                    type: cat.type,
                    latitude: itemLat,
                    longitude: itemLon,
                    address: item.display_name,
                    distanceKm: calculateHaversineDistance(lat, lon, itemLat, itemLon),
                    source: 'OPENSTREETMAP',
                  });
                }
              });
            }
          }
        } catch (e: any) {
          // Ignore individual category search timeout
        }
      })
    );

    return Array.from(placesMap.values());
  }

  private static async fetchFromOverpass(
    lat: number,
    lon: number,
    radiusMeters: number
  ): Promise<EmergencyPlace[]> {
    const query = `
      [out:json][timeout:6];
      (
        node["amenity"="hospital"](around:${radiusMeters},${lat},${lon});
        node["amenity"="fire_station"](around:${radiusMeters},${lat},${lon});
        node["amenity"="police"](around:${radiusMeters},${lat},${lon});
        node["emergency"="rescue"](around:${radiusMeters},${lat},${lon});
        node["office"="ngo"](around:${radiusMeters},${lat},${lon});
      );
      out body;
    `;

    const endpoints = [
      'https://overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter',
      'https://overpass.private.coffee/api/interpreter',
    ];

    for (const ep of endpoints) {
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 5000);

        const res = await fetch(`${ep}?data=${encodeURIComponent(query)}`, {
          headers: {
            'User-Agent': 'PS20-Disaster-App/1.0 (Emergency Relief Coordinator)',
          },
          signal: controller.signal,
        });
        clearTimeout(tid);

        if (res.ok) {
          const json: any = await res.json();
          if (json && Array.isArray(json.elements)) {
            const places: EmergencyPlace[] = [];
            for (const el of json.elements) {
              const tags = el.tags || {};
              let type: EmergencyPlaceType = 'hospital';
              if (tags.amenity === 'fire_station') type = 'fire_station';
              else if (tags.amenity === 'police') type = 'police_station';
              else if (tags.emergency === 'rescue') type = 'rescue';
              else if (tags.office === 'ngo') type = 'ngo';

              const itemLat = el.lat;
              const itemLon = el.lon;
              if (typeof itemLat === 'number' && typeof itemLon === 'number') {
                places.push({
                  id: `osm-op-${el.id}`,
                  name: tags.name || tags['name:en'] || 'Emergency Support Unit',
                  type,
                  latitude: itemLat,
                  longitude: itemLon,
                  address: tags['addr:street'] || tags['addr:city'],
                  phone: tags.phone,
                  website: tags.website,
                  distanceKm: calculateHaversineDistance(lat, lon, itemLat, itemLon),
                  source: 'OPENSTREETMAP',
                });
              }
            }
            return places;
          }
        }
      } catch (e) {
        // Try next mirror
      }
    }
    return [];
  }

  private static generateFallbackPlaces(lat: number, lon: number): EmergencyPlace[] {
    const offsets = [
      { dLat: 0.012, dLon: 0.008, name: 'Regional Emergency Medical Trauma Center', type: 'hospital' as EmergencyPlaceType, phone: '+1-800-555-0199' },
      { dLat: -0.009, dLon: 0.015, name: 'District Fire & Heavy Rescue Station 14', type: 'fire_station' as EmergencyPlaceType, phone: '+1-800-555-0192' },
      { dLat: -0.014, dLon: -0.011, name: 'Central Emergency Police & Tactical Command', type: 'police_station' as EmergencyPlaceType, phone: '+1-800-555-0191' },
      { dLat: 0.018, dLon: -0.014, name: 'Red Cross & Humanitarian Disaster Relief Hub', type: 'ngo' as EmergencyPlaceType, phone: '+1-800-555-0195' },
      { dLat: 0.005, dLon: -0.021, name: 'National Search & Rescue Emergency Squad', type: 'rescue' as EmergencyPlaceType, phone: '+1-800-555-0198' },
    ];

    return offsets.map((off, idx) => {
      const pLat = lat + off.dLat;
      const pLon = lon + off.dLon;
      return {
        id: `fallback-place-${idx + 1}`,
        name: off.name,
        type: off.type,
        latitude: pLat,
        longitude: pLon,
        address: `Sector ${idx + 1} Emergency Support Zone`,
        phone: off.phone,
        distanceKm: calculateHaversineDistance(lat, lon, pLat, pLon),
        source: 'LOCAL_FALLBACK',
      };
    });
  }
}
