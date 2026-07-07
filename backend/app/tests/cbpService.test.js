import { parseBwtResponse, getPortNumbersForPort, normalizeLane, isRecordTimeStale } from '../services/cbpService.js';

describe('CBP Ingestion Service — Mappings, Freshness, and Parsing', () => {
  const now = new Date();
  const currentDateStr = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
  const tenMinsAgo = new Date(now.getTime() - 10 * 60 * 1000);
  const currentTimeStr = `${String(tenMinsAgo.getHours()).padStart(2, '0')}:${String(tenMinsAgo.getMinutes()).padStart(2, '0')}:${String(tenMinsAgo.getSeconds()).padStart(2, '0')}`;

  const sampleCbpBwtData = [
    {
      "port_number": "250401",
      "port_name": "San Ysidro",
      "crossing_name": "Passenger",
      "date": currentDateStr,
      "time": currentTimeStr,
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
      "date": currentDateStr,
      "time": currentTimeStr,
      "pedestrian_lanes": {
        "standard_lanes": { "delay_minutes": "30", "lanes_open": "2", "update_time": "At 10:00 pm PDT" }
      }
    },
    {
      "port_number": "250409",
      "port_name": "San Ysidro",
      "crossing_name": "Cross Border Express",
      "date": currentDateStr,
      "time": currentTimeStr,
      "pedestrian_lanes": {
        "standard_lanes": { "delay_minutes": "5", "lanes_open": "1", "update_time": "At 10:00 pm PDT" }
      }
    },
    {
      "port_number": "250601",
      "port_name": "Otay Mesa",
      "crossing_name": "Passenger",
      "date": currentDateStr,
      "time": currentTimeStr,
      "passenger_vehicle_lanes": {
        "standard_lanes": { "delay_minutes": "22", "lanes_open": "10", "update_time": "At 10:00 pm PDT" },
        "ready_lanes": { "delay_minutes": "100", "lanes_open": "2", "update_time": "At 10:00 pm PDT" },
        "NEXUS_SENTRI_lanes": { "delay_minutes": "5", "lanes_open": "2", "update_time": "At 10:00 pm PDT" }
      }
    },
    {
      "port_number": "250602",
      "port_name": "Otay Mesa",
      "crossing_name": "Commercial",
      "date": currentDateStr,
      "time": currentTimeStr,
      "commercial_vehicle_lanes": {
        "standard_lanes": { "delay_minutes": "45", "lanes_open": "3", "update_time": "At 10:00 pm PDT" }
      }
    },
    {
      "port_number": "250609",
      "port_name": "Otay Mesa",
      "crossing_name": "Passenger Update Pending",
      "date": currentDateStr,
      "time": currentTimeStr,
      "passenger_vehicle_lanes": {
        "standard_lanes": { "delay_minutes": "Update Pending", "lanes_open": "0", "update_time": "At 10:00 pm PDT" }
      }
    }
  ];

  describe('Freshness & Stale Detection', () => {
    it('isRecordTimeStale detects old timestamps as stale', () => {
      // 10 years ago is definitely stale (> 120 minutes)
      expect(isRecordTimeStale('07/04/2016', '04:27:50')).toBe(true);
      
      // empty string is stale
      expect(isRecordTimeStale('', '')).toBe(true);
    });

    it('identifies mock fallback source as stale', () => {
      const res = parseBwtResponse(sampleCbpBwtData, 'otay_mesa', 'general', false, 'mock_fallback', ['Failed to fetch']);
      expect(res.lanes[0].source).toBe('mock_fallback');
      expect(res.lanes[0].is_live).toBe(false);
      expect(res.lanes[0].freshness.is_stale).toBe(true);
      expect(res.lanes[0].freshness.stale_reason).toBe('Using mock fallback data');
    });

    it('identifies pending lane delay as stale', () => {
      // 250609 has standard_lanes delay: "Update Pending"
      const res = parseBwtResponse(sampleCbpBwtData, 'otay_mesa', 'general', true, 'fresh_live_fetch');
      // Otay mesa general parses standard POV lanes from 250601 which is 22 min (not pending)
      expect(res.lanes[0].freshness.is_stale).toBe(false);

      // Now let's try with update pending directly (we force it to find 250609 by mock mapping or directly passing)
      const resPending = parseBwtResponse([sampleCbpBwtData[5]], 'otay_mesa', 'general', true, 'fresh_live_fetch');
      // No standard standard lanes because Update Pending is skipped entirely, length is 0
      expect(resPending.lanes.length).toBe(0);
    });
  });

  describe('Otay Mesa Mapping Verification', () => {
    it('Otay Mesa General uses port_number 250601', () => {
      const portNums = getPortNumbersForPort('otay_mesa', 'general');
      expect(portNums).toContain('250601');
      expect(portNums).not.toContain('250602');
    });

    it('Otay Mesa General uses passenger_vehicle_lanes.standard_lanes', () => {
      const res = parseBwtResponse(sampleCbpBwtData, 'otay_mesa', 'general');
      expect(res.lanes[0].cbp_lane_path).toBe('passenger_vehicle_lanes.standard_lanes');
    });

    it('Otay Mesa Standard alias normalizes to General', () => {
      expect(normalizeLane('standard')).toBe('general');
      expect(normalizeLane('regular')).toBe('general');
      expect(normalizeLane('normal')).toBe('general');
      expect(normalizeLane('general')).toBe('general');
    });

    it('Otay Mesa General returns the standard lane delay and lanes_open from the CBP fixture', () => {
      const res = parseBwtResponse(sampleCbpBwtData, 'otay_mesa', 'general');
      expect(res.lanes[0].waitMinutes).toBe(22);
      expect(res.lanes[0].openLanes).toBe(10);
    });

    it('Otay Mesa Ready uses passenger_vehicle_lanes.ready_lanes', () => {
      const res = parseBwtResponse(sampleCbpBwtData, 'otay_mesa', 'ready');
      expect(res.lanes[0].cbp_lane_path).toBe('passenger_vehicle_lanes.ready_lanes');
      expect(res.lanes[0].waitMinutes).toBe(100);
      expect(res.lanes[0].openLanes).toBe(2);
    });

    it('Otay Mesa SENTRI uses passenger_vehicle_lanes.NEXUS_SENTRI_lanes', () => {
      const res = parseBwtResponse(sampleCbpBwtData, 'otay_mesa', 'sentri');
      expect(res.lanes[0].cbp_lane_path).toBe('passenger_vehicle_lanes.NEXUS_SENTRI_lanes');
      expect(res.lanes[0].waitMinutes).toBe(5);
    });

    it('Otay Mesa Commercial record 250602 is not used for passenger general', () => {
      const res = parseBwtResponse(sampleCbpBwtData, 'otay_mesa', 'general');
      expect(res.lanes[0].cbp_port_number).toBe('250601');
      expect(res.lanes[0].cbp_crossing_name).toBe('Passenger');
    });

    it('Generic Otay records 250608 and 250609 are ignored for passenger general', () => {
      const res = parseBwtResponse(sampleCbpBwtData, 'otay_mesa', 'general');
      expect(res.lanes.length).toBe(1);
      expect(res.lanes[0].waitMinutes).toBe(22);
      expect(res.lanes[0].cbp_port_number).toBe('250601');
    });
  });

  describe('San Ysidro Mapping Verification', () => {
    it('San Ysidro General uses port_number 250401', () => {
      const portNums = getPortNumbersForPort('san_ysidro', 'general');
      expect(portNums).toContain('250401');
    });

    it('San Ysidro General uses passenger_vehicle_lanes.standard_lanes', () => {
      const res = parseBwtResponse(sampleCbpBwtData, 'san_ysidro', 'general');
      expect(res.lanes[0].cbp_lane_path).toBe('passenger_vehicle_lanes.standard_lanes');
    });

    it('San Ysidro General returns 120 minutes and 3 lanes from the CBP fixture', () => {
      const res = parseBwtResponse(sampleCbpBwtData, 'san_ysidro', 'general');
      expect(res.lanes[0].waitMinutes).toBe(120);
      expect(res.lanes[0].openLanes).toBe(3);
    });

    it('San Ysidro Ready uses passenger_vehicle_lanes.ready_lanes', () => {
      const res = parseBwtResponse(sampleCbpBwtData, 'san_ysidro', 'ready');
      expect(res.lanes[0].cbp_lane_path).toBe('passenger_vehicle_lanes.ready_lanes');
    });

    it('San Ysidro Ready returns 60 minutes and 15 lanes from the CBP fixture', () => {
      const res = parseBwtResponse(sampleCbpBwtData, 'san_ysidro', 'ready');
      expect(res.lanes[0].waitMinutes).toBe(60);
      expect(res.lanes[0].openLanes).toBe(15);
    });

    it('San Ysidro SENTRI uses passenger_vehicle_lanes.NEXUS_SENTRI_lanes', () => {
      const res = parseBwtResponse(sampleCbpBwtData, 'san_ysidro', 'sentri');
      expect(res.lanes[0].cbp_lane_path).toBe('passenger_vehicle_lanes.NEXUS_SENTRI_lanes');
    });

    it('San Ysidro SENTRI returns 15 minutes and 4 lanes from the CBP fixture', () => {
      const res = parseBwtResponse(sampleCbpBwtData, 'san_ysidro', 'sentri');
      expect(res.lanes[0].waitMinutes).toBe(15);
      expect(res.lanes[0].openLanes).toBe(4);
    });

    it('San Ysidro Pedestrian uses pedestrian_lanes.standard_lanes', () => {
      const res = parseBwtResponse(sampleCbpBwtData, 'san_ysidro', 'pedestrian');
      expect(res.lanes[0].cbp_lane_path).toBe('pedestrian_lanes.standard_lanes');
    });

    it('San Ysidro Pedestrian returns 90 minutes and 14 lanes from the CBP fixture', () => {
      const res = parseBwtResponse(sampleCbpBwtData, 'san_ysidro', 'pedestrian');
      expect(res.lanes[0].waitMinutes).toBe(90);
      expect(res.lanes[0].openLanes).toBe(14);
    });

    it('PedWest 250407 is not used for regular San Ysidro vehicle lanes', () => {
      const portNums = getPortNumbersForPort('san_ysidro', 'general');
      expect(portNums).not.toContain('250407');
    });

    it('CBX 250409 is not used for regular San Ysidro vehicle lanes', () => {
      const portNums = getPortNumbersForPort('san_ysidro', 'ready');
      expect(portNums).not.toContain('250409');
    });
  });
});
