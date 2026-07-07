import { Router } from 'express';
import QueueMapAgent from '../agents/QueueMapAgent.js';

const router = Router();

/** GET /api/queue-map?port=SAN_YSIDRO */
router.get('/', async (req, res, next) => {
  try {
    const { port, laneType, queueStartLabel, delayBand, reportedQueueLengthKm } = req.query;
    if (!port) return res.status(400).json({ error: 'port query param is required' });
    const data = await new QueueMapAgent().run({
      port,
      laneType,
      queueStartLabel,
      delayBand,
      reportedQueueLengthKm: reportedQueueLengthKm ? parseFloat(reportedQueueLengthKm) : null
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
