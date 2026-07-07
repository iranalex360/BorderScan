import { communityReportTool } from '../tools/communityReportTool.js';

describe('CommunitySignalAgent — communityReportTool', () => {
  it('returns structured output with reportsCount', async () => {
    const result = await communityReportTool({ port: 'SAN_YSIDRO', windowMinutes: 60 });
    expect(result).toHaveProperty('reportsCount');
    expect(result).toHaveProperty('reports');
    expect(Array.isArray(result.reports)).toBe(true);
  });

  it('throws when port is missing', async () => {
    await expect(communityReportTool({})).rejects.toThrow('port is required');
  });

  it('returns averageReportedWait as null when no reports', async () => {
    const result = await communityReportTool({ port: 'TECATE', windowMinutes: 1 });
    if (result.reportsCount === 0) {
      expect(result.averageReportedWait).toBeNull();
    }
  });
});
