import React, { useEffect, useState } from 'react';
import { CloudRain, CloudLightning, Sun, Wind, Thermometer, AlertCircle, RefreshCw } from 'lucide-react';
import { apiService, getSocket } from '../../services/apiService';
import { MAP_DEFAULT_CENTER } from '../../utils/constants';

export interface WeatherInfo {
  temperature: number;
  precipitation: number;
  windSpeed: number;
  condition: string;
  riskLevel: 'NORMAL' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  etaMultiplier: number;
  timestamp: string;
  source: 'OPEN_METEO' | 'FALLBACK';
}

export const WeatherPanel: React.FC = () => {
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchWeatherInfo = async () => {
    setLoading(true);
    const data = await apiService.fetchWeather(MAP_DEFAULT_CENTER.lat, MAP_DEFAULT_CENTER.lng);
    if (data) {
      setWeather(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchWeatherInfo();
    const interval = setInterval(fetchWeatherInfo, 60 * 1000); // 1-minute telemetry poll

    const socket = getSocket();
    const handleWeatherAlert = (payload: { weather: WeatherInfo }) => {
      if (payload?.weather) {
        setWeather(payload.weather);
      }
    };

    socket.on('weather.alert', handleWeatherAlert);
    return () => {
      clearInterval(interval);
      socket.off('weather.alert', handleWeatherAlert);
    };
  }, []);

  const riskBadgeStyle = {
    NORMAL: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    MODERATE: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    HIGH: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    CRITICAL: 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse-fast shadow-glow-critical',
  }[weather?.riskLevel || 'NORMAL'];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 flex flex-col h-full font-mono">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
        <div className="flex items-center gap-2">
          <CloudRain className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
            Weather Intelligence (Open-Meteo)
          </h3>
        </div>
        <button
          onClick={fetchWeatherInfo}
          disabled={loading}
          className="text-slate-400 hover:text-cyan-400 transition-colors p-1"
          title="Refresh Weather"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {weather ? (
        <div className="flex-1 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {weather.riskLevel === 'CRITICAL' || weather.riskLevel === 'HIGH' ? (
                <CloudLightning className="w-6 h-6 text-orange-400 animate-pulse" />
              ) : (
                <Sun className="w-6 h-6 text-amber-400" />
              )}
              <div>
                <h4 className="text-xs font-bold text-slate-100 leading-tight">{weather.condition}</h4>
                <p className="text-[10px] text-slate-400">
                  ETA Multiplier: <strong className="text-cyan-400">{weather.etaMultiplier}x</strong>
                </p>
              </div>
            </div>

            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${riskBadgeStyle}`}>
              {weather.riskLevel} RISK
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 bg-slate-950/70 p-2 rounded border border-slate-800/80 text-center text-xs">
            <div>
              <div className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
                <Thermometer className="w-3 h-3 text-red-400" /> TEMP
              </div>
              <div className="font-bold text-slate-200">{weather.temperature}°C</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
                <CloudRain className="w-3 h-3 text-cyan-400" /> RAIN
              </div>
              <div className="font-bold text-cyan-300">{weather.precipitation} mm/h</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
                <Wind className="w-3 h-3 text-purple-400" /> WIND
              </div>
              <div className="font-bold text-purple-300">{weather.windSpeed} km/h</div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
            <span>Source: {weather.source}</span>
            <span>Updated: {new Date(weather.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
          Loading live weather telemetry...
        </div>
      )}
    </div>
  );
};
