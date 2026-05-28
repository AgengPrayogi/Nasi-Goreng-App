const express = require('express');
const cors = require('cors');

const apiRoutes = require('./routes');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const app = express();

const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

function corsOrigin(origin, callback) {
  if (!origin) {
    return callback(null, true);
  }
  if (allowedOrigins.length === 0 && process.env.NODE_ENV !== 'production') {
    return callback(null, true);
  }
  if (allowedOrigins.includes(origin)) {
    return callback(null, true);
  }
  return callback(null, false);
}

app.use(
  cors({
    origin: corsOrigin,
    credentials: true
  })
);

// Core middlewares
app.use(express.json({ limit: '1mb' }));

// Routes
app.use('/api', apiRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;

