import { generatePrediction } from '../services/predictionService.js';

/**
 * predictionTool — Generates wait time predictions using LLM + historical data.
 * @param {Object} params
 * @param {string} params.port
 * @param {string} params.laneType
 * @param {number} params.currentWaitMinutes
 * @param {Object} params.holidayContext
 * @param {Object} params.communitySignals
 * @param {number} [params.horizonMinutes=120]
 * @returns {Promise<Object>}
 */
export async function predictionTool(params) {
  const {
    port,
    laneType,
    currentWaitMinutes,
    currentLanesOpen,
    isCbpStale,
    holidayContext,
    communitySignals,
    historicalAverage,
    historicalMedian,
    queueLengthMeters,
    queueMapData,
    trend,
    holidayProfile,
    horizonMinutes = 120
  } = params;

  if (!port || !laneType || currentWaitMinutes === undefined) {
    throw new Error('predictionTool: port, laneType, and currentWaitMinutes are required');
  }

  return generatePrediction({
    port,
    laneType,
    currentWaitMinutes,
    currentLanesOpen,
    isCbpStale,
    holidayContext,
    communitySignals,
    historicalMedian: historicalMedian || historicalAverage,
    queueLengthMeters,
    queueMapData,
    trend,
    holidayProfile,
    horizonMinutes
  });
}
