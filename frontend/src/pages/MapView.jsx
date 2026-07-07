import React, { useEffect, useState } from 'react';
import QueueMap from '../components/QueueMap.jsx';
import LaneSelector from '../components/LaneSelector.jsx';
import { fetchQueueMap } from '../lib/api.js';
import { PORTS } from '../lib/constants.js';

export default function MapView() {
  const [selectedPort, setSelectedPort] = useState(PORTS[0].code);
  const [selectedLane, setSelectedLane] = useState('standard');
  const [queueData, setQueueData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadQueueMap();
  }, [selectedPort, selectedLane]);

  async function loadQueueMap() {
    setLoading(true);
    try {
      const data = await fetchQueueMap({
        port: selectedPort,
        laneType: selectedLane === 'all' ? 'standard' : selectedLane
      });
      setQueueData(data);
    } finally {
      setLoading(false);
    }
  }

  const portName = PORTS.find((p) => p.code === selectedPort)?.name || selectedPort;

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.25rem' }}>🗺️ Queue Map</h1>
        <p className="text-muted text-sm">Visual lane-by-lane breakdown of border crossing queues.</p>
      </div>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label htmlFor="port-select" className="text-xs text-muted">Port of Entry</label>
          <select
            id="port-select"
            value={selectedPort}
            onChange={(e) => setSelectedPort(e.target.value)}
            style={{
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-text)',
              padding: '0.5rem 0.75rem',
              fontFamily: 'var(--font-sans)',
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            {PORTS.map((p) => (
              <option key={p.code} value={p.code}>{p.name}</option>
            ))}
          </select>
        </div>

        <div style={{ flex: 1, minWidth: '280px', marginTop: 'auto' }}>
          <LaneSelector
            selectedLane={selectedLane}
            onLaneChange={setSelectedLane}
          />
        </div>
      </div>

      <QueueMap
        geojson={queueData?.geojson}
        queueSummary={{
          title: queueData?.queue_start_label || "Estimated queue route",
          confidence: queueData?.confidence
        }}
        isLoading={loading}
      />

      {queueData?.corridors?.length > 0 && (
        <div className="grid-auto" style={{ marginTop: '1.5rem' }}>
          {queueData.corridors.map((c) => (
            <div key={c.id} className="card fade-in">
              <div className="flex justify-between items-center">
                <div className="text-sm" style={{ fontWeight: '600', textTransform: 'capitalize' }}>
                  {c.laneType} Lane
                </div>
                <span className={`wait-badge ${c.colorCategory || 'yellow'}`}>{c.estimatedWaitMinutes} min</span>
              </div>
              {c.currentQueueLengthMeters && (
                <div className="text-xs text-muted mt-1">Queue: ~{c.currentQueueLengthMeters}m</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
