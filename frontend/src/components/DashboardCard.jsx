const SHOW_DEBUG = import.meta.env.VITE_SHOW_DEBUG === "true";

export default function DashboardCard({
  portName,
  laneType,
  waitMinutes,
  openLanes,
  updatedAt,
  isActive = false,
  onSelect,
  // Debug properties
  source,
  is_live,
  cbp_port_number,
  cbp_crossing_name,
  cbp_lane_path,
  lane_update_time,
  record_time,
  fetched_at,
  cache_status,
  freshness,
  fetch_error,
  fetch_error_type,
  live_fetch_attempted,
  live_fetch_url
}) {
  let colorClass = 'gray';
  if (waitMinutes !== null && waitMinutes !== undefined) {
    if (waitMinutes <= 30) colorClass = 'green';
    else if (waitMinutes <= 75) colorClass = 'yellow';
    else if (waitMinutes <= 120) colorClass = 'orange';
    else colorClass = 'red';
  }

  const loadedTime = updatedAt ? new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  const isMock = source === 'mock_fallback';

  // Format CBP update time nicely without "At" prefix if present
  const lastCbpUpdateStr = lane_update_time ? lane_update_time.replace(/^At\s+/i, '') : 'N/A';

  const timeLabel = isMock ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '0.5rem' }}>
      <div className="text-xs" style={{ color: 'var(--wait-orange)', fontWeight: '600' }}>
        ⚠️ Live CBP data is unavailable. Showing demo fallback data.
      </div>
      <div className="text-xs text-muted">CBP update from fixture: {lastCbpUpdateStr}</div>
    </div>
  ) : (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '0.5rem' }}>
      <div className="text-xs text-muted">Last CBP Update: {lastCbpUpdateStr}</div>
    </div>
  );

  const lane = laneType?.toLowerCase() || 'standard';
  const progressMax = lane === 'sentri' ? 150 : lane.includes('pedestrian') ? 180 : 240;
  const percent = waitMinutes !== null && waitMinutes !== undefined ? Math.min(100, (waitMinutes / progressMax) * 100) : 0;

  return (
    <div
      className="card fade-in"
      style={{
        cursor: onSelect ? 'pointer' : 'default',
        borderColor: isActive ? 'var(--color-primary)' : 'var(--color-border)',
        boxShadow: isActive ? '0 0 0 1px var(--color-primary)' : 'none',
        transition: 'all 0.2s',
        padding: '1rem'
      }}
      onClick={onSelect}
    >
      <div className="flex justify-between items-start">
        <div>
          <div className="section-title" style={{ marginBottom: '0.25rem', fontSize: '1rem', fontWeight: '700' }}>{portName}</div>
          <div className="text-xs text-muted" style={{ textTransform: 'capitalize' }}>
            {laneType === 'standard' ? 'General' : laneType} Lane
          </div>
        </div>
        <span className={`wait-badge ${colorClass}`} style={{ fontSize: '1.1rem', padding: '0.25rem 0.6rem', borderRadius: '6px' }}>
          {waitMinutes !== null && waitMinutes !== undefined ? `${waitMinutes} min` : 'N/A'}
        </span>
      </div>

      <div style={{ marginTop: '0.75rem' }}>
        <div className="text-xs text-muted">🚦 {openLanes} lanes open</div>
        {timeLabel}
      </div>

      {/* Wait time bar */}
      <div style={{
        marginTop: '0.75rem',
        height: '6px',
        borderRadius: '3px',
        background: 'rgba(255,255,255,0.08)',
        overflow: 'hidden'
      }}>
        <div style={{
          height: '100%',
          width: `${percent}%`,
          background: `var(--wait-${colorClass})`,
          borderRadius: '3px',
          transition: 'width 0.6s ease'
        }} />
      </div>

      {/* Dev/Debug Section - Hidden by default */}
      {SHOW_DEBUG && (
        <div style={{
          marginTop: '0.75rem',
          padding: '0.5rem',
          background: 'rgba(0,0,0,0.25)',
          borderRadius: '4px',
          border: '1px dashed rgba(255,255,255,0.1)',
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#a0aec0',
          lineHeight: '1.4'
        }}>
          <div style={{ fontWeight: 'bold', color: 'var(--color-primary)', marginBottom: '0.25rem' }}>🔧 Dev Debug Info</div>
          <div>source: {source || 'unknown'}</div>
          <div>is_live: {is_live ? 'true' : 'false'}</div>
          <div>cbp_port_number: {cbp_port_number || 'N/A'}</div>
          <div>cbp_crossing_name: {cbp_crossing_name || 'Passenger'}</div>
          <div>cbp_lane_path: {cbp_lane_path || 'N/A'}</div>
          <div>lane_update_time: {lane_update_time || 'N/A'}</div>
          <div>record_time: {record_time || 'N/A'}</div>
          <div>fetched_at: {fetched_at ? new Date(fetched_at).toLocaleTimeString() : 'N/A'}</div>
          <div>cache_status: {cache_status || 'N/A'}</div>
          {fetch_error && (
            <div style={{ color: 'var(--wait-red)', marginTop: '0.25rem', wordBreak: 'break-word' }}>
              ⚠️ fetch_error: {fetch_error} ({fetch_error_type || 'NETWORK_ERROR'})
            </div>
          )}
          {freshness && (
            <div style={{ color: freshness.is_stale ? 'var(--wait-red)' : 'var(--wait-green)', marginTop: '0.2rem' }}>
              ● {freshness.is_stale ? `stale: ${freshness.stale_reason || 'unknown'}` : 'fresh'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
