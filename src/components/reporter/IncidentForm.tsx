import React, { useState, useEffect } from 'react';
import { IncidentCategory, SeverityLevel } from '../../types';
import { CATEGORY_LABELS } from '../../utils/constants';
import { Send, MapPin, Navigation, FileText, CheckCircle, AlertCircle, Search, Loader2 } from 'lucide-react';

interface IncidentFormProps {
  onSubmitReport: (data: {
    title: string;
    category: IncidentCategory;
    severity: SeverityLevel;
    address: string;
    lat: number;
    lng: number;
    strandedCount: number;
    injuredCount: number;
    urgentNeeds: string[];
    description: string;
  }) => void;
}

export const IncidentForm: React.FC<IncidentFormProps> = ({ onSubmitReport }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<IncidentCategory>('FLOOD');
  const [severity, setSeverity] = useState<SeverityLevel>('HIGH');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState<number>(19.0760);
  const [lng, setLng] = useState<number>(72.8777);
  const [strandedCount, setStrandedCount] = useState(1);
  const [injuredCount, setInjuredCount] = useState(0);
  const [description, setDescription] = useState('');
  const [selectedNeeds, setSelectedNeeds] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geoStatus, setGeoStatus] = useState<string | null>(null);

  const needsOptions = ['MEDICAL', 'EVACUATION', 'CLEAN_WATER', 'FOOD_RATIONS', 'SHELTER', 'POWER_GENERATOR'];

  // Auto-geocode address when location is entered (debounced)
  useEffect(() => {
    if (!address || address.trim().length < 3) return;

    const timer = setTimeout(async () => {
      setIsGeocoding(true);
      setGeoStatus('Geocoding location...');
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
          { headers: { 'User-Agent': 'PS20-Disaster-App/1.0' } }
        );
        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0) {
            const geocodedLat = parseFloat(parseFloat(data[0].lat).toFixed(5));
            const geocodedLng = parseFloat(parseFloat(data[0].lon).toFixed(5));
            setLat(geocodedLat);
            setLng(geocodedLng);
            setGeoStatus(`Auto-geocoded coordinates: ${geocodedLat}° N, ${geocodedLng}° E`);
          } else {
            setGeoStatus('Location not found on geocoder map, using default/manual coordinates.');
          }
        }
      } catch (e) {
        console.warn('Geocoding service error:', e);
      } finally {
        setIsGeocoding(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [address]);

  const toggleNeed = (need: string) => {
    setSelectedNeeds((prev) =>
      prev.includes(need) ? prev.filter((n) => n !== need) : [...prev, need]
    );
  };

  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setGeoStatus('Geolocation is not supported by your browser.');
      return;
    }

    setIsGeolocating(true);
    setGeoStatus('Acquiring high-precision GPS coordinates...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const detectedLat = parseFloat(position.coords.latitude.toFixed(5));
        const detectedLng = parseFloat(position.coords.longitude.toFixed(5));
        setLat(detectedLat);
        setLng(detectedLng);
        setIsGeolocating(false);
        setGeoStatus(`GPS Acquired: ${detectedLat}° N, ${detectedLng}° E`);

        if (!address) {
          setAddress(`GPS Location (${detectedLat}, ${detectedLng})`);
        }
      },
      (error) => {
        setIsGeolocating(false);
        setGeoStatus(`GPS Error: ${error.message}. Using manual / fallback coordinates.`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !address) return;
    onSubmitReport({
      title,
      category,
      severity,
      address,
      lat: isNaN(lat) ? 19.0760 : lat,
      lng: isNaN(lng) ? 72.8777 : lng,
      strandedCount,
      injuredCount,
      urgentNeeds: selectedNeeds,
      description,
    });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="p-6 bg-slate-900 border border-emerald-500/50 rounded-xl text-center font-mono">
        <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3 animate-bounce" />
        <h3 className="text-lg font-bold text-slate-100">REPORT FILED & PINNED TO MAP</h3>
        <p className="text-xs text-slate-400 mt-2">
          Your emergency report has been transmitted to EOC Command and mapped dynamically at ({lat}, {lng}).
        </p>
        <button
          onClick={() => setSubmitted(false)}
          className="mt-4 px-4 py-2 bg-slate-800 text-cyan-400 rounded text-xs font-bold border border-slate-700 hover:bg-slate-700"
        >
          SUBMIT ANOTHER REPORT
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-4 font-sans shadow-xl">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <FileText className="w-5 h-5 text-cyan-400" />
        <h3 className="font-mono text-sm font-bold text-slate-100 uppercase tracking-wider">
          Report Field Incident / Emergency
        </h3>
      </div>

      {/* Incident Title */}
      <div>
        <label className="block text-xs font-mono text-slate-400 mb-1">INCIDENT SUMMARY TITLE</label>
        <input
          type="text"
          required
          placeholder="e.g. Flash flood trapped family on rooftop..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs text-slate-100 placeholder-slate-500 font-mono focus:border-cyan-500 outline-none"
        />
      </div>

      {/* Category & Severity Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-mono text-slate-400 mb-1">DISASTER TYPE</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as IncidentCategory)}
            className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs font-mono text-slate-200 outline-none"
          >
            {Object.entries(CATEGORY_LABELS).map(([cat, label]) => (
              <option key={cat} value={cat}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-mono text-slate-400 mb-1">SEVERITY LEVEL</label>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as SeverityLevel)}
            className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs font-mono text-slate-200 outline-none"
          >
            <option value="CRITICAL">CRITICAL (Life-Threatening)</option>
            <option value="HIGH">HIGH (Urgent Assistance)</option>
            <option value="MEDIUM">MEDIUM (Moderate Danger)</option>
            <option value="LOW">LOW (Informational / Minor)</option>
          </select>
        </div>
      </div>

      {/* Location Controls Section */}
      <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-mono text-slate-300 font-bold flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-cyan-400" />
            <span>INCIDENT LOCATION</span>
          </label>
          <button
            type="button"
            onClick={handleDetectGPS}
            disabled={isGeolocating}
            className="px-2.5 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-300 text-[11px] font-mono font-bold rounded flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
          >
            <Navigation className={`w-3.5 h-3.5 ${isGeolocating ? 'animate-spin text-cyan-400' : ''}`} />
            <span>{isGeolocating ? 'DETECTING...' : 'USE MY GPS LOCATION'}</span>
          </button>
        </div>

        {/* Address / Location Text Field */}
        <div>
          <label className="block text-[10px] font-mono text-slate-400 mb-1 flex items-center justify-between">
            <span>STREET ADDRESS / LANDMARK LOCATION</span>
            {isGeocoding && (
              <span className="text-cyan-400 flex items-center gap-1 font-mono">
                <Loader2 className="w-3 h-3 animate-spin" /> Auto-geocoding...
              </span>
            )}
          </label>
          <div className="relative">
            <input
              type="text"
              required
              placeholder="e.g. Marine Drive, Nariman Point, Mumbai..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-2 text-xs text-slate-100 placeholder-slate-500 font-mono focus:border-cyan-500 outline-none pr-8"
            />
            <Search className="w-4 h-4 text-slate-500 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>
        </div>

        {geoStatus && (
          <div className="text-[10px] font-mono text-cyan-400 flex items-center gap-1 bg-slate-900 p-1.5 rounded border border-slate-800">
            <AlertCircle className="w-3 h-3 text-cyan-400 shrink-0" />
            <span>{geoStatus}</span>
          </div>
        )}

        {/* Latitude & Longitude manual inputs (Auto-updated) */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-900">
          <div>
            <label className="block text-[10px] font-mono text-slate-400 mb-1">LATITUDE (°N)</label>
            <input
              type="number"
              step="any"
              required
              value={lat}
              onChange={(e) => setLat(parseFloat(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono text-cyan-300 outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono text-slate-400 mb-1">LONGITUDE (°E)</label>
            <input
              type="number"
              step="any"
              required
              value={lng}
              onChange={(e) => setLng(parseFloat(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono text-cyan-300 outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      </div>

      {/* Stranded & Injured Counts */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-mono text-slate-400 mb-1">STRANDED PEOPLE</label>
          <input
            type="number"
            min={0}
            value={strandedCount}
            onChange={(e) => setStrandedCount(parseInt(e.target.value) || 0)}
            className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs text-slate-100 font-mono outline-none"
          />
        </div>
        <div>
          <label className="block text-[11px] font-mono text-slate-400 mb-1">INJURED COUNT</label>
          <input
            type="number"
            min={0}
            value={injuredCount}
            onChange={(e) => setInjuredCount(parseInt(e.target.value) || 0)}
            className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs text-slate-100 font-mono outline-none"
          />
        </div>
      </div>

      {/* Urgent Needs Checklist */}
      <div>
        <label className="block text-xs font-mono text-slate-400 mb-1">URGENT NEEDS</label>
        <div className="flex flex-wrap gap-1.5">
          {needsOptions.map((need) => {
            const isSelected = selectedNeeds.includes(need);
            return (
              <button
                type="button"
                key={need}
                onClick={() => toggleNeed(need)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all border ${
                  isSelected
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                + {need.replace('_', ' ')}
              </button>
            );
          })}
        </div>
      </div>

      {/* Additional Details */}
      <div>
        <label className="block text-xs font-mono text-slate-400 mb-1">ADDITIONAL DESCRIPTION</label>
        <textarea
          rows={3}
          placeholder="Describe water depth, structural safety, medical conditions..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs text-slate-100 placeholder-slate-500 font-mono focus:border-cyan-500 outline-none resize-none"
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-mono font-bold text-xs rounded-lg flex items-center justify-center gap-2 shadow-glow-critical transition-all uppercase tracking-wider"
      >
        <Send className="w-4 h-4" />
        <span>TRANSMIT DISASTER REPORT</span>
      </button>
    </form>
  );
};


