import db from '../models/db.js';

function getMedian(arr) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * evaluatePendingPredictions
 * Compares pending predictions made ~60 minutes ago to the actual wait time proxy.
 * @param {string} port
 * @param {string} lane
 * @param {number} currentLiveCbpWait
 */
export async function evaluatePendingPredictions(port, lane, currentLiveCbpWait) {
  const normPort = port?.toLowerCase().replace(/[-_]/g, '_');
  const normLane = lane?.toLowerCase();
  const nowISO = new Date().toISOString();

  try {
    // Query pending logs created between 50 and 120 minutes ago
    const pendingLogs = db.prepare(`
      SELECT id, predicted_p50 FROM prediction_logs
      WHERE port = ? AND lane = ? AND calibration_status = 'pending'
        AND datetime(created_at) <= datetime(?, '-50 minutes')
        AND datetime(created_at) >= datetime(?, '-120 minutes')
    `).all(normPort, normLane, nowISO, nowISO);

    if (pendingLogs.length === 0) {
      return;
    }

    const updateLogStmt = db.prepare(`
      UPDATE prediction_logs
      SET actual_wait_proxy = ?,
          error_minutes = ?,
          absolute_error_minutes = ?,
          evaluated_at = ?,
          calibration_status = 'evaluated'
      WHERE id = ?
    `);

    for (const log of pendingLogs) {
      const error = currentLiveCbpWait - log.predicted_p50;
      const absError = Math.abs(error);
      updateLogStmt.run(currentLiveCbpWait, error, absError, nowISO, log.id);
    }

    // Recalculate calibration profile
    await updateCalibrationProfile(normPort, normLane);
  } catch (err) {
    console.error(`[calibrationService] Failed to evaluate pending predictions for ${port}/${lane}:`, err.message);
  }
}

/**
 * updateCalibrationProfile
 * Recalculates average error, median absolute error, sample size, and tendency.
 * @param {string} port
 * @param {string} lane
 */
export async function updateCalibrationProfile(port, lane) {
  const normPort = port?.toLowerCase().replace(/[-_]/g, '_');
  const normLane = lane?.toLowerCase();
  const nowISO = new Date().toISOString();

  try {
    const rows = db.prepare(`
      SELECT error_minutes, absolute_error_minutes FROM prediction_logs
      WHERE port = ? AND lane = ? AND calibration_status = 'evaluated'
    `).all(normPort, normLane);

    const sampleSize = rows.length;
    let avgError = 0;
    let medianAbsError = 0;
    let tendency = 'neutral';

    if (sampleSize > 0) {
      const sumError = rows.reduce((sum, r) => sum + r.error_minutes, 0);
      avgError = sumError / sampleSize;

      const absErrors = rows.map((r) => r.absolute_error_minutes);
      medianAbsError = getMedian(absErrors);

      if (avgError >= 20) {
        tendency = 'underpredicting';
      } else if (avgError <= -20) {
        tendency = 'overpredicting';
      } else {
        tendency = 'neutral';
      }
    }

    // Check if profile exists
    const profile = db.prepare(`
      SELECT id FROM prediction_calibration_profiles
      WHERE port = ? AND lane = ?
    `).get(normPort, normLane);

    if (profile) {
      db.prepare(`
        UPDATE prediction_calibration_profiles
        SET average_error_minutes = ?,
            median_absolute_error_minutes = ?,
            sample_size = ?,
            tendency = ?,
            updated_at = ?
        WHERE id = ?
      `).run(avgError, medianAbsError, sampleSize, tendency, nowISO, profile.id);
    } else {
      db.prepare(`
        INSERT INTO prediction_calibration_profiles (
          port, lane, average_error_minutes, median_absolute_error_minutes, sample_size, tendency, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(normPort, normLane, avgError, medianAbsError, sampleSize, tendency, nowISO);
    }
  } catch (err) {
    console.error(`[calibrationService] Failed to update calibration profile for ${port}/${lane}:`, err.message);
  }
}
