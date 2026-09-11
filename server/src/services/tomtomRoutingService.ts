import dotenv from 'dotenv';

dotenv.config();

export interface TomTomRouteResult {
  distanceKm: number;
  durationMinutes: number;
  trafficDelayMinutes: number;
  source: 'TOMTOM_TRAFFIC';
  geometry?: {
    type: 'LineString';
    coordinates: [number, number][];
  };
}

/**
 * Fetches real-time traffic-aware route and travel time from TomTom Routing API
 * Documentation: https://developer.tomtom.com/routing-api/documentation/tomtom-maps/routing/calculate-route
 */
export async function getTomTomRoute(
  originLat: number,
  originLon: number,
  destinationLat: number,
  destinationLon: number
): Promise<TomTomRouteResult | null> {
  const apiKey = process.env.routingTomTomApi || process.env.routingtomtomapi || process.env.TOMTOM_API_KEY;

  if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_tomtom')) {
    return null;
  }

  const locations = `${originLat},${originLon}:${destinationLat},${destinationLon}`;
  const url = `https://api.tomtom.com/routing/1/calculateRoute/${locations}/json?traffic=true&routeType=fastest&travelMode=car&key=${apiKey}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`TomTom routing failed with HTTP status ${response.status}`);
    }

    const data: any = await response.json();
    const route = data.routes?.[0];

    if (!route || !route.summary) {
      throw new Error('No valid route summary returned by TomTom');
    }

    const summary = route.summary;
    const distanceKm = Math.round((summary.lengthInMeters / 1000) * 10) / 10;
    const durationMinutes = Math.max(1, Math.ceil(summary.travelTimeInSeconds / 60));
    const trafficDelayMinutes = Math.max(0, Math.ceil((summary.trafficDelayInSeconds || 0) / 60));

    // Convert TomTom points [{latitude: x, longitude: y}] to GeoJSON coordinates [[lon, lat]]
    const points: Array<{ latitude: number; longitude: number }> = route.legs?.[0]?.points ?? [];
    const coordinates: [number, number][] = points.map((p) => [p.longitude, p.latitude]);

    return {
      distanceKm,
      durationMinutes,
      trafficDelayMinutes,
      source: 'TOMTOM_TRAFFIC',
      geometry: coordinates.length > 0 ? { type: 'LineString', coordinates } : undefined,
    };
  } catch (error: any) {
    console.warn(`[TomTomRoutingService] TomTom query failed (${error?.message || 'Error'}). Falling back to OSRM.`);
    return null;
  }
}
