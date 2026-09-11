import { Request, Response } from 'express';
import { repository } from '../utils/repository.js';
import { CoordinationAgent, emitEvent } from '../services/coordinationAgent.js';
import { ETAEngine } from '../services/etaEngine.js';
import { IAlert, IBroadcast } from '../models/types.js';
import { isMongoDBConnected } from '../config/database.js';

export const disasterController = {
  // Health
  getHealth: async (req: Request, res: Response) => {
    res.json({
      status: 'UP',
      service: 'PS20 Agentic Disaster Relief Coordinator API',
      database: isMongoDBConnected() ? 'MongoDB' : 'In-Memory Repository Fallback',
      timestamp: new Date().toISOString(),
    });
  },

  // Route Estimation
  getRouteEstimate: async (req: Request, res: Response) => {
    const originLat = parseFloat(req.query.originLat as string);
    const originLon = parseFloat(req.query.originLon as string);
    const destinationLat = parseFloat(req.query.destinationLat as string);
    const destinationLon = parseFloat(req.query.destinationLon as string);

    if (isNaN(originLat) || isNaN(originLon) || isNaN(destinationLat) || isNaN(destinationLon)) {
      return res.status(400).json({ error: 'Valid originLat, originLon, destinationLat, and destinationLon query parameters are required' });
    }

    const { RoutingService } = await import('../services/routingService.js');
    const result = await RoutingService.getRouteEstimate(originLat, originLon, destinationLat, destinationLon);
    res.json(result);
  },

  // Nearby Emergency Support Discovery
  getNearbyEmergencyPlaces: async (req: Request, res: Response) => {
    const lat = parseFloat((req.query.lat || req.query.latitude) as string);
    const lon = parseFloat((req.query.lon || req.query.lng || req.query.longitude) as string);
    const radius = req.query.radius ? parseInt(req.query.radius as string, 10) : 5000;

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({
        success: false,
        error: 'Valid lat and lon query parameters are required',
      });
    }

    const { EmergencyPlacesService } = await import('../services/emergencyPlacesService.js');
    const result = await EmergencyPlacesService.getNearbyPlaces(lat, lon, radius);
    res.json(result);
  },

  // Weather Intelligence
  getWeather: async (req: Request, res: Response) => {
    const lat = parseFloat(req.query.lat as string);
    const lon = parseFloat(req.query.lon as string);

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({ error: 'Valid lat and lon query parameters are required' });
    }

    const { WeatherService } = await import('../services/weatherService.js');
    const result = await WeatherService.getWeather(lat, lon);

    // Weather risk alert trigger check
    if (result.riskLevel === 'HIGH' || result.riskLevel === 'CRITICAL') {
      const { CoordinationAgent, emitEvent } = await import('../services/coordinationAgent.js');
      const { repository } = await import('../utils/repository.js');

      const alertTitle = `WEATHER RISK ${result.riskLevel}: ${result.condition}`;
      const existingAlerts = await repository.getAlerts();
      const duplicateAlert = existingAlerts.find(
        (a) => a.title === alertTitle && !a.status || a.title.includes(result.condition)
      );

      if (!duplicateAlert) {
        const newAlert = await repository.saveAlert({
          id: `ALT-${Math.floor(100 + Math.random() * 900)}`,
          severity: result.riskLevel === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
          title: alertTitle,
          message: `Open-Meteo Weather Intelligence detected severe conditions (${result.precipitation}mm/h rain, ${result.windSpeed}km/h wind). ETA multiplier: ${result.etaMultiplier}x.`,
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
        });

        await CoordinationAgent.logAudit(
          'WEATHER_ALERT_TRIGGERED',
          `Weather Intelligence → ${result.condition} detected → ETA multiplier ${result.etaMultiplier}x`,
          'ALERT',
          undefined,
          undefined,
          'Weather Intelligence Engine'
        );

        emitEvent('weather.alert', { weather: result, alert: newAlert });
        emitEvent('alert.created', newAlert);
      }
    }

    res.json(result);
  },

  // Incidents
  getIncidents: async (req: Request, res: Response) => {
    const incidents = await repository.getIncidents();
    res.json(incidents);
  },

  getIncidentById: async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const incident = await repository.getIncidentById(id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    res.json(incident);
  },

  createIncident: async (req: Request, res: Response) => {
    const result = await CoordinationAgent.handleNewIncident(req.body);
    res.status(201).json(result.incident);
  },

  resetMockState: async (req: Request, res: Response) => {
    const result = await CoordinationAgent.resetMockState();
    res.json(result);
  },

  updateIncident: async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const incident = await repository.getIncidentById(id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });

    Object.assign(incident, req.body);
    await repository.saveIncident(incident);
    emitEvent('incident.updated', incident);

    await CoordinationAgent.logAudit(
      'INCIDENT_UPDATED',
      `Updated details for incident ${incident.id}`,
      'INCIDENT',
      incident.id
    );

    res.json(incident);
  },

  updateIncidentStatus: async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const incident = await repository.getIncidentById(id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });

    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required' });

    incident.status = status;
    await repository.saveIncident(incident);
    emitEvent('incident.updated', incident);

    await CoordinationAgent.logAudit(
      'INCIDENT_STATUS_CHANGED',
      `Incident ${incident.id} status updated to ${status}`,
      'INCIDENT',
      incident.id
    );

    res.json(incident);
  },

  // Resources
  getResources: async (req: Request, res: Response) => {
    const resources = await repository.getResources();
    res.json(resources);
  },

  getResourceById: async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const resource = await repository.getResourceById(id);
    if (!resource) return res.status(404).json({ error: 'Resource not found' });
    res.json(resource);
  },

  dispatchResource: async (req: Request, res: Response) => {
    const resourceId = req.params.id as string;
    const { incidentId, needType, notes } = req.body;

    if (!incidentId) return res.status(400).json({ error: 'incidentId is required' });

    const result = await CoordinationAgent.dispatchResource(incidentId, resourceId, needType, notes);
    if (!result) return res.status(404).json({ error: 'Incident or Resource not found' });

    res.json(result);
  },

  simulateDelay: async (req: Request, res: Response) => {
    const resourceId = req.params.id as string;
    const result = await ETAEngine.simulateRouteCondition(resourceId, true);
    if (!result) return res.status(404).json({ error: 'Dispatched resource not found or not assigned' });
    res.json(result);
  },

  // Allocations
  createAllocation: async (req: Request, res: Response) => {
    const { incidentId, resourceId, needType, notes } = req.body;
    if (!incidentId || !resourceId) {
      return res.status(400).json({ error: 'incidentId and resourceId are required' });
    }

    const result = await CoordinationAgent.dispatchResource(incidentId, resourceId, needType, notes);
    if (!result) return res.status(404).json({ error: 'Failed to create allocation' });

    res.status(201).json(result.allocation);
  },

  reallocateResource: async (req: Request, res: Response) => {
    const { oldResourceId, newResourceId, incidentId } = req.body;

    if (!oldResourceId || !newResourceId || !incidentId) {
      return res.status(400).json({
        error: 'oldResourceId, newResourceId, and incidentId are required',
      });
    }

    const result = await CoordinationAgent.reallocateResource(
      oldResourceId,
      newResourceId,
      incidentId
    );

    if (!result) return res.status(400).json({ error: 'Failed to reallocate resource' });
    res.json(result);
  },

  // Shelters
  getShelters: async (req: Request, res: Response) => {
    const shelters = await repository.getShelters();
    res.json(shelters);
  },

  getShelterById: async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const shelter = await repository.getShelterById(id);
    if (!shelter) return res.status(404).json({ error: 'Shelter not found' });
    res.json(shelter);
  },

  updateShelter: async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const shelter = await repository.getShelterById(id);
    if (!shelter) return res.status(404).json({ error: 'Shelter not found' });

    Object.assign(shelter, req.body);
    if (shelter.occupied >= shelter.capacity) {
      shelter.status = 'FULL';
    } else if (shelter.status === 'FULL' && shelter.occupied < shelter.capacity) {
      shelter.status = 'OPEN';
    }
    shelter.availableBeds = Math.max(0, shelter.capacity - shelter.occupied);

    await repository.saveShelter(shelter);
    emitEvent('shelter.updated', shelter);

    await CoordinationAgent.logAudit(
      'SHELTER_UPDATED',
      `Shelter ${shelter.name} updated: Occupancy ${shelter.occupied}/${shelter.capacity}`,
      'SHELTER'
    );

    res.json(shelter);
  },

  // Alerts
  getAlerts: async (req: Request, res: Response) => {
    const alerts = await repository.getAlerts();
    res.json(alerts);
  },

  createAlert: async (req: Request, res: Response) => {
    const alert: IAlert = {
      id: `ALT-${Math.floor(100 + Math.random() * 900)}`,
      severity: req.body.severity || 'HIGH',
      title: req.body.title || 'System Emergency Alert',
      message: req.body.message || 'Distress condition reported',
      incidentId: req.body.incidentId,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };

    await repository.saveAlert(alert);
    emitEvent('alert.created', alert);

    await CoordinationAgent.logAudit(
      'ALERT_CREATED',
      `Alert created: ${alert.title}`,
      'ALERT',
      alert.incidentId
    );

    res.status(201).json(alert);
  },

  resolveAlert: async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const alert = await repository.getAlertById(id);
    if (!alert) return res.status(404).json({ error: 'Alert not found' });

    alert.status = 'RESOLVED';
    await repository.saveAlert(alert);
    emitEvent('alert.updated', alert);

    await CoordinationAgent.logAudit(
      'ALERT_RESOLVED',
      `Alert ${alert.id} resolved`,
      'ALERT',
      alert.incidentId
    );

    res.json(alert);
  },

  // Audit
  getAudit: async (req: Request, res: Response) => {
    const auditEvents = await repository.getAuditEvents();
    res.json(auditEvents);
  },

  // Broadcasts
  getBroadcasts: async (req: Request, res: Response) => {
    const broadcasts = await repository.getBroadcasts();
    res.json(broadcasts);
  },

  createBroadcast: async (req: Request, res: Response) => {
    const broadcast: IBroadcast = {
      id: `BRD-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: new Date().toISOString(),
      priority: req.body.priority || 'EMERGENCY',
      title: req.body.title,
      message: req.body.message,
      targetArea: req.body.targetArea || 'ALL SECTORS',
      issuedBy: req.body.issuedBy || 'Command Officer',
    };

    await repository.saveBroadcast(broadcast);
    emitEvent('broadcast.created', broadcast);

    await CoordinationAgent.logAudit(
      'BROADCAST_SENT',
      `Broadcast transmitted: ${broadcast.title}`,
      'BROADCAST'
    );

    res.status(201).json(broadcast);
  },

  // Allocations list
  getAllocations: async (req: Request, res: Response) => {
    const allocations = await repository.getAllocations();
    res.json(allocations);
  },

  // Dynamic Analytics
  getAnalytics: async (req: Request, res: Response) => {
    const [incidents, resources, shelters, allocations] = await Promise.all([
      repository.getIncidents(),
      repository.getResources(),
      repository.getShelters(),
      repository.getAllocations(),
    ]);

    const totalIncidents = incidents.length;
    const criticalIncidents = incidents.filter(i => i.severity === 'CRITICAL').length;
    const highIncidents = incidents.filter(i => i.severity === 'HIGH').length;
    const mediumIncidents = incidents.filter(i => i.severity === 'MEDIUM').length;
    const lowIncidents = incidents.filter(i => i.severity === 'LOW').length;

    const activeIncidents = incidents.filter(i => i.status === 'REPORTED' || i.status === 'DISPATCHED' || i.status === 'ON_SITE').length;
    const resolvedIncidents = incidents.filter(i => i.status === 'RESOLVED').length;

    const totalResources = resources.length;
    const availableResources = resources.filter(r => r.status === 'AVAILABLE').length;
    const dispatchedResources = resources.filter(r => r.status === 'EN_ROUTE' || r.status === 'ON_SITE').length;

    const totalShelterCapacity = shelters.reduce((acc, s) => acc + (s.capacity || 0), 0);
    const totalShelterOccupancy = shelters.reduce((acc, s) => acc + ((s as any).occupied ?? (s as any).currentOccupancy ?? 0), 0);
    const shelterOccupancyPct = totalShelterCapacity > 0 ? Math.round((totalShelterOccupancy / totalShelterCapacity) * 100) : 0;

    // Resource Category Breakdown
    const resourceCategories: { [key: string]: { deployed: number; available: number } } = {};
    resources.forEach(r => {
      const type = ((r as any).type || (r as any).category || 'SEARCH_RESCUE').toString();
      if (!resourceCategories[type]) {
        resourceCategories[type] = { deployed: 0, available: 0 };
      }
      if (r.status === 'EN_ROUTE' || r.status === 'ON_SITE') {
        resourceCategories[type].deployed += 1;
      } else {
        resourceCategories[type].available += 1;
      }
    });

    const resourceDistChartData = Object.entries(resourceCategories).map(([type, counts]) => ({
      name: type.replace('_', ' '),
      deployed: counts.deployed,
      available: counts.available,
    }));

    // Incidents Over Time Trend
    const incidentTrend = [
      { time: '06:00', critical: Math.max(1, Math.round(criticalIncidents * 0.2)), high: Math.max(1, Math.round(highIncidents * 0.3)), medium: Math.max(2, Math.round(mediumIncidents * 0.4)) },
      { time: '09:00', critical: Math.max(2, Math.round(criticalIncidents * 0.5)), high: Math.max(2, Math.round(highIncidents * 0.6)), medium: Math.max(3, Math.round(mediumIncidents * 0.6)) },
      { time: '12:00', critical: criticalIncidents, high: highIncidents, medium: mediumIncidents },
      { time: '15:00', critical: Math.max(1, criticalIncidents - 1), high: Math.max(2, highIncidents - 1), medium: Math.max(2, mediumIncidents) },
      { time: '18:00', critical: Math.max(0, criticalIncidents - 2), high: Math.max(1, highIncidents - 2), medium: Math.max(1, mediumIncidents - 1) },
    ];

    const avgResponseEta = allocations.length > 0
      ? Math.round(allocations.reduce((acc, a) => acc + ((a as any).eta || (a as any).etaMinutes || 5), 0) / allocations.length)
      : 4.2;

    res.json({
      summary: {
        totalIncidents,
        criticalIncidents,
        activeIncidents,
        resolvedIncidents,
        totalResources,
        availableResources,
        dispatchedResources,
        totalShelterCapacity,
        totalShelterOccupancy,
        shelterOccupancyPct,
        avgResponseEta,
      },
      incidentsBySeverity: [
        { severity: 'CRITICAL', count: criticalIncidents },
        { severity: 'HIGH', count: highIncidents },
        { severity: 'MEDIUM', count: mediumIncidents },
        { severity: 'LOW', count: lowIncidents },
      ],
      resourceDistChartData,
      incidentTrend,
    });
  },
};
