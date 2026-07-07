/** @fileoverview Shared constants for the BorderScan frontend. */

/** Supported ports of entry */
export const PORTS = [
  { code: 'SAN_YSIDRO',   name: 'San Ysidro',   lat: 32.5552, lng: -117.0463 },
  { code: 'OTAY_MESA',    name: 'Otay Mesa',     lat: 32.5528, lng: -116.9739 },
  { code: 'TECATE',       name: 'Tecate',        lat: 32.5769, lng: -116.6283 },
  { code: 'CALEXICO_E',   name: 'Calexico East', lat: 32.6713, lng: -115.4830 },
  { code: 'CALEXICO_W',   name: 'Calexico West', lat: 32.6698, lng: -115.4989 },
];

/** Supported lane types */
export const LANE_TYPES = [
  { value: 'standard', label: 'General'  },
  { value: 'ready',    label: 'Ready' },
  { value: 'sentri',   label: 'SENTRI'    },
  { value: 'pedestrian', label: 'Pedestrian' },
];

/** Wait time color thresholds (minutes) */
export const WAIT_THRESHOLDS = {
  green:  20,
  yellow: 45,
  orange: 90,
};

/**
 * Returns a color class name based on wait minutes.
 * @param {number} minutes
 * @returns {'green'|'yellow'|'orange'|'red'}
 */
export function waitColorClass(minutes) {
  if (minutes < WAIT_THRESHOLDS.green)  return 'green';
  if (minutes < WAIT_THRESHOLDS.yellow) return 'yellow';
  if (minutes < WAIT_THRESHOLDS.orange) return 'orange';
  return 'red';
}
