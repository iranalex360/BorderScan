import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import CommunitySignalAgent from './CommunitySignalAgent.js';
import HolidayContextAgent from './HolidayContextAgent.js';
import PredictionAgent from './PredictionAgent.js';
import QueueMapAgent from './QueueMapAgent.js';
import RecommendationAgent from './RecommendationAgent.js';
import EvaluationGuardrailAgent from './EvaluationGuardrailAgent.js';
import BorderScanDataAgent from './BorderScanDataAgent.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const systemPrompt = readFileSync(resolve(__dirname, '../../../prompts/main_orchestrator.md'), 'utf-8');

/**
 * BorderScanOrchestratorAgent
 * Coordinates the full multi-agent pipeline and returns a validated response.
 */
export default class BorderScanOrchestratorAgent {
  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    this.model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  }

  /**
   * Run the full pipeline for a given query context.
   * @param {Object} params
   * @param {string} params.query
   * @param {string} params.port
   * @param {string} params.laneType
   * @returns {Promise<Object>}
   */
  async run({ query, port, laneType }) {
    const context = { query, port, laneType, timestamp: new Date().toISOString() };

    // --- Step 1: Fetch live border data ---
    context.cbpData = await new BorderScanDataAgent().run({ port, laneType });

    // --- Step 2: Community signals ---
    context.communityData = await new CommunitySignalAgent().run({ port });

    // --- Step 3: Holiday context ---
    context.holidayData = await new HolidayContextAgent().run({ date: context.timestamp.split('T')[0] });

    // Find any recently reported queue start label
    const reports = context.communityData?.reports || [];
    const reportWithQueueStart = reports.find((r) => r.queueStartLabel);
    const queueStartLabel = reportWithQueueStart ? reportWithQueueStart.queueStartLabel : null;

    // --- Step 4: Queue map ---
    context.queueMap = await new QueueMapAgent().run({ port, laneType, queueStartLabel });

    // --- Step 5: Prediction ---
    context.prediction = await new PredictionAgent().run(context);

    // --- Step 6: Recommendation ---
    context.recommendation = await new RecommendationAgent().run(context);

    // --- Step 7: Guardrail validation ---
    const guardrail = await new EvaluationGuardrailAgent().run(context.recommendation);

    return {
      cbpData: context.cbpData,
      communityData: context.communityData,
      holidayData: context.holidayData,
      prediction: context.prediction,
      queueMap: context.queueMap,
      recommendation: guardrail.sanitizedResponse,
      guardrail: { passed: guardrail.passed, score: guardrail.score, issues: guardrail.issues },
    };
  }
}
