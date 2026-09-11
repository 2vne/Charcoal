import { SystemAlert } from '../types';

export const INITIAL_MOCK_ALERTS: SystemAlert[] = [
  {
    id: 'ALT-101',
    title: 'ICU Generator Backup Power Critical',
    message: 'Central Hospital generator fuel at 25%. Medevac units requested.',
    severity: 'CRITICAL',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    resolved: false,
    relatedIncidentId: 'INC-2026-8802',
  },
  {
    id: 'ALT-102',
    title: 'Flash Flood Water Level Rising',
    message: 'Kurla Creek level increased 0.4m in 15 minutes. High tide expected.',
    severity: 'HIGH',
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    resolved: false,
    relatedIncidentId: 'INC-2026-8801',
  },
  {
    id: 'ALT-103',
    title: 'Highway 12 Corridor Blocked',
    message: 'Supply route to East Ridge obstructed by landslide debris.',
    severity: 'HIGH',
    timestamp: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
    resolved: false,
    relatedIncidentId: 'INC-2026-8803',
  },
];
