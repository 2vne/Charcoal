import { repository } from '../utils/repository.js';
import { calculateHaversineDistance, AllocationAgent } from './allocationAgent.js';
import { RoutingService, RouteEstimate } from './routingService.js';
import { WeatherService, WeatherData } from './weatherService.js';
import { CoordinationAgent, emitEvent } from './coordinationAgent.js';
import { IAlert } from '../models/types.js';

export class ETAEngine {
  /**
   * Calculates dynamic ETA: OSRM travel time × Weather multiplier × Disaster/Roadblock multiplier
   */
  public static async calculateETA(
    resLat: number,
    resLng: number,
    incLat: number,
    incLng: number,
    delayFactor: number = 1.0
  ): Promise<{
    durationMinutes: number;
    distanceKm: number;
    weatherData: WeatherData;
    routeEstimate: RouteEstimate;
  }> {
    const [routeEstimate, weatherData] = await Promise.all([
      RoutingService.getRouteEstimate(resLat, resLng, incLat, incLng),
      WeatherService.getWeather(incLat, incLng),
    ]);

    const weatherMultiplier = weatherData.etaMultiplier || 1.0;
    const baseMinutes = routeEstimate.durationMinutes;

    // Final ETA = Traffic-aware Base Travel Time * Weather Multiplier * Disaster/Roadblock Multiplier
    const durationMinutes = Math.max(2, Math.round(baseMinutes * weatherMultiplier * delayFactor));

    if (routeEstimate.source === 'TOMTOM_TRAFFIC' && (routeEstimate.trafficDelayMinutes || 0) > 0) {
      await CoordinationAgent.logAudit(
        'TRAFFIC_DELAY_DETECTED',
        `TomTom Traffic Engine → Live congestion delay (+${routeEstimate.trafficDelayMinutes}m) detected on route → Traffic-aware ETA: ${durationMinutes}m`,
        'RESOURCE',
        undefined,
        undefined,
        'TomTom Traffic Engine'
      );
    }

    if (weatherMultiplier > 1.15) {
      await CoordinationAgent.logAudit(
        'WEATHER_ETA_ADJUSTMENT',
        `Weather Intelligence → ${weatherData.condition} detected → ETA multiplier ${weatherMultiplier}x applied to base ETA (${baseMinutes}m -> ${durationMinutes}m)`,
        'RESOURCE',
        undefined,
        undefined,
        'ETA Engine'
      );
    }

    return {
      durationMinutes,
      distanceKm: routeEstimate.distanceKm,
      weatherData,
      routeEstimate,
    };
  }

  /**
   * Simulates route updates, severe traffic delays, or flood barriers for dispatched units
   */
  public static async simulateRouteCondition(
    resourceId: string,
    forcedDelay: boolean = true
  ): Promise<{
    resourceId: string;
    oldEta: number;
    newEta: number;
    delayDetected: boolean;
    reason: string;
    recommendedAlternative?: any;
    alert?: IAlert;
  } | null> {
    const resource = await repository.getResourceById(resourceId);
    if (!resource) return null;

    const incidentId = resource.assignedIncidentId || resource.currentAssignment;
    if (!incidentId) return null;

    const incident = await repository.getIncidentById(incidentId);
    if (!incident) return null;

    const oldEta = resource.eta || 10;
    const delayMultiplier = forcedDelay ? 2.8 : 1.0;

    const etaCalculation = await this.calculateETA(
      resource.latitude,
      resource.longitude,
      incident.latitude,
      incident.longitude,
      delayMultiplier
    );

    const newEta = etaCalculation.durationMinutes;

    resource.eta = newEta;
    incident.eta = newEta;

    await repository.saveResource(resource);
    await repository.saveIncident(incident);

    // Active Allocation update
    const allAllocations = await repository.getAllocations();
    const activeAllocations = allAllocations.filter(
      (a) => a.resourceId === resourceId && a.incidentId === incident.id && a.status === 'ACTIVE'
    );
    
    for (const a of activeAllocations) {
      a.eta = newEta;
      await repository.saveAllocation(a);
    }

    const reason = `Transit blockage / Roadbreak detected on route to ${incident.title}. ETA expanded from ${oldEta}m to ${newEta}m (Weather: ${etaCalculation.weatherData.condition}).`;

    // Generate Critical Delay Alert
    const alert: IAlert = {
      id: `ALT-${Math.floor(100 + Math.random() * 900)}`,
      severity: 'CRITICAL',
      title: `TRANSIT DELAY: ${resource.name}`,
      message: reason,
      incidentId: incident.id,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };
    await repository.saveAlert(alert);

    // Audit Event
    await CoordinationAgent.logAudit(
      'ETA_DELAY_DETECTED',
      reason,
      'RESOURCE',
      incident.id,
      resourceId
    );

    // Re-evaluate alternative resource recommendation
    const recommendedAlternative = await AllocationAgent.recommendAllocation(incident);

    // Emit Socket.IO real-time events
    emitEvent('resource.eta.updated', { resourceId, oldEta, newEta, incidentId: incident.id });
    emitEvent('alert.created', alert);
    emitEvent('incident.updated', incident);
    
    if (recommendedAlternative) {
      emitEvent('allocation.recommended', {
        incidentId: incident.id,
        recommendation: recommendedAlternative,
        reason: 'Original unit delayed; recommended faster replacement',
      });
    }

    return {
      resourceId,
      oldEta,
      newEta,
      delayDetected: true,
      reason,
      recommendedAlternative,
      alert,
    };
  }
}
