import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { fetchCBPWaitTimes } from '../services/cbpService.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const systemPrompt = readFileSync(resolve(__dirname, '../../../prompts/border_data_agent.md'), 'utf-8');

/**
 * BorderScanDataAgent
 * Fetches live CBP border wait time data for a given port and lane type.
 */
export default class BorderScanDataAgent {
  /**
   * @param {{ port: string, laneType?: string }} params
   * @returns {Promise<Object>}
   */
  async run({ port, laneType = 'all' }) {
    try {
      const data = await fetchCBPWaitTimes({ port, laneType });
      return {
        source: data.lanes?.[0]?.source || 'CBP Border Wait Times API',
        fetchedAt: new Date().toISOString(),
        isStale: !!data.cbp_unavailable,
        warning: data.warning || null,
        data,
      };
    } catch (err) {
      console.error('[BorderScanDataAgent] CBP fetch failed:', err.message);
      return { error: 'CBP API unavailable', partial: true, isStale: true, fetchedAt: new Date().toISOString() };
    }
  }
}
