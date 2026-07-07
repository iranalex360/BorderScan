import React from 'react';

/**
 * PredictionPanel — Displays wait time forecasts, percentile ranges, and signal-fusion scores.
 * @param {Object} props
 * @param {Array}  props.predictions
 * @param {string} props.reasoning
 * @param {Object} props.predictionData - Full prediction object containing fusion details
 * @param {boolean} props.loading
 */
export default function PredictionPanel({ predictions = [], reasoning, predictionData, loading }) {
  if (loading) {
    return (
      <div className="card fade-in" style={{ textAlign: 'center', padding: '2.5rem' }}>
        <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🤖</div>
        <div className="text-sm text-muted">Running Signal-Fusion Forecasting...</div>
      </div>
    );
  }

  const hasRanges = predictionData && predictionData.p50 !== undefined;

  const cbpWait = predictionData?.signals_used?.cbp_wait ?? predictionData?.official_cbp_wait_minutes ?? 0;
  const lanesOpen = predictionData?.signals_used?.lanes_open ?? predictionData?.official_lanes_open ?? 0;
  const p50 = predictionData?.p50 ?? predictionData?.predicted_wait_minutes ?? 0;
  const p75 = predictionData?.p75 ?? 0;
  const lowRange = predictionData?.low_range ?? 0;
  const highRange = predictionData?.high_range ?? 0;
  const confidence = predictionData?.confidence ?? 'medium';
  const hasCommunity = predictionData?.signals_used?.community_reports_used ?? false;
  const communityWait = predictionData?.signals_used?.community_wait ?? predictionData?.community_estimate_minutes ?? null;
  const histMedianVal = predictionData?.historical_median ?? predictionData?.historical_average_minutes ?? 0;

  const maxCap = predictionData?.max_cap_applied || 240;
  const leftPercent = Math.min(100, Math.max(0, (lowRange / maxCap) * 100));
  const rightPercent = Math.min(100, Math.max(0, (highRange / maxCap) * 100));
  const widthPercent = Math.max(0, rightPercent - leftPercent);
  const p50Percent = Math.min(100, Math.max(0, (p50 / maxCap) * 100));

  return (
    <div className="card fade-in">
      <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
        <div className="section-title" style={{ marginBottom: 0 }}>⏱ Wait Time Forecast</div>
        {hasRanges && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
            <span className={`wait-badge ${confidence === 'high' ? 'green' : confidence === 'medium' ? 'yellow' : 'red'}`} style={{ textTransform: 'capitalize' }}>
              {confidence} Confidence
            </span>
            <span className="text-xs text-muted" style={{ fontSize: '0.7rem' }}>
              Prediction quality: <strong style={{ color: 'var(--color-text)' }}>{predictionData.prediction_quality || 'limited data'}</strong>
            </span>
          </div>
        )}
      </div>

      {predictions.length === 0 ? (
        <div className="text-sm text-muted">No predictions available. Select a crossing and refresh data.</div>
      ) : (
        <>
          {/* Main ranges metrics (P50, P75, and min/max interval) */}
          {hasRanges && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: '1rem',
              marginBottom: '1.25rem',
            }}>
              <div className="card-glass" style={{ padding: '1rem', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <div className="text-xs text-muted" style={{ marginBottom: '0.25rem' }}>BorderScan Estimate</div>
                <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--color-text)' }}>
                  {p50}
                  <span className="text-xs text-muted" style={{ fontSize: '0.75rem', fontWeight: '400' }}> min</span>
                </div>
                <div className="text-xs text-muted mt-1">Most likely crossing time</div>
              </div>

              <div className="card-glass" style={{ padding: '1rem', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <div className="text-xs text-muted" style={{ marginBottom: '0.25rem' }}>BorderScan Conservative</div>
                <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--color-text)' }}>
                  {p75}
                  <span className="text-xs text-muted" style={{ fontSize: '0.75rem', fontWeight: '400' }}> min</span>
                </div>
                <div className="text-xs text-muted mt-1">Conservative P75</div>
              </div>

              <div className="card-glass" style={{ padding: '1rem', borderRadius: 'var(--radius-sm)', textAlign: 'center', gridColumn: 'span 2' }}>
                <div className="text-xs text-muted" style={{ marginBottom: '0.25rem' }}>Estimate Range</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--color-text)', marginTop: '0.25rem' }}>
                  {lowRange} - {highRange}
                  <span className="text-xs text-muted" style={{ fontSize: '0.75rem', fontWeight: '400' }}> min</span>
                </div>
                {/* Horizontal range bar */}
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', marginTop: '0.75rem', position: 'relative' }}>
                  <div style={{
                    position: 'absolute',
                    left: `${leftPercent}%`,
                    width: `${widthPercent}%`,
                    height: '100%',
                    background: 'var(--color-primary)',
                    borderRadius: '3px',
                    opacity: 0.6
                  }} />
                  <div style={{
                    position: 'absolute',
                    left: `${p50Percent}%`,
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: '#ffffff',
                    top: '-2px',
                    boxShadow: '0 0 4px var(--color-primary)'
                  }} />
                </div>
                <div className="text-xs text-muted" style={{ marginTop: '0.5rem', fontWeight: '600' }}>
                  Delay Band: <span style={{
                    color: p50 <= 30 ? 'var(--wait-green)' :
                           p50 <= 75 ? 'var(--wait-yellow)' :
                           p50 <= 120 ? 'var(--wait-orange)' : 'var(--wait-red)',
                    textTransform: 'uppercase'
                  }}>{predictionData.delay_band || 'moderate'}</span>
                </div>
                {p50 > 120 && (
                  <div className="text-xs" style={{ color: 'var(--wait-red)', fontWeight: '700', marginTop: '0.25rem' }}>
                    🚨 Severe delays possible (Could exceed 2 hours)
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Comparison of Signals Section */}
          {hasRanges && (
            <div style={{
              marginBottom: '1.25rem',
              padding: '1rem',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)'
            }}>
              <div className="text-xs text-muted" style={{ marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Comparison of Signals & Forecasts
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
                <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>
                  <div className="text-xs text-muted">Official CBP Wait</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--wait-green)' }}>
                    {cbpWait} min
                  </div>
                  <div className="text-xs text-muted">🚦 {lanesOpen} lanes open</div>
                </div>
                <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>
                  <div className="text-xs text-muted">BorderScan Estimate</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--color-primary)' }}>
                    {p50} min
                  </div>
                  <div className="text-xs text-muted">Signal-fusion P50</div>
                </div>
                <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>
                  <div className="text-xs text-muted">Average Wait</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--color-text)' }}>
                    {histMedianVal} min
                  </div>
                  <div className="text-xs text-muted">Historical median</div>
                </div>
                <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>
                  <div className="text-xs text-muted">Community Reports</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: '700', color: hasCommunity ? 'var(--wait-yellow)' : 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                    {hasCommunity && communityWait !== null
                      ? `${communityWait} min`
                      : 'Not used'}
                  </div>
                  <div className="text-xs text-muted" style={{ marginTop: '0.2rem' }}>
                    {hasCommunity ? 'Traveler inputs' : 'No reports active'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Time horizons forecast timeline */}
          <div className="text-xs text-muted" style={{ marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Time Horizon Forecasts</div>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            {predictions.map((p) => (
              <div
                key={p.minutesFromNow}
                className="card-glass"
                style={{ flex: '1', minWidth: '90px', padding: '0.75rem', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}
              >
                <div className="text-xs text-muted" style={{ marginBottom: '0.25rem' }}>+{p.minutesFromNow} min</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--color-text)' }}>
                  {p.estimatedWaitMinutes}
                  <span className="text-xs text-muted" style={{ fontSize: '0.65rem', fontWeight: '400' }}> min</span>
                </div>
              </div>
            ))}
          </div>

          {/* Signal Fusion scores dashboard */}
          {hasRanges && (
            <div style={{ marginBottom: '1.25rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
              <div className="text-xs text-muted" style={{ marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Fused Input Signal Scores (Spread: {predictionData.spread_minutes ?? 0} min)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {/* CBP Trust */}
                <div>
                  <div className="flex justify-between items-center text-xs text-muted" style={{ marginBottom: '0.25rem' }}>
                    <span>CBP Data Trust</span>
                    <strong>{Math.round((predictionData.cbp_trust ?? 1.0) * 100)}%</strong>
                  </div>
                  <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px' }}>
                    <div style={{ height: '100%', width: `${(predictionData.cbp_trust ?? 1.0) * 100}%`, background: 'var(--wait-green)', borderRadius: '2px' }} />
                  </div>
                </div>

                {/* Community Trust */}
                <div>
                  <div className="flex justify-between items-center text-xs text-muted" style={{ marginBottom: '0.25rem' }}>
                    <span>Community Data Trust</span>
                    <strong>{Math.round((predictionData.community_trust ?? 0.0) * 100)}%</strong>
                  </div>
                  <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px' }}>
                    <div style={{ height: '100%', width: `${(predictionData.community_trust ?? 0.0) * 100}%`, background: 'var(--color-primary)', borderRadius: '2px' }} />
                  </div>
                </div>

                {/* Queue Estimate */}
                <div style={{ marginTop: '0.25rem' }}>
                  <span className="text-xs text-muted" style={{ display: 'block' }}>Queue Physical Est.</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                    {predictionData.queue_estimate !== null && predictionData.queue_estimate !== undefined
                      ? `${Math.round(predictionData.queue_estimate)} mins`
                      : 'No Signal'}
                  </span>
                </div>

                {/* Historical Baseline */}
                <div style={{ marginTop: '0.25rem' }}>
                  <span className="text-xs text-muted" style={{ display: 'block' }}>Historical Median</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>{histMedianVal} mins</span>
                </div>
              </div>
            </div>
          )}

          {/* Info banner about data source */}
          <div style={{
            marginBottom: '1.25rem',
            padding: '0.75rem 1rem',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: 'var(--radius-sm)',
            borderLeft: '3px solid var(--color-primary)',
            fontSize: '0.825rem',
            lineHeight: '1.4',
            border: '1px solid var(--color-border)',
            borderLeftWidth: '3px'
          }}>
            <div style={{ fontWeight: '600', marginBottom: '0.25rem', color: 'var(--color-primary)' }}>
              ℹ️ {hasCommunity ? 'Community-Enhanced Forecast' : 'Official CBP History & Trend Forecast'}
            </div>
            <div>
              {hasCommunity
                ? 'Prediction based on official CBP history, live trend, and verified traveler-submitted reports.'
                : 'Prediction based on official CBP history and live trend. No community reports used.'}
            </div>
            <div className="text-xs text-muted" style={{ marginTop: '0.25rem' }}>
              Based on: CBP history, current wait, trend, lanes open, time of day{hasCommunity && ', community inputs'}.
            </div>
          </div>

          {/* AI reasoning summaries */}
          {reasoning && (
            <div style={{ padding: '0.75rem 1rem', background: 'var(--color-glass)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--color-primary)' }}>
              <div className="text-xs text-muted" style={{ marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prediction Logic (Deterministic Fusing)</div>
              <div className="text-sm" style={{ lineHeight: '1.5' }}>{reasoning}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
