import { Router } from 'express';
import { getHolidayContext } from '../services/holidayService.js';

const router = Router();

/** GET /api/holiday-context?date=2025-07-04 */
router.get('/', async (req, res, next) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const country = req.query.country || 'both';
    const context = await getHolidayContext({ date, country });
    res.json(context);
  } catch (err) {
    next(err);
  }
});

export default router;
