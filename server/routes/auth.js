const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { ROLES } = require('../utils/roles');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const router = express.Router();

// Async error wrapper - catches errors from async route handlers
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Get users file path
const getUsersPath = () => {
  const dataDir = path.join(__dirname, '../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, 'users.json');
};

// Get password reset tokens file path
const getResetTokensPath = () => {
  const dataDir = path.join(__dirname, '../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, 'resetTokens.json');
};

// Load users from file
const loadUsers = () => {
  try {
    const usersPath = getUsersPath();
    if (fs.existsSync(usersPath)) {
      const fileContent = fs.readFileSync(usersPath, 'utf8');
      return JSON.parse(fileContent);
    }
  } catch (error) {
    console.error('Error loading users from file:', error);
  }
  // Return default admin user if file doesn't exist
  return [
    {
      id: 1,
      email: 'admin@example.com',
      password: '$2a$10$h/pvhkveM/vNMpGoWvl1K.HS.NE2x12D3gY3ln2Kq1DQxRbvMHeYq', // password: admin123
      role: ROLES.ADMIN,
      permissions: ['all'],
      createdAt: new Date().toISOString(),
      isActive: true
    }
  ];
};

// Save users to file
const saveUsers = (usersArray) => {
  try {
    const usersPath = getUsersPath();
    fs.writeFileSync(usersPath, JSON.stringify(usersArray, null, 2), 'utf8');
    console.log(`Saved ${usersArray.length} users to persistent storage`);
  } catch (error) {
    console.error('Error saving users to file:', error);
    throw error;
  }
};

// Load reset tokens from file
const loadResetTokens = () => {
  try {
    const tokensPath = getResetTokensPath();
    if (fs.existsSync(tokensPath)) {
      const fileContent = fs.readFileSync(tokensPath, 'utf8');
      return JSON.parse(fileContent);
    }
  } catch (error) {
    console.error('Error loading reset tokens from file:', error);
  }
  return [];
};

// Save reset tokens to file
const saveResetTokens = (tokensArray) => {
  try {
    const tokensPath = getResetTokensPath();
    fs.writeFileSync(tokensPath, JSON.stringify(tokensArray, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving reset tokens to file:', error);
    throw error;
  }
};

// Initialize users array
let users = loadUsers();

// Initialize reset tokens array
let resetTokens = loadResetTokens();

// Clean up expired reset tokens periodically
setInterval(() => {
  const now = Date.now();
  resetTokens = resetTokens.filter(token => token.expiresAt > now);
  saveResetTokens(resetTokens);
}, 60 * 60 * 1000); // Run every hour

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

// Login endpoint
router.post('/login', asyncHandler(async (req, res) => {
  try {
    // Set CORS headers for all responses
    setCorsHeaders(req, res);
    
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Reload users from file to get latest data
    users = loadUsers();

    // Find user by email (case-insensitive)
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim() && u.isActive !== false);
    if (!user) {
      console.log('Login attempt failed: User not found for email:', email);
      setCorsHeaders(req, res);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password with bcrypt
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      console.log('Login attempt failed: Invalid password for email:', email);
      setCorsHeaders(req, res);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, permissions: user.permissions },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    console.log('Login successful for user:', user.email);
    // Ensure CORS headers are set on success response
    setCorsHeaders(req, res);
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        permissions: user.permissions
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    console.error('Error stack:', error.stack);
    
    if (res.headersSent) {
      console.error('Response already sent, cannot send error response');
      return;
    }
    
    throw error;
  }
}));

// Register endpoint (self-registration)
router.post('/register', asyncHandler(async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Reload users from file
    users = loadUsers();

    // Check if user already exists
    const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user (default role: 'user', default permissions: ['view_project'])
    const newUser = {
      id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      name: name || email.split('@')[0],
      role: 'user',
      permissions: ['view_project'],
      createdAt: new Date().toISOString(),
      isActive: true
    };

    users.push(newUser);
    saveUsers(users);

    console.log('User registered successfully:', newUser.email);
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
}));

// Forgot password endpoint
router.post('/forgot-password', asyncHandler(async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Reload users from file
    users = loadUsers();

    // Find user by email
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim() && u.isActive !== false);
    
    // Always return success message (security best practice - don't reveal if email exists)
    if (user) {
      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour from now

      // Reload reset tokens
      resetTokens = loadResetTokens();

      // Remove any existing tokens for this user
      resetTokens = resetTokens.filter(t => t.userId !== user.id);

      // Add new token
      resetTokens.push({
        userId: user.id,
        token: resetToken,
        expiresAt: expiresAt,
        createdAt: new Date().toISOString()
      });

      saveResetTokens(resetTokens);

      // In production, send email with reset link
      // For now, we'll return the token in the response (for testing)
      // In production, remove this and send email instead
      console.log(`Password reset token for ${user.email}: ${resetToken}`);
      
      res.json({
        message: 'If an account with that email exists, a password reset link has been sent.',
        // Remove this in production - only for testing
        resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
      });
    } else {
      // Still return success to prevent email enumeration
      res.json({
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    throw error;
  }
}));

// Reset password endpoint
router.post('/reset-password', asyncHandler(async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Reload reset tokens
    resetTokens = loadResetTokens();

    // Find valid token
    const tokenData = resetTokens.find(t => t.token === token && t.expiresAt > Date.now());
    if (!tokenData) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Reload users
    users = loadUsers();

    // Find user
    const user = users.find(u => u.id === tokenData.userId);
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    user.password = hashedPassword;
    user.updatedAt = new Date().toISOString();

    saveUsers(users);

    // Remove used token
    resetTokens = resetTokens.filter(t => t.token !== token);
    saveResetTokens(resetTokens);

    console.log('Password reset successful for user:', user.email);
    res.json({
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    throw error;
  }
}));

// Get all users (admin only)
router.get('/users', authenticate, requireRole(ROLES.ADMIN), asyncHandler(async (req, res) => {
  try {
    // Reload users
    users = loadUsers();

    // Return users without passwords
    const usersWithoutPasswords = users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      permissions: u.permissions,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      isActive: u.isActive
    }));

    res.json({
      success: true,
      users: usersWithoutPasswords
    });
  } catch (error) {
    console.error('Get users error:', error);
    throw error;
  }
}));

