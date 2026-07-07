import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import db from '../models/db.js';
import { determineHolidayProfile } from './holidayService.js';
import { evaluatePendingPredictions } from './calibrationService.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const CBP_BASE = process.env.CBP_API_BASE_URL || 'https://bwt.cbp.gov/api';
const CBP_KEY  = process.env.CBP_API_KEY || '';

export const CBP_PORT_MAP = {
  san_ysidro: {
    passenger: "250401",
    pedwest: "250407",
    cbx: "250409"
  },
  otay_mesa: {
    passenger: "250601",
    commercial: "250602"
  },
  tecate: {
    passenger: "250501"
  }
};

export const CBP_LANE_MAP = {
  general: "passenger_vehicle_lanes.standard_lanes",
  standard: "passenger_vehicle_lanes.standard_lanes",
  ready: "passenger_vehicle_lanes.ready_lanes",
  sentri: "passenger_vehicle_lanes.NEXUS_SENTRI_lanes",
  pedestrian: "pedestrian_lanes.standard_lanes",
  pedestrian_ready: "pedestrian_lanes.ready_lanes"
};

export const LANE_ALIASES = {
  standard: "general",
  regular: "general",
  normal: "general",
  general: "general",
  ready: "ready",
  "ready lane": "ready",
  sentri: "sentri",
  nexus_sentri: "sentri",
  pedestrian: "pedestrian",
  walking: "pedestrian",
  pedestrian_ready: "pedestrian_ready"
};

export function normalizeLane(lane) {
  if (!lane) return 'general';
  const lower = lane.toLowerCase().trim();
  return LANE_ALIASES[lower] || lower;
}

const MOCK_RAW_BWT_DATA = [
  {
    "port_number": "250401",
    "port_name": "San Ysidro",
    "crossing_name": "Passenger",
    "passenger_vehicle_lanes": {
      "standard_lanes": { "delay_minutes": "120", "lanes_open": "3", "update_time": "At 10:00 pm PDT" },
      "ready_lanes": { "delay_minutes": "60", "lanes_open": "15", "update_time": "At 10:00 pm PDT" },
      "NEXUS_SENTRI_lanes": { "delay_minutes": "15", "lanes_open": "4", "update_time": "At 10:00 pm PDT" }
    },
    "pedestrian_lanes": {
      "standard_lanes": { "delay_minutes": "90", "lanes_open": "14", "update_time": "At 10:00 pm PDT" },
      "ready_lanes": { "delay_minutes": "1", "lanes_open": "5", "update_time": "At 10:00 pm PDT" }
    }
  },
  {
    "port_number": "250407",
    "port_name": "San Ysidro",
    "crossing_name": "PedWest",
    "pedestrian_lanes": {
      "standard_lanes": { "delay_minutes": "30", "lanes_open": "2", "update_time": "At 10:00 pm PDT" }
    }
  },
  {
    "port_number": "250409",
    "port_name": "San Ysidro",
    "crossing_name": "Cross Border Express",
    "pedestrian_lanes": {
      "standard_lanes": { "delay_minutes": "5", "lanes_open": "1", "update_time": "At 10:00 pm PDT" }
    }
  },
  {
    "port_number": "250601",
    "port_name": "Otay Mesa",
    "crossing_name": "Passenger",
    "passenger_vehicle_lanes": {
      "standard_lanes": { "delay_minutes": "22", "lanes_open": "10", "update_time": "At 10:00 pm PDT" },
      "ready_lanes": { "delay_minutes": "100", "lanes_open": "2", "update_time": "At 10:00 pm PDT" },
      "NEXUS_SENTRI_lanes": { "delay_minutes": "5", "lanes_open": "2", "update_time": "At 10:00 pm PDT" }
    },
    "pedestrian_lanes": {
      "standard_lanes": { "delay_minutes": "12", "lanes_open": "2", "update_time": "At 10:00 pm PDT" }
    }
  },
  {
    "port_number": "250501",
    "port_name": "Tecate",
    "crossing_name": "Passenger",
    "passenger_vehicle_lanes": {
      "standard_lanes": { "delay_minutes": "15", "lanes_open": "4", "update_time": "At 10:00 pm PDT" }
    }
  },
  {
    "port_number": "250602",
    "port_name": "Otay Mesa",
    "crossing_name": "Commercial",
    "commercial_vehicle_lanes": {
      "standard_lanes": { "delay_minutes": "45", "lanes_open": "3", "update_time": "At 10:00 pm PDT" }
    }
  },
  {
    "port_number": "250609",
    "port_name": "Otay Mesa",
    "crossing_name": "Passenger Update Pending",
    "passenger_vehicle_lanes": {
      "standard_lanes": { "delay_minutes": "Update Pending", "lanes_open": "0", "update_time": "At 10:00 pm PDT" }
    }
  }
];

