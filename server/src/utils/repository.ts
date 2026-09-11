import {
  IIncident,
  IResource,
  IShelter,
  IAllocation,
  IAuditEvent,
  IAlert,
  IBroadcast,
} from '../models/types.js';
import {
  IncidentModel,
  ResourceModel,
  ShelterModel,
  AllocationModel,
  AuditEventModel,
  AlertModel,
  BroadcastModel,
} from '../models/schemas.js';
import { isMongoDBConnected } from '../config/database.js';
import {
  SEED_INCIDENTS,
  SEED_RESOURCES,
  SEED_SHELTERS,
  SEED_ALLOCATIONS,
  SEED_ALERTS,
  SEED_AUDIT_EVENTS,
  SEED_BROADCASTS,
} from './initialSeed.js';

import { supabase, isSupabaseConfigured } from '../config/supabase.js';

class UnifiedDisasterRepository {
  private inMemoryIncidents: Map<string, IIncident> = new Map();
  private inMemoryResources: Map<string, IResource> = new Map();
  private inMemoryShelters: Map<string, IShelter> = new Map();
  private inMemoryAllocations: Map<string, IAllocation> = new Map();
  private inMemoryAlerts: Map<string, IAlert> = new Map();
  private inMemoryAuditEvents: IAuditEvent[] = [];
  private inMemoryBroadcasts: IBroadcast[] = [];

  constructor() {
    this.seedInMemory();
  }

  private seedInMemory() {
    this.inMemoryIncidents.clear();
    this.inMemoryResources.clear();
    this.inMemoryShelters.clear();
    this.inMemoryAllocations.clear();
    this.inMemoryAlerts.clear();
    this.inMemoryAuditEvents = [];
    this.inMemoryBroadcasts = [];

    SEED_INCIDENTS.forEach((i) => this.inMemoryIncidents.set(i.id, { ...i }));
    SEED_RESOURCES.forEach((r) => this.inMemoryResources.set(r.id, { ...r }));
    SEED_SHELTERS.forEach((s) => this.inMemoryShelters.set(s.id, { ...s }));
    SEED_ALLOCATIONS.forEach((a) => this.inMemoryAllocations.set(a.id, { ...a }));
    SEED_ALERTS.forEach((alt) => this.inMemoryAlerts.set(alt.id, { ...alt }));
    this.inMemoryAuditEvents = [...SEED_AUDIT_EVENTS];
    this.inMemoryBroadcasts = [...SEED_BROADCASTS];
  }

