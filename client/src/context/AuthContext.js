import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import apiClient, { checkBackendHealth } from '../config/api';
import toast from 'react-hot-toast';
import { ROLES, PERMISSIONS, hasPermission as checkPermission, canAccessRoute, canAccessFeature } from '../utils/rbac';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem('token');
    } catch (error) {
      console.error('Error accessing localStorage:', error);
      return null;
    }
  });
  // Initialize loading to false if no token, true if token exists (needs verification)
  const [loading, setLoading] = useState(() => !!token);

  useEffect(() => {
    let isMounted = true;
    
    if (token) {
      verifyToken();
    } else {
      // No token - set loading to false immediately
      setLoading(false);
    }
    
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const verifyToken = async () => {
    try {
      const response = await apiClient.get('/auth/verify');
      
      if (response.data && response.data.valid) {
        setUser(response.data.user);
      } else {
        // Invalid token - clear it silently
        setToken(null);
        setUser(null);
        try {
          localStorage.removeItem('token');
        } catch (e) {
          console.error('Error removing token:', e);
        }
      }
    } catch (error) {
      // Verification failed - clear token silently
      // Don't log network errors as they're expected if server is down
      if (error.response && error.response.status !== 401) {
        console.error('Token verification error:', error);
      }
      setToken(null);
      setUser(null);
      try {
        localStorage.removeItem('token');
      } catch (e) {
        console.error('Error removing token:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      // Check backend health before making login request
      const isHealthy = await checkBackendHealth();
      if (!isHealthy) {
        toast.error('Backend server is not responding. Please ensure the server is running on port 5000.');
        return false;
      }
      
      const response = await apiClient.post('/auth/login', { email, password });
      const { token: newToken, user: userData } = response.data;
      
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('token', newToken);
      
      toast.success('Login successful!');
      return true;
    } catch (error) {
      // Handle timeout errors
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        const errorMessage = 'Request timed out. The backend server may not be responding. Please ensure the server is running on port 5000.';
        toast.error(errorMessage);
        console.error('Login timeout error:', {
          code: error.code,
          message: error.message,
          timeout: error.config?.timeout
        });
        return false;
      }
      
      // Handle 504 Gateway Timeout
      if (error.response?.status === 504 || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        const errorMessage = 'Backend server is not responding. Please ensure the server is running on port 5000.';
        toast.error(errorMessage);
        console.error('Login backend connection error:', {
          status: error.response?.status,
          code: error.code,
          message: error.message
        });
        return false;
      }
      
      // Handle network errors (server not running, CORS blocked, etc.)
      if (!error.response) {
        const errorMessage = error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')
          ? 'Cannot connect to server. Please ensure the server is running on port 5000.'
          : error.message || 'Network error occurred';
        toast.error(errorMessage);
        console.error('Login network error:', {
          message: error.message,
          code: error.code,
          config: error.config
        });
      } else {
        // Server responded with an error
        toast.error(error.response?.data?.error || error.response?.data?.message || 'Login failed');
      }
      return false;
    }
  };

  const logout = (showToast = true) => {
    setToken(null);
    setUser(null);
    try {
      localStorage.removeItem('token');
      if (showToast) {
        toast.success('Logged out successfully');
      }
    } catch (error) {
      console.error('Error removing token from localStorage:', error);
    }
  };

  const hasPermission = (permission) => {
    if (!user) return false;
    if (!user.permissions || !Array.isArray(user.permissions)) return false;
    if (user.permissions.includes('all')) return true;
    return user.permissions.includes(permission);
  };

  // Role-based permission check
  const hasRolePermission = (permission) => {
    if (!user || !user.role) return false;
    return checkPermission(user.role, permission);
  };

  // Check if user can access a route
  const canAccess = (route) => {
    if (!user || !user.role) return false;
    return canAccessRoute(user.role, route);
  };

  // Check if user can access a feature
  const canAccessFeatureByRole = (feature) => {
    if (!user || !user.role) return false;
    return canAccessFeature(user.role, feature);
  };

  // Check if user has a specific role
  const hasRole = (role) => {
    return user?.role === role;
  };

  // Check if user is admin
  const isAdmin = () => {
    return user?.role === ROLES.ADMIN;
  };

  const value = {
    user,
    token,
    login,
    logout,
    hasPermission,
    hasRolePermission,
    canAccess,
    canAccessFeature: canAccessFeatureByRole,
    hasRole,
    isAdmin,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};




