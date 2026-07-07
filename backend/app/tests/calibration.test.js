import { predictionTool } from '../tools/predictionTool.js';
import { evaluatePendingPredictions, updateCalibrationProfile } from '../services/calibrationService.js';
import db from '../models/db.js';

describe('BorderScan Prediction Calibration & Accuracy Suite', () => {
  let originalDate;

  beforeEach(() => {
    db.prepare('DELETE FROM prediction_logs').run();
    db.prepare('DELETE FROM prediction_calibration_profiles').run();
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
    db.prepare('DELETE FROM prediction_logs').run();
    db.prepare('DELETE FROM prediction_calibration_profiles').run();
    db.prepare('DELETE FROM cbp_wait_snapshots').run();
  });

  const baseParams = {
    port: 'SAN_YSIDRO',
    laneType: 'standard',
    currentWaitMinutes: 90,
    currentLanesOpen: 4
  };

  // 1. Prediction logs are saved
  it('1. Prediction logs are saved', async () => {
    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development'; // Temporarily enable logging

    try {
      await predictionTool(baseParams);

      const logs = db.prepare('SELECT * FROM prediction_logs').all();
      expect(logs.length).toBe(1);
      expect(logs[0].port).toBe('san_ysidro');
      expect(logs[0].lane).toBe('general');
      expect(logs[0].predicted_p50).toBe(90);
      expect(logs[0].calibration_status).toBe('pending');
    } finally {
      process.env.NODE_ENV = prevEnv; // Restore env
    }
  });

  // 2. Pending predictions can be evaluated later
  // 3. Error and absolute error are calculated
  it('2 & 3. Pending predictions can be evaluated later with error calculations', async () => {
    const sixtyMinsAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    // Insert pending log from 60 mins ago (predicted_p50 = 80)
    db.prepare(`
      INSERT INTO prediction_logs (
        port, lane, predicted_p50, predicted_p75, low_range, high_range,
        confidence, cbp_wait_at_prediction, lanes_open, trend, holiday_profile, created_at, calibration_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('san_ysidro', 'general', 80, 120, 45, 180, 'medium', 80, 4, 'stable', 'none', sixtyMinsAgo, 'pending');

    // Run evaluation with live wait time = 100
    await evaluatePendingPredictions('san_ysidro', 'general', 100);

    const logs = db.prepare('SELECT * FROM prediction_logs').all();
    expect(logs.length).toBe(1);
    expect(logs[0].calibration_status).toBe('evaluated');
    expect(logs[0].actual_wait_proxy).toBe(100);
    expect(logs[0].error_minutes).toBe(20); // 100 - 80
    expect(logs[0].absolute_error_minutes).toBe(20);
    expect(logs[0].evaluated_at).toBeDefined();
  });

  // 4. Calibration profile updates after enough samples
  it('4. Calibration profile updates after enough samples', async () => {
    const nowISO = new Date().toISOString();

    // Insert 12 evaluated predictions with average error = 24 and MAE = 20
    const insertStmt = db.prepare(`
      INSERT INTO prediction_logs (
        port, lane, predicted_p50, actual_wait_proxy, error_minutes, absolute_error_minutes, created_at, calibration_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (let i = 0; i < 12; i++) {
      // 8 rows with error +30, 4 rows with error +12 -> Avg error = (240 + 48)/12 = 24. Median absolute = 30.
      const err = i < 8 ? 30 : 12;
      insertStmt.run('san_ysidro', 'general', 70, 70 + err, err, Math.abs(err), nowISO, 'evaluated');
    }

    await updateCalibrationProfile('san_ysidro', 'general');

    const profile = db.prepare('SELECT * FROM prediction_calibration_profiles WHERE port = ? AND lane = ?').get('san_ysidro', 'general');
    expect(profile).toBeDefined();
    expect(profile.sample_size).toBe(12);
    expect(profile.average_error_minutes).toBe(24);
    expect(profile.median_absolute_error_minutes).toBe(30);
    expect(profile.tendency).toBe('underpredicting');
  });

  // 5. Underprediction applies positive adjustment
  it('5. Underprediction applies positive adjustment', async () => {
    // Insert profile showing underprediction: avg error = +20, sample_size = 12
    db.prepare(`
      INSERT INTO prediction_calibration_profiles (
        port, lane, average_error_minutes, median_absolute_error_minutes, sample_size, tendency, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('san_ysidro', 'general', 20, 20, 12, 'underpredicting', new Date().toISOString());

    // Adjustment = 20 * 0.35 = 7. p50 = 90 + 7 = 97.
    const result = await predictionTool({
      ...baseParams,
      currentWaitMinutes: 90
    });
    expect(result.calibration.adjustment_applied).toBe(7);
    expect(result.p50).toBe(97);
  });

  // 6. Overprediction applies negative adjustment
  it('6. Overprediction applies negative adjustment', async () => {
    // Insert profile showing overprediction: avg error = -30, sample_size = 12
    db.prepare(`
      INSERT INTO prediction_calibration_profiles (
        port, lane, average_error_minutes, median_absolute_error_minutes, sample_size, tendency, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('san_ysidro', 'general', -30, 30, 12, 'overpredicting', new Date().toISOString());

    // Adjustment = -30 * 0.35 = -10.5 -> rounds to -10. p50 = 90 - 10 = 80.
    const result = await predictionTool({
      ...baseParams,
      currentWaitMinutes: 90
    });
    expect(result.calibration.adjustment_applied).toBe(-10);
    expect(result.p50).toBe(80);
  });

  // 7. Calibration adjustment is capped
  it('7. Calibration adjustment is capped', async () => {
    // Insert profile with huge avg error = +100
    db.prepare(`
      INSERT INTO prediction_calibration_profiles (
        port, lane, average_error_minutes, median_absolute_error_minutes, sample_size, tendency, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('san_ysidro', 'general', 100, 100, 12, 'underpredicting', new Date().toISOString());

    // Adjustment = 100 * 0.35 = 35 -> capped to 25. p50 = 90 + 25 = 115.
    const result = await predictionTool({
      ...baseParams,
      currentWaitMinutes: 90
    });
    expect(result.calibration.adjustment_applied).toBe(25);
    expect(result.p50).toBe(115);
  });

  // 8. Low sample size applies no adjustment
  it('8. Low sample size applies no adjustment', async () => {
    // Insert profile with low sample size = 5
    db.prepare(`
      INSERT INTO prediction_calibration_profiles (
        port, lane, average_error_minutes, median_absolute_error_minutes, sample_size, tendency, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('san_ysidro', 'general', 20, 20, 5, 'underpredicting', new Date().toISOString());

    const result = await predictionTool({
      ...baseParams,
      currentWaitMinutes: 90
    });
    expect(result.calibration.adjustment_applied).toBe(0);
    expect(result.p50).toBe(90);
  });

  // 9. High recent error lowers confidence
  // 10. Poor calibration widens the prediction range
  it('9 & 10. High recent error lowers confidence and widens ranges', async () => {
    // Insert profile with median absolute error = 50, sample_size = 15
    db.prepare(`
      INSERT INTO prediction_calibration_profiles (
        port, lane, average_error_minutes, median_absolute_error_minutes, sample_size, tendency, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('san_ysidro', 'general', 0, 50, 15, 'neutral', new Date().toISOString());

    const result = await predictionTool({
      ...baseParams,
      currentWaitMinutes: 90,
      historicalMedian: 90 // sample_size for snapshots is 30, normally high confidence
    });

    // Confidence downgraded to low, low_range decreased by 20, high_range increased by 45
    expect(result.confidence).toBe('low');
    expect(result.warnings.some(w => w.includes('recent accuracy'))).toBe(true);
    expect(result.warnings.some(w => w.includes('safest reference'))).toBe(true);

    // Default range spread: low_range = 90 - (90 - 45) = 45. high_range = 90 + (167 - 90) = 167.
    // Widened lowRange = 45 - 20 = 25. Widened highRange = 167 + 45 = 212.
    expect(result.low_range).toBe(25);
    expect(result.high_range).toBe(212);
  });
});
