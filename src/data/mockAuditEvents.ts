import { AuditEvent } from '../types';

export const INITIAL_MOCK_AUDIT_EVENTS: AuditEvent[] = [
  {
    id: 'AUD-501',
    timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    action: 'SYSTEM_INITIALIZATION',
    actor: 'EOC Command Center',
    details: 'Disaster telemetry network initialized for Metro Coastal Region.',
    entityType: 'ALERT',
    entityId: 'SYS-DEFCON2',
  },
  {
    id: 'AUD-502',
    timestamp: new Date(Date.now() - 1000 * 60 * 32).toISOString(),
    action: 'INCIDENT_REPORTED',
    actor: 'Dr. Sarah Vance',
    details: 'Hospital power outage reported at Central Municipal Trauma Hospital.',
    entityType: 'INCIDENT',
    entityId: 'INC-2026-8802',
  },
  {
    id: 'AUD-503',
    timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    action: 'RESOURCE_DISPATCHED',
    actor: 'EOC Dispatch Officer',
    details: 'Medevac unit RES-102 dispatched to incident INC-2026-8802.',
    entityType: 'RESOURCE',
    entityId: 'RES-102',
  },
];
