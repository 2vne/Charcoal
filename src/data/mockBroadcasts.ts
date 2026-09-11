import { BroadcastMessage } from '../types';

export const INITIAL_MOCK_BROADCASTS: BroadcastMessage[] = [
  {
    id: 'BRD-901',
    timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    priority: 'EMERGENCY',
    title: 'FLASH FLOOD ADVISORY - SECTORS 4 & 5',
    message: 'High tide combined with storm surge has breached Kurla Creek embankment. All low-lying residents must evacuate immediately to Metro Indoor Stadium Shelter (SHL-401).',
    targetArea: 'North Metro Coastal Zone',
    issuedBy: 'EOC Command Chief V. Thorne',
  },
  {
    id: 'BRD-902',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    priority: 'ADVISORY',
    title: 'HIGHWAY 12 TRAFFIC DIVERSION',
    message: 'Highway 12 East Ridge is blocked due to landslide debris. Emergency transport vehicles must use Eastern Bypass Route B.',
    targetArea: 'Eastern Foothills Sector',
    issuedBy: 'Logistics Control',
  },
  {
    id: 'BRD-903',
    timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    priority: 'UPDATE',
    title: 'POTABLE WATER DISTRIBUTION ONLINE',
    message: 'Clean water tank trucks deployed to St. Jude High School Shelter (SHL-402). 10,000 liters available for public distribution.',
    targetArea: 'Kurla West Region',
    issuedBy: 'Relief Logistics Unit',
  },
];
