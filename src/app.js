// Basic Express app
const express = require('express');
const authRoutes = require('./routes/auth');
const agentRoutes = require('./routes/agents');

const dotenv = require('dotenv');
dotenv.config();

const app = express();

// Middleware to parse JSON
app.use(express.json());

// Health check endpoint (for testing server availability)
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Mount new routes under short prefixes
app.use('/auth', authRoutes);
app.use('/agents', agentRoutes);

module.exports = app;
