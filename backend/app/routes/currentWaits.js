import { Router } from 'express';
import { fetchCBPWaitTimes, normalizeLane } from '../services/cbpService.js';
import { getHolidayContext } from '../services/holidayService.js';

const router = Router();

/**
 * GET /api/current-waits
 * Returns live wait times for ports + holiday context, supporting port & lane filters.
 */
router.get('/', async (req, res, next) => {
  try {
    // Add route-level no-cache headers to prevent proxy or browser caching
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    res.set("Surrogate-Control", "no-store");

    const reqPort = req.query.port;
    const reqLane = req.query.lane;
    const refresh = req.query.refresh === 'true';
    const debugUseMock = req.query.debug_use_mock === 'true' ? true : (req.query.debug_use_mock === 'false' ? false : null);

    const ports = ['SAN_YSIDRO', 'OTAY_MESA', 'TECATE', 'CALEXICO_E', 'CALEXICO_W'];
    const waitsData = await Promise.allSettled(
      ports.map((port) => fetchCBPWaitTimes({ port, laneType: reqLane || 'all', refresh, debugUseMock }))
    );

    let waits = waitsData.flatMap((result, i) => {
      if (result.status !== 'fulfilled') return [];
      return result.value.lanes.map((lane) => {
        const itemPort = ports[i].toLowerCase().replace(/[-_]/g, '_');
        const itemLane = lane.type;
        return {
          portCode: ports[i],
          port: result.value.port || ports[i],
          laneType: lane.type,
          waitMinutes: lane.waitMinutes,
          official_wait_minutes: lane.official_wait_minutes,
          openLanes: lane.openLanes,
          lanes_open: lane.lanes_open,
          capturedAt: result.value.timestamp,
          source: lane.source,
          is_live: lane.is_live,
          requested_port: reqPort || itemPort,
          requested_lane: reqLane || itemLane,
          normalized_port: reqPort ? reqPort.toLowerCase().replace(/[-_]/g, '_') : itemPort,
          normalized_lane: normalizeLane(reqLane || itemLane),
          cbp_port_number: lane.cbp_port_number,
          cbp_port_name: lane.cbp_port_name,
          cbp_crossing_name: lane.cbp_crossing_name,
          cbp_lane_path: lane.cbp_lane_path,
          lane_update_time: lane.lane_update_time,
          record_date: lane.record_date,
          record_time: lane.record_time,
          fetched_at: lane.fetched_at,
          cache_status: lane.cache_status,
          warnings: lane.warnings || [],
          freshness: lane.freshness,
          fetch_error: lane.fetch_error,
          fetch_error_type: lane.fetch_error_type,
          live_fetch_attempted: lane.live_fetch_attempted,
          live_fetch_url: lane.live_fetch_url
        };
      });
    });

    if (reqPort) {
      const pKey = reqPort.toLowerCase().replace(/[-_]/g, '_');
      waits = waits.filter(w => w.portCode.toLowerCase() === pKey || w.port.toLowerCase() === pKey);
    }
    if (reqLane) {
      const norm = normalizeLane(reqLane);
      waits = waits.filter(w => normalizeLane(w.laneType) === norm);
    }

    const holidayContext = await getHolidayContext({ date: new Date().toISOString().split('T')[0] });
    res.json({ waits, holidayContext });
  } catch (err) {
    next(err);
  }
});

export default router;
