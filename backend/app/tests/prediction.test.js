import { predictionTool } from '../tools/predictionTool.js';
import db from '../models/db.js';

describe('PredictionAgent — No-Community Prediction Engine', () => {
  let originalDate;

  beforeEach(() => {
    db.prepare('DELETE FROM cbp_wait_snapshots').run();
    
    // Mock Date globally to Tuesday 10:00 AM (neutral time pressure)
    const mockDate = new Date('2026-07-07T10:00:00'); // Tuesday 10:00 AM
    originalDate = global.Date;
    global.Date = class extends originalDate {
      constructor(...args) {
        if (args.length === 0) return mockDate;
        return new originalDate(...args);
      }
      static now() {
        return mockDate.getTime();
      }
    };
  });

  afterEach(() => {
    global.Date = originalDate;
  });

  afterAll(() => {
    db.prepare('DELETE FROM cbp_wait_snapshots').run();
  });

  function insertSnapshot({ port, lane, wait_minutes, lanes_open, day_of_week, hour, holiday_profile = 'none', fetched_at = null }) {
    db.prepare(`
      INSERT INTO cbp_wait_snapshots (
        port, lane, cbp_port_number, cbp_lane_path, wait_minutes, lanes_open,
        lane_update_time, source_record_time, fetched_at, day_of_week, hour, holiday_profile
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      port,
      lane,
      '250401',
      'passenger_vehicle_lanes.standard_lanes',
      wait_minutes,
      lanes_open,
      'At 10:00 pm PDT',
      '7/3/2026 22:08:40',
      fetched_at || new Date().toISOString(),
      day_of_week,
      hour,
      holiday_profile
    );
  }

  const baseParams = {
    port: 'SAN_YSIDRO',
    laneType: 'standard',
    currentWaitMinutes: 90,
    currentLanesOpen: 4
  };

  // 1. Prediction works with zero community reports
  it('1. Prediction works with zero community reports', async () => {
    const result = await predictionTool({
      ...baseParams,
      communitySignals: null
    });
    expect(result.mode).toBe('official_history_no_community');
    expect(result.p50).toBeDefined();
    expect(result.signals_used.community_reports_used).toBe(false);
  });

  // 2. Historical p50 anchors prediction
  it('2. Historical p50 anchors prediction', async () => {
    const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const currentHour = new Date().getHours();
    const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();
    
    // Insert 10 snapshots with wait_minutes = 100
    for (let i = 0; i < 10; i++) {
      insertSnapshot({
        port: 'san_ysidro',
        lane: 'general',
        wait_minutes: 100,
        lanes_open: 4,
        day_of_week: currentDay,
        hour: currentHour,
        fetched_at: fiveHoursAgo
      });
    }

    const result = await predictionTool({
      ...baseParams,
      currentWaitMinutes: 100
    });
    expect(result.historical_baseline.p50).toBe(100);
    expect(result.p50).toBe(100);
  });

  // 3. Current CBP adjusts but does not fully replace history
  it('3. Current CBP adjusts but does not fully replace history', async () => {
    const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const currentHour = new Date().getHours();
    const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();

    for (let i = 0; i < 10; i++) {
      insertSnapshot({
        port: 'san_ysidro',
        lane: 'general',
        wait_minutes: 90,
        lanes_open: 4,
        day_of_week: currentDay,
        hour: currentHour,
        fetched_at: fiveHoursAgo
      });
    }

    const result = await predictionTool({
      ...baseParams,
      currentWaitMinutes: 120 // CBP is higher than history (90)
    });
    // cbpDelta = 30, cbpAdjustment = 30 * 1 * 0.7 = 21. p50Raw = 90 + 21 = 111.
    expect(result.p50).toBe(111);
    expect(result.p50).toBeGreaterThan(90);
    expect(result.p50).toBeLessThan(120);
  });

  // 4. Recent rising trend increases estimate
  it('4. Recent rising trend increases estimate', async () => {
    const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const currentHour = new Date().getHours();
    const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();

    // Insert historical base
    for (let i = 0; i < 10; i++) {
      insertSnapshot({
        port: 'san_ysidro',
        lane: 'general',
        wait_minutes: 90,
        lanes_open: 4,
        day_of_week: currentDay,
        hour: currentHour,
        fetched_at: fiveHoursAgo
      });
    }

    // Insert trend snapshots (rising by 50 mins in last 2 hours)
    insertSnapshot({
      port: 'san_ysidro',
      lane: 'general',
      wait_minutes: 50,
      lanes_open: 4,
      day_of_week: currentDay,
      hour: currentHour,
      fetched_at: new Date(Date.now() - 90 * 60 * 1000).toISOString()
    });
    insertSnapshot({
      port: 'san_ysidro',
      lane: 'general',
      wait_minutes: 100,
      lanes_open: 4,
      day_of_week: currentDay,
      hour: currentHour,
      fetched_at: new Date(Date.now() - 10 * 60 * 1000).toISOString()
    });

    const result = await predictionTool({
      ...baseParams,
      currentWaitMinutes: 90
    });
    // trendDelta = 50 -> rising_fast (+25 mins adjustment)
    expect(result.adjustments.trend).toBe(25);
    expect(result.p50).toBe(115); // 90 + 25
  });

  // 5. Recent dropping trend decreases estimate
  it('5. Recent dropping trend decreases estimate', async () => {
    const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const currentHour = new Date().getHours();
    const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();

    for (let i = 0; i < 10; i++) {
      insertSnapshot({
        port: 'san_ysidro',
        lane: 'general',
        wait_minutes: 90,
        lanes_open: 4,
        day_of_week: currentDay,
        hour: currentHour,
        fetched_at: fiveHoursAgo
      });
    }

    // Insert trend snapshots (dropping by 50 mins in last 2 hours)
    insertSnapshot({
      port: 'san_ysidro',
      lane: 'general',
      wait_minutes: 100,
      lanes_open: 4,
      day_of_week: currentDay,
      hour: currentHour,
      fetched_at: new Date(Date.now() - 90 * 60 * 1000).toISOString()
    });
    insertSnapshot({
      port: 'san_ysidro',
      lane: 'general',
      wait_minutes: 50,
      lanes_open: 4,
      day_of_week: currentDay,
      hour: currentHour,
      fetched_at: new Date(Date.now() - 10 * 60 * 1000).toISOString()
    });

    const result = await predictionTool({
      ...baseParams,
      currentWaitMinutes: 90
    });
    // trendDelta = -50 -> dropping_fast (-25 mins adjustment)
    expect(result.adjustments.trend).toBe(-25);
    expect(result.p50).toBe(65); // 90 - 25
  });

  // 6. Fewer lanes open increases estimate
  it('6. Fewer lanes open increases estimate', async () => {
    const result = await predictionTool({
      ...baseParams,
      currentWaitMinutes: 90,
      currentLanesOpen: 2 // Reference for general/standard is 4. Ratio = 4/2 = 2 (adjustment +25)
    });
    expect(result.adjustments.lanes_open).toBe(25);
  });

  // 7. More lanes open decreases estimate slightly
  it('7. More lanes open decreases estimate slightly', async () => {
    const result = await predictionTool({
      ...baseParams,
      currentWaitMinutes: 90,
      currentLanesOpen: 8 // Ratio = 4/8 = 0.5 (adjustment -12)
    });
    expect(result.adjustments.lanes_open).toBe(-12);
  });

  // 8. Holiday profile adds pressure
  it('8. Holiday profile adds pressure', async () => {
    const result = await predictionTool({
      ...baseParams,
      currentWaitMinutes: 90,
      holidayProfile: 'both_holiday' // adds +35 mins for general lane
    });
    expect(result.adjustments.holiday).toBe(35);
  });

  // 9. Weekend/daytime pressure adds pressure
  it('9. Weekend/daytime pressure adds pressure', async () => {
    const mockWeekend = new Date('2026-07-04T12:00:00'); // Saturday 12:00 PM
    
    // Override local date to weekend
    global.Date = class extends originalDate {
      constructor(...args) {
        if (args.length === 0) return mockWeekend;
        return new originalDate(...args);
      }
      static now() {
        return mockWeekend.getTime();
      }
    };

    const result = await predictionTool({
      ...baseParams,
      currentWaitMinutes: 90
    });

    // Saturday 12:00 PM is weekend daytime -> adds +20 mins pressure
    expect(result.adjustments.time_pressure).toBe(20);
  });

  // 10. Queue estimate is optional
  it('10. Queue estimate is optional', async () => {
    const withoutQueue = await predictionTool({
      ...baseParams,
      currentWaitMinutes: 90,
      queueLengthMeters: null
    });
    expect(withoutQueue.adjustments.queue).toBe(0);

    const withQueue = await predictionTool({
      ...baseParams,
      currentWaitMinutes: 90,
      queueLengthMeters: 2000 // 2 km General = 90 min estimate. queueAdjustment = (90 - 90) * 1 * 0.45 = 0.
    });
    expect(withQueue.signals_used.queue_estimate).toBe(90);

    const withLongQueue = await predictionTool({
      ...baseParams,
      currentWaitMinutes: 90,
      queueLengthMeters: 4000 // 4 km General = 180 min estimate. queueAdjustment = (180 - 90) * 1 * 0.45 = 40.5 -> 41.
    });
    expect(withLongQueue.adjustments.queue).toBe(41);
  });

  // 11. p75 uses historical spread
  it('11. p75 uses historical spread', async () => {
    const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const currentHour = new Date().getHours();
    const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();

    const waits = [45, 45, 45, 90, 90, 90, 140, 140, 210, 210];
    for (const w of waits) {
      insertSnapshot({
        port: 'san_ysidro',
        lane: 'general',
        wait_minutes: w,
        lanes_open: 4,
        day_of_week: currentDay,
        hour: currentHour,
        fetched_at: fiveHoursAgo
      });
    }

    const result = await predictionTool({
      ...baseParams,
      currentWaitMinutes: 90
    });
    expect(result.p75).toBe(140);
  });

  // 12. high_range uses historical p90 spread
  it('12. high_range uses historical p90 spread', async () => {
    const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const currentHour = new Date().getHours();
    const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();

    const waits = [45, 45, 45, 90, 90, 90, 140, 140, 210, 210];
    for (const w of waits) {
      insertSnapshot({
        port: 'san_ysidro',
        lane: 'general',
        wait_minutes: w,
        lanes_open: 4,
        day_of_week: currentDay,
        hour: currentHour,
        fetched_at: fiveHoursAgo
      });
    }

    const result = await predictionTool({
      ...baseParams,
      currentWaitMinutes: 90
    });
    expect(result.high_range).toBe(210);
  });

  // 13. General and Ready lanes can reach 240 max
  it('13. General and Ready lanes can reach 240 max', async () => {
    const result = await predictionTool({
      ...baseParams,
      laneType: 'general',
      currentWaitMinutes: 240,
      historicalMedian: 240,
      currentLanesOpen: 1
    });
    expect(result.p50).toBe(240);
    expect(result.high_range).toBe(240);
  });

  // 14. Confidence is lower when history sample size is small
  it('14. Confidence is lower when history sample size is small', async () => {
    const result = await predictionTool({
      ...baseParams,
      currentWaitMinutes: 90
    });
    // No snapshots in database -> sampleSize = 0 -> confidence = 'low'
    expect(result.historical_baseline.sample_size).toBe(0);
    expect(result.confidence).toBe('low');
  });

  // 15. Confidence is lower when CBP differs strongly from history
  it('15. Confidence is lower when CBP differs strongly from history', async () => {
    const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const currentHour = new Date().getHours();
    const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();

    for (let i = 0; i < 35; i++) {
      insertSnapshot({
        port: 'san_ysidro',
        lane: 'general',
        wait_minutes: 40,
        lanes_open: 4,
        day_of_week: currentDay,
        hour: currentHour,
        fetched_at: fiveHoursAgo
      });
    }

    const result = await predictionTool({
      ...baseParams,
      currentWaitMinutes: 150 // CBP (150) differs from history p50 (40) by 110 mins (exceeds 70 mins penalty)
    });
    expect(result.confidence).toBe('low');
  });

  // 16. No community fields are required to generate prediction
  it('16. No community fields are required to generate prediction', async () => {
    const result = await predictionTool({
      port: 'SAN_YSIDRO',
      laneType: 'standard',
      currentWaitMinutes: 60
    });
    expect(result.p50).toBeDefined();
    expect(result.confidence).toBeDefined();
  });
});
