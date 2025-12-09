const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const projectObjectiveRoutes = require('./routes/projectObjectives');
const qualificationStepRoutes = require('./routes/qualificationSteps');
const uploadRoutes = require('./routes/upload');
const parseRoutes = require('./routes/parse');
const salesforceRoutes = require('./routes/salesforce');
const draftsRoutes = require('./routes/drafts');
const historyRoutes = require('./routes/history');
const clientToolAccountRoutes = require('./routes/clientToolAccount');
const clientToolAccountAnalyticsRoutes = require('./routes/clientToolAccountAnalytics');
const queueStatusManagementRoutes = require('./routes/queueStatusManagement');
const workStreamRoutes = require('./routes/workStream');
const workStreamReportingRoutes = require('./routes/workStreamReporting');
const workStreamAnalyticsRoutes = require('./routes/workStreamAnalytics');
const updateObjectFieldsRoutes = require('./routes/updateObjectFields');
const crowdDashboardRoutes = require('./routes/crowdDashboard');
const caseAnalyticsRoutes = require('./routes/caseAnalytics');
const contributorPaymentsRoutes = require('./routes/contributorPayments');
const auditLogsRoutes = require('./routes/auditLogs');
const scheduledReportsRoutes = require('./routes/scheduledReports');
const reportsRoutes = require('./routes/reports');
const authRolesRoutes = require('./routes/authRoles');
const authPermissionsRoutes = require('./routes/authPermissions');
const cloneRoutes = require('./routes/clone');
const caseManagementRoutes = require('./routes/caseManagement');
const mfaVerificationLogsRoutes = require('./routes/mfaVerificationLogs');
const projectRosterFunnelRoutes = require('./routes/projectRosterFunnel');
const activeContributorsByProjectRoutes = require('./routes/activeContributorsByProject');
const activeContributorsByQualStepRoutes = require('./routes/activeContributorsByQualStep');
const projectPerformanceRoutes = require('./routes/projectPerformance');
const onboardingContributorsRoutes = require('./routes/onboardingContributors');
const contributorTimeStatusRoutes = require('./routes/contributorTimeStatus');
const contributorMatchMatrixRoutes = require('./routes/contributorMatchMatrix');
const poPayRatesRoutes = require('./routes/poPayRates');
const poProductivityTargetsRoutes = require('./routes/poProductivityTargets');
const paymentAdjustmentsRoutes = require('./routes/paymentAdjustments');
const welcomeRoutes = require('./routes/welcome');
const pmApprovalsRoutes = require('./routes/pmApprovals');
const userPreferencesRoutes = require('./routes/userPreferences');

// Queue Status Scheduler Service
const { startScheduler } = require('./services/queueStatusScheduler');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware - configure before CORS
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false // Disable CSP for development to avoid CORS issues
}));
app.use(compression());

// Trust proxy for rate limiting (set before rate limiter)
app.set('trust proxy', 1); // Trust first proxy

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip rate limiting for localhost in development
  skip: (req) => {
    if (process.env.NODE_ENV !== 'production') {
      const ip = req.ip || req.connection.remoteAddress;
      return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
    }
    return false;
  }
});
app.use('/api/', limiter);

// Handle preflight OPTIONS requests - must be before CORS middleware
// This handles CORS preflight for direct requests (bypassing proxy)
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  
  // In development, allow all localhost origins
  if (process.env.NODE_ENV !== 'production') {
    if (!origin || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      // Use exact origin
      res.setHeader('Access-Control-Allow-Origin', origin || 'http://localhost:3000');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
      res.setHeader('Access-Control-Max-Age', '86400');
      // Don't set Access-Control-Allow-Credentials since credentials: false
      return res.status(204).end();
    }
  }
  
  // Production: use configured origins
  const allowedOrigins = process.env.CLIENT_URL 
    ? process.env.CLIENT_URL.split(',')
    : ['http://localhost:3000'];
  
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Max-Age', '86400');
    // Don't set Access-Control-Allow-Credentials since credentials: false
    return res.status(204).end();
  }
  
  // Default: still send CORS headers even if origin doesn't match (for development)
  if (process.env.NODE_ENV !== 'production') {
    res.setHeader('Access-Control-Allow-Origin', origin || 'http://localhost:3000');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Max-Age', '86400');
    // Don't set Access-Control-Allow-Credentials since credentials: false
  }
  
  return res.status(204).end();
});

// CORS configuration - simplified for better compatibility
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // In development, allow localhost on any port
    if (process.env.NODE_ENV !== 'production') {
      if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        return callback(null, true);
      }
    }
    
    // In production, use the configured CLIENT_URL
    const allowedOrigins = process.env.CLIENT_URL 
      ? process.env.CLIENT_URL.split(',')
      : ['http://localhost:3000'];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // In development, still allow even if not in list (for flexibility)
      if (process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    }
  },
  // Explicitly set credentials to false to avoid CORS issues
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Cookie parser (needed for CSRF protection)
app.use(cookieParser(process.env.JWT_SECRET || 'your-secret-key'));

