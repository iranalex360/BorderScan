import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { queueMapTool } from '../tools/queueMapTool.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const systemPrompt = readFileSync(resolve(__dirname, '../../../prompts/queue_map_agent.md'), 'utf-8');

/**
 * QueueMapAgent
 * Assembles lane geometry and current queue state for map rendering.
 */
export default class QueueMapAgent {
  async run({ port, laneType = 'standard', queueStartLabel = null, delayBand = null, reportedQueueLengthKm = null }) {
    try {
      const result = await queueMapTool({ port, laneType, queueStartLabel, delayBand, reportedQueueLengthKm });
      return result;
    } catch (err) {
      console.error('[QueueMapAgent] failed:', err.message);
      return { error: 'Queue map unavailable', partial: true, corridors: [], geojson: null };
    }
  }
}
