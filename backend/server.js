const express = require('express');
const cors = require('cors');
require('dotenv').config();

const requestsRouter = require('./routes/requests');
const approvalsRouter = require('./routes/approvals');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Parse JSON and form-urlencoded requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Register routes
app.use('/api/requests', requestsRouter);
app.use('/api/approvals', approvalsRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    service: 'Document Approval API'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'An internal server error occurred.' });
});

// Start listening
app.listen(PORT, () => {
  console.log(`Document Approval Server is running on port ${PORT}`);
  console.log(`Frontend CORS origin set to: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
});
