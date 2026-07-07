import { Router } from 'express';
import db from '../models/db.js';

const router = Router();

router.get('/', (req, res, next) => {
  try {
    const profiles = db.prepare(`
      SELECT port, lane, average_error_minutes, median_absolute_error_minutes, sample_size, tendency, updated_at
      FROM prediction_calibration_profiles
      ORDER BY port ASC, lane ASC
    `).all();
    res.json(profiles);
  } catch (err) {
    next(err);
  }
});

export default router;
