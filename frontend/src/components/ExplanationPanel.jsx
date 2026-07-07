import React from 'react';

/**
 * ExplanationPanel — Displays the "Why this estimate?" AI explanation in bullet points.
 * @param {Object} props
 * @param {string} props.explanation
 * @param {Array}  props.sources
 * @param {Object} props.guardrail - { passed, score, issues }
 */
export default function ExplanationPanel({ explanation, sources = [], guardrail }) {
  if (!explanation) return null;

  // Split sentence paragraphs into clean bullet points
  const bullets = explanation
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 6);

  return (
    <div className="card fade-in" style={{ padding: '1.25rem' }}>
      <div className="section-title" style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '0.75rem' }}>
        ℹ️ Why this estimate?
      </div>

      {bullets.length === 0 ? (
        <div className="text-sm text-muted">{explanation}</div>
      ) : (
        <ul style={{
          paddingLeft: '1.1rem',
          margin: '0 0 1rem 0',
          fontSize: '0.85rem',
          lineHeight: '1.5',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem',
          color: 'var(--color-text-muted)'
        }}>
          {bullets.map((bullet, idx) => (
            <li key={idx} style={{ listStyleType: 'disc' }}>
              {bullet}.
            </li>
          ))}
        </ul>
      )}

      {sources.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <div className="text-xs text-muted" style={{ marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Data Sources
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {sources.map((s) => (
              <span key={s} style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0.2rem 0.6rem',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--color-border)',
                borderRadius: '4px',
                fontSize: '0.7rem',
                color: 'var(--color-text-muted)',
                textTransform: 'capitalize'
              }}>
                📍 {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {guardrail && (
        <div style={{
          padding: '0.6rem 0.8rem',
          background: guardrail.passed ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.05)',
          border: `1px solid ${guardrail.passed ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}`,
          borderRadius: '6px',
        }}>
          <div className="flex items-center gap-1" style={{ marginBottom: guardrail.issues?.length ? '0.4rem' : 0 }}>
            <span>{guardrail.passed ? '✅' : '⚠️'}</span>
            <span className="text-xs" style={{ color: guardrail.passed ? 'var(--wait-green)' : 'var(--color-danger)' }}>
              Security Guardrail {guardrail.passed ? 'Passed' : 'Flagged'} · Check score: {(guardrail.score * 100).toFixed(0)}%
            </span>
          </div>
          {guardrail.issues?.map((issue, i) => (
            <div key={i} className="text-xs text-muted">• {issue.detail}</div>
          ))}
        </div>
      )}
    </div>
  );
}
