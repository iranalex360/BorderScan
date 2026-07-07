import React, { useEffect, useState } from 'react';
import CommunityReportForm from '../components/CommunityReportForm.jsx';
import { fetchCommunityReports } from '../lib/api.js';
import { PORTS } from '../lib/constants.js';

export default function Report() {
  const [reports, setReports] = useState([]);
  const [selectedPort, setSelectedPort] = useState(PORTS[0].code);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReports();
  }, [selectedPort]);

  async function loadReports() {
    setLoading(true);
    try {
      const data = await fetchCommunityReports({ port: selectedPort });
      setReports(data.reports || []);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.25rem' }}>🗣️ Community Reports</h1>
        <p className="text-muted text-sm">Share your real-time crossing experience and see what others are reporting.</p>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <CommunityReportForm />

        <div className="card fade-in">
          <div className="section-title">Recent Reports</div>

          <div style={{ marginBottom: '1rem' }}>
            <select
              value={selectedPort}
              onChange={(e) => setSelectedPort(e.target.value)}
              style={{
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-text)',
                padding: '0.5rem 0.75rem',
                fontFamily: 'var(--font-sans)',
                fontSize: '0.85rem',
              }}
            >
              {PORTS.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="text-sm text-muted">Loading reports...</div>
          ) : reports.length === 0 ? (
            <div className="text-sm text-muted">No recent reports for this port.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {reports.map((r) => (
                <div key={r.id} style={{ padding: '0.75rem', background: 'var(--color-glass)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-glass-border)' }}>
                  <div className="flex justify-between items-center" style={{ marginBottom: '0.35rem' }}>
                    <span className="text-xs text-muted" style={{ textTransform: 'capitalize' }}>{r.laneType} Lane</span>
                    <span className="text-xs text-muted">{new Date(r.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="text-sm" style={{ fontWeight: '600' }}>{r.reportedWaitMinutes} min wait</div>
                  {r.notes && <div className="text-xs text-muted mt-1">{r.notes}</div>}
                  <div className="text-xs text-muted mt-1">👍 {r.upvotes}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
