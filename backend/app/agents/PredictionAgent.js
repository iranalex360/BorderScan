import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { predictionTool } from '../tools/predictionTool.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const systemPrompt = readFileSync(resolve(__dirname, '../../../prompts/prediction_agent.md'), 'utf-8');

/**
 * PredictionAgent
 * Forecasts border wait times using live data, community signals, and holiday context.
 */
export default class PredictionAgent {
  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    this.model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  }

  async run({ port, laneType, cbpData, communityData, holidayData, queueMap }) {
    try {
      const laneData = cbpData?.data?.lanes?.find((l) => l.type === laneType);
      const currentWait = laneData?.waitMinutes ?? 0;
      const currentLanesOpen = laneData?.openLanes ?? 0;
      const result = await predictionTool({
        port,
        laneType,
        currentWaitMinutes: currentWait,
        currentLanesOpen,
        holidayContext: holidayData,
        communitySignals: communityData,
        queueMapData: queueMap,
        horizonMinutes: 120,
      });
      return result;
    } catch (err) {
      console.error('[PredictionAgent] failed:', err.message);
      return { error: 'Prediction unavailable', partial: true, predictions: [] };
    }
  }
}