// Create user (admin only)
router.post('/users', authenticate, requireRole(ROLES.ADMIN), asyncHandler(async (req, res) => {
  try {
    const { email, password, name, role, permissions } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Reload users
    users = loadUsers();

    // Check if user already exists
    const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = {
      id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      name: name || email.split('@')[0],
      role: role || 'user',
      permissions: permissions || ['view_project'],
      createdAt: new Date().toISOString(),
      createdBy: req.user?.email,
      isActive: true
    };

    users.push(newUser);
    saveUsers(users);

    console.log('User created by admin:', newUser.email);
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        permissions: newUser.permissions
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    throw error;
  }
}));

// Update user (admin only)
router.put('/users/:id', authenticate, requireRole(ROLES.ADMIN), asyncHandler(async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { email, name, role, permissions, isActive, password } = req.body;

    // Reload users
    users = loadUsers();

    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[userIndex];

    // Update user fields
    if (email && email !== user.email) {
      // Check if new email already exists
      const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim() && u.id !== userId);
      if (existingUser) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }
      user.email = email.toLowerCase().trim();
    }

    if (name) user.name = name;
    if (role) user.role = role;
    if (permissions) user.permissions = permissions;
    if (typeof isActive === 'boolean') user.isActive = isActive;
    
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
      }
      user.password = await bcrypt.hash(password, 10);
    }

    user.updatedAt = new Date().toISOString();
    user.updatedBy = req.user?.email;

    saveUsers(users);

    console.log('User updated by admin:', user.email);
    res.json({
      success: true,
      message: 'User updated successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        permissions: user.permissions,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    throw error;
  }
}));

// Delete user (admin only)
router.delete('/users/:id', authenticate, requireRole(ROLES.ADMIN), asyncHandler(async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    // Prevent deleting yourself
    if (req.user?.id === userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Reload users
    users = loadUsers();

    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Soft delete - set isActive to false
    users[userIndex].isActive = false;
    users[userIndex].updatedAt = new Date().toISOString();
    users[userIndex].updatedBy = req.user?.email;

    saveUsers(users);

    console.log('User deactivated by admin:', users[userIndex].email);
    res.json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    throw error;
  }
}));

// Verify token endpoint
router.get('/verify', asyncHandler(async (req, res) => {
  try {
    // Set CORS headers for all responses
    setCorsHeaders(req, res);
    
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      setCorsHeaders(req, res);
      return res.json({ valid: false, error: 'No token provided' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      
      // Reload users to get latest data
      users = loadUsers();
      const user = users.find(u => u.id === decoded.id && u.isActive !== false);
      
      if (!user) {
        setCorsHeaders(req, res);
        return res.json({ valid: false, error: 'User not found or inactive' });
      }
      
      // Ensure CORS headers are set on success response
      setCorsHeaders(req, res);
      res.json({ 
        valid: true, 
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          permissions: user.permissions
        }
      });
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError.message);
      setCorsHeaders(req, res);
      res.json({ valid: false, error: 'Invalid token' });
    }
  } catch (error) {
    console.error('Error in verify endpoint:', error);
    console.error('Error stack:', error.stack);
    
    if (res.headersSent) {
      console.error('Response already sent, cannot send error response');
      return;
    }
    
    setCorsHeaders(req, res);
    res.json({ valid: false, error: 'Token verification failed' });
  }
}));

module.exports = router;
