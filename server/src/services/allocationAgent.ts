import { IIncident, IResource, IAllocation } from '../models/types.js';
import { repository } from '../utils/repository.js';
import { NeedsAssessmentAgent } from './needsAssessmentAgent.js';
import { ETAEngine } from './etaEngine.js';
import { openai, isOpenAIConfigured } from '../config/openai.js';

export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export class AllocationAgent {
  /**
   * Deterministically evaluates candidate resources using weather-adjusted road-routing ETA,
   * capability match, availability, and incident severity priority score.
   */
  public static async recommendAllocation(
    incident: IIncident,
    preferredResourceType?: string
  ): Promise<{
    resource: IResource;
    distance: number;
    eta: number;
    priorityScore: number;
    reason: string;
    geometry?: any;
  } | null> {
    const allResources = await repository.getResources();
    const availableResources = allResources.filter((r) => r.status === 'AVAILABLE');

    if (availableResources.length === 0) return null;

    const assessment = NeedsAssessmentAgent.assessIncident(incident);

    // Evaluate each candidate resource asynchronously using ETAEngine (Road routing + Weather Multiplier)
    const candidates = await Promise.all(
      availableResources.map(async (res) => {
        const etaResult = await ETAEngine.calculateETA(
          res.latitude,
          res.longitude,
          incident.latitude,
          incident.longitude
        );

        const distance = etaResult.distanceKm;
        const eta = etaResult.durationMinutes;

        // Weighting formula: Suitability + Priority vs Distance/ETA penalty
        let matchScore = 100 - distance * 2.5 - eta * 1.5;

        const isTypeMatch = preferredResourceType
          ? res.type === preferredResourceType
          : assessment.recommendedResourceTypes.includes(res.type);

        if (isTypeMatch) {
          matchScore += 45; // High weight for exact functional capability match
        }

        return {
          resource: res,
          distance,
          eta,
          priorityScore: assessment.priorityScore,
          matchScore,
          isTypeMatch,
          route: etaResult.routeEstimate,
          weather: etaResult.weatherData,
        };
      })
    );

    candidates.sort((a, b) => b.matchScore - a.matchScore);
    const best = candidates[0];

    if (!best) return null;

    let reason = `Selected unit ${best.resource.name} (${best.resource.agency}) - ${
      best.isTypeMatch ? 'Direct capability match' : 'Secondary support unit'
    }, ${best.distance}km road distance, weather-adjusted ETA ${best.eta} mins (${best.weather.condition}).`;

    if (isOpenAIConfigured() && openai) {
      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are the PS20 Resource Dispatch AI Agent. Provide a concise 1-2 sentence tactical dispatch justification for selecting this unit.',
            },
            {
              role: 'user',
              content: `Incident: "${incident.title}" (Severity: ${incident.severity}). Selected Unit: ${best.resource.name} (${best.resource.type}, ${best.resource.agency}). Road Distance: ${best.distance}km, Weather-Adjusted ETA: ${best.eta} mins. Weather: ${best.weather.condition}.`,
            },
          ],
          max_tokens: 100,
          temperature: 0.3,
        });

        const aiText = response.choices[0]?.message?.content?.trim();
        if (aiText) {
          reason = `[OpenAI GPT-4o-mini Dispatch Agent] ${aiText}`;
        }
      } catch (e: any) {
        console.warn('[AllocationAgent] OpenAI completion error:', e?.message || e);
      }
    }

    return {
      resource: best.resource,
      distance: best.distance,
      eta: best.eta,
      priorityScore: best.priorityScore,
      reason,
      geometry: best.route.geometry,
    };
  }

  public static async createAllocationRecord(
    incidentId: string,
    resourceId: string,
    needType: string,
    priorityScore: number,
    distance: number,
    eta: number,
    reason: string
  ): Promise<IAllocation> {
    const allocation: IAllocation = {
      id: `ALC-${Math.floor(300 + Math.random() * 9700)}`,
      incidentId,
      resourceId,
      needType,
      priorityScore,
      distance,
      eta,
      status: 'ACTIVE',
      reason,
      allocatedAt: new Date().toISOString(),
    };

    return await repository.saveAllocation(allocation);
  }
}
