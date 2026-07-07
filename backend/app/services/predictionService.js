import db from '../models/db.js';

const HISTORICAL_DEFAULTS = {
  general: { p25: 45, p50: 90, p75: 140, p90: 210 },
  standard: { p25: 45, p50: 90, p75: 140, p90: 210 },
  ready: { p25: 35, p50: 75, p75: 120, p90: 190 },
  sentri: { p25: 10, p50: 25, p75: 55, p90: 100 },
  pedestrian: { p25: 20, p50: 50, p75: 95, p90: 150 },
  pedestrian_ready: { p25: 5, p50: 15, p75: 35, p90: 75 }
};

const REFERENCE_LANES = {
  general: 4,
  standard: 4,
  ready: 6,
  sentri: 3,
  pedestrian: 8,
  pedestrian_ready: 4
};

const LANE_MAX_WAIT_MINUTES = {
  general: 240,
  standard: 240,
  ready: 240,
  sentri: 150,
  pedestrian: 180,
  pedestrian_ready: 120
};

const BASE_MINUTES_PER_KM = {
  general: 45,
  standard: 45,
  ready: 40,
  sentri: 22,
  pedestrian: 35,
  pedestrian_ready: 25
};

export function getDelayBand(minutes) {
  if (minutes == null) return "unknown";
  if (minutes <= 30) return "low";
  if (minutes <= 75) return "moderate";
  if (minutes <= 120) return "high";
  if (minutes <= 180) return "severe";
  return "extreme";
}

const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

function getPercentile(sortedArray, percentile) {
  if (sortedArray.length === 0) return 0;
  const index = (sortedArray.length - 1) * (percentile / 100);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
}

function getTrendLabel(trendDelta) {
  if (trendDelta >= 45) return "rising_fast";
  if (trendDelta >= 15) return "rising";
  if (trendDelta <= -45) return "dropping_fast";
  if (trendDelta <= -15) return "dropping";
  return "stable";
}

function getTrendAdjustment(trendLabel) {
  switch (trendLabel) {
    case "rising_fast":
      return 25;
    case "rising":
      return 12;
    case "dropping_fast":
      return -25;
    case "dropping":
      return -12;
    default:
      return 0;
  }
}

function getLaneCapacityAdjustment({ lane, lanesOpen }) {
  if (!lanesOpen || lanesOpen <= 0) return 0;

  const reference = REFERENCE_LANES[lane] || 4;
  const ratio = reference / lanesOpen;

  if (ratio >= 2) return 25;
  if (ratio >= 1.5) return 15;
  if (ratio >= 1.2) return 8;
  if (ratio <= 0.6) return -12;
  if (ratio <= 0.8) return -6;

  return 0;
}

function getHolidayAdjustment({ holidayProfile, lane }) {
  const isSentri = lane === "sentri";

  switch (holidayProfile) {
    case "both_holiday":
      return isSentri ? 15 : 35;
    case "us_holiday":
      return isSentri ? 10 : 25;
    case "mx_holiday":
      return isSentri ? 8 : 20;
    case "us_long_weekend":
    case "mx_long_weekend":
      return isSentri ? 12 : 30;
    case "day_before_holiday":
      return isSentri ? 10 : 25;
    case "day_after_holiday":
      return isSentri ? 8 : 20;
    default:
      return 0;
  }
}

function getTimePressureAdjustment({ hour, dayOfWeek, lane }) {
  const isWeekend = ["saturday", "sunday"].includes(dayOfWeek);
  const isVehicle = ["general", "standard", "ready"].includes(lane);

  if (!isVehicle) return 0;

  if (isWeekend && hour >= 10 && hour <= 20) return 20;
  if (!isWeekend && hour >= 5 && hour <= 9) return 15;
  if (!isWeekend && hour >= 15 && hour <= 19) return 12;
  if (hour >= 0 && hour <= 4) return -15;

  return 0;
}

function estimateFromQueueLength({ queueLengthMeters, lane, lanesOpen }) {
  if (!queueLengthMeters || queueLengthMeters <= 0) return null;

  const km = queueLengthMeters / 1000;
  const base = BASE_MINUTES_PER_KM[lane] || 45;
  const referenceLanes = REFERENCE_LANES[lane] || 4;
  const safeLanesOpen = Math.max(1, lanesOpen || referenceLanes);
  const laneCapacityFactor = Math.sqrt(referenceLanes / safeLanesOpen);

  return km * base * laneCapacityFactor;
}

