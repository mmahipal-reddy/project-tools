import axios from 'axios';

// In development, use relative URL to go through proxy (avoids CORS)
// In production, use full URL from environment variable
const API_BASE_URL = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '/api' : '/api');

// Backend health check with retry logic
let backendHealthCheckPromise = null;
let lastHealthCheck = null;
const HEALTH_CHECK_CACHE_MS = 5000; // Cache health check for 5 seconds

const checkBackendHealthWithCache = async () => {
  const now = Date.now();
  
  // Return cached result if available and recent
  if (lastHealthCheck && (now - lastHealthCheck.timestamp) < HEALTH_CHECK_CACHE_MS) {
    return lastHealthCheck.isHealthy;
  }
  
  // If a health check is already in progress, wait for it
  if (backendHealthCheckPromise) {
    return backendHealthCheckPromise;
  }
  
  // Start new health check
  backendHealthCheckPromise = (async () => {
    try {
      const response = await axios.get('/health', {
        baseURL: API_BASE_URL,
        timeout: 3000,
        validateStatus: (status) => status === 200
      });
      lastHealthCheck = { isHealthy: true, timestamp: now };
      return true;
    } catch (error) {
      lastHealthCheck = { isHealthy: false, timestamp: now };
      return false;
    } finally {
      backendHealthCheckPromise = null;
    }
  })();
  
  return backendHealthCheckPromise;
};

// CSRF token management
let csrfToken = null;
let csrfTokenPromise = null;

const getCsrfToken = async () => {
  // Return cached token if available
  if (csrfToken) {
    return csrfToken;
  }
  
  // If a token fetch is already in progress, wait for it
  if (csrfTokenPromise) {
    return csrfTokenPromise;
  }
  
  // Fetch new CSRF token
  csrfTokenPromise = (async () => {
    try {
      const response = await axios.get('/csrf-token', {
        baseURL: API_BASE_URL,
        timeout: 5000
      });
      csrfToken = response.data.csrfToken;
      return csrfToken;
    } catch (error) {
      console.warn('Failed to fetch CSRF token:', error);
      // Return null if token fetch fails (will retry on next request)
      return null;
    } finally {
      csrfTokenPromise = null;
    }
  })();
  
  return csrfTokenPromise;
};

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Remove withCredentials to avoid CORS issues - server CORS is configured correctly
  // withCredentials: true,
  timeout: 120000, // 120 second timeout (increased for Salesforce API calls, especially KPIs)
});

// Request interceptor to add auth token and CSRF token
apiClient.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add CSRF token for state-changing requests (POST, PUT, DELETE, PATCH)
    // Skip CSRF for auth endpoints and GET requests
    if (!config.url?.includes('/auth/') && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(config.method?.toUpperCase())) {
      try {
        const csrf = await getCsrfToken();
        if (csrf) {
          config.headers['X-CSRF-Token'] = csrf;
        }
      } catch (error) {
        console.warn('Failed to get CSRF token for request:', error);
      }
    }
    
    // Always log request details in development for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('API Request:', {
        url: config.url,
        method: config.method,
        baseURL: config.baseURL,
        fullURL: `${config.baseURL}${config.url}`,
        hasToken: !!token,
        hasCsrfToken: !!config.headers['X-CSRF-Token'],
        tokenLength: token ? token.length : 0,
        headers: {
          'Content-Type': config.headers['Content-Type'],
          'Authorization': config.headers.Authorization ? 'Bearer ***' : 'None',
          'X-CSRF-Token': config.headers['X-CSRF-Token'] ? '***' : 'None',
          'Origin': window.location.origin
        },
        withCredentials: config.withCredentials
      });
    } else if (!token) {
      console.warn('API Request without token:', {
        url: config.url,
        method: config.method
      });
    }
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Use the cached health check function
const checkBackendHealth = checkBackendHealthWithCache;

