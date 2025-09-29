// Basic Express app
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');

const authRoutes = require('./routes/auth');
const agentRoutes = require('./routes/agents');
const customerRoutes = require('./routes/customers');

const dotenv = require('dotenv');
dotenv.config();

const app = express();
/** General hardening
 * - Helmet sets secure headers.
 * - Hide Express fingerprint.
 * - JSON only, small bodies to reduce DoS surface.
 * - Block HTTP parameter pollution (?a=1&a=2).
 */
app.disable('x-powered-by');
app.use(helmet({
  // Allow cross-origin embedding only if you need it; otherwise 'sameorigin'
  crossOriginResourcePolicy: { policy: 'same-origin' },
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  // Content-Security-Policy: not strictly useful for an API; skip to avoid breaking API tools
}));
app.use(hpp());

// Only accept JSON bodies (strict) and limit size
app.use(express.json({ limit: '100kb', strict: true }));

/** CORS: lock to allowlist via env (comma-separated), default deny-all except local dev. */
const raw = (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map(s => s.trim()).filter(Boolean);
const allowlist = new Set(raw);
app.use(cors({
  origin(origin, cb) {
    // Allow no-origin (curl/Postman) and explicit allowlist
    if (!origin || allowlist.has(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: false,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));

/** Global rate limit (disabled in tests) */
if (process.env.NODE_ENV !== 'test') {
  app.use(rateLimit({
    windowMs: 60 * 1000, // 1 min
    max: 100,            // 100 req/min per IP
    standardHeaders: true,
    legacyHeaders: false
  }));
}

// Health check endpoint (for testing server availability)
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

/** Tighter login rate limit (disabled in tests) */
const loginLimiter = (process.env.NODE_ENV === 'test') ? (req,res,next)=>next() : rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later.' }
});
app.use('/auth/login', loginLimiter);

// Routes
app.use('/auth', authRoutes);
app.use('/agents', agentRoutes);
app.use('/customers', customerRoutes);

/** Central error handler: returns opaque error in prod, helpful message in dev/test */
app.use((err, _req, res, _next) => {
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.error('SERVER ERROR:', err?.message, err?.stack);
    return res.status(500).json({ error: 'InternalError', message: err?.message });
  }
  return res.status(500).json({ error: 'InternalError' });
});

module.exports = app;
