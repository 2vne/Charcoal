import { Router } from 'express';
import { disasterController } from '../controllers/disasterController.js';

const router = Router();

// Health & Intelligence
router.get('/health', disasterController.getHealth);
router.get('/routes/estimate', disasterController.getRouteEstimate);
router.get('/weather', disasterController.getWeather);
router.get('/emergency-places/nearby', disasterController.getNearbyEmergencyPlaces);

// Incidents
router.get('/incidents', disasterController.getIncidents);
router.get('/incidents/:id', disasterController.getIncidentById);
router.post('/incidents', disasterController.createIncident);
router.patch('/incidents/:id', disasterController.updateIncident);
router.patch('/incidents/:id/status', disasterController.updateIncidentStatus);

// Resources
router.get('/resources', disasterController.getResources);
router.get('/resources/:id', disasterController.getResourceById);
router.post('/resources/:id/dispatch', disasterController.dispatchResource);
router.post('/resources/:id/simulate-delay', disasterController.simulateDelay);

// Allocations
router.get('/allocations', disasterController.getAllocations);
router.post('/allocations', disasterController.createAllocation);
router.post('/allocations/:id/reallocate', disasterController.reallocateResource);

// Analytics
router.get('/analytics', disasterController.getAnalytics);

// Shelters
router.get('/shelters', disasterController.getShelters);
router.get('/shelters/:id', disasterController.getShelterById);
router.patch('/shelters/:id', disasterController.updateShelter);

// Alerts
router.get('/alerts', disasterController.getAlerts);
router.post('/alerts', disasterController.createAlert);
router.patch('/alerts/:id/resolve', disasterController.resolveAlert);

// Audit
router.get('/audit', disasterController.getAudit);

// Broadcasts
router.get('/broadcasts', disasterController.getBroadcasts);
router.post('/broadcasts', disasterController.createBroadcast);

export default router;
