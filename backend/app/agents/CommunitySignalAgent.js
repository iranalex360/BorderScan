import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { communityReportTool } from '../tools/communityReportTool.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const systemPrompt = readFileSync(resolve(__dirname, '../../../prompts/community_signal_agent.md'), 'utf-8');

/**
 * CommunitySignalAgent
 * Retrieves and assesses recent community-submitted crossing reports.
 */
export default class CommunitySignalAgent {
  async run({ port, windowMinutes = 60 }) {
    try {
      const result = await communityReportTool({ port, windowMinutes });
      const signalStrength =
        result.reportsCount === 0 ? 'none' :
        result.reportsCount >= 3 ? 'high' :
        result.reportsCount >= 1 ? 'medium' : 'low';

      return {
        source: 'BorderScan Community Reports',
        windowMinutes,
        reportsCount: result.reportsCount,
        averageReportedWait: result.averageReportedWait,
        signalStrength,
        reports: result.reports,
      };
    } catch (err) {
      console.error('[CommunitySignalAgent] failed:', err.message);
      return { error: 'Community data unavailable', partial: true, signalStrength: 'none', reports: [] };
    }
  }
}
