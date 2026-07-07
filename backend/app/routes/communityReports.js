import { Router } from 'express';
import { getRecentReports, createReport } from '../services/communityService.js';
import { extractAndValidateReport } from '../services/communityExtractor.js';
import db from '../models/db.js';

const router = Router();

/** GET /api/community-reports?port=SAN_YSIDRO&windowMinutes=60 */
router.get('/', (req, res, next) => {
  try {
    const port = req.query.port;
    const windowMinutes = parseInt(req.query.windowMinutes || '60', 10);
    if (!port) return res.status(400).json({ error: 'port query param is required' });
    const reports = getRecentReports({ port, windowMinutes });
    res.json({ port, windowMinutes, reportsCount: reports.length, reports });
  } catch (err) {
    next(err);
  }
});

/** POST /api/community-reports */
router.post('/', (req, res, next) => {
  try {
    const { port, lane, laneType, reported_wait_minutes, reportedWaitMinutes, queue_start_label, notes, report_text } = req.body;
    
    // Determine the text to parse/validate
    const textToValidate = report_text || notes || '';
    
    if (textToValidate) {
      // Run extraction & validation on the text
      const extracted = extractAndValidateReport(textToValidate);
      if (!extracted.passed) {
        return res.status(400).json({
          validation_status: extracted.validationStatus,
          reason: extracted.reason
        });
      }
      
      // Use extracted values, override body fields if they were missing
      const finalPort = port || extracted.port;
      const finalLane = laneType || lane || extracted.laneType;
      const finalWait = reportedWaitMinutes !== undefined ? Number(reportedWaitMinutes) : (reported_wait_minutes !== undefined ? Number(reported_wait_minutes) : extracted.reportedWaitMinutes);
      
      const report = createReport({
        port: finalPort,
        laneType: finalLane,
        reportedWaitMinutes: finalWait,
        notes: textToValidate
      });

      // Insert extracted wait signal
      db.prepare(`
        INSERT INTO extracted_wait_signals (
          report_id, port, lane_type, wait_minutes,
          queue_start_label, signal_time, confidence, extraction_method
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        report.id,
        finalPort,
        finalLane,
        finalWait,
        queue_start_label || extracted.queueStartLabel || null,
        new Date().toISOString(),
        extracted.confidence || 0.85,
        'heuristic'
      );

      return res.status(201).json({
        report_id: report.id,
        validation_status: 'accepted',
        trust_score: 0.85
      });
    }

    // Fallback: structured fields without text notes
    const finalPort = port;
    const finalLane = laneType || lane;
    const finalWait = reportedWaitMinutes !== undefined ? Number(reportedWaitMinutes) : Number(reported_wait_minutes);

    if (!finalPort || !finalLane || isNaN(finalWait)) {
      return res.status(400).json({ error: 'Missing required report fields' });
    }

    if (finalWait < 0) {
      return res.status(400).json({ validation_status: 'rejected', reason: 'Negative wait times are not allowed.' });
    }
    if (finalWait > 480) {
      return res.status(400).json({ validation_status: 'rejected', reason: 'Wait times above 480 minutes are not allowed.' });
    }

    const report = createReport({
      port: finalPort,
      laneType: finalLane,
      reportedWaitMinutes: finalWait,
      notes: ''
    });

    return res.status(201).json({
      report_id: report.id,
      validation_status: 'accepted',
      trust_score: 0.7
    });

  } catch (err) {
    next(err);
  }
});

export default router;
