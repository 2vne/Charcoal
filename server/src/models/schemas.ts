import mongoose, { Schema } from 'mongoose';
import {
  IIncident,
  IResource,
  IShelter,
  IAllocation,
  IAuditEvent,
  IAlert,
  IBroadcast,
} from './types.js';

const IncidentSchema = new Schema<IIncident>({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  severity: { type: String, required: true, enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] },
  status: { type: String, required: true, enum: ['REPORTED', 'DISPATCHED', 'ON_SITE', 'RESOLVED', 'CANCELLED'] },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  reportedAt: { type: String, required: true },
  peopleAffected: { type: Number, default: 0 },
  peopleTrapped: { type: Number, default: 0 },
  injured: { type: Number, default: 0 },
  requiredResources: [{ type: String }],
  assignedResources: [{ type: String }],
  source: { type: String, required: true },
  photoUrl: { type: String },
  aiAssessment: { type: Schema.Types.Mixed },
  eta: { type: Number },
});

const ResourceSchema = new Schema<IResource>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: { type: String, required: true },
  agency: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  status: { type: String, required: true, enum: ['AVAILABLE', 'EN_ROUTE', 'ON_SITE', 'MAINTENANCE'] },
  capacity: { type: Number, required: true },
  currentAssignment: { type: String },
  destination: { type: String },
  eta: { type: Number },
  fuelOrSupplyPct: { type: Number, default: 100 },
  contactChannel: { type: String },
});

const ShelterSchema = new Schema<IShelter>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  capacity: { type: Number, required: true },
  occupied: { type: Number, required: true },
  availableBeds: { type: Number, required: true },
  foodSupply: { type: Number, required: true },
  waterSupply: { type: Number, required: true },
  medicalStaff: { type: Number, required: true },
  status: { type: String, required: true, enum: ['OPEN', 'FULL', 'CLOSED'] },
  address: { type: String },
  contactPhone: { type: String },
});

const AllocationSchema = new Schema<IAllocation>({
  id: { type: String, required: true, unique: true },
  resourceId: { type: String, required: true },
  incidentId: { type: String, required: true },
  needType: { type: String, required: true },
  priorityScore: { type: Number, required: true },
  distance: { type: Number, required: true },
  eta: { type: Number, required: true },
  status: { type: String, required: true, enum: ['ACTIVE', 'REALLOCATED', 'COMPLETED', 'CANCELLED'] },
  reason: { type: String, required: true },
  allocatedAt: { type: String, required: true },
});

const AuditEventSchema = new Schema<IAuditEvent>({
  id: { type: String, required: true, unique: true },
  timestamp: { type: String, required: true },
  actor: { type: String, required: true },
  action: { type: String, required: true },
  incidentId: { type: String },
  resourceId: { type: String },
  description: { type: String, required: true },
});

const AlertSchema = new Schema<IAlert>({
  id: { type: String, required: true, unique: true },
  severity: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  incidentId: { type: String },
  status: { type: String, required: true, enum: ['ACTIVE', 'RESOLVED'] },
  createdAt: { type: String, required: true },
});

const BroadcastSchema = new Schema<IBroadcast>({
  id: { type: String, required: true, unique: true },
  timestamp: { type: String, required: true },
  priority: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  targetArea: { type: String, required: true },
  issuedBy: { type: String, required: true },
});

export const IncidentModel = mongoose.models.Incident || mongoose.model<IIncident>('Incident', IncidentSchema);
export const ResourceModel = mongoose.models.Resource || mongoose.model<IResource>('Resource', ResourceSchema);
export const ShelterModel = mongoose.models.Shelter || mongoose.model<IShelter>('Shelter', ShelterSchema);
export const AllocationModel = mongoose.models.Allocation || mongoose.model<IAllocation>('Allocation', AllocationSchema);
export const AuditEventModel = mongoose.models.AuditEvent || mongoose.model<IAuditEvent>('AuditEvent', AuditEventSchema);
export const AlertModel = mongoose.models.Alert || mongoose.model<IAlert>('Alert', AlertSchema);
export const BroadcastModel = mongoose.models.Broadcast || mongoose.model<IBroadcast>('Broadcast', BroadcastSchema);
