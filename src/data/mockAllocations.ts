import { Allocation } from '../types';

export const INITIAL_MOCK_ALLOCATIONS: Allocation[] = [
  {
    id: 'ALC-301',
    incidentId: 'INC-2026-8802',
    resourceId: 'RES-102',
    dispatchedAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    etaMinutes: 0,
    status: 'ACTIVE',
    notes: 'Medevac unit on site at Central Hospital Trauma ICU',
  },
  {
    id: 'ALC-302',
    incidentId: 'INC-2026-8802',
    resourceId: 'RES-105',
    dispatchedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    etaMinutes: 10,
    status: 'ACTIVE',
    notes: 'Emergency power generator truck en route to hospital',
  },
  {
    id: 'ALC-303',
    incidentId: 'INC-2026-8803',
    resourceId: 'RES-104',
    dispatchedAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
    etaMinutes: 0,
    status: 'ACTIVE',
    notes: 'Heavy excavator deployed for highway landslide clearing',
  },
  {
    id: 'ALC-304',
    incidentId: 'INC-2026-8805',
    resourceId: 'RES-101',
    dispatchedAt: new Date(Date.now() - 1000 * 60 * 80).toISOString(),
    etaMinutes: 12,
    status: 'ACTIVE',
    notes: 'Search & Rescue unit dispatched to stranded transit bus',
  },
];
