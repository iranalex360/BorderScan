import { Router } from 'express';
import PredictionAgent from '../agents/PredictionAgent.js';
import BorderScanDataAgent from '../agents/BorderScanDataAgent.js';
import CommunitySignalAgent from '../agents/CommunitySignalAgent.js';
import HolidayContextAgent from '../agents/HolidayContextAgent.js';

const router = Router();

/** GET /api/prediction?port=SAN_YSIDRO&laneType=standard */
router.get('/', async (req, res, next) => {
  try {
    const { port, laneType = 'standard' } = req.query;
    if (!port) return res.status(400).json({ error: 'port query param is required' });

    const [cbpData, communityData, holidayData] = await Promise.all([
      new BorderScanDataAgent().run({ port, laneType }),
      new CommunitySignalAgent().run({ port }),
      new HolidayContextAgent().run({ date: new Date().toISOString().split('T')[0] }),
    ]);

    const prediction = await new PredictionAgent().run({ port, laneType, cbpData, communityData, holidayData });
    res.json(prediction);
  } catch (err) {
    next(err);
  }
});

export default router;
