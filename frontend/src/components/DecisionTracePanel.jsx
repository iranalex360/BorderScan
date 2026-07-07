import React from 'react';

/**
 * DecisionTracePanel — Displays the audit trail logs from the agent database.
 * @param {Object} props
 * @param {Array}  props.logs
 * @param {boolean} props.loading
 */
export default function DecisionTracePanel({ logs = [], loading }) {
  return (
    <div className="card fade-in">
      <div className="section-title">📊 Agent Decision Traces</div>
      <div className="text-sm text-muted" style={{ marginBottom: '1.25rem' }}>
        Audit trail of multi-agent reasoning logs saved to the database.
      </div>

      {loading ? (
        <div className="text-xs text-muted">Loading traces...</div>
      ) : logs.length === 0 ? (
        <div className="text-xs text-muted">No decision traces logged yet. Run a recommendation to populate.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {logs.map((log, index) => (
            <div
              key={log.id || index}
              style={{
                padding: '0.75rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div className="flex justify-between items-center" style={{ marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--color-primary)', textTransform: 'uppercase' }}>
                  {log.port || 'San Ysidro'} ({log.lane_type || 'standard'})
                </span>
                <span className={`wait-badge ${log.confidence === 'high' ? 'green' : log.confidence === 'medium' ? 'yellow' : 'red'}`} style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', textTransform: 'capitalize' }}>
                  {log.confidence}
                </span>
              </div>
              <div className="text-xs" style={{ fontFamily: 'monospace', color: '#c9d1d9', marginTop: '0.25rem' }}>
                {log.recommendation}
              </div>
              <div className="text-muted mt-2" style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.7rem' }}>
                <span>CBP: {log.official_wait_minutes}m</span>
                <span>·</span>
                <span>Community: {log.community_estimate_minutes ?? 'none'}m</span>
                <span>·</span>
                <span>Est: {log.prediction_minutes}m</span>
                <span style={{ marginLeft: 'auto' }}>{new Date(log.created_at).toLocaleTimeString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
