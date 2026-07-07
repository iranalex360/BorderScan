import { getQueueMapData } from '../services/queueMapService.js';

/**
 * queueMapTool — Assembles lane geometry and queue state for a port.
 * @param {{ port: string }} params
 * @returns {Promise<Object>}
 */
export async function queueMapTool({ port, laneType = 'standard', queueStartLabel = null, delayBand = null, reportedQueueLengthKm = null }) {
  if (!port) throw new Error('queueMapTool: port is required');
  return getQueueMapData({ port, laneType, queueStartLabel, delayBand, reportedQueueLengthKm });
}
