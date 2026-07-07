describe('GET /api/current-waits Router via HTTP', () => {
  it('returns waits list with debug and source labels', async () => {
    const res = await fetch('http://localhost:3001/api/current-waits');
    expect(res.status).toBe(200);

    // Verify no-cache response headers
    expect(res.headers.get('cache-control')).toContain('no-store');
    expect(res.headers.get('cache-control')).toContain('no-cache');
    expect(res.headers.get('pragma')).toBe('no-cache');
    expect(res.headers.get('expires')).toBe('0');
    expect(res.headers.get('surrogate-control')).toBe('no-store');

    const json = await res.json();
    expect(json).toHaveProperty('waits');
    
    const waits = json.waits;
    if (waits.length > 0) {
      const first = waits[0];
      expect(first).toHaveProperty('cbp_port_number');
      expect(first).toHaveProperty('cbp_lane_path');
      expect(first).toHaveProperty('requested_port');
      expect(first).toHaveProperty('requested_lane');
      expect(first).toHaveProperty('normalized_lane');
      expect(first).toHaveProperty('official_wait_minutes');
      expect(first).toHaveProperty('lanes_open');
      expect(first).toHaveProperty('fetched_at');
      expect(first).toHaveProperty('cache_status');
      expect(first).toHaveProperty('is_live');
      expect(first).toHaveProperty('freshness');
      expect(first.freshness).toHaveProperty('is_stale');
      expect(first.freshness).toHaveProperty('stale_reason');
      expect(['mock_fallback', 'cbp_live']).toContain(first.source);
    }
  });

  it('does not overwrite official wait fields with prediction outputs', async () => {
    const res = await fetch('http://localhost:3001/api/current-waits');
    const json = await res.json();
    expect(json.waits.every((w) => w.waitMinutes !== undefined)).toBe(true);
    expect(json.waits.every((w) => w.p50 === undefined)).toBe(true);
  });

  it('respects CBP_USE_MOCK environment variable', async () => {
    // Enable mock mode via query override
    let res = await fetch('http://localhost:3001/api/current-waits?debug_use_mock=true');
    let json = await res.json();
    expect(json.waits.every(w => w.source === 'mock_fallback')).toBe(true);

    // Disable mock mode via query override
    res = await fetch('http://localhost:3001/api/current-waits?debug_use_mock=false');
    json = await res.json();
    if (json.waits.length > 0) {
      const w = json.waits[0];
      if (w.source === 'mock_fallback') {
        expect(w).toHaveProperty('fetch_error');
        expect(w).toHaveProperty('live_fetch_attempted', true);
      } else {
        expect(w.source).toBe('cbp_live');
      }
    }
  });

  it('returns raw CBP debug diagnostics on GET /api/debug/cbp-raw', async () => {
    const res = await fetch('http://localhost:3001/api/debug/cbp-raw');
    const json = await res.json();
    if (json.ok) {
      expect(res.status).toBe(200);
      expect(json).toHaveProperty('status');
      expect(json).toHaveProperty('content_type');
      expect(json).toHaveProperty('record_count');
      expect(json).toHaveProperty('sample_records');
      expect(json).toHaveProperty('fetched_at');
    } else {
      expect(json).toHaveProperty('error_type');
      expect(json).toHaveProperty('error_message');
      expect(json).toHaveProperty('fetched_at');
    }
  });
});
