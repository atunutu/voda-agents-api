// Basic Express app
const express = require('express');

const app = express();

// Middleware to parse JSON
app.use(express.json());

// Health check endpoint (for testing server availability)
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

module.exports = app;
