import db from '../models/db.js';

/**
 * communityService — SQLite-backed community report operations.
 */

/**
 * Get recent community reports for a port within a time window.
 * @param {{ port: string, windowMinutes: number }} params
 * @returns {Array}
 */
export function getRecentReports({ port, windowMinutes = 60 }) {
  const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
  return db.prepare(`
    SELECT cr.* FROM community_reports cr
    WHERE cr.port = ? AND cr.created_at >= ?
    ORDER BY cr.created_at DESC
    LIMIT 50
  `).all(port, cutoff);
}

/**
 * Insert a new community report.
 * @param {{ port: string, laneType: string, reportedWaitMinutes: number, notes?: string }} params
 * @returns {Object} The inserted report
 */
export function createReport({ port, laneType, reportedWaitMinutes, notes = '' }) {
  const now = new Date().toISOString();
  const result = db.prepare(`
    INSERT INTO community_reports (
      port, lane_type, crossing_mode, report_type,
      reported_wait_minutes, report_text, trust_score,
      validation_status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    port,
    laneType,
    'car',
    'wait_time',
    reportedWaitMinutes,
    notes,
    0.7,
    'accepted',
    now
  );
  return db.prepare('SELECT * FROM community_reports WHERE id = ?').get(result.lastInsertRowid);
}

/**
 * Upvote a community report.
 * @param {number} id
 */
export function upvoteReport(id) {
  db.prepare('UPDATE community_reports SET trust_score = trust_score + 0.05 WHERE id = ?').run(id);
}

