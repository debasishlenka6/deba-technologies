require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const rateLimit = require('express-rate-limit');
const db      = require('./db/connection');

const ordersRouter  = require('./routes/orders');
const contactRouter = require('./routes/contact');
const servicesRouter = require('./routes/services');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── SECURITY MIDDLEWARE ──────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:8080','http://localhost:5500','http://127.0.0.1:5500'],
  methods: ['GET','POST'],
  allowedHeaders: ['Content-Type'],
}));

app.use(express.json({ limit: '10kb' }));

// ── RATE LIMITING ────────────────────────────────
const isTest = process.env.NODE_ENV === 'test';

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 10000 : 100,
  message: { error: 'Too many requests. Please try again in 15 minutes.' }
});

const orderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isTest ? 10000 : 5,
  message: { error: 'Too many order requests. Please try again later.' }
});

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isTest ? 10000 : 10,
  message: { error: 'Too many messages. Please try again later.' }
});

// ── ROUTES ───────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({
      status: 'healthy',
      service: 'Deba Technologies API',
      version: '1.0.0',
      database: 'connected',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString()
    });
  } catch {
    res.status(503).json({ status: 'unhealthy', database: 'disconnected' });
  }
});

app.use('/api/services', servicesRouter);
app.use('/api/orders',   orderLimiter,   ordersRouter);
app.use('/api/contact',  contactLimiter, contactRouter);

// GET /api/currency — proxy to Frankfurter (avoids browser CORS)
app.get('/api/currency', async (req, res) => {
  const { amount = 80, from = 'INR', to = 'USD,EUR,GBP,AED,SGD,AUD,CAD,JPY' } = req.query;
  try {
    const response = await fetch(
      `https://api.frankfurter.app/latest?amount=${amount}&from=${from}&to=${to}`
    );
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(503).json({ error: 'Currency service unavailable' });
  }
});

// ── 404 ───────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── ERROR HANDLER ─────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ── START ─────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n✅ Deba Technologies API running on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/health`);
    console.log(`   Orders: http://localhost:${PORT}/api/orders`);
  });
}

module.exports = app;
