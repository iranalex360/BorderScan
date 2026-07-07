import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER = [32.534, -117.02];

function getFeatureByKind(geojson, kind) {
  return geojson?.features?.find(
    (feature) => feature?.properties?.kind === kind || feature?.properties?.type === kind
  );
}

function getLineCoordinates(geojson) {
  const line = getFeatureByKind(geojson, "queue_line");
  return line?.geometry?.coordinates || [];
}

function toLeafletCoords(coords) {
  return coords.map(([lng, lat]) => [lat, lng]);
}

function FitBounds({ geojson }) {
  const map = useMap();

  useEffect(() => {
    const coords = getLineCoordinates(geojson);

    if (!Array.isArray(coords) || coords.length < 2) {
      return;
    }

    const leafletCoords = toLeafletCoords(coords);
    const bounds = L.latLngBounds(leafletCoords);

    map.fitBounds(bounds, {
      padding: [28, 28],
      maxZoom: 15
    });
  }, [geojson, map]);

  return null;
}

function queueLineStyle(feature) {
  const kind = feature?.properties?.kind || feature?.properties?.type;
  if (kind === "queue_line") {
    return {
      color: "#dc2626",
      weight: 6,
      opacity: 0.9,
      dashArray: "10 8",
      lineCap: "round"
    };
  }

  return {
    color: "#2563eb",
    weight: 3,
    opacity: 0.8
  };
}

function pointToLayer(feature, latlng) {
  const kind = feature?.properties?.kind || feature?.properties?.type;

  const color =
    kind === "queue_start"
      ? "#f97316"
      : kind === "entry_point" || kind === "entry_gate"
      ? "#2563eb"
      : "#6b7280";

  return L.circleMarker(latlng, {
    radius: 8,
    color,
    fillColor: color,
    fillOpacity: 0.95,
    weight: 2
  });
}

function onEachFeature(feature, layer) {
  const label =
    feature?.properties?.label ||
    feature?.properties?.popup ||
    feature?.properties?.kind ||
    "BorderScan map point";

  layer.bindPopup(label);
}

export default function QueueMap({
  geojson,
  queueSummary,
  isLoading = false,
  error = null
}) {
  // Temporary debug logging
  console.log("QueueMap geojson:", geojson);
  console.log("QueueMap line coords:", getLineCoordinates(geojson));

  const hasValidLine = useMemo(() => {
    const coords = getLineCoordinates(geojson);
    return Array.isArray(coords) && coords.length >= 2;
  }, [geojson]);

  const geojsonKey = useMemo(() => {
    if (!geojson) return "no-geojson";
    return JSON.stringify(geojson);
  }, [geojson]);

  if (isLoading) {
    return (
      <section className="queue-map-card">
        <div className="queue-map-placeholder">
          Scanning queue route...
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="queue-map-card">
        <div className="queue-map-placeholder queue-map-error">
          Could not load queue map.
        </div>
      </section>
    );
  }

  if (!geojson || !hasValidLine) {
    return (
      <section className="queue-map-card">
        <div className="queue-map-placeholder">
          Queue route is not available yet.
        </div>
      </section>
    );
  }

  return (
    <section className="queue-map-card">
      <div className="queue-map-header">
        <div>
          <p className="eyebrow" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary)', fontWeight: '700', margin: 0 }}>Live Queue Map</p>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '700', margin: '0.25rem 0 0 0' }}>{queueSummary?.title || "Estimated queue route"}</h2>
        </div>

        <span className="confidence-pill wait-badge yellow" style={{ textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: '700', padding: '0.25rem 0.5rem' }}>
          {queueSummary?.confidence || "estimated"}
        </span>
      </div>

      <MapContainer
        className="queue-map-container"
        center={DEFAULT_CENTER}
        zoom={13}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <GeoJSON
          key={geojsonKey}
          data={geojson}
          style={queueLineStyle}
          pointToLayer={pointToLayer}
          onEachFeature={onEachFeature}
        />

        <FitBounds geojson={geojson} />
      </MapContainer>
    </section>
  );
}
