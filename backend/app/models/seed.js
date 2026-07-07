import 'dotenv/config';
import db from './db.js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('🌱 Seeding BorderScan database...');

// Clean existing data for a fresh seed
try {
  db.prepare('DELETE FROM community_reports').run();
  db.prepare('DELETE FROM extracted_wait_signals').run();
} catch (err) {
  // Safe if tables don't exist yet
}

// --- Seed community reports & extracted signals ---
const reportsPath = resolve(__dirname, '../../../data/seed/sample_community_reports.json');
try {
  const reports = JSON.parse(readFileSync(reportsPath, 'utf-8'));
  const insertReport = db.prepare(`
    INSERT INTO community_reports (
      port, lane_type, crossing_mode, report_type, 
      reported_wait_minutes, queue_start_label, report_text, 
      trust_score, validation_status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const insertSignal = db.prepare(`
    INSERT INTO extracted_wait_signals (
      report_id, port, lane_type, wait_minutes, 
      queue_start_label, signal_time, confidence, extraction_method
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const r of reports) {
    const res = insertReport.run(
      r.portCode,
      r.laneType,
      'car',
      'wait_time',
      r.notes?.includes('starts near') ? 'near 5 y 10' : null,
      r.reportedWaitMinutes,
      r.notes || null,
      r.upvotes > 0 ? 0.8 : 0.6,
      'accepted',
      r.submittedAt || new Date().toISOString()
    );

    // Also seed a matching extracted wait signal to mimic CommunitySignalAgent extraction
    insertSignal.run(
      res.lastInsertRowid,
      r.portCode,
      r.laneType,
      r.reportedWaitMinutes,
      r.notes?.includes('starts near') ? 'near 5 y 10' : null,
      r.submittedAt || new Date().toISOString(),
      0.75,
      'heuristic'
    );
  }
  console.log(`  ✅ Seeded ${reports.length} community reports and extracted signals`);
} catch (e) {
  console.log('  ⚠️  Could not seed community reports:', e.message);
}

console.log('✅ Database seeding complete.');
