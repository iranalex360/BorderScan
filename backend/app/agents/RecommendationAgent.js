import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { recommendationTool } from '../tools/recommendationTool.js';
import { logDecision } from '../services/decisionLogService.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const systemPrompt = readFileSync(resolve(__dirname, '../../../prompts/recommendation_agent.md'), 'utf-8');

/**
 * RecommendationAgent
 * Synthesizes all context to produce the best crossing recommendation.
 */
export default class RecommendationAgent {
  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    this.model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  }

  async run(context) {
    try {
      const result = await recommendationTool({
        ports: context.cbpData?.data?.lanes?.map((l) => l.port) || [],
        laneType: context.laneType,
        cbpData: context.cbpData,
        predictions: context.prediction,
        holidayContext: context.holidayData,
        communitySignals: context.communityData,
      });

      const officialWait = context.cbpData?.data?.lanes?.find((l) => l.type === context.laneType)?.waitMinutes ?? null;
      await logDecision({
        query: context.query,
        port: result.recommendedPort,
        laneType: result.recommendedLane,
        officialWait,
        communityEstimate: context.communityData?.averageReportedWait ?? null,
        predictionMinutes: result.estimatedWaitMinutes,
        recommendation: result.explanation,
        confidence: result.confidence,
        reasoningSummary: result.explanation,
      });

      return result;
    } catch (err) {
      console.error('[RecommendationAgent] failed:', err.message);
      return { error: 'Recommendation unavailable', partial: true };
    }
  }
}
