import { fetchCBPWaitTimes } from '../services/cbpService.js';

/**
 * cbpTool — Fetches live CBP border wait time data.
 * @param {{ port: string, laneType?: string, timestamp?: string }} params
 * @returns {Promise<Object>}
 */
export async function cbpTool({ port, laneType = 'all', timestamp }) {
  if (!port) throw new Error('cbpTool: port is required');
  return fetchCBPWaitTimes({ port, laneType, timestamp });
}
