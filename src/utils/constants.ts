import { SeverityLevel, IncidentCategory, ResourceCategory } from '../types';

export const MAP_DEFAULT_CENTER = {
  lat: 19.0760,
  lng: 72.8777, // Metro Disaster Zone (e.g. Mumbai Coastal Region)
  zoom: 12,
};

export const SEVERITY_COLORS: Record<SeverityLevel, { bg: string; text: string; border: string; glow: string; badge: string }> = {
  CRITICAL: {
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    border: 'border-red-500/40',
    glow: 'shadow-glow-critical',
    badge: 'bg-red-600 text-white',
  },
  HIGH: {
    bg: 'bg-orange-500/10',
    text: 'text-orange-400',
    border: 'border-orange-500/40',
    glow: 'shadow-glow-high',
    badge: 'bg-orange-500 text-white',
  },
  MEDIUM: {
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-400',
    border: 'border-yellow-500/40',
    glow: 'shadow-[0_0_15px_rgba(234,179,8,0.3)]',
    badge: 'bg-yellow-500 text-slate-950 font-bold',
  },
  LOW: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/40',
    glow: 'shadow-[0_0_15px_rgba(59,130,246,0.3)]',
    badge: 'bg-blue-600 text-white',
  },
};

export const CATEGORY_LABELS: Record<IncidentCategory, string> = {
  FLOOD: 'Flash Flooding',
  EARTHQUAKE: 'Seismic Impact',
  WILDFIRE: 'Wildfire Hazard',
  POWER_OUTAGE: 'Grid Collapse',
  MEDICAL_EMERGENCY: 'Mass Casualty / Medevac',
  STRUCTURAL_COLLAPSE: 'Structural Collapse',
  HAZMAT: 'Hazmat Incident',
  LANDSLIDE: 'Landslide Barrier',
};

export const RESOURCE_CATEGORY_LABELS: Record<ResourceCategory, string> = {
  MEDICAL_UNIT: 'Medevac Unit',
  SEARCH_RESCUE: 'Search & Rescue Ops',
  SUPPLY_CONVOY: 'Supply Logistics',
  HEAVY_EQUIPMENT: 'Debris Removal',
  WATER_VESSEL: 'Rescue Boat Unit',
  HELICOPTER: 'Aero-Rescue Unit',
};