  // Incidents
  public async getIncidents(): Promise<IIncident[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.from('incidents').select('*');
        if (!error && data && data.length > 0) {
          return data as IIncident[];
        }
      } catch (e) {
        console.warn('[Supabase] Fetch error:', e);
      }
    }
    if (isMongoDBConnected()) {
      const docs = await IncidentModel.find().lean();
      return docs.map(({ _id, __v, ...item }) => item as IIncident);
    }
    return Array.from(this.inMemoryIncidents.values());
  }

  public async getIncidentById(id: string): Promise<IIncident | undefined> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.from('incidents').select('*').eq('id', id).single();
        if (!error && data) return data as IIncident;
      } catch (e) {
        console.warn('[Supabase] Fetch by ID error:', e);
      }
    }
    if (isMongoDBConnected()) {
      const doc = await IncidentModel.findOne({ id }).lean();
      if (!doc) return undefined;
      const { _id, __v, ...item } = doc as any;
      return item as IIncident;
    }
    return this.inMemoryIncidents.get(id);
  }

  public async saveIncident(incident: IIncident): Promise<IIncident> {
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('incidents').upsert(incident, { onConflict: 'id' });
      } catch (e) {
        console.warn('[Supabase] Save error:', e);
      }
    }
    if (isMongoDBConnected()) {
      await IncidentModel.findOneAndUpdate({ id: incident.id }, incident, {
        upsert: true,
        new: true,
      });
      return incident;
    }
    this.inMemoryIncidents.set(incident.id, incident);
    return incident;
  }

  public async setIncidents(incidents: IIncident[]): Promise<IIncident[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('incidents').delete().neq('id', 'NONE');
        await supabase.from('incidents').insert(incidents);
      } catch (e) {
        console.warn('[Supabase] Reset incidents error:', e);
      }
    }
    if (isMongoDBConnected()) {
      await IncidentModel.deleteMany({});
      await IncidentModel.insertMany(incidents);
    }
    this.inMemoryIncidents.clear();
    incidents.forEach((i) => this.inMemoryIncidents.set(i.id, { ...i }));
    return incidents;
  }

  // Resources
  public async getResources(): Promise<IResource[]> {
    if (isMongoDBConnected()) {
      const docs = await ResourceModel.find().lean();
      return docs.map(({ _id, __v, ...item }) => item as IResource);
    }
    return Array.from(this.inMemoryResources.values());
  }

  public async getResourceById(id: string): Promise<IResource | undefined> {
    if (isMongoDBConnected()) {
      const doc = await ResourceModel.findOne({ id }).lean();
      if (!doc) return undefined;
      const { _id, __v, ...item } = doc as any;
      return item as IResource;
    }
    return this.inMemoryResources.get(id);
  }

  public async saveResource(resource: IResource): Promise<IResource> {
    if (isMongoDBConnected()) {
      await ResourceModel.findOneAndUpdate({ id: resource.id }, resource, {
        upsert: true,
        new: true,
      });
      return resource;
    }
    this.inMemoryResources.set(resource.id, resource);
    return resource;
  }

  // Shelters
  public async getShelters(): Promise<IShelter[]> {
    if (isMongoDBConnected()) {
      const docs = await ShelterModel.find().lean();
      return docs.map(({ _id, __v, ...item }) => item as IShelter);
    }
    return Array.from(this.inMemoryShelters.values());
  }

  public async getShelterById(id: string): Promise<IShelter | undefined> {
    if (isMongoDBConnected()) {
      const doc = await ShelterModel.findOne({ id }).lean();
      if (!doc) return undefined;
      const { _id, __v, ...item } = doc as any;
      return item as IShelter;
    }
    return this.inMemoryShelters.get(id);
  }

  public async saveShelter(shelter: IShelter): Promise<IShelter> {
    if (isMongoDBConnected()) {
      await ShelterModel.findOneAndUpdate({ id: shelter.id }, shelter, {
        upsert: true,
        new: true,
      });
      return shelter;
    }
    this.inMemoryShelters.set(shelter.id, shelter);
    return shelter;
  }

  // Allocations
  public async getAllocations(): Promise<IAllocation[]> {
    if (isMongoDBConnected()) {
      const docs = await AllocationModel.find().lean();
      return docs.map(({ _id, __v, ...item }) => item as IAllocation);
    }
    return Array.from(this.inMemoryAllocations.values());
  }

  public async getAllocationById(id: string): Promise<IAllocation | undefined> {
    if (isMongoDBConnected()) {
      const doc = await AllocationModel.findOne({ id }).lean();
      if (!doc) return undefined;
      const { _id, __v, ...item } = doc as any;
      return item as IAllocation;
    }
    return this.inMemoryAllocations.get(id);
  }

  public async saveAllocation(allocation: IAllocation): Promise<IAllocation> {
    if (isMongoDBConnected()) {
      await AllocationModel.findOneAndUpdate({ id: allocation.id }, allocation, {
        upsert: true,
        new: true,
      });
      return allocation;
    }
    this.inMemoryAllocations.set(allocation.id, allocation);
    return allocation;
  }

  // Alerts
  public async getAlerts(): Promise<IAlert[]> {
    if (isMongoDBConnected()) {
      const docs = await AlertModel.find().lean();
      return docs.map(({ _id, __v, ...item }) => item as IAlert);
    }
    return Array.from(this.inMemoryAlerts.values());
  }

  public async getAlertById(id: string): Promise<IAlert | undefined> {
    if (isMongoDBConnected()) {
      const doc = await AlertModel.findOne({ id }).lean();
      if (!doc) return undefined;
      const { _id, __v, ...item } = doc as any;
      return item as IAlert;
    }
    return this.inMemoryAlerts.get(id);
  }

  public async saveAlert(alert: IAlert): Promise<IAlert> {
    if (isMongoDBConnected()) {
      await AlertModel.findOneAndUpdate({ id: alert.id }, alert, {
        upsert: true,
        new: true,
      });
      return alert;
    }
    this.inMemoryAlerts.set(alert.id, alert);
    return alert;
  }

  // Audit Events
  public async getAuditEvents(): Promise<IAuditEvent[]> {
    if (isMongoDBConnected()) {
      const docs = await AuditEventModel.find().sort({ timestamp: -1 }).lean();
      return docs.map(({ _id, __v, ...item }) => item as IAuditEvent);
    }
    return [...this.inMemoryAuditEvents].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  public async saveAuditEvent(event: IAuditEvent): Promise<IAuditEvent> {
    if (isMongoDBConnected()) {
      await AuditEventModel.findOneAndUpdate({ id: event.id }, event, {
        upsert: true,
        new: true,
      });
      return event;
    }
    this.inMemoryAuditEvents.unshift(event);
    return event;
  }

  // Broadcasts
  public async getBroadcasts(): Promise<IBroadcast[]> {
    if (isMongoDBConnected()) {
      const docs = await BroadcastModel.find().sort({ timestamp: -1 }).lean();
      return docs.map(({ _id, __v, ...item }) => item as IBroadcast);
    }
    return [...this.inMemoryBroadcasts].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  public async saveBroadcast(broadcast: IBroadcast): Promise<IBroadcast> {
    if (isMongoDBConnected()) {
      await BroadcastModel.findOneAndUpdate({ id: broadcast.id }, broadcast, {
        upsert: true,
        new: true,
      });
      return broadcast;
    }
    this.inMemoryBroadcasts.unshift(broadcast);
    return broadcast;
  }
}

export const repository = new UnifiedDisasterRepository();
