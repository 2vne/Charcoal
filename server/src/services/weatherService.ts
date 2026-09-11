import dotenv from 'dotenv';

dotenv.config();

export interface WeatherData {
  temperature: number; // Celsius
  precipitation: number; // mm/hr
  windSpeed: number; // km/h
  weatherCode: number;
  condition: string;
  riskLevel: 'NORMAL' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  etaMultiplier: number;
  timestamp: string;
  source: 'OPEN_METEO' | 'FALLBACK';
}

interface CacheEntry {
  data: WeatherData;
  expiresAt: number;
}

const weatherCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export class WeatherService {
  private static getCacheKey(lat: number, lon: number): string {
    return `${lat.toFixed(2)},${lon.toFixed(2)}`;
  }

  /**
   * Translates WMO weather codes and wind speed into risk levels and ETA multipliers
   */
  public static parseWeatherCondition(code: number, windSpeed: number, precipitation: number): {
    condition: string;
    riskLevel: 'NORMAL' | 'MODERATE' | 'HIGH' | 'CRITICAL';
    etaMultiplier: number;
  } {
    let condition = 'Clear Sky';
    let riskLevel: 'NORMAL' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'NORMAL';
    let etaMultiplier = 1.0;

    if (code === 0) {
      condition = 'Clear / Fair';
      riskLevel = 'NORMAL';
      etaMultiplier = 1.0;
    } else if (code >= 1 && code <= 3) {
      condition = 'Partly Cloudy / Overcast';
      riskLevel = 'NORMAL';
      etaMultiplier = 1.05;
    } else if (code >= 51 && code <= 55) {
      condition = 'Light Drizzle';
      riskLevel = 'MODERATE';
      etaMultiplier = 1.10;
    } else if (code >= 61 && code <= 63) {
      condition = 'Moderate Rainfall';
      riskLevel = 'MODERATE';
      etaMultiplier = 1.15;
    } else if (code === 65 || (code >= 80 && code <= 82)) {
      condition = 'Heavy Rain / Flash Flood Hazard';
      riskLevel = 'HIGH';
      etaMultiplier = 1.25;
    } else if (code >= 95 && code <= 99) {
      condition = 'Severe Thunderstorm & High Wind Surge';
      riskLevel = 'CRITICAL';
      etaMultiplier = 1.45;
    } else {
      condition = 'Coastal Weather Hazard';
      riskLevel = 'MODERATE';
      etaMultiplier = 1.15;
    }

    // High wind or heavy rain escalation override
    if (windSpeed > 50 || precipitation > 15) {
      riskLevel = 'CRITICAL';
      etaMultiplier = Math.max(etaMultiplier, 1.40);
      condition += ' (Gale Warning)';
    } else if (windSpeed > 35 && riskLevel === 'NORMAL') {
      riskLevel = 'MODERATE';
      etaMultiplier = Math.max(etaMultiplier, 1.15);
    }

    return { condition, riskLevel, etaMultiplier };
  }

  public static async getWeather(lat: number, lon: number): Promise<WeatherData> {
    if (isNaN(lat) || isNaN(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
      return this.getFallbackWeather();
    }

    const cacheKey = this.getCacheKey(lat, lon);
    const cached = weatherCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const baseUrl = process.env.WEATHER_API_URL || 'https://api.open-meteo.com/v1/forecast';
    const url = `${baseUrl}?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=precipitation,windspeed_10m`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Open-Meteo HTTP ${response.status}`);
      }

      const data: any = await response.json();
      if (!data || !data.current_weather) {
        throw new Error('Malformed Open-Meteo payload');
      }

      const temp = Math.round(data.current_weather.temperature * 10) / 10;
      const windSpeed = Math.round(data.current_weather.windspeed * 10) / 10;
      const code = data.current_weather.weathercode || 0;
      const precipitation = data.hourly?.precipitation?.[0] || (code >= 61 ? 12 : 0);

      const parsed = this.parseWeatherCondition(code, windSpeed, precipitation);

      const result: WeatherData = {
        temperature: temp,
        precipitation,
        windSpeed,
        weatherCode: code,
        condition: parsed.condition,
        riskLevel: parsed.riskLevel,
        etaMultiplier: parsed.etaMultiplier,
        timestamp: new Date().toISOString(),
        source: 'OPEN_METEO',
      };

      weatherCache.set(cacheKey, {
        data: result,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });

      return result;
    } catch (error: any) {
      console.warn(`[WeatherService] Open-Meteo query failed (${error?.message || 'Timeout'}). Using fallback.`);
      return this.getFallbackWeather();
    }
  }

  private static getFallbackWeather(): WeatherData {
    return {
      temperature: 28.5,
      precipitation: 8.2,
      windSpeed: 24.0,
      weatherCode: 63,
      condition: 'Heavy Rain / Coastal Surge Warning',
      riskLevel: 'HIGH',
      etaMultiplier: 1.25,
      timestamp: new Date().toISOString(),
      source: 'FALLBACK',
    };
  }
}
