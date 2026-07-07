import React from 'react';

/**
 * RecommendationPanel — Displays the AI-generated crossing recommendation.
 * @param {Object} props
 * @param {string} props.recommendedPort
 * @param {string} props.recommendedLane
 * @param {number} props.estimatedWaitMinutes
 * @param {string} props.confidence - 'high' | 'medium' | 'low'
 * @param {string} props.explanation
 * @param {Array}  props.sources
 * @param {boolean} props.loading
 */
export default function RecommendationPanel({
  recommendedPort,
  recommendedLane,
  estimatedWaitMinutes,
  confidence,
  explanation,
  sources = [],
  loading,
}) {
  if (loading) {
    return (
      <div className="card fade-in" style={{ textAlign: 'center', padding: '2.5rem', background: 'var(--color-surface-2)' }}>
        <div style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }} className="pulse">💡</div>
        <div className="text-sm" style={{ color: 'var(--color-primary)', fontWeight: '600' }}>Scanning border conditions...</div>
      </div>
    );
  }

  if (!recommendedPort) {
    return (
      <div className="card fade-in" style={{ padding: '1.5rem', background: 'var(--color-surface-2)', border: '1px dashed var(--color-border)' }}>
        <div style={{ fontWeight: '700', fontSize: '1.1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>💡</span> Crossing Recommendation
        </div>
        <div className="text-sm text-muted">Select your preferred lane type to see the best port recommendation.</div>
      </div>
    );
  }

  const isLowConfidence = confidence?.toLowerCase() === 'low';
  
  // Format port/lane name nicely
  const portDisplay = recommendedPort.replace(/[-_]/g, ' ');
  const laneDisplay = recommendedLane === 'standard' ? 'General' : recommendedLane;

  // Calculate dynamic wait range around the estimate
  const waitMin = Math.max(5, estimatedWaitMinutes - 5);
  const waitMax = estimatedWaitMinutes + 10;

  return (
    <div className="card fade-in" style={{
      borderLeft: '4px solid var(--color-primary)',
      padding: '1.5rem',
      background: 'linear-gradient(135deg, rgba(0, 115, 230, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
      borderRadius: '12px'
    }}>
      <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
        <div style={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', color: 'var(--color-primary)' }}>
          ⭐️ Best Option
        </div>
        <span className={`wait-badge ${isLowConfidence ? 'red' : confidence === 'medium' ? 'yellow' : 'green'}`} style={{
          textTransform: 'uppercase',
          fontSize: '0.7rem',
          fontWeight: '700',
          padding: '0.2rem 0.5rem'
        }}>
          {confidence} Confidence
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--color-text)', textTransform: 'capitalize' }}>
            {portDisplay} <span style={{ color: 'var(--color-primary)' }}>{laneDisplay}</span>
          </div>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
          <div className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Estimated Wait</div>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', marginTop: '0.25rem', color: 'var(--color-text)' }}>
            {waitMin}–{waitMax} min
          </div>
        </div>
      </div>

      {explanation && (
        <div style={{ marginBottom: '1.25rem' }}>
          <div className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Why</div>
          <div className="text-sm" style={{ lineHeight: '1.5', color: '#e2e8f0' }}>{explanation}</div>
        </div>
      )}

      {isLowConfidence && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.75rem',
          borderRadius: '8px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: 'var(--wait-red)',
          fontSize: '0.8rem',
          fontWeight: '500',
          marginBottom: '1rem'
        }}>
          <span>⚠️</span> Use caution. Official and community signals disagree.
        </div>
      )}

      {sources.length > 0 && (
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="text-xs text-muted">Signals:</span>
          {sources.map((s) => (
            <span key={s} className="text-xs" style={{
              padding: '0.15rem 0.5rem',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--color-border)',
              borderRadius: '4px',
              color: 'var(--color-text-muted)',
              textTransform: 'capitalize'
            }}>
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
