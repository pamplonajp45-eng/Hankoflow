const express = require('express');
const cors = require('cors');
require('dotenv').config();

const requestsRouter = require('./routes/requests');
const approvalsRouter = require('./routes/approvals');

const app = express();

function getAllowedOrigins() {
  const configured = [
    process.env.FRONTEND_URL,
    process.env.FRONTEND_URLS
  ]
    .filter(Boolean)
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean);

  return new Set([
    'http://localhost:5173',
    ...configured
  ]);
}

app.use(cors({
  origin(origin, callback) {
    if (!origin || getAllowedOrigins().has(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use('/api/requests', requestsRouter);
app.use('/api/approvals', approvalsRouter);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    service: 'Document Approval API'
  });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'An internal server error occurred.' });
});

module.exports = app;
