/** @fileoverview API client for BorderScan frontend. All calls go through the Vite proxy to /api. */

const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'API error');
  }
  return res.json();
}

/** Fetch current wait times with cache busting. */
export function fetchCurrentWaits(params = {}) {
  const qs = new URLSearchParams();
  if (params.port) qs.append('port', params.port);
  if (params.lane) qs.append('lane', params.lane);
  if (params.refresh) qs.append('refresh', 'true');
  qs.append('_', Date.now());
  return request(`/current-waits?${qs.toString()}`, { cache: 'no-store' });
}

/**
 * Fetch AI prediction for a port/lane.
 * @param {{ port: string, laneType: string }} params
 */
export function fetchPrediction(params) {
  return request(`/prediction?port=${encodeURIComponent(params.port)}&laneType=${encodeURIComponent(params.laneType)}`);
}

/**
 * Fetch AI crossing recommendation.
 * @param {{ laneType: string }} params
 */
export function fetchRecommendation(params) {
  return request(`/recommendation?laneType=${encodeURIComponent(params.laneType)}`);
}

/** Fetch recent agent decision logs. */
export function fetchRecommendationLogs() {
  return request('/recommendation/logs');
}

/**
 * Fetch queue map data for a port.
 * @param {{ port: string }} params
 */
export function fetchQueueMap(params) {
  const qs = new URLSearchParams({
    port: params.port,
    ...(params.laneType && { laneType: params.laneType }),
    ...(params.queueStartLabel && { queueStartLabel: params.queueStartLabel })
  });
  return request(`/queue-map?${qs}`);
}

/**
 * Fetch recent community reports for a port.
 * @param {{ port: string, windowMinutes?: number }} params
 */
export function fetchCommunityReports(params) {
  const qs = new URLSearchParams({ port: params.port, windowMinutes: params.windowMinutes || 60 });
  return request(`/community-reports?${qs}`);
}

/**
 * Submit a new community crossing report.
 * @param {{ port: string, laneType: string, reportedWaitMinutes: number, notes?: string }} body
 */
export function submitCommunityReport(body) {
  return request('/community-reports', { method: 'POST', body: JSON.stringify(body) });
}
