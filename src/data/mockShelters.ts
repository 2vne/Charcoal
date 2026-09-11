import { Shelter } from '../types';

export const INITIAL_MOCK_SHELTERS: Shelter[] = [
  {
    id: 'SHL-401',
    name: 'Metro Indoor Stadium Safe Zone',
    location: {
      lat: 19.0600,
      lng: 72.8580,
      address: 'Stadium Complex, Sector 2',
      zone: 'Central Urban Core',
    },
    capacity: 1500,
    currentOccupancy: 1140,
    medicalStaffCount: 18,
    supplies: {
      waterDays: 5.5,
      foodDays: 4.0,
      medicalKits: 140,
    },
    contactPhone: '+1 (800) 555-SHELTER-1',
    isOpen: true,
  },
  {
    id: 'SHL-402',
    name: 'St. Jude High School Gymnasium',
    location: {
      lat: 19.0900,
      lng: 72.8900,
      address: 'School Road, Kurla West',
      zone: 'North Metro Coastal Zone',
    },
    capacity: 600,
    currentOccupancy: 585,
    medicalStaffCount: 6,
    supplies: {
      waterDays: 2.0,
      foodDays: 1.5,
      medicalKits: 45,
    },
    contactPhone: '+1 (800) 555-SHELTER-2',
    isOpen: true,
  },
  {
    id: 'SHL-403',
    name: 'East Ridge Civic Center',
    location: {
      lat: 19.1150,
      lng: 72.9250,
      address: 'Civic Plaza Blvd, East Hills',
      zone: 'Eastern Foothills Sector',
    },
    capacity: 850,
    currentOccupancy: 320,
    medicalStaffCount: 12,
    supplies: {
      waterDays: 7.0,
      foodDays: 6.0,
      medicalKits: 200,
    },
    contactPhone: '+1 (800) 555-SHELTER-3',
    isOpen: true,
  },
  {
    id: 'SHL-404',
    name: 'South Port Disaster Relief Center',
    location: {
      lat: 19.0300,
      lng: 72.8380,
      address: 'Port Authority Maritime Hall',
      zone: 'Industrial Harbor District',
    },
    capacity: 500,
    currentOccupancy: 110,
    medicalStaffCount: 8,
    supplies: {
      waterDays: 9.0,
      foodDays: 8.5,
      medicalKits: 180,
    },
    contactPhone: '+1 (800) 555-SHELTER-4',
    isOpen: true,
  },
];
