import { queueMapTool } from '../tools/queueMapTool.js';

describe('QueueMapAgent — queueMapTool', () => {
  it('throws when port is missing', async () => {
    await expect(queueMapTool({})).rejects.toThrow('port is required');
  });

  // 1. San Ysidro General selects san_ysidro_general_ready_long
  it('1. San Ysidro General selects san_ysidro_general_ready_long', async () => {
    const result = await queueMapTool({ port: 'san_ysidro', laneType: 'general' });
    expect(result.corridor_id).toBe('san_ysidro_general_ready_long');
  });

  // 2. San Ysidro Ready selects san_ysidro_general_ready_long
  it('2. San Ysidro Ready selects san_ysidro_general_ready_long', async () => {
    const result = await queueMapTool({ port: 'san_ysidro', laneType: 'ready' });
    expect(result.corridor_id).toBe('san_ysidro_general_ready_long');
  });

  // 3. San Ysidro SENTRI selects san_ysidro_sentri_short
  it('3. San Ysidro SENTRI selects san_ysidro_sentri_short', async () => {
    const result = await queueMapTool({ port: 'san_ysidro', laneType: 'sentri' });
    expect(result.corridor_id).toBe('san_ysidro_sentri_short');
  });

  // 4. Otay Mesa General selects otay_mesa_general_ready_bellas_artes
  it('4. Otay Mesa General selects otay_mesa_general_ready_bellas_artes', async () => {
    const result = await queueMapTool({ port: 'otay_mesa', laneType: 'general' });
    expect(result.corridor_id).toBe('otay_mesa_general_ready_bellas_artes');
  });

  // 5. Otay Mesa Ready selects otay_mesa_general_ready_bellas_artes
  it('5. Otay Mesa Ready selects otay_mesa_general_ready_bellas_artes', async () => {
    const result = await queueMapTool({ port: 'otay_mesa', laneType: 'ready' });
    expect(result.corridor_id).toBe('otay_mesa_general_ready_bellas_artes');
  });

  // 6. Otay Mesa SENTRI selects otay_mesa_sentri_short
  it('6. Otay Mesa SENTRI selects otay_mesa_sentri_short', async () => {
    const result = await queueMapTool({ port: 'otay_mesa', laneType: 'sentri' });
    expect(result.corridor_id).toBe('otay_mesa_sentri_short');
  });

  // 7. Queue line is not a straight two-point line when corridor has multiple points
  it('7. Queue line is not a straight two-point line when corridor has multiple points', async () => {
    const result = await queueMapTool({ port: 'san_ysidro', laneType: 'general', delayBand: 'extreme' });
    const lineFeature = result.geojson.features.find((f) => f.properties.kind === 'queue_line');
    expect(lineFeature.geometry.coordinates.length).toBeGreaterThan(2);
  });

  // 8. GeoJSON output includes queue line, queue start point, and entry point
  it('8. GeoJSON output includes queue line, queue start point, and entry point', async () => {
    const result = await queueMapTool({ port: 'san_ysidro', laneType: 'general' });
    expect(result.geojson.type).toBe('FeatureCollection');
    
    const line = result.geojson.features.find((f) => f.properties.kind === 'queue_line');
    const start = result.geojson.features.find((f) => f.properties.kind === 'queue_start');
    const entry = result.geojson.features.find((f) => f.properties.kind === 'entry_point');

    expect(line).toBeDefined();
    expect(start).toBeDefined();
    expect(entry).toBeDefined();

    expect(line.geometry.type).toBe('LineString');
    expect(start.geometry.type).toBe('Point');
    expect(entry.geometry.type).toBe('Point');
  });

  // 9. 5 y 10 queue start selects the first San Ysidro point
  it('9. 5 y 10 queue start selects the first San Ysidro point', async () => {
    const result = await queueMapTool({ port: 'san_ysidro', laneType: 'general', queueStartLabel: 'starts near 5 y 10' });
    const lineFeature = result.geojson.features.find((f) => f.properties.kind === 'queue_line');
    expect(lineFeature.geometry.coordinates[0]).toEqual([-116.99345, 32.5064]);
  });

  // 10. Bellas Artes queue start selects the first Otay Mesa point
  it('10. Bellas Artes queue start selects the first Otay Mesa point', async () => {
    const result = await queueMapTool({ port: 'otay_mesa', laneType: 'general', queueStartLabel: 'Bellas Artes approach' });
    const lineFeature = result.geojson.features.find((f) => f.properties.kind === 'queue_line');
    expect(lineFeature.geometry.coordinates[0]).toEqual([-116.9700, 32.5268]);
  });

  // 11. Leaflet coordinate conversion does not reverse GeoJSON coordinates incorrectly
  it('11. Leaflet coordinate conversion does not reverse GeoJSON coordinates incorrectly', async () => {
    const result = await queueMapTool({ port: 'san_ysidro', laneType: 'general' });
    const lineFeature = result.geojson.features.find((f) => f.properties.kind === 'queue_line');
    const firstPoint = lineFeature.geometry.coordinates[0];
    expect(firstPoint[0]).toBeLessThan(0);
    expect(firstPoint[0]).toBeGreaterThan(-118);
    expect(firstPoint[1]).toBeGreaterThan(30);
    expect(firstPoint[1]).toBeLessThan(35);
  });

  // Additional range and coordinates count assertions (Otay Mesa coordinate check)
  it('asserts Otay Mesa general queue line has at least 2 coordinates and kind queue_line', async () => {
    const result = await queueMapTool({ port: 'otay_mesa', laneType: 'general' });
    const lineFeature = result.geojson.features.find((f) => f.properties.kind === 'queue_line');
    expect(lineFeature.geometry.coordinates.length).toBeGreaterThanOrEqual(2);
    expect(lineFeature.properties.kind).toBe('queue_line');
  });

  // Empty state fallback logic assertions
  it('returns valid low-confidence empty state if no corridors match', async () => {
    const result = await queueMapTool({ port: 'invalid_port', laneType: 'general' });
    expect(result.confidence).toBe('low');
    expect(result.geojson.features.length).toBe(0);
    expect(result.warnings).toContain('No queue corridor found for this port/lane.');
  });
});
