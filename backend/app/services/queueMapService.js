import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function selectQueueStartIndex({ corridor, queueStartLabel, delayBand, reportedQueueLengthKm }) {
  const points = corridor.geometry.coordinates;
  const labels = corridor.properties.turn_points || [];

  if (queueStartLabel) {
    const normalizedLabel = queueStartLabel.toLowerCase();

    const labelMatchIndex = labels.findIndex((point) => {
      return normalizedLabel.includes(point.label.toLowerCase()) ||
        point.label.toLowerCase().includes(normalizedLabel);
    });

    if (labelMatchIndex >= 0) {
      return labelMatchIndex;
    }

    if (normalizedLabel.includes("5 y 10")) return 0;
    if (normalizedLabel.includes("via rapida")) return 1;
    if (normalizedLabel.includes("padre kino")) return Math.max(0, points.length - 4);
    if (normalizedLabel.includes("bellas artes")) return 0;
    if (normalizedLabel.includes("garita")) return Math.max(0, points.length - 2);
  }

  if (typeof reportedQueueLengthKm === "number") {
    if (reportedQueueLengthKm >= 4) return 0;
    if (reportedQueueLengthKm >= 2.5) return 1;
    if (reportedQueueLengthKm >= 1.5) return 2;
    return Math.max(0, points.length - 3);
  }

  if (delayBand === "extreme") return 0;
  if (delayBand === "severe") return 1;
  if (delayBand === "high") return 2;
  if (delayBand === "moderate") return Math.max(0, points.length - 3);

  return Math.max(0, points.length - 2);
}

function sliceCorridorFromStart(corridor, startIndex) {
  const coords = corridor.geometry.coordinates;
  return coords.slice(startIndex);
}

function getColorCategory(minutes) {
  if (minutes < 20)  return 'green';
  if (minutes < 45)  return 'yellow';
  if (minutes < 90)  return 'orange';
  return 'red';
}

/**
 * @param {{ port: string, laneType?: string, queueStartLabel?: string, delayBand?: string, reportedQueueLengthKm?: number }} params
 * @returns {Promise<Object>}
 */
export async function getQueueMapData({ port, laneType = 'standard', queueStartLabel = null, delayBand = null, reportedQueueLengthKm = null }) {
  const geoPath = resolve(__dirname, '../../../data/seed/queue_corridors.geojson');
  let corridors = [];
  let geojson = null;
  let finalQueueStartLabel = '';
  let finalEntryLabel = '';
  let corridorId = '';
  let selectedCorridor = null;

  try {
    const raw = readFileSync(geoPath, 'utf-8');
    const data = JSON.parse(raw);
    
    const normPort = port.toLowerCase();
    const normLane = laneType.toLowerCase() === 'standard' ? 'general' : laneType.toLowerCase();

    // Filter corridors by port
    const filteredFeatures = data.features.filter(
      (f) => f.properties?.port?.toLowerCase() === normPort
    );

    corridors = filteredFeatures.map((f) => ({
      id: f.properties.id,
      laneType: f.properties.lane_types ? (f.properties.lane_types.includes(normLane) ? normLane : f.properties.lane_types[0]) : 'standard',
      geometry: f.geometry,
      currentQueueLengthMeters: f.properties.queueLengthMeters || 0,
      estimatedWaitMinutes: f.properties.waitMinutes || 0,
      colorCategory: getColorCategory(f.properties.waitMinutes || 0),
    }));

    // Find the specific corridor matching the requested lane
    selectedCorridor = filteredFeatures.find((f) => {
      const laneTypes = f.properties?.lane_types || [];
      return laneTypes.map(l => l.toLowerCase()).includes(normLane);
    }) || filteredFeatures[0];

    if (selectedCorridor) {
      corridorId = selectedCorridor.properties.id;
      finalEntryLabel = selectedCorridor.properties.entry_label || `${port} entry`;

      // 1. Select the start point index
      const startIndex = selectQueueStartIndex({
        corridor: selectedCorridor,
        queueStartLabel,
        delayBand,
        reportedQueueLengthKm
      });

      // Get label for starting point if defined
      const turnPoints = selectedCorridor.properties.turn_points || [];
      const matchedPoint = turnPoints[startIndex];
      finalQueueStartLabel = matchedPoint ? matchedPoint.label : (selectedCorridor.properties.default_queue_start_label || 'Queue Start');

      // 2. Slice coordinates
      const slicedCoordinates = sliceCorridorFromStart(selectedCorridor, startIndex);
      const startPoint = slicedCoordinates[0];
      const endPoint = slicedCoordinates[slicedCoordinates.length - 1];

      // 3. Assemble geojson features
      geojson = {
        type: 'FeatureCollection',
        properties: {
          port: normPort,
          laneType: normLane,
          confidence: selectedCorridor.properties.confidence || 'starter_approximation',
          queueLengthMeters: selectedCorridor.properties.queueLengthMeters || (slicedCoordinates.length - 1) * 800,
          estimatedWaitMinutes: selectedCorridor.properties.waitMinutes || 0
        },
        features: [
          {
            type: 'Feature',
            properties: {
              kind: 'queue_line',
              type: 'queue_line',
              stroke: 'red',
              corridor_id: corridorId
            },
            geometry: {
              type: 'LineString',
              coordinates: slicedCoordinates
            }
          },
          {
            type: 'Feature',
            properties: {
              kind: 'queue_start',
              type: 'queue_start',
              label: finalQueueStartLabel
            },
            geometry: {
              type: 'Point',
              coordinates: startPoint
            }
          },
          {
            type: 'Feature',
            properties: {
              kind: 'entry_point',
              type: 'entry_gate',
              label: finalEntryLabel
            },
            geometry: {
              type: 'Point',
              coordinates: endPoint
            }
          }
        ]
      };
    } else {
      geojson = {
        type: 'FeatureCollection',
        properties: {
          port: normPort,
          laneType: normLane,
          confidence: 'low',
          queueLengthMeters: 0,
          estimatedWaitMinutes: 0
        },
        features: []
      };
      finalQueueStartLabel = 'Unknown Start';
      finalEntryLabel = 'Unknown Entry';
    }

  } catch (err) {
    console.error('[queueMapService] error:', err.message);
  }

  return {
    source: 'BorderScan Queue Map',
    port: port.toLowerCase(),
    lane: laneType.toLowerCase() === 'standard' ? 'general' : laneType.toLowerCase(),
    corridor_id: corridorId,
    queue_start_label: finalQueueStartLabel,
    entry_label: finalEntryLabel,
    confidence: selectedCorridor ? 'starter_approximation' : 'low',
    warnings: selectedCorridor ? [] : ["No queue corridor found for this port/lane."],
    corridors,
    geojson
  };
}
