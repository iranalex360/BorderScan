import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import currentWaitsRouter from './app/routes/currentWaits.js';
import communityReportsRouter from './app/routes/communityReports.js';
import holidayContextRouter from './app/routes/holidayContext.js';
import predictionRouter from './app/routes/prediction.js';
import queueMapRouter from './app/routes/queueMap.js';
import recommendationRouter from './app/routes/recommendation.js';
import debugRouter from './app/routes/debug.js';
import predictionQualityRouter from './app/routes/predictionQuality.js';

const app = express();
const PORT = process.env.PORT || 3001;

// --- Middleware ---
app.use(cors({ origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : 'http://localhost:5173' }));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });
app.use('/api', limiter);

// --- Routes ---
app.use('/api/current-waits',     currentWaitsRouter);
app.use('/api/community-reports', communityReportsRouter);
app.use('/api/holiday-context',   holidayContextRouter);
app.use('/api/prediction',        predictionRouter);
app.use('/api/queue-map',         queueMapRouter);
app.use('/api/recommendation',    recommendationRouter);
app.use('/api/debug',             debugRouter);
app.use('/api/prediction-quality', predictionQualityRouter);

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// 404 handler
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// Error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🛂 BorderScan API running on http://localhost:${PORT}`);
});
