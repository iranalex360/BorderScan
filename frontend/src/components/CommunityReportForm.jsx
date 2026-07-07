import React, { useState } from 'react';
import { submitCommunityReport } from '../lib/api.js';
import { PORTS } from '../lib/constants.js';

export default function CommunityReportForm({ onReportSubmitted }) {
  const [mode, setMode] = useState('structured'); // 'structured' | 'unstructured'
  const [form, setForm] = useState({
    port: PORTS[0].code,
    laneType: 'standard',
    reportedWaitMinutes: '',
    notes: '',
    report_text: ''
  });
  const [status, setStatus] = useState(null); // 'loading' | 'success' | 'error'
  const [feedback, setFeedback] = useState('');

  const reportLanes = [
    { value: 'standard', label: 'General' },
    { value: 'ready', label: 'Ready' },
    { value: 'sentri', label: 'SENTRI' },
    { value: 'pedestrian', label: 'Pedestrian' }
  ];

  const handleChange = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setFeedback('');
    try {
      if (mode === 'structured') {
        const payload = {
          port: form.port,
          laneType: form.laneType,
          reportedWaitMinutes: Number(form.reportedWaitMinutes),
          notes: form.notes
        };
        const result = await submitCommunityReport(payload);
        setStatus('success');
        setFeedback(`Report submitted successfully!`);
        setForm({ port: PORTS[0].code, laneType: 'standard', reportedWaitMinutes: '', notes: '', report_text: '' });
      } else {
        const result = await submitCommunityReport({ report_text: form.report_text });
        setStatus('success');
        setFeedback(`Text successfully parsed & accepted!`);
        setForm({ port: PORTS[0].code, laneType: 'standard', reportedWaitMinutes: '', notes: '', report_text: '' });
      }
      
      // Trigger dashboard reload if callback exists
      if (onReportSubmitted) {
        onReportSubmitted();
      }
    } catch (err) {
      setStatus('error');
      setFeedback(err.message || 'Submission failed. Please check guardrails.');
    }
  };

  const inputStyle = {
    width: '100%',
    background: 'var(--color-surface-2)',
    border: '1px solid var(--color-border)',
    borderRadius: '10px',
    color: 'var(--color-text)',
    padding: '0.85rem 1rem',
    fontFamily: 'var(--font-sans)',
    fontSize: '1rem',
    outline: 'none',
    boxSizing: 'border-box',
    minHeight: '48px', // Thumb friendly height
    transition: 'border-color 0.2s'
  };

  return (
    <div className="card fade-in" style={{ padding: '1.25rem' }}>
      <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
        <div className="section-title" style={{ marginBottom: 0, fontSize: '1rem', fontWeight: '700' }}>
          📝 Submit Report
        </div>
        <div style={{
          display: 'inline-flex',
          background: 'rgba(255,255,255,0.04)',
          padding: '2px',
          borderRadius: '20px',
          border: '1px solid var(--color-border)'
        }}>
          <button
            type="button"
            style={{
              padding: '0.4rem 0.8rem',
              fontSize: '0.75rem',
              borderRadius: '20px',
              border: 'none',
              background: mode === 'structured' ? 'var(--color-primary)' : 'transparent',
              color: mode === 'structured' ? '#fff' : 'var(--color-text-muted)',
              cursor: 'pointer',
              fontWeight: '600'
            }}
            onClick={() => { setMode('structured'); setStatus(null); setFeedback(''); }}
          >
            Form
          </button>
          <button
            type="button"
            style={{
              padding: '0.4rem 0.8rem',
              fontSize: '0.75rem',
              borderRadius: '20px',
              border: 'none',
              background: mode === 'unstructured' ? 'var(--color-primary)' : 'transparent',
              color: mode === 'unstructured' ? '#fff' : 'var(--color-text-muted)',
              cursor: 'pointer',
              fontWeight: '600'
            }}
            onClick={() => { setMode('unstructured'); setStatus(null); setFeedback(''); }}
          >
            Paste Text
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {mode === 'structured' ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label htmlFor="report-port" className="text-xs text-muted" style={{ display: 'block', marginBottom: '0.35rem' }}>Port</label>
                <select id="report-port" style={inputStyle} value={form.port} onChange={handleChange('port')}>
                  {PORTS.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="report-lane" className="text-xs text-muted" style={{ display: 'block', marginBottom: '0.35rem' }}>Lane Type</label>
                <select id="report-lane" style={inputStyle} value={form.laneType} onChange={handleChange('laneType')}>
                  {reportLanes.map((lt) => <option key={lt.value} value={lt.value}>{lt.label}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="report-wait" className="text-xs text-muted" style={{ display: 'block', marginBottom: '0.35rem' }}>Wait Time (minutes)</label>
              <input
                id="report-wait"
                type="number"
                min="0"
                max="600"
                placeholder="e.g. 45"
                style={inputStyle}
                value={form.reportedWaitMinutes}
                onChange={handleChange('reportedWaitMinutes')}
                required
              />
            </div>

            <div>
              <label htmlFor="report-notes" className="text-xs text-muted" style={{ display: 'block', marginBottom: '0.35rem' }}>Notes (optional)</label>
              <textarea
                id="report-notes"
                rows={2}
                placeholder="e.g. Line starts at 5 y 10..."
                style={{ ...inputStyle, resize: 'none', minHeight: '60px' }}
                value={form.notes}
                onChange={handleChange('notes')}
              />
            </div>
          </>
        ) : (
          <div>
            <label htmlFor="report-text" className="text-xs text-muted" style={{ display: 'block', marginBottom: '0.35rem' }}>Pasted Text Content</label>
            <textarea
              id="report-text"
              rows={4}
              placeholder="e.g. SY general starts near 5 y 10, looks like about 2 hours."
              style={{ ...inputStyle, resize: 'none', minHeight: '100px' }}
              value={form.report_text}
              onChange={handleChange('report_text')}
              required
            />
          </div>
        )}

        <button
          type="submit"
          disabled={status === 'loading'}
          style={{
            width: '100%',
            height: '48px', // Large touch target
            borderRadius: '10px',
            border: 'none',
            background: 'var(--color-primary)',
            color: '#ffffff',
            fontWeight: '600',
            fontSize: '1rem',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0, 115, 230, 0.25)',
            transition: 'background 0.2s',
            marginTop: '0.5rem'
          }}
        >
          {status === 'loading' ? '⏳ Submitting...' : 'Submit Report'}
        </button>

        {status === 'success' && (
          <div className="text-xs" style={{ color: 'var(--wait-green)', fontWeight: '600', textAlign: 'center', marginTop: '0.5rem' }}>
            ✅ {feedback}
          </div>
        )}
        {status === 'error' && (
          <div className="text-xs" style={{ color: 'var(--color-danger)', fontWeight: '600', textAlign: 'center', marginTop: '0.5rem' }}>
            ❌ {feedback}
          </div>
        )}
      </form>
    </div>
  );
}