/** Helper to extract count, average, age, stdDev from community signals reports */
function getCommunityStats(communitySignals) {
  if (!communitySignals) {
    return { count: 0, avgWait: null, avgAge: 0, stdDev: 0 };
  }

  if (communitySignals.reportsCount !== undefined && communitySignals.averageReportedWait !== undefined) {
    const count = communitySignals.reportsCount;
    const avgWait = communitySignals.averageReportedWait;
    
    if (count === 0 || avgWait === null) {
      return { count: 0, avgWait: null, avgAge: 0, stdDev: 0 };
    }
    
    const reports = communitySignals.reports || [];
    if (reports.length === 0) {
      return { count, avgWait, avgAge: 0, stdDev: 0 };
    }
  }

  const reports = communitySignals.reports || [];
  const count = reports.length;
  if (count === 0) {
    return { count: 0, avgWait: null, avgAge: 0, stdDev: 0 };
  }

  const waits = reports
    .map((r) => r.reportedWaitMinutes ?? r.reported_wait_minutes)
    .filter((w) => w !== undefined && w !== null);

  if (waits.length === 0) {
    return { count, avgWait: null, avgAge: 0, stdDev: 0 };
  }

  const avgWait = waits.reduce((sum, w) => sum + w, 0) / waits.length;

  let variance = 0;
  if (waits.length > 1) {
    const sqDiffs = waits.map((w) => Math.pow(w - avgWait, 2));
    variance = sqDiffs.reduce((sum, d) => sum + d, 0) / waits.length;
  }
  const stdDev = Math.sqrt(variance);

  const nowMs = Date.now();
  const ages = reports.map((r) => {
    const submitted = r.submittedAt || r.submitted_at || r.created_at;
    if (!submitted) return 0;
    const diffMs = nowMs - new Date(submitted).getTime();
    return Math.max(0, diffMs / (60 * 1000));
  });
  const avgAge = ages.reduce((sum, a) => sum + a, 0) / ages.length;

  return { count, avgWait, avgAge, stdDev };
}

/**
 * generatePrediction - Forecasts border wait times using snapshot databases.
 * @param {Object} params
 * @returns {Promise<Object>}
 */
