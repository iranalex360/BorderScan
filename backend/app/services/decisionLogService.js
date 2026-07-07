import db from '../models/db.js';

/**
 * decisionLogService — Audit trail for every AI recommendation.
 */

/**
 * Log a recommendation decision to the database.
 * @param {Object} params
 */
export function logDecision({ query, port, laneType, officialWait, communityEstimate, predictionMinutes, recommendation, confidence, reasoningSummary }) {
  console.log('[decisionLogService] Logged recommendation decision:', { query, port, laneType, predictionMinutes, confidence });
  db.prepare(`
    INSERT INTO agent_decision_logs (
      user_query, port, lane_type, official_wait_minutes,
      community_estimate_minutes, prediction_minutes, recommendation,
      confidence, reasoning_summary, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    query,
    port,
    laneType,
    officialWait,
    communityEstimate,
    predictionMinutes,
    recommendation,
    confidence,
    reasoningSummary,
    new Date().toISOString()
  );
}

/**
 * Get recent decision logs.
 * @param {number} [limit=50]
 * @returns {Array}
 */
export function getRecentDecisions(limit = 50) {
  return db.prepare('SELECT * FROM agent_decision_logs ORDER BY created_at DESC LIMIT ?').all(limit);
}
