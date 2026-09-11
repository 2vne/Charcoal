import dotenv from 'dotenv';
import { calculateHaversineDistance } from './allocationAgent.js';
import { getTomTomRoute } from './tomtomRoutingService.js';

dotenv.config();

export interface RouteEstimate {
  distanceKm: number;
  durationMinutes: number;
  trafficDelayMinutes?: number;
  geometry?: {
    type: 'LineString';
    coordinates: [number, number][];
  };
  source: 'TOMTOM_TRAFFIC' | 'OSRM' | 'FALLBACK';
}

interface CacheEntry {
  data: RouteEstimate;
  expiresAt: number;
}

const routeCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export class RoutingService {
  private static getCacheKey(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): string {
    return `${lat1.toFixed(4)},${lon1.toFixed(4)}->${lat2.toFixed(4)},${lon2.toFixed(4)}`;
  }

  public static async getRouteEstimate(
    originLat: number,
    originLon: number,
    destinationLat: number,
    destinationLon: number
  ): Promise<RouteEstimate> {
    // Validate coordinates
    if (
      isNaN(originLat) ||
      isNaN(originLon) ||
      isNaN(destinationLat) ||
      isNaN(destinationLon) ||
      Math.abs(originLat) > 90 ||
      Math.abs(destinationLat) > 90
    ) {
      return this.getFallbackRoute(originLat, originLon, destinationLat, destinationLon);
    }

    const cacheKey = this.getCacheKey(originLat, originLon, destinationLat, destinationLon);
    const cached = routeCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    // Tier 1: Attempt TomTom Traffic-Aware Routing if TOMTOM_API_KEY is configured
    try {
      const tomTomResult = await getTomTomRoute(originLat, originLon, destinationLat, destinationLon);
      if (tomTomResult) {
        const result: RouteEstimate = {
          distanceKm: tomTomResult.distanceKm,
          durationMinutes: tomTomResult.durationMinutes,
          trafficDelayMinutes: tomTomResult.trafficDelayMinutes,
          source: 'TOMTOM_TRAFFIC',
          geometry: tomTomResult.geometry,
        };

        routeCache.set(cacheKey, {
          data: result,
          expiresAt: Date.now() + CACHE_TTL_MS,
        });

        return result;
      }
    } catch (e: any) {
      console.warn(`[RoutingService] TomTom Routing failed (${e?.message || 'Error'}). Trying OSRM fallback.`);
    }

    // Tier 2: Attempt OSRM Driving Routing
    const baseUrl = process.env.ROUTING_API_URL || 'https://router.project-osrm.org';
    const url = `${baseUrl}/route/v1/driving/${originLon},${originLat};${destinationLon},${destinationLat}?overview=full&geometries=geojson`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`OSRM API HTTP ${response.status}`);
      }

      const data: any = await response.json();
      if (!data || !data.routes || data.routes.length === 0) {
        throw new Error('OSRM returned no valid route');
      }

      const route = data.routes[0];
      const distanceKm = Math.round((route.distance / 1000) * 10) / 10;
      const durationMinutes = Math.max(2, Math.round(route.duration / 60));

      const result: RouteEstimate = {
        distanceKm,
        durationMinutes,
        geometry: route.geometry,
        source: 'OSRM',
      };

      // Store in cache
      routeCache.set(cacheKey, {
        data: result,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });

      return result;
    } catch (error: any) {
      console.warn(`[RoutingService] OSRM query failed (${error?.message || 'Network Timeout'}). Using Haversine fallback.`);
      const fallback = this.getFallbackRoute(originLat, originLon, destinationLat, destinationLon);
      return fallback;
    }
  }

  private static getFallbackRoute(
    originLat: number,
    originLon: number,
    destinationLat: number,
    destinationLon: number
  ): RouteEstimate {
    const distanceKm = calculateHaversineDistance(originLat, originLon, destinationLat, destinationLon);
    const durationMinutes = Math.max(3, Math.round(distanceKm * 1.5 + 4));

    return {
      distanceKm,
      durationMinutes,
      source: 'FALLBACK',
      geometry: {
        type: 'LineString',
        coordinates: [
          [originLon, originLat],
          [destinationLon, destinationLat],
        ],
      },
    };
  }
}