// Session configuration for CSRF protection
// Note: Sessions are optional - CSRF works with JWT user IDs as well
app.use(session({
  secret: process.env.JWT_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false, // Don't create session until needed
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevent XSS attacks
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict' // CSRF protection
  }
}));

// Request logging middleware for bulk-import debugging - MUST be before body parsing
app.use((req, res, next) => {
  if (req.url && req.url.includes('bulk-import')) {
    const startTime = Date.now();
    console.log('[Server] ===== BULK IMPORT REQUEST RECEIVED =====');
    console.log('[Server] Request details:', {
      method: req.method,
      url: req.url,
      timestamp: new Date().toISOString(),
      contentType: req.headers['content-type'],
      contentLength: req.headers['content-length'],
      hasBody: !!req.body
    });
    
    // CRITICAL: Set timeouts IMMEDIATELY before body parsing
    const timeoutMs = 600000; // 10 minutes
    req.setTimeout(timeoutMs);
    res.setTimeout(timeoutMs);
    
    if (req.socket) {
      req.socket.setTimeout(timeoutMs);
      req.socket.setKeepAlive(true);
    }
    if (res.socket) {
      res.socket.setTimeout(timeoutMs);
      res.socket.setKeepAlive(true);
    }
    
    // Send immediate acknowledgment headers to keep connection alive
    res.setHeader('X-Request-Received', new Date().toISOString());
    res.setHeader('Connection', 'keep-alive');
    
    // Log when body data starts arriving
    let bytesReceived = 0;
    req.on('data', (chunk) => {
      bytesReceived += chunk.length;
      if (bytesReceived % 100000 === 0 || bytesReceived < 100000) {
        console.log('[Server] Bulk import body data received:', bytesReceived, 'bytes, time elapsed:', Date.now() - startTime, 'ms');
      }
    });
    
    req.on('end', () => {
      console.log('[Server] Bulk import body fully received:', bytesReceived, 'bytes, total time:', Date.now() - startTime, 'ms');
    });
  }
  next();
});