export async function generatePrediction({
  port,
  laneType = 'standard',
  currentWaitMinutes,
  currentLanesOpen,
  isCbpStale = false,
  cbpAgeMinutes = 0,
  holidayProfile = 'none',
  holidayContext,
  communitySignals,
  historicalMedian,
  historicalAverage,
  queueLengthMeters,
  queueMapData,
  trend = 'stable'
}) {
  const lane = laneType?.toLowerCase() || 'standard';
  const normLane = lane === 'standard' ? 'general' : lane;
  const normPort = port?.toLowerCase().replace(/[-_]/g, '_');
  const laneMax = LANE_MAX_WAIT_MINUTES[normLane] || LANE_MAX_WAIT_MINUTES.general;

  // 1. Resolve current day, hour and holiday context
  const dateObj = new Date();
  const currentDayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const currentHour = dateObj.getHours();

  let resolvedHolidayProfile = holidayProfile || holidayContext?.holidayProfile || 'none';
  if (resolvedHolidayProfile === 'none' && holidayContext?.isHoliday) {
    const isUs = holidayContext.is_us_holiday || holidayContext.isUsHoliday || false;
    const isMx = holidayContext.is_mx_holiday || holidayContext.isMxHoliday || false;
    const isLong = holidayContext.is_long_weekend || holidayContext.isLongWeekend || false;
    if (isUs && isMx) resolvedHolidayProfile = 'both_holiday';
    else if (isUs) resolvedHolidayProfile = isLong ? 'us_long_weekend' : 'us_holiday';
    else if (isMx) resolvedHolidayProfile = isLong ? 'mx_long_weekend' : 'mx_holiday';
    else resolvedHolidayProfile = isLong ? 'us_long_weekend' : 'us_holiday';
  }

  // 2. Query historical snapshots with fallback priority
  let matchedRows = [];
  try {
    matchedRows = db.prepare(`
      SELECT wait_minutes FROM cbp_wait_snapshots
      WHERE port = ? AND lane = ? AND day_of_week = ? AND hour = ? AND holiday_profile = ?
    `).all(normPort, normLane, currentDayOfWeek, currentHour, resolvedHolidayProfile);

    if (matchedRows.length === 0) {
      matchedRows = db.prepare(`
        SELECT wait_minutes FROM cbp_wait_snapshots
        WHERE port = ? AND lane = ? AND day_of_week = ? AND hour = ?
      `).all(normPort, normLane, currentDayOfWeek, currentHour);
    }
    if (matchedRows.length === 0) {
      matchedRows = db.prepare(`
        SELECT wait_minutes FROM cbp_wait_snapshots
        WHERE port = ? AND lane = ? AND hour = ?
      `).all(normPort, normLane, currentHour);
    }
    if (matchedRows.length === 0) {
      matchedRows = db.prepare(`
        SELECT wait_minutes FROM cbp_wait_snapshots
        WHERE port = ? AND lane = ?
      `).all(normPort, normLane);
    }
  } catch (err) {
    console.error('[predictionService] Failed to query cbp snapshots:', err.message);
  }

  // Calculate historical percentiles
  let historicalP25, historicalP50, historicalP75, historicalP90, sampleSize;
  const histMedianInput = historicalMedian || historicalAverage;

  if (matchedRows.length > 0) {
    const waits = matchedRows.map(r => r.wait_minutes).sort((a, b) => a - b);
    historicalP25 = Math.round(getPercentile(waits, 25));
    historicalP50 = Math.round(getPercentile(waits, 50));
    historicalP75 = Math.round(getPercentile(waits, 75));
    historicalP90 = Math.round(getPercentile(waits, 90));
    sampleSize = matchedRows.length;
  } else if (histMedianInput !== undefined && histMedianInput !== null) {
    historicalP25 = Math.round(histMedianInput * 0.50);
    historicalP50 = histMedianInput;
    historicalP75 = Math.round(histMedianInput * 1.35);
    historicalP90 = Math.round(histMedianInput * 1.85);
    sampleSize = 30; // Treat as trusted input with sufficient sample size
  } else {
    // Falls back to lane default
    const defaults = HISTORICAL_DEFAULTS[normLane] || HISTORICAL_DEFAULTS.general;
    historicalP25 = defaults.p25;
    historicalP50 = defaults.p50;
    historicalP75 = defaults.p75;
    historicalP90 = defaults.p90;
    sampleSize = 0;
  }

  // 3. Current CBP wait time signal
  const cbpWait = currentWaitMinutes !== undefined && currentWaitMinutes !== null ? currentWaitMinutes : 45;
  const cbpTrust = isCbpStale ? 0.3 : 1.0;
  const cbpDelta = cbpWait - historicalP50;
  const cbpAdjustment = cbpDelta * cbpTrust * 0.70;

  // 3b. Optional Community signals
  const commStats = getCommunityStats(communitySignals);
  const commWait = commStats.avgWait;
  const reportsCount = commStats.count;

  let communityTrust = 0.0;
  if (reportsCount === 1) communityTrust = 0.3;
  else if (reportsCount === 2) communityTrust = 0.6;
  else if (reportsCount >= 3) communityTrust = 1.0;

  if (commStats.avgAge > 30) communityTrust -= 0.3;
  if (commStats.stdDev > 25) communityTrust -= 0.3;
  communityTrust = Math.max(0.0, Math.min(1.0, communityTrust));

  const communityAdjustment = commWait !== null ? (commWait - historicalP50) * communityTrust * 0.45 : 0;

  // 4. CBP Trend from recent snapshots (last 60-120 minutes)
  let trendLabel = trend || 'stable';
  let trendDelta = 0;
  try {
    const twoHoursAgo = new Date(Date.now() - 120 * 60 * 1000).toISOString();
    const recentSnaps = db.prepare(`
      SELECT wait_minutes, fetched_at FROM cbp_wait_snapshots
      WHERE port = ? AND lane = ? AND fetched_at >= ?
      ORDER BY fetched_at ASC
    `).all(normPort, normLane, twoHoursAgo);

    if (recentSnaps.length >= 2) {
      const latestWait = recentSnaps[recentSnaps.length - 1].wait_minutes;
      const earliestWait = recentSnaps[0].wait_minutes;
      trendDelta = latestWait - earliestWait;
      trendLabel = getTrendLabel(trendDelta);
    }
  } catch (err) {
    console.error('[predictionService] Failed to query recent snapshots for trend:', err.message);
  }
  const trendAdjustment = getTrendAdjustment(trendLabel);

  // 5. Lane capacity adjustment
  const laneCapacityAdjustment = getLaneCapacityAdjustment({ lane: normLane, lanesOpen: currentLanesOpen });

  // 6. Holiday and time pressure
  const holidayAdjustment = getHolidayAdjustment({ holidayProfile: resolvedHolidayProfile, lane: normLane });
  const timePressureAdjustment = getTimePressureAdjustment({ hour: currentHour, dayOfWeek: currentDayOfWeek, lane: normLane });

  // 7. Optional queue-map estimate
  let queueLen = queueLengthMeters;
  if (queueLen === undefined || queueLen === null) {
    queueLen = queueMapData?.geojson?.properties?.queueLengthMeters;
  }
  if (queueLen === undefined || queueLen === null) {
    queueLen = queueMapData?.corridors?.find((c) => c.laneType === laneType)?.currentQueueLengthMeters;
  }
  
  const queueEstimate = estimateFromQueueLength({ queueLengthMeters: queueLen, lane: normLane, lanesOpen: currentLanesOpen });
  const queueTrust = queueEstimate !== null ? 1.0 : 0.0;
  const queueAdjustment = queueEstimate !== null ? (queueEstimate - historicalP50) * queueTrust * 0.45 : 0;

  // 8. New p50 formula (community optional)
  const p50Raw =
    historicalP50 +
    cbpAdjustment +
    trendAdjustment +
    laneCapacityAdjustment +
    holidayAdjustment +
    timePressureAdjustment +
    queueAdjustment +
    communityAdjustment;

  let p50 = clamp(Math.round(p50Raw), 0, laneMax);

  // 8b. Query prediction calibration profile
  let profile = null;
  try {
    profile = db.prepare(`
      SELECT average_error_minutes, median_absolute_error_minutes, sample_size, tendency
      FROM prediction_calibration_profiles
      WHERE port = ? AND lane = ?
    `).get(normPort, normLane);
  } catch (err) {
    console.error('[predictionService] Failed to query calibration profile:', err.message);
  }

  function getCalibrationAdjustment(prof) {
    if (!prof || prof.sample_size < 10) return 0;
    const adj = prof.average_error_minutes * 0.35;
    return clamp(adj, -25, 25);
  }
  const calibrationAdjustment = getCalibrationAdjustment(profile);

  // Apply calibration adjustment
  p50 = clamp(p50 + Math.round(calibrationAdjustment), 0, laneMax);

  // 9. Generate future predictions (now, +30, +60, +120)
  const nowEst = p50;
  const plus30Est = clamp(Math.round(p50 + trendAdjustment * 0.75), 0, laneMax);
  const plus60Est = clamp(Math.round(p50 + trendAdjustment * 0.50 + timePressureAdjustment * 0.25), 0, laneMax);
  const plus120Est = clamp(Math.round(historicalP50 + holidayAdjustment + timePressureAdjustment + calibrationAdjustment), 0, laneMax);

  // 10. Confidence
  const activeValues = [historicalP50, cbpWait];
  if (commWait !== null) activeValues.push(commWait);
  if (queueEstimate !== null) activeValues.push(queueEstimate);
  const spread = Math.max(...activeValues) - Math.min(...activeValues);

  let confidence = 'high';
  if (
    sampleSize >= 30 &&
    cbpTrust >= 0.75 &&
    (commWait === null || communityTrust >= 0.75) &&
    spread <= 30 &&
    trendLabel === "stable" &&
    !isCbpStale &&
    resolvedHolidayProfile === "none"
  ) {
    confidence = "high";
  } else if (
    sampleSize >= 10 &&
    cbpTrust >= 0.5 &&
    spread <= 70
  ) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  // Downgrade to low under uncertainty penalties
  if (
    isCbpStale ||
    sampleSize < 10 ||
    trendLabel === 'rising_fast' ||
    trendLabel === 'dropping_fast' ||
    resolvedHolidayProfile !== 'none' ||
    spread > 60
  ) {
    confidence = 'low';
  }

  // 11. Range calculation using historical spread
  let lowRange = clamp(
    p50 - (historicalP50 - historicalP25),
    0,
    laneMax
  );

  let p75 = clamp(
    p50 + (historicalP75 - historicalP50),
    0,
    laneMax
  );

  let highRange = clamp(
    p50 + (historicalP90 - historicalP50),
    0,
    laneMax
  );

  const warnings = [];

  // Widen ranges and downgrade confidence when accuracy profile shows high error
  if (profile && profile.sample_size >= 10 && profile.median_absolute_error_minutes >= 45) {
    confidence = "low";
    lowRange = clamp(lowRange - 20, 0, laneMax);
    highRange = clamp(highRange + 45, 0, laneMax);
    warnings.push("Prediction uncertainty is high for this lane based on recent accuracy.");
    warnings.push("Prediction uncertainty is high right now. Use the official CBP wait as the safest reference.");
  } else if (confidence === 'low') {
    // Standard low confidence widening
    lowRange = clamp(lowRange - 20, 0, laneMax);
    highRange = clamp(highRange + 45, 0, laneMax);
  }

  if (isCbpStale) {
    warnings.push("Official CBP wait time reports are stale/lagging.");
  }
  if (resolvedHolidayProfile !== 'none') {
    warnings.push(`Holiday traffic profiles (${resolvedHolidayProfile}) increase uncertainty.`);
  }
  if (spread > 60) {
    warnings.push('High spread/disagreement between available data signals.');
  }
  if (trendLabel === 'rising_fast' || trendLabel === 'dropping_fast') {
    warnings.push(`Rapidly changing live trend (${trendLabel}) detected.`);
  }
  if (sampleSize < 10) {
    warnings.push("Limited history for this lane. Estimate is based mostly on current CBP data and time-of-day defaults.");
  }

  // Save prediction logs to database (bypassed in test env)
  if (process.env.NODE_ENV !== 'test') {
    try {
      db.prepare(`
        INSERT INTO prediction_logs (
          port, lane, predicted_p50, predicted_p75, low_range, high_range,
          confidence, cbp_wait_at_prediction, lanes_open, trend, holiday_profile,
          prediction_target_minutes, created_at, calibration_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        normPort,
        normLane,
        p50,
        p75,
        lowRange,
        highRange,
        confidence,
        cbpWait,
        currentLanesOpen !== undefined && currentLanesOpen !== null ? currentLanesOpen : 0,
        trendLabel,
        resolvedHolidayProfile,
        60,
        new Date().toISOString(),
        'pending'
      );
    } catch (err) {
      console.error('[predictionService] Failed to log prediction:', err.message);
    }
  }

  const communityUsedText = commWait !== null 
    ? `community (${commWait}m, trust ${communityTrust.toFixed(2)})` 
    : 'No community reports were used';

  const reasoning = `Prediction is based on historical waits for this lane and time, adjusted by current CBP wait, recent trend, lanes open, and time-of-day pressure. ${communityUsedText}. Confidence: ${confidence}.`;

  const predictionQualityLabel = (profile && profile.sample_size >= 10) ? 'improving' : 'limited data';

  return {
    now: nowEst,
    plus_30: plus30Est,
    plus_60: plus60Est,
    plus_120: plus120Est,
    p50,
    p75,
    low_range: lowRange,
    high_range: highRange,
    delay_band: getDelayBand(p50),
    confidence,
    mode: "official_history_no_community",
    historical_baseline: {
      p25: historicalP25,
      p50: historicalP50,
      p75: historicalP75,
      p90: historicalP90,
      sample_size: sampleSize
    },
    adjustments: {
      cbp: Math.round(cbpAdjustment),
      trend: Math.round(trendAdjustment),
      lanes_open: Math.round(laneCapacityAdjustment),
      holiday: Math.round(holidayAdjustment),
      time_pressure: Math.round(timePressureAdjustment),
      queue: Math.round(queueAdjustment)
    },
    signals_used: {
      cbp_wait: cbpWait,
      lanes_open: currentLanesOpen !== undefined && currentLanesOpen !== null ? currentLanesOpen : 0,
      trend: trendLabel,
      holiday_profile: resolvedHolidayProfile,
      queue_estimate: queueEstimate !== null ? Math.round(queueEstimate) : null,
      community_reports_used: commWait !== null,
      community_wait: commWait !== null ? Math.round(commWait) : null
    },
    warnings,
    reasoning_summary: reasoning,
    
    // Maintain old list format for frontend
    predictions: [
      { minutesFromNow: 0, minutes_from_now: 0, estimatedWaitMinutes: nowEst, estimated_wait_minutes: nowEst, confidence },
      { minutesFromNow: 30, minutes_from_now: 30, estimatedWaitMinutes: plus30Est, estimated_wait_minutes: plus30Est, confidence },
      { minutesFromNow: 60, minutes_from_now: 60, estimatedWaitMinutes: plus60Est, estimated_wait_minutes: plus60Est, confidence },
      { minutesFromNow: 120, minutes_from_now: 120, estimatedWaitMinutes: plus120Est, estimated_wait_minutes: plus120Est, confidence }
    ],
    cbp_trust: cbpTrust,
    community_trust: communityTrust,
    queue_estimate: queueEstimate,
    historical_median: historicalP50,
    spread_minutes: spread,

    // Calibration metadata (Requirement 6)
    calibration: {
      sample_size: profile ? profile.sample_size : 0,
      average_error_minutes: profile ? profile.average_error_minutes : 0,
      median_absolute_error_minutes: profile ? profile.median_absolute_error_minutes : 0,
      tendency: profile ? profile.tendency : "neutral",
      adjustment_applied: Math.round(calibrationAdjustment)
    },
    prediction_quality: predictionQualityLabel
  };
}
