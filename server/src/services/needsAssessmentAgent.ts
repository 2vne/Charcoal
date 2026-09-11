import { IIncident } from '../models/types.js';
import { openai, isOpenAIConfigured } from '../config/openai.js';

export interface NeedsAssessmentResult {
  priorityScore: number;
  zoneScore: number;
  peopleAffectedScore: number;
  disasterTypeScore: number;
  urgencyKeywordScore: number;
  detectedKeywords: string[];
  recommendedResourceTypes: string[];
  urgencyReasoning: string;
  assessedAt: string;
  agentModel?: string;
}

export class NeedsAssessmentAgent {
  /**
   * Pure mathematical Priority and Severity Zone Scoring calculation.
   * Formula: zone_score = log10(people_affected) * weight_A + disaster_type + urgency_keyword_score
   */
  public static calculateZoneScore(
    incident: Partial<IIncident>,
    weightA: number = 20
  ): {
    zoneScore: number;
    priorityScore: number;
    peopleAffectedScore: number;
    disasterTypeScore: number;
    urgencyKeywordScore: number;
    detectedKeywords: string[];
    peopleAffected: number;
  } {
    const trapped = Math.max(0, incident.peopleTrapped || 0);
    const injured = Math.max(0, incident.injured || 0);
    const rawAffected = incident.peopleAffected || (trapped + injured);
    const peopleAffected = Math.max(1, rawAffected);

    // 1. log10(people_affected) * weight_A
    const logVal = Math.log10(peopleAffected);
    const peopleAffectedScore = Math.round(logVal * weightA * 10) / 10;

    // 2. Disaster Type Base Score
    let disasterTypeScore = 15;
    const cat = (incident.category || '').toUpperCase();
    if (['EARTHQUAKE', 'STRUCTURAL_COLLAPSE', 'HAZMAT'].includes(cat)) {
      disasterTypeScore = 30;
    } else if (['FLOOD', 'WILDFIRE', 'MEDICAL_EMERGENCY'].includes(cat)) {
      disasterTypeScore = 25;
    } else if (['LANDSLIDE', 'POWER_OUTAGE'].includes(cat)) {
      disasterTypeScore = 20;
    }

    // 3. Urgency Keyword Score from text description & title
    const text = `${incident.title || ''} ${incident.description || ''}`.toLowerCase();
    const criticalKeywords = ['trapped', 'critical', 'explosion', 'submerged', 'bleeding', 'toxic', 'collapse', 'icu', 'raging', 'drowning', 'fatalities', 'urgent', 'life-threatening', 'catastrophic', 'overwhelmed', 'severe', 'flattened'];
    const highKeywords = ['injured', 'fire', 'smoke', 'hazmat', 'landslide', 'flood', 'outage', 'damaged', 'marooned', 'blocked', 'leak', 'rescue', 'evacuate', 'panic', 'medical', 'hospital', 'unconscious'];
    const modKeywords = ['help', 'water', 'power', 'shelter', 'supplies', 'request', 'food', 'need', 'assistance'];

    const detectedKeywords: string[] = [];
    let urgencyKeywordScore = 0;

    for (const kw of criticalKeywords) {
      if (text.includes(kw)) {
        urgencyKeywordScore += 5;
        detectedKeywords.push(kw);
      }
    }
    for (const kw of highKeywords) {
      if (text.includes(kw) && !detectedKeywords.includes(kw)) {
        urgencyKeywordScore += 3;
        detectedKeywords.push(kw);
      }
    }
    for (const kw of modKeywords) {
      if (text.includes(kw) && !detectedKeywords.includes(kw)) {
        urgencyKeywordScore += 1;
        detectedKeywords.push(kw);
      }
    }

    // Mathematical formula: zone_score = log10(people_affected) * weight_A + disaster_type + urgency_keyword_score
    const zoneScore = Math.round((peopleAffectedScore + disasterTypeScore + urgencyKeywordScore) * 10) / 10;
    const priorityScore = Math.min(100, Math.max(1, Math.round(zoneScore)));

    return {
      zoneScore,
      priorityScore,
      peopleAffectedScore,
      disasterTypeScore,
      urgencyKeywordScore,
      detectedKeywords,
      peopleAffected,
    };
  }

