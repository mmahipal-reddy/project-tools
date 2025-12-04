/**
 * CSRF Protection Middleware
 * Protects against Cross-Site Request Forgery attacks
 */

const csrf = require('csrf');
const tokens = new csrf();

/**
 * CSRF token generation endpoint
 * GET /api/csrf-token
 */
const getCsrfToken = (req, res) => {
  // Use user ID from JWT token, session ID, or IP address as secret
  // This ensures tokens are user-specific
  let secret = 'default-secret';
  
  if (req.user?.id) {
    secret = `user-${req.user.id}`;
  } else if (req.session?.id) {
    secret = `session-${req.session.id}`;
  } else {
    // Fallback to IP address (less secure but works for anonymous requests)
    secret = `ip-${req.ip || req.connection.remoteAddress || 'unknown'}`;
  }
  
  const token = tokens.create(secret);
  
  // Store token in session if available
  if (req.session) {
    req.session.csrfToken = token;
    req.session.csrfSecret = secret;
  }
  
  res.json({
    success: true,
    csrfToken: token
  });
};

/**
 * CSRF validation middleware
 * Validates CSRF token for state-changing requests (POST, PUT, DELETE, PATCH)
 */
const validateCsrf = (req, res, next) => {
  // Skip CSRF validation for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // Skip CSRF validation for auth endpoints (they use JWT)
  if (req.path.startsWith('/api/auth/')) {
    return next();
  }
  
  // Get token from header (preferred) or body
  const token = req.headers['x-csrf-token'] || req.body?.csrfToken;
  
  if (!token) {
    return res.status(403).json({
      success: false,
      error: 'CSRF token missing',
      message: 'CSRF token is required for this request. Please refresh the page and try again.'
    });
  }
  
  // Determine secret based on user, session, or IP
  let secret = 'default-secret';
  
  if (req.user?.id) {
    secret = `user-${req.user.id}`;
  } else if (req.session?.csrfSecret) {
    secret = req.session.csrfSecret;
  } else if (req.session?.id) {
    secret = `session-${req.session.id}`;
  } else {
    secret = `ip-${req.ip || req.connection.remoteAddress || 'unknown'}`;
  }
  
  // Verify token
  if (!tokens.verify(secret, token)) {
    // Try alternative secrets if user is authenticated
    if (req.user?.id) {
      // Try with session-based secret as fallback
      const sessionSecret = req.session?.csrfSecret || `session-${req.session?.id || 'none'}`;
      if (!tokens.verify(sessionSecret, token)) {
        return res.status(403).json({
          success: false,
          error: 'Invalid CSRF token',
          message: 'Invalid CSRF token. Please refresh the page and try again.'
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        error: 'Invalid CSRF token',
        message: 'Invalid CSRF token. Please refresh the page and try again.'
      });
    }
  }
  
  next();
};

module.exports = {
  getCsrfToken,
  validateCsrf
};

