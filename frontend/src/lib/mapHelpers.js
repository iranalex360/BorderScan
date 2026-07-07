/** @fileoverview Helper utilities for map rendering in BorderScan. */

/**
 * Convert a wait time (minutes) to a MapLibre GL color string.
 * @param {number} minutes
 * @returns {string} CSS color
 */
export function waitTimeToColor(minutes) {
  if (minutes < 20)  return '#22c55e'; // green
  if (minutes < 45)  return '#f59e0b'; // yellow
  if (minutes < 90)  return '#f97316'; // orange
  return '#ef4444';                    // red
}

/**
 * Build a MapLibre GL paint object for corridor line layers.
 * @param {Array<{ id: string, estimatedWaitMinutes: number }>} corridors
 * @returns {Object} MapLibre GL paint spec
 */
export function buildCorridorPaint(corridors) {
  return {
    'line-color': [
      'match',
      ['get', 'id'],
      ...corridors.flatMap((c) => [c.id, waitTimeToColor(c.estimatedWaitMinutes)]),
      '#94a3b8', // default
    ],
    'line-width': 5,
    'line-opacity': 0.85,
  };
}

/**
 * Calculate the bounding box of a set of GeoJSON corridors.
 * @param {Array<{ geometry: { coordinates: Array } }>} corridors
 * @returns {{ minLng: number, minLat: number, maxLng: number, maxLat: number } | null}
 */
export function getBounds(corridors) {
  const coords = corridors
    .filter((c) => c.geometry?.coordinates)
    .flatMap((c) => c.geometry.coordinates);

  if (coords.length === 0) return null;

  return coords.reduce(
    (bounds, [lng, lat]) => ({
      minLng: Math.min(bounds.minLng, lng),
      minLat: Math.min(bounds.minLat, lat),
      maxLng: Math.max(bounds.maxLng, lng),
      maxLat: Math.max(bounds.maxLat, lat),
    }),
    { minLng: Infinity, minLat: Infinity, maxLng: -Infinity, maxLat: -Infinity }
  );
}

/**
 * Format queue length in meters to a human-readable string.
 * @param {number} meters
 * @returns {string}
 */
export function formatQueueLength(meters) {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${meters} m`;
}
