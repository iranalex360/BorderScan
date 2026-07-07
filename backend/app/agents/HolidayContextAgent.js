import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { holidayTool } from '../tools/holidayTool.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const systemPrompt = readFileSync(resolve(__dirname, '../../../prompts/holiday_context_agent.md'), 'utf-8');

/**
 * HolidayContextAgent
 * Detects US and Mexican holidays and assesses their traffic impact.
 */
export default class HolidayContextAgent {
  async run({ date }) {
    try {
      const result = await holidayTool({ date, country: 'both' });
      return result;
    } catch (err) {
      console.error('[HolidayContextAgent] failed:', err.message);
      return { error: 'Holiday data unavailable', partial: true, isHoliday: false, trafficImpact: 'unknown' };
    }
  }
}
