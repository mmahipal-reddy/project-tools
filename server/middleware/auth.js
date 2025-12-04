const jwt = require('jsonwebtoken');

// Helper function to set CORS headers
const setCorsHeaders = (req, res) => {
  const origin = req.headers.origin;
  
  // In development, allow all localhost origins
  if (process.env.NODE_ENV !== 'production') {
    if (!origin || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      // Use exact origin if provided, otherwise use default for development
      res.setHeader('Access-Control-Allow-Origin', origin || 'http://localhost:3000');
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
    res.setHeader('Access-Control-Allow-Origin', origin || 'http://localhost:3000');
  }
};

const authenticate = (req, res, next) => {
  // Log incoming requests for bulk-import to debug timeout issues
  if (req.url && req.url.includes('bulk-import')) {
    console.log('[Auth] Bulk import request received at', new Date().toISOString(), 'Method:', req.method, 'URL:', req.url);
  }
  
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!token) {
    console.error('Authentication failed: No token provided');
    console.error('Request headers:', {
      authorization: req.headers.authorization ? 'Present' : 'Missing',
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent']
    });
    // Set CORS headers before sending error response
    setCorsHeaders(req, res);
    return res.status(401).json({ 
      success: false,
      error: 'No token provided',
      message: 'Authentication required. Please log in again.'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    
    if (req.url && req.url.includes('bulk-import')) {
      console.log('[Auth] Authentication successful for bulk import at', new Date().toISOString());
    }
    
    next();
  } catch (error) {
    console.error('Authentication failed: Invalid token', {
      error: error.message,
      name: error.name,
      expiredAt: error.expiredAt
    });
    // Set CORS headers before sending error response
    setCorsHeaders(req, res);
    return res.status(401).json({ 
      success: false,
      error: 'Invalid token',
      message: error.name === 'TokenExpiredError' 
        ? 'Your session has expired. Please log in again.'
        : 'Invalid authentication token. Please log in again.'
    });
  }
};

const authorize = (...permissions) => {
  return (req, res, next) => {
    if (req.url && req.url.includes('bulk-import')) {
      console.log('[Auth] Authorization check for bulk import at', new Date().toISOString());
    }
    
    if (!req.user) {
      // Set CORS headers before sending error response
      setCorsHeaders(req, res);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.user.permissions.includes('all')) {
      if (req.url && req.url.includes('bulk-import')) {
        console.log('[Auth] Authorization successful (all permissions) for bulk import at', new Date().toISOString());
      }
      return next();
    }

    const hasPermission = permissions.some(permission => 
      req.user.permissions.includes(permission)
    );

    if (!hasPermission) {
      // Set CORS headers before sending error response
      setCorsHeaders(req, res);
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    if (req.url && req.url.includes('bulk-import')) {
      console.log('[Auth] Authorization successful for bulk import at', new Date().toISOString());
    }
    
    next();
  };
};

module.exports = { authenticate, authorize };