  /**
   * Assesses incident severity, casualty count, and emergency context.
   * If OpenAI is configured, uses GPT-4o-mini to perform live AI triage assessment using the exact mathematical formula.
   */
  public static async assessIncidentAsync(incident: Partial<IIncident>): Promise<NeedsAssessmentResult> {
    const mathCalc = this.calculateZoneScore(incident);

    if (isOpenAIConfigured() && openai) {
      try {
        const prompt = `You are the PS20 Emergency Priority & Severity Zone Scoring AI Agent.
Calculate and verify the disaster zone score using the exact mathematical formula:
zone_score = log10(people_affected) * weight_A + disaster_type + urgency_keyword_score

Incident Details:
Title: ${incident.title || 'Emergency Incident'}
Category: ${incident.category || 'FLOOD'}
Severity: ${incident.severity || 'HIGH'}
Description: ${incident.description || 'N/A'}
People Affected: ${mathCalc.peopleAffected} (Trapped: ${incident.peopleTrapped || 0}, Injured: ${incident.injured || 0})
Location: Lat ${incident.latitude}, Lon ${incident.longitude}

Calculated Math Components:
- log10(people_affected) * weight_A (weight_A=20): ${mathCalc.peopleAffectedScore}
- Disaster Type Base Score: ${mathCalc.disasterTypeScore}
- Urgency Keywords Detected: ${mathCalc.detectedKeywords.join(', ') || 'None'} (Score: ${mathCalc.urgencyKeywordScore})
- Total Mathematical Zone Score: ${mathCalc.zoneScore}

Return a JSON object with:
- zoneScore: float/number equal to total formula score
- priorityScore: integer from 1 to 100 representing life-safety urgency
- peopleAffectedScore: float/number log10 component score
- disasterTypeScore: number
- urgencyKeywordScore: number
- detectedKeywords: array of urgency keywords
- recommendedResourceTypes: array of matching resource types from ['SEARCH_RESCUE', 'MEDICAL_UNIT', 'WATER_VESSEL', 'HELICOPTER', 'HEAVY_EQUIPMENT', 'SUPPLY_CONVOY']
- urgencyReasoning: explicit mathematical breakdown text (e.g., "Math: zone_score = log10(N)*20 [X] + disaster_type [Y] + urgency_keywords [Z] = TOTAL. Reason: ...")`;

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
            priorityScore: Math.min(100, Math.max(1, parseInt(parsed.priorityScore) || mathCalc.priorityScore)),
            zoneScore: typeof parsed.zoneScore === 'number' ? parsed.zoneScore : mathCalc.zoneScore,
            peopleAffectedScore: typeof parsed.peopleAffectedScore === 'number' ? parsed.peopleAffectedScore : mathCalc.peopleAffectedScore,
            disasterTypeScore: typeof parsed.disasterTypeScore === 'number' ? parsed.disasterTypeScore : mathCalc.disasterTypeScore,
            urgencyKeywordScore: typeof parsed.urgencyKeywordScore === 'number' ? parsed.urgencyKeywordScore : mathCalc.urgencyKeywordScore,
            detectedKeywords: Array.isArray(parsed.detectedKeywords) ? parsed.detectedKeywords : mathCalc.detectedKeywords,
            recommendedResourceTypes: Array.isArray(parsed.recommendedResourceTypes) ? parsed.recommendedResourceTypes : ['SEARCH_RESCUE'],
            urgencyReasoning: parsed.urgencyReasoning || `Math: zone_score = log10(${mathCalc.peopleAffected})×20 (${mathCalc.peopleAffectedScore}) + type (${mathCalc.disasterTypeScore}) + urgency_keywords (${mathCalc.urgencyKeywordScore}) = ${mathCalc.zoneScore}`,
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
   * Deterministic fallback assessment engine using exact mathematical formula
   */
  public static assessIncident(incident: Partial<IIncident>): NeedsAssessmentResult {
    const mathCalc = this.calculateZoneScore(incident);
    const recommendedTypes: Set<string> = new Set();

    const trapped = incident.peopleTrapped || 0;
    const injured = incident.injured || 0;

    if (trapped > 0) recommendedTypes.add('SEARCH_RESCUE');
    if (injured > 0) recommendedTypes.add('MEDICAL_UNIT');

    switch ((incident.category || '').toUpperCase()) {
      case 'FLOOD':
        recommendedTypes.add('WATER_VESSEL');
        recommendedTypes.add('HELICOPTER');
        if (trapped > 5) recommendedTypes.add('SEARCH_RESCUE');
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

    const reasoning = `Zone Score Breakdown: log10(${mathCalc.peopleAffected})×20 [${mathCalc.peopleAffectedScore}] + ${incident.category || 'FLOOD'} type [${mathCalc.disasterTypeScore}] + Urgency Keywords [${mathCalc.urgencyKeywordScore}] (${mathCalc.detectedKeywords.join(', ') || 'none'}) = ${mathCalc.zoneScore}`;

    return {
      priorityScore: mathCalc.priorityScore,
      zoneScore: mathCalc.zoneScore,
      peopleAffectedScore: mathCalc.peopleAffectedScore,
      disasterTypeScore: mathCalc.disasterTypeScore,
      urgencyKeywordScore: mathCalc.urgencyKeywordScore,
      detectedKeywords: mathCalc.detectedKeywords,
      recommendedResourceTypes: Array.from(recommendedTypes),
      urgencyReasoning: reasoning,
      assessedAt: new Date().toISOString(),
      agentModel: 'Mathematical Zone Scoring Engine',
    };
  }
}