// Export health check function for use in other modules
export { checkBackendHealth };

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handle 504 Gateway Timeout errors
    if (error.response?.status === 504 || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      const url = error.config?.url || '';
      console.error('Backend connection error:', {
        status: error.response?.status,
        code: error.code,
        message: error.message,
        url: url
      });
      
      error.message = 'Backend server is not responding. Please ensure the server is running on port 5000.';
      error.isBackendDown = true;
      error.userMessage = 'Unable to connect to server. Please ensure the backend server is running on port 5000.';
    }
    
    // Handle 404 errors - check if backend is ready
    if (error.response?.status === 404) {
      const url = error.config?.url || '';
      const isAuthEndpoint = url.includes('/auth/');
      
      // For auth endpoints, check if backend is ready
      if (isAuthEndpoint) {
        const isHealthy = await checkBackendHealth();
        if (!isHealthy) {
          console.error('Backend is not responding. Please ensure the server is running on port 5000.');
          error.message = 'Backend server is not responding. Please ensure the server is running on port 5000.';
          error.isBackendDown = true;
        } else {
          console.error('404 on auth endpoint - route may not be registered:', url);
          error.message = `Route not found: ${url}. Please check that the backend server has restarted and routes are registered.`;
        }
      }
    }
    
    // Handle network errors (server not running, CORS blocked, etc.)
    if (!error.response) {
      const url = error.config?.url || '';
      const baseURL = error.config?.baseURL || API_BASE_URL;
      const fullURL = `${baseURL}${url}`;
      
      console.error('Network error - request did not reach server:', {
        url: url,
        fullURL: fullURL,
        baseURL: baseURL,
        message: error.message,
        code: error.code,
        name: error.name
      });
      
      // Check if it's a CORS error
      if (error.message && (
        error.message.includes('CORS') || 
        error.message.includes('Network Error') ||
        error.code === 'ERR_NETWORK' ||
        error.code === 'ERR_BLOCKED_BY_CLIENT'
      )) {
        console.error('CORS or network blocking detected. Check:');
        console.error('1. Server is running on port 5000');
        console.error('2. CORS is configured correctly on server');
        console.error('3. Browser is not blocking the request');
        console.error('4. Request URL:', fullURL);
      }
      
      const isAuthEndpoint = url.includes('/auth/');
      
      // For login/verify endpoints, provide helpful error message
      if (isAuthEndpoint && (url.includes('/login') || url.includes('/verify'))) {
        // Don't show error toast for network errors on login - let the component handle it
        // The error will be caught in the login function and shown there
      }
      
      return Promise.reject(error);
    }
    
    // Handle CSRF token errors - refresh token and retry
    if (error.response?.status === 403 && error.response?.data?.error?.includes('CSRF')) {
      // Clear cached CSRF token and retry once
      csrfToken = null;
      const originalRequest = error.config;
      
      // Only retry if we haven't already retried
      if (!originalRequest._retry) {
        originalRequest._retry = true;
        try {
          const newCsrfToken = await getCsrfToken();
          if (newCsrfToken && originalRequest.headers) {
            originalRequest.headers['X-CSRF-Token'] = newCsrfToken;
            return apiClient(originalRequest);
          }
        } catch (csrfError) {
          console.error('Failed to refresh CSRF token:', csrfError);
        }
      }
    }
    
    if (error.response?.status === 401) {
      // Check if this is a Salesforce endpoint error (invalid Salesforce credentials)
      // vs an auth endpoint error (invalid user token)
      const url = error.config?.url || '';
      const isSalesforceEndpoint = url.includes('/salesforce/');
      const isAuthEndpoint = url.includes('/auth/');
      
      // Only redirect to login if it's an auth endpoint error (user token invalid)
      // Salesforce 401 errors should not redirect - they're just invalid Salesforce credentials
      if (isAuthEndpoint && !isSalesforceEndpoint) {
        // Token expired or invalid - redirect to login
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
      // For Salesforce endpoints, just return the error without redirecting
    }
    return Promise.reject(error);
  }
);

export default apiClient;




