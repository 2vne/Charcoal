import mongoose from 'mongoose';
import dotenv from 'dotenv';
import {
  IncidentModel,
  ResourceModel,
  ShelterModel,
  AllocationModel,
  AuditEventModel,
  AlertModel,
  BroadcastModel,
} from '../models/schemas.js';
import {
  SEED_INCIDENTS,
  SEED_RESOURCES,
  SEED_SHELTERS,
  SEED_ALLOCATIONS,
  SEED_ALERTS,
  SEED_AUDIT_EVENTS,
  SEED_BROADCASTS,
} from '../utils/initialSeed.js';

dotenv.config();

let isConnected = false;

export function isMongoDBConnected(): boolean {
  return isConnected && mongoose.connection.readyState === 1;
}

export async function seedMongoDBIfEmpty() {
  try {
    const incidentCount = await IncidentModel.countDocuments();
    if (incidentCount === 0) {
      console.log('[MongoDB] Database is empty. Seeding initial PS20 disaster scenario data...');
      await IncidentModel.insertMany(SEED_INCIDENTS);
      await ResourceModel.insertMany(SEED_RESOURCES);
      await ShelterModel.insertMany(SEED_SHELTERS);
      await AllocationModel.insertMany(SEED_ALLOCATIONS);
      await AlertModel.insertMany(SEED_ALERTS);
      await AuditEventModel.insertMany(SEED_AUDIT_EVENTS);
      await BroadcastModel.insertMany(SEED_BROADCASTS);
      console.log('[MongoDB] Seeding completed successfully.');
    }
  } catch (err) {
    console.error('[MongoDB] Error during seeding:', err);
  }
}

export async function connectDatabase(): Promise<boolean> {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ps20_disaster_relief';

  try {
    console.log(`[MongoDB] Connecting to ${uri}...`);
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
    isConnected = true;
    console.log('=======================================================');
    console.log('[MongoDB] Connection Status: CONNECTED (Production DB Mode Active)');
    console.log('=======================================================');

    await seedMongoDBIfEmpty();
    return true;
  } catch (error: any) {
    isConnected = false;
    console.log('=======================================================');
    console.log('[MongoDB] Connection Status: UNAVAILABLE');
    console.log(`[MongoDB] Reason: ${error?.message || 'Server timeout or connection refused'}`);
    console.log('[Fallback Mode] In-Memory Repository active for PS20 application');
    console.log('=======================================================');
    return false;
  }
}

mongoose.connection.on('disconnected', () => {
  if (isConnected) {
    isConnected = false;
    console.warn('[MongoDB] Connection lost. Fallback mode active.');
  }
});
