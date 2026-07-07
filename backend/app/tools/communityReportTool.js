import { getRecentReports } from '../services/communityService.js';

/**
 * communityReportTool — Retrieves recent community crossing reports for a port.
 * @param {{ port: string, windowMinutes?: number }} params
 * @returns {Promise<Object>}
 */
export async function communityReportTool({ port, windowMinutes = 60 }) {
  if (!port) throw new Error('communityReportTool: port is required');

  const reports = await getRecentReports({ port, windowMinutes });
  const avg = reports.length > 0
    ? Math.round(reports.reduce((sum, r) => sum + r.reported_wait_minutes, 0) / reports.length)
    : null;

  return {
    port,
    reportsCount: reports.length,
    reports: reports.map((r) => ({
      id: r.id,
      submittedAt: r.created_at,
      laneType: r.lane_type,
      reportedWaitMinutes: r.reported_wait_minutes,
      notes: r.report_text,
      upvotes: Math.round((r.trust_score || 0.5) * 5),
      queueStartLabel: r.queue_start_label,
    })),
    averageReportedWait: avg,
  };
}