// Increase body size limit for large project data and bulk imports (50MB)
// Set timeout for body parsing
app.use(express.json({ 
  limit: '50mb',
  verify: (req, res, buf, encoding) => {
    if (req.url && req.url.includes('bulk-import')) {
      console.log('[Server] Body parsing started for bulk import, buffer size:', buf.length);
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Log after body parsing for bulk-import
app.use((req, res, next) => {
  if (req.url && req.url.includes('bulk-import')) {
    console.log('[Server] Body parsed for bulk import at', new Date().toISOString(), 'Body size:', req.body ? JSON.stringify(req.body).length : 0);
  }
  next();
});

// Health check - register FIRST to ensure it's always available
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    routes: {
      auth: '/api/auth',
      projects: '/api/projects',
      health: '/api/health'
    }
  });
});

// Import security middleware
const { sanitizeInput, sanitizeSearchInput } = require('./middleware/inputSanitization');
const { getCsrfToken, validateCsrf } = require('./middleware/csrf');

// CSRF token endpoint (must be before other routes)
app.get('/api/csrf-token', getCsrfToken);

// Apply input sanitization to all API routes (except auth which handles its own)
app.use('/api/', sanitizeInput);

// Apply search-specific sanitization to routes that need it
app.use('/api/', sanitizeSearchInput);

// Routes - register in order of priority
// Auth routes first (most critical) - CSRF validation skipped for auth
app.use('/api/auth', authRoutes);
// Apply CSRF protection to all state-changing routes
// Apply CSRF protection to all state-changing routes
app.use('/api/projects', validateCsrf, projectRoutes);
app.use('/api/project-objectives', validateCsrf, projectObjectiveRoutes);
app.use('/api/qualification-steps', validateCsrf, qualificationStepRoutes);
app.use('/api/upload', validateCsrf, uploadRoutes);
app.use('/api/parse', validateCsrf, parseRoutes);
app.use('/api/salesforce', validateCsrf, salesforceRoutes);
app.use('/api/drafts', validateCsrf, draftsRoutes);
app.use('/api/history', validateCsrf, historyRoutes);
app.use('/api/client-tool-account', validateCsrf, clientToolAccountRoutes);
app.use('/api/client-tool-account/analytics', validateCsrf, clientToolAccountAnalyticsRoutes);
app.use('/api/queue-status-management', validateCsrf, queueStatusManagementRoutes);
app.use('/api/workstream', validateCsrf, workStreamRoutes);
app.use('/api/workstream-reporting', validateCsrf, workStreamReportingRoutes);
app.use('/api/workstream-analytics', validateCsrf, workStreamAnalyticsRoutes);
app.use('/api/update-object-fields', validateCsrf, updateObjectFieldsRoutes);
app.use('/api/crowd-dashboard', validateCsrf, crowdDashboardRoutes);
app.use('/api/case-analytics', validateCsrf, caseAnalyticsRoutes);
app.use('/api/contributor-payments', validateCsrf, contributorPaymentsRoutes);
app.use('/api/audit-logs', validateCsrf, auditLogsRoutes);
app.use('/api/scheduled-reports', validateCsrf, scheduledReportsRoutes);
app.use('/api/reports', validateCsrf, reportsRoutes);
app.use('/api/auth/roles', validateCsrf, authRolesRoutes);
app.use('/api/auth/permissions', validateCsrf, authPermissionsRoutes);
app.use('/api/clone', validateCsrf, cloneRoutes);
app.use('/api/case-management', validateCsrf, caseManagementRoutes);
app.use('/api/mfa-verification-logs', validateCsrf, mfaVerificationLogsRoutes);
app.use('/api/project-roster-funnel', validateCsrf, projectRosterFunnelRoutes);
app.use('/api/active-contributors-by-project', validateCsrf, activeContributorsByProjectRoutes);
app.use('/api/active-contributors-by-qual-step', validateCsrf, activeContributorsByQualStepRoutes);
app.use('/api/project-performance', validateCsrf, projectPerformanceRoutes);
app.use('/api/onboarding-contributors', validateCsrf, onboardingContributorsRoutes);
app.use('/api/contributor-time-status', validateCsrf, contributorTimeStatusRoutes);
app.use('/api/contributor-match-matrix', validateCsrf, contributorMatchMatrixRoutes);
app.use('/api/po-pay-rates', validateCsrf, poPayRatesRoutes);
app.use('/api/po-productivity-targets', validateCsrf, poProductivityTargetsRoutes);
app.use('/api/payment-adjustments', validateCsrf, paymentAdjustmentsRoutes);
app.use('/api/welcome', welcomeRoutes); // No CSRF for GET requests
app.use('/api/pm-approvals', validateCsrf, pmApprovalsRoutes);
app.use('/api/user', userPreferencesRoutes); // User preferences (GPC-Filter) - GET doesn't need CSRF, POST does

// Routes registered

// Helper function to set CORS headers (reusable)
const setCorsHeaders = (req, res) => {
  const origin = req.headers.origin;
  const defaultOrigin = process.env.NODE_ENV !== 'production' ? 'http://localhost:3000' : null;
  
  // In development, allow all localhost origins
  if (process.env.NODE_ENV !== 'production') {
    if (!origin || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      res.setHeader('Access-Control-Allow-Origin', origin || defaultOrigin);
      return;
    }
  }
  
  // Production: use configured origins
  const allowedOrigins = process.env.CLIENT_URL 
    ? process.env.CLIENT_URL.split(',')
    : ['http://localhost:3000'];
  
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (process.env.NODE_ENV !== 'production') {
    // In development, still allow even if not in list
    res.setHeader('Access-Control-Allow-Origin', origin || defaultOrigin);
  }
};

// Global error handler - MUST be after all routes
app.use((err, req, res, next) => {
  
  // Set CORS headers before sending error response
  setCorsHeaders(req, res);
  
  // Don't send error details in production
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  // Only send response if headers haven't been sent
  if (!res.headersSent) {
    res.status(err.status || 500).json({
      error: err.message || 'Internal server error',
      details: isDevelopment ? err.stack : undefined,
      message: 'An error occurred while processing your request'
    });
  } else {
    console.error('Response already sent, cannot send error response');
  }
});

// 404 handler - MUST be last, after all routes
app.use((req, res) => {
  // Set CORS headers before sending 404 response
  setCorsHeaders(req, res);
  
  // 404 - Route not found
  res.status(404).json({ 
    error: 'Route not found',
    message: `The requested route ${req.method} ${req.path} was not found on the server`,
    path: req.path,
    method: req.method
  });
});

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  // Don't exit - let the server continue running
});

process.on('unhandledRejection', (reason, promise) => {
  // Don't exit - let the server continue running
});

const server = app.listen(PORT, () => {
  console.log(`✅ Backend server is running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
  
  // Start the automatic scheduler for queue status rules
  try {
    startScheduler(15); // Run every 15 minutes
    console.log('✅ Queue Status Scheduler started (runs every 15 minutes)');
  } catch (error) {
    console.error('❌ Failed to start Queue Status Scheduler:', error);
  }
});

// Increase server timeout for long-running requests (10 minutes for large dataset queries)
server.timeout = 600000; // 10 minutes
server.keepAliveTimeout = 600000; // 10 minutes
server.headersTimeout = 600000; // 10 minutes
server.headersTimeout = 601000; // 10 minutes + 1 second

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please stop the process using this port.`);
  } else {
    console.error('❌ Server error:', error);
  }
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

