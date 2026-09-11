import { IIncident } from '../models/types.js';
import { openai, isOpenAIConfigured } from '../config/openai.js';

export interface NeedsAssessmentResult {
  priorityScore: number;
  recommendedResourceTypes: string[];
  urgencyReasoning: string;
  assessedAt: string;
  agentModel?: string;
}

export class NeedsAssessmentAgent {
  /**
   * Assesses incident severity, casualty count, and emergency context.
   * If OpenAI is configured, uses GPT-4o-mini to perform live AI triage assessment.
   */
  public static async assessIncidentAsync(incident: Partial<IIncident>): Promise<NeedsAssessmentResult> {
    if (isOpenAIConfigured() && openai) {
      try {
        const prompt = `You are the PS20 Emergency Needs Assessment AI Agent.
Analyze this disaster incident report and return a JSON object with:
- priorityScore: integer from 1 to 100 representing life-safety urgency
- recommendedResourceTypes: array of matching resource types from ['SEARCH_RESCUE', 'MEDICAL_UNIT', 'WATER_VESSEL', 'HELICOPTER', 'HEAVY_EQUIPMENT', 'SUPPLY_CONVOY']
- urgencyReasoning: 1-2 sentence detailed reasoning of why this priority score and resource allocation was selected

Incident Details:
Title: ${incident.title || 'Emergency Incident'}
Category: ${incident.category || 'FLOOD'}
Severity: ${incident.severity || 'HIGH'}
Description: ${incident.description || 'N/A'}
People Trapped: ${incident.peopleTrapped || 0}
People Injured: ${incident.injured || 0}
Location: Lat ${incident.latitude}, Lon ${incident.longitude}`;

        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: 'You are an expert emergency logistics AI triage agent. Respond ONLY in valid JSON.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.2,
        });

        const content = response.choices[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          return {
            priorityScore: Math.min(100, Math.max(1, parseInt(parsed.priorityScore) || 75)),
            recommendedResourceTypes: Array.isArray(parsed.recommendedResourceTypes) ? parsed.recommendedResourceTypes : ['SEARCH_RESCUE'],
            urgencyReasoning: parsed.urgencyReasoning || 'AI live GPT-4o-mini triage assessment completed.',
            assessedAt: new Date().toISOString(),
            agentModel: 'OpenAI GPT-4o-mini',
          };
        }
      } catch (e: any) {
        console.warn('[NeedsAssessmentAgent] OpenAI Live Agent call failed, falling back to rule-based engine:', e?.message || e);
      }
    }

    return this.assessIncident(incident);
  }

  /**
   * Deterministic fallback assessment engine
   */
  public static assessIncident(incident: Partial<IIncident>): NeedsAssessmentResult {
    let score = 50;
    const recommendedTypes: Set<string> = new Set();
    const reasons: string[] = [];

    switch (incident.severity) {
      case 'CRITICAL':
        score += 30;
        reasons.push('Life-threatening critical status');
        break;
      case 'HIGH':
        score += 20;
        reasons.push('High urgency emergency');
        break;
      case 'MEDIUM':
        score += 10;
        reasons.push('Moderate urgency risk');
        break;
      case 'LOW':
        score += 0;
        break;
    }

    const trapped = incident.peopleTrapped || 0;
    const injured = incident.injured || 0;

    if (trapped > 0) {
      score += Math.min(20, trapped * 2);
      reasons.push(`${trapped} citizens trapped`);
      recommendedTypes.add('SEARCH_RESCUE');
    }

    if (injured > 0) {
      score += Math.min(15, injured * 3);
      reasons.push(`${injured} casualties reported`);
      recommendedTypes.add('MEDICAL_UNIT');
    }

    switch (incident.category) {
      case 'FLOOD':
        recommendedTypes.add('WATER_VESSEL');
        recommendedTypes.add('HELICOPTER');
        if (trapped > 10) recommendedTypes.add('SEARCH_RESCUE');
        break;
      case 'POWER_OUTAGE':
        recommendedTypes.add('SUPPLY_CONVOY');
        recommendedTypes.add('MEDICAL_UNIT');
        break;
      case 'LANDSLIDE':
      case 'STRUCTURAL_COLLAPSE':
        recommendedTypes.add('HEAVY_EQUIPMENT');
        recommendedTypes.add('SEARCH_RESCUE');
        break;
      case 'HAZMAT':
      case 'WILDFIRE':
        recommendedTypes.add('SEARCH_RESCUE');
        recommendedTypes.add('MEDICAL_UNIT');
        break;
      default:
        recommendedTypes.add('SEARCH_RESCUE');
        break;
    }

    const finalScore = Math.min(100, Math.max(1, score));

    return {
      priorityScore: finalScore,
      recommendedResourceTypes: Array.from(recommendedTypes),
      urgencyReasoning: reasons.join('; ') || 'Standard emergency assessment.',
      assessedAt: new Date().toISOString(),
      agentModel: 'Rule-Based Fallback Engine',
    };
  }
}
