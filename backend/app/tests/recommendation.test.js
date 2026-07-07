import { recommendationTool } from '../tools/recommendationTool.js';
import db from '../models/db.js';

describe('RecommendationAgent — recommendationTool', () => {
  beforeEach(() => {
    db.prepare('DELETE FROM community_reports').run();
  });

  const baseParams = {
    laneType: 'standard',
    cbpData: {
      data: {
        lanes: [
          { port: 'SAN_YSIDRO', type: 'standard', waitMinutes: 45 },
          { port: 'OTAY_MESA',  type: 'standard', waitMinutes: 20 },
          { port: 'TECATE',     type: 'standard', waitMinutes: 50 },
        ],
      },
    },
    predictions: { predictions: [] },
    holidayContext: { isHoliday: false },
    communitySignals: { reportsCount: 0, windowMinutes: 60, averageReportedWait: null },
  };

  it('recommends switching ports when wait difference is >= 20 mins', async () => {
    // San Ysidro = 45, Otay Mesa = 20. Diff = 25 min.
    const result = await recommendationTool(baseParams);
    expect(result.recommendedPort).toBe('Otay Mesa');
    expect(result.action).toBe('use another port');
    expect(result.alternativeOption).toBe('San Ysidro');
    expect(result.cbpUnderreporting).toBe(false);
  });

  it('recommends crossing now when wait is low', async () => {
    const result = await recommendationTool({
      ...baseParams,
      cbpData: {
        data: {
          lanes: [
            { port: 'SAN_YSIDRO', type: 'standard', waitMinutes: 15 },
            { port: 'OTAY_MESA',  type: 'standard', waitMinutes: 10 },
            { port: 'TECATE',     type: 'standard', waitMinutes: 12 },
          ],
        },
      }
    });
    expect(result.recommendedPort).toBe('San Ysidro');
    expect(result.action).toBe('cross now');
  });

  it('flags CBP underreporting when community median is much higher', async () => {
    const result = await recommendationTool({
      ...baseParams,
      cbpData: {
        data: {
          lanes: [
            { port: 'SAN_YSIDRO', type: 'standard', waitMinutes: 30 },
            { port: 'OTAY_MESA',  type: 'standard', waitMinutes: 40 },
            { port: 'TECATE',     type: 'standard', waitMinutes: 45 },
          ],
        },
      },
      communitySignals: {
        port: 'SAN_YSIDRO',
        reportsCount: 5,
        averageReportedWait: 75, // mismatch = 45 mins
        reports: [{ queueStartLabel: 'near 5 y 10' }]
      }
    });
    expect(result.cbpUnderreporting).toBe(true);
    expect(result.warning).toContain('underreporting');
    expect(result.explanation).toContain('near 5 y 10');
  });

  it('recommends waiting when wait times are extremely high', async () => {
    const result = await recommendationTool({
      ...baseParams,
      cbpData: {
        data: {
          lanes: [
            { port: 'SAN_YSIDRO', type: 'standard', waitMinutes: 120 },
            { port: 'OTAY_MESA',  type: 'standard', waitMinutes: 110 },
            { port: 'TECATE',     type: 'standard', waitMinutes: 115 },
          ],
        },
      }
    });
    expect(result.action).toBe('wait');
  });
});
