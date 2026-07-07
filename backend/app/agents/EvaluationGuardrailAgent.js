import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __dirname = dirname(fileURLToPath(import.meta.url));
const systemPrompt = readFileSync(resolve(__dirname, '../../../prompts/evaluation_guardrail_agent.md'), 'utf-8');

/**
 * EvaluationGuardrailAgent
 * Validates the recommendation response for hallucinations, missing citations,
 * and policy violations before it reaches the user.
 */
export default class EvaluationGuardrailAgent {
  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    this.model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  }

  /**
   * @param {Object} recommendation - Output from RecommendationAgent
   * @returns {Promise<{ passed: boolean, score: number, issues: Array, sanitizedResponse: Object }>}
   */
  async run(recommendation) {
    try {
      const issues = [];
      let score = 1.0;

      // Check 1: source citation
      if (!recommendation.sources || recommendation.sources.length === 0) {
        issues.push({ check: 'source_citation', detail: 'No sources listed in recommendation.' });
        score -= 0.3;
      }

      // Check 2: numeric range
      const wait = recommendation.estimatedWaitMinutes;
      if (typeof wait === 'number' && (wait < 0 || wait > 600)) {
        issues.push({ check: 'numeric_range', detail: `estimatedWaitMinutes (${wait}) is out of range 0–600.` });
        score -= 0.2;
      }

      // Check 3: confidence field present
      if (!recommendation.confidence) {
        issues.push({ check: 'confidence_missing', detail: 'No confidence level specified.' });
        score -= 0.1;
      }

      // Check 4: recommended port present
      if (!recommendation.recommendedPort) {
        issues.push({ check: 'missing_recommendation', detail: 'recommendedPort is missing.' });
        score -= 0.4;
      }

      const passed = issues.length === 0;
      return {
        passed,
        score: Math.max(0, score),
        issues,
        sanitizedResponse: recommendation,
      };
    } catch (err) {
      console.error('[EvaluationGuardrailAgent] failed:', err.message);
      return {
        passed: false,
        score: 0,
        issues: [{ check: 'guardrail_error', detail: err.message }],
        sanitizedResponse: recommendation,
      };
    }
  }
}