/**
 * Helper to check if the record date and time are older than 2 hours.
 * @param {string} dateStr
 * @param {string} timeStr
 * @returns {boolean}
 */
export function isRecordTimeStale(dateStr, timeStr) {
  if (!dateStr || !timeStr) return true;
  try {
    const dateParts = dateStr.split('/');
    const timeParts = timeStr.split(':');
    if (dateParts.length !== 3 || timeParts.length !== 3) return true;

    const month = parseInt(dateParts[0], 10);
    const day = parseInt(dateParts[1], 10);
    const year = parseInt(dateParts[2], 10);

    const hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1], 10);
    const seconds = parseInt(timeParts[2], 10);

    // CBP API records are Eastern Time (EDT/EST).
    // Construct Date in local time of the running server.
    // If the server and record time differs by more than 2 hours, flag it.
    const recordDate = new Date(year, month - 1, day, hours, minutes, seconds);
    const now = new Date();

    const diffMs = Math.abs(now.getTime() - recordDate.getTime());
    const diffMins = diffMs / (1000 * 60);

    return diffMins > 120;
  } catch (e) {
    return true;
  }
}

/**
 * @param {{ port: string, laneType?: string, refresh?: boolean }} params
 * @returns {Promise<Object>}
 */
export async function fetchCBPWaitTimes({ port, laneType = 'all', refresh = false, debugUseMock = null }) {
  if (!port) throw new Error('CBP Port is required');

  const normLane = laneType === 'all' ? 'all' : normalizeLane(laneType);
  const CBP_WAIT_TIMES_URL = 'https://bwt.cbp.gov/api/waittimes';

  const cbpUseMock = debugUseMock !== null ? debugUseMock : (process.env.CBP_USE_MOCK === 'true');
  const cbpAllowFallback = process.env.CBP_ALLOW_FALLBACK !== 'false';

  let fetchedData = null;
  let cacheStatus = 'fresh_live_fetch';
  let isLive = true;
  let warnings = [];
  let fetchError = null;
  let fetchErrorType = null;

  // Force disable TLS verification globally for node-fetch cert handshake issues
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  if (cbpUseMock) {
    fetchedData = MOCK_RAW_BWT_DATA;
    cacheStatus = 'mock_fallback';
    isLive = false;
    warnings.push('CBP_USE_MOCK env variable is set to true. Using mock data.');
  } else {
    // Attempt live fetch
    try {
      const url = `${CBP_WAIT_TIMES_URL}?_=${Date.now()}`;
      const res = await fetch(url, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Accept': 'application/json'
        }
      });
      if (!res.ok) {
        throw new Error(`HTTP_ERROR: status ${res.status}`);
      }
      const data = await res.json();
      const records = Array.isArray(data) ? data : (data?.ports || data?.data || []);
      if (records.length === 0) {
        throw new Error('RECORD_NOT_FOUND: Empty or invalid CBP response array');
      }
      fetchedData = records;
    } catch (err) {
      console.error("CBP live fetch failed:", err);
      fetchError = err.message;
      
      // Determine error type
      if (err.message.includes('HTTP_ERROR')) {
        fetchErrorType = 'HTTP_ERROR';
      } else if (err.message.includes('JSON') || err.message.includes('parse')) {
        fetchErrorType = 'JSON_PARSE_ERROR';
      } else if (err.message.includes('RECORD_NOT_FOUND')) {
        fetchErrorType = 'RECORD_NOT_FOUND';
      } else {
        fetchErrorType = 'NETWORK_ERROR';
      }

      if (!cbpAllowFallback) {
        // Fallback not allowed - throw the error!
        throw err;
      }

      fetchedData = MOCK_RAW_BWT_DATA;
      cacheStatus = 'mock_fallback';
      isLive = false;
      warnings.push(`Live CBP fetch failed. Using mock fallback data.`);
    }
  }

  const res = parseBwtResponse(fetchedData, port, normLane, isLive, cacheStatus, warnings);
  res.lanes.forEach((l) => {
    l.requested_port = port;
    l.requested_lane = laneType;
    l.normalized_port = port.toLowerCase().replace(/[-_]/g, '_');
    l.normalized_lane = normLane;
    
    // Inject diagnostics metadata for fallbacks (Requirement 2 & 3)
    if (!isLive) {
      l.fetch_error = fetchError;
      l.fetch_error_type = fetchErrorType || (cbpUseMock ? 'MOCK_MODE' : 'NETWORK_ERROR');
      l.live_fetch_attempted = !cbpUseMock;
      l.live_fetch_url = CBP_WAIT_TIMES_URL;
    }
  });

  if (isLive) {
    try {
      const dateObj = new Date();
      const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const hour = dateObj.getHours();
      const todayYMD = dateObj.toISOString().split('T')[0];
      const holidayProfile = await determineHolidayProfile(todayYMD);
      
      const insertStmt = db.prepare(`
        INSERT INTO cbp_wait_snapshots (
          port, lane, cbp_port_number, cbp_lane_path, wait_minutes, lanes_open,
          lane_update_time, source_record_time, fetched_at, day_of_week, hour, holiday_profile
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const l of res.lanes) {
        const snapLane = l.type === 'standard' ? 'general' : l.type;
        const snapPort = l.port;
        insertStmt.run(
          snapPort,
          snapLane,
          l.cbp_port_number,
          l.cbp_lane_path,
          l.waitMinutes,
          l.openLanes,
          l.lane_update_time,
          `${l.record_date} ${l.record_time}`,
          l.fetched_at || new Date().toISOString(),
          dayOfWeek,
          hour,
          holidayProfile
        );

        // Evaluate pending predictions using this fresh live CBP wait time
        await evaluatePendingPredictions(snapPort, snapLane, l.waitMinutes);
      }
    } catch (dbErr) {
      console.error('[cbpService] Failed to save cbp wait snapshot:', dbErr.message);
    }
  }

  return res;
}

export function getPortNumbersForPort(port, laneType) {
  const pKey = port?.toLowerCase().replace(/[-_]/g, '_');
  const portConfig = CBP_PORT_MAP[pKey];
  if (!portConfig) return [];

  if (laneType === 'all') {
    return [portConfig.passenger].filter(Boolean);
  }
  if (laneType === 'commercial') {
    return [portConfig.commercial].filter(Boolean);
  }
  if (laneType === 'pedwest') {
    return [portConfig.pedwest].filter(Boolean);
  }
  if (laneType === 'cbx') {
    return [portConfig.cbx].filter(Boolean);
  }
  return [portConfig.passenger].filter(Boolean);
}

export function resolveLanePath(record, path) {
  const parts = path.split('.');
  let current = record;
  for (const part of parts) {
    if (current === undefined || current === null) return null;
    current = current[part];
  }
  return current;
}

export function parseCbpRecord(record, targetLaneType, isLive = true, cacheStatus = 'fresh_live_fetch', warnings = []) {
  const lanes = [];
  
  const toCheck = targetLaneType === 'all' 
    ? Object.keys(CBP_LANE_MAP) 
    : [targetLaneType];

  for (const laneKey of toCheck) {
    const lanePath = CBP_LANE_MAP[laneKey];
    if (!lanePath) continue;

    const laneData = resolveLanePath(record, lanePath);
    if (!laneData) continue;

    const delayStr = laneData.delay_minutes ?? laneData.delay;
    const lanesOpenStr = laneData.lanes_open;
    const updateTime = laneData.update_time;

    const isPending = delayStr === undefined || 
      delayStr === null || 
      delayStr.toLowerCase().includes('pending') || 
      delayStr.toLowerCase().includes('unavailable') ||
      isNaN(parseInt(delayStr));

    const wait = isPending ? 0 : parseInt(delayStr, 10);
    const open = lanesOpenStr ? parseInt(lanesOpenStr, 10) : 0;

    const recordDate = record.date || '';
    const recordTime = record.time || '';
    const laneUpdateTime = updateTime || 'Unknown';

    let isStale = !isLive || isPending;
    let staleReason = null;

    if (!isLive) {
      isStale = true;
      staleReason = 'Using mock fallback data';
    } else if (isPending) {
      isStale = true;
      staleReason = `Lane delay is pending or unavailable: ${delayStr}`;
    } else {
      const isTimeStale = isRecordTimeStale(recordDate, recordTime);
      if (isTimeStale) {
        isStale = true;
        staleReason = `Record date/time (${recordDate} ${recordTime}) is older than 2 hours`;
      }
    }

    lanes.push({
      type: laneKey === 'general' ? 'standard' : laneKey,
      waitMinutes: wait,
      official_wait_minutes: wait,
      openLanes: open,
      lanes_open: open,
      vehicles: null,
      port: record.port_name?.toLowerCase().replace(/\s+/g, '_') || '',
      cbp_port_number: record.port_number,
      cbp_port_name: record.port_name,
      cbp_crossing_name: record.crossing_name === 'Passenger' ? 'Passenger' : (record.crossing_name || ''),
      cbp_lane_path: lanePath,
      source: isLive ? 'cbp_live' : 'mock_fallback',
      is_live: isLive,
      lane_update_time: laneUpdateTime,
      record_date: recordDate,
      record_time: recordTime,
      fetched_at: new Date().toISOString(),
      cache_status: cacheStatus,
      warnings: [...warnings],
      freshness: {
        record_date: recordDate,
        record_time: recordTime,
        lane_update_time: laneUpdateTime,
        fetched_at: new Date().toISOString(),
        is_stale: isStale,
        stale_reason: staleReason
      }
    });
  }

  return lanes;
}

export function parseBwtResponse(rawBwtArray, port, laneType, isLive = true, cacheStatus = 'fresh_live_fetch', warnings = []) {
  const portNumbers = getPortNumbersForPort(port, laneType);
  if (portNumbers.length === 0) {
    return {
      port,
      timestamp: new Date().toISOString(),
      lanes: [],
      warning: `CBP Port mapping not found for ${port}`,
      cbp_unavailable: true
    };
  }

  const lanes = [];
  for (const portNum of portNumbers) {
    const record = rawBwtArray.find((r) => r.port_number === portNum);
    if (!record) continue;

    const parsedLanes = parseCbpRecord(record, laneType, isLive, cacheStatus, warnings);
    lanes.push(...parsedLanes);
  }

  if (lanes.length === 0) {
    return {
      port,
      timestamp: new Date().toISOString(),
      lanes: [],
      warning: `CBP record is missing or the lane path is unavailable for ${port} / ${laneType}`,
      cbp_unavailable: true
    };
  }

  return {
    port,
    timestamp: new Date().toISOString(),
    lanes
  };
}
