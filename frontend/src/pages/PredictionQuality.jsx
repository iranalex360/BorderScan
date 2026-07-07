import React, { useEffect, useState } from 'react';

export default function PredictionQuality() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadProfiles();
  }, []);

  async function loadProfiles() {
    setLoading(true);
    setError(null);
    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiBase}/api/prediction-quality`);
      if (!res.ok) {
        throw new Error(`Failed to load calibration data: status ${res.status}`);
      }
      const data = await res.json();
      setProfiles(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '0.25rem' }}>📊 Prediction Quality Dashboard</h1>
          <p className="text-muted text-sm">Deterministic calibration logs & port-lane accuracy analytics.</p>
        </div>
        <button
          onClick={loadProfiles}
          style={{
            background: 'var(--color-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '0.875rem'
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {error && (
        <div style={{ padding: '1rem', background: 'rgba(255,0,0,0.1)', color: 'var(--wait-red)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}>
          Error: {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }} className="text-muted">
          Loading calibration profiles...
        </div>
      ) : profiles.length === 0 ? (
        <div className="card text-center text-muted" style={{ padding: '3rem' }}>
          No prediction logs or calibration profiles generated yet. Run some predictions to accumulate logs.
        </div>
      ) : (
        <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.02)' }}>
                <th style={{ padding: '1rem' }}>Port</th>
                <th style={{ padding: '1rem' }}>Lane</th>
                <th style={{ padding: '1rem' }}>Sample Size</th>
                <th style={{ padding: '1rem' }}>Average Error</th>
                <th style={{ padding: '1rem' }}>Median Absolute Error</th>
                <th style={{ padding: '1rem' }}>Calibration Status</th>
                <th style={{ padding: '1rem' }}>Last Calibrated</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => {
                const formattedPort = p.port?.toUpperCase().replace(/_/g, ' ');
                const formattedLane = p.lane?.toUpperCase();
                
                let tendencyColor = 'var(--color-text)';
                if (p.tendency === 'underpredicting') tendencyColor = 'var(--wait-orange)';
                if (p.tendency === 'overpredicting') tendencyColor = 'var(--wait-red)';
                
                return (
                  <tr key={`${p.port}-${p.lane}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '1rem', fontWeight: '700' }}>{formattedPort}</td>
                    <td style={{ padding: '1rem' }}>
                      <span className="wait-badge" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                        {formattedLane}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>{p.sample_size} predictions</td>
                    <td style={{ padding: '1rem', color: tendencyColor, fontWeight: '600' }}>
                      {p.average_error_minutes > 0 ? `+${p.average_error_minutes.toFixed(1)}` : p.average_error_minutes.toFixed(1)} m
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {p.median_absolute_error_minutes.toFixed(1)} m
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        textTransform: 'uppercase',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        color: tendencyColor
                      }}>
                        {p.tendency}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }} className="text-muted text-sm">
                      {new Date(p.updated_at).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
