import { Router } from 'express';
import BorderScanOrchestratorAgent from '../agents/BorderScanOrchestratorAgent.js';

import { getRecentDecisions } from '../services/decisionLogService.js';

const router = Router();

/** GET /api/recommendation/logs */
router.get('/logs', async (req, res, next) => {
  try {
    const logs = getRecentDecisions(5);
    res.json({ logs });
  } catch (err) {
    next(err);
  }
});

/** GET /api/recommendation?laneType=standard */
router.get('/', async (req, res, next) => {
  try {
    const { laneType = 'standard', port = 'SAN_YSIDRO' } = req.query;
    const orchestrator = new BorderScanOrchestratorAgent();
    const result = await orchestrator.run({
      query: `Best crossing for ${laneType} lane`,
      port,
      laneType,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
