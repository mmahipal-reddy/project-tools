/**
 * User Preferences API Routes
 * Handles CRUD operations for user preferences (GPC-Filter)
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { validateCsrf } = require('../middleware/csrf');
const { getUserPreferences, saveUserPreference } = require('../utils/userPreferences');
const { ENABLE_GPC_FILTER } = require('../config/featureFlags');
const asyncHandler = require('../utils/salesforce/asyncHandler');
const { getSettingsPath } = require('../utils/salesforce/dataStorage');
const jsforce = require('jsforce');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Helper function to decrypt credentials
const decrypt = (text) => {
  if (!text) return '';
  try {
    const textParts = text.split(':');
    if (textParts.length !== 2) return text; // Not encrypted, return as is
    const iv = Buffer.from(textParts[0], 'hex');
    const encryptedText = textParts[1];
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY 
      ? Buffer.from(process.env.ENCRYPTION_KEY.slice(0, 64), 'hex')
      : crypto.createHash('sha256').update('default-salesforce-encryption-key-change-in-production').digest();
    const ALGORITHM = 'aes-256-cbc';
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    return text; // Return original if decryption fails
  }
};

// Helper function to get Salesforce connection
const getSalesforceConnection = async () => {
  const settingsPath = getSettingsPath();
  if (!fs.existsSync(settingsPath)) {
    throw new Error('Salesforce settings not configured. Please configure Salesforce settings first.');
  }

  let encryptedSettings;
  try {
    encryptedSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  } catch (parseError) {
    console.error('Error parsing settings file:', parseError);
    throw new Error('Error reading Salesforce settings. Please reconfigure your Salesforce settings.');
  }

  const salesforceUrl = encryptedSettings.salesforceUrl || encryptedSettings.loginUrl || '';
  const username = decrypt(encryptedSettings.username || '');
  const password = decrypt(encryptedSettings.password || '');
  const securityToken = decrypt(encryptedSettings.securityToken || '');

  if (!salesforceUrl || !username || !password || !securityToken) {
    throw new Error('Salesforce credentials are incomplete. Please configure all required fields.');
  }

  // Normalize Salesforce URL
  let normalizedUrl = String(salesforceUrl).trim();
  normalizedUrl = normalizedUrl.replace(/\/+$/, '');
  normalizedUrl = normalizedUrl.replace(/\/services\/.*$/i, '');
  
  const urlLower = normalizedUrl.toLowerCase();
  let loginUrlForConnection = normalizedUrl;
  
  if (urlLower.includes('lightning.force.com')) {
    if (urlLower.includes('.sandbox.') || urlLower.includes('--staging') || urlLower.includes('--dev')) {
      loginUrlForConnection = 'https://test.salesforce.com';
    } else {
      loginUrlForConnection = 'https://login.salesforce.com';
    }
  } else if (urlLower.includes('.my.salesforce.com')) {
    loginUrlForConnection = 'https://login.salesforce.com';
  }

  const conn = new jsforce.Connection({
    loginUrl: loginUrlForConnection
  });

  const fullPassword = password + securityToken;
  const userInfo = await conn.login(username, fullPassword);
  console.log('Salesforce login successful for User Preferences, user ID:', userInfo.id);
  
  return conn;
};

/**
 * Get user preferences
 * GET /api/user/preferences
 */
router.get('/preferences', authenticate, asyncHandler(async (req, res) => {
  if (!ENABLE_GPC_FILTER) {
    return res.json({
      interestedAccounts: [],
      interestedProjects: []
    });
  }

  const userId = req.user.id;
  const preferences = getUserPreferences(userId);
  
  res.json({
    interestedAccounts: preferences?.interestedAccounts || [],
    interestedProjects: preferences?.interestedProjects || []
  });
}));

/**
 * Save user preferences
 * POST /api/user/preferences
 */
router.post('/preferences', authenticate, validateCsrf, asyncHandler(async (req, res) => {
  if (!ENABLE_GPC_FILTER) {
    return res.status(400).json({ error: 'GPC-Filter feature is disabled' });
  }

  const userId = req.user.id;
  const { interestedAccounts, interestedProjects } = req.body;

  // Validate input - expect array of objects { id, name }
  if (!Array.isArray(interestedAccounts) || !Array.isArray(interestedProjects)) {
    return res.status(400).json({ 
      error: 'interestedAccounts and interestedProjects must be arrays' 
    });
  }

  // Filter out invalid entries and ensure structure
  const validAccounts = interestedAccounts.filter(item => 
    item && typeof item.id === 'string' && item.id.trim().length > 0 && typeof item.name === 'string'
  );
  const validProjects = interestedProjects.filter(item => 
    item && typeof item.id === 'string' && item.id.trim().length > 0 && typeof item.name === 'string'
  );

  const success = saveUserPreference(userId, {
    interestedAccounts: validAccounts,
    interestedProjects: validProjects
  });

  if (!success) {
    return res.status(500).json({ error: 'Failed to save preferences' });
  }

  res.json({
    message: 'Preferences saved successfully',
    preferences: {
      interestedAccounts: validAccounts,
      interestedProjects: validProjects
    }
  });
}));

/**
 * Search accounts for selection
 * GET /api/user/preferences/accounts/search?q=searchTerm
 */
router.get('/preferences/accounts/search', authenticate, asyncHandler(async (req, res) => {
  if (!ENABLE_GPC_FILTER) {
    return res.json([]);
  }

  try {
    const searchTerm = (req.query.q || '').trim();
    const conn = await getSalesforceConnection();
    
    // Query Account object
    let query = `SELECT Id, Name FROM Account WHERE Name != null`;
    
    if (searchTerm) {
      query += ` AND Name LIKE '%${searchTerm.replace(/'/g, "\\'")}%'`;
    }
    
    query += ` ORDER BY Name LIMIT 100`;
    
    const result = await conn.query(query);
    
    const accounts = result.records.map(record => ({
      id: record.Id,
      name: record.Name
    }));
    
    res.json(accounts);
  } catch (error) {
    console.error('Error searching accounts:', error);
    // Return empty array on error (non-breaking)
    res.json([]);
  }
}));

/**
 * Search projects for selection
 * GET /api/user/preferences/projects/search?q=searchTerm
 */
router.get('/preferences/projects/search', authenticate, asyncHandler(async (req, res) => {
  if (!ENABLE_GPC_FILTER) {
    return res.json([]);
  }

  try {
    const searchTerm = (req.query.q || '').trim();
    const conn = await getSalesforceConnection();
    
    // Query Project__c object (adjust object name if different)
    let query = `SELECT Id, Name FROM Project__c WHERE Name != null`;
    
    if (searchTerm) {
      query += ` AND Name LIKE '%${searchTerm.replace(/'/g, "\\'")}%'`;
    }
    
    query += ` ORDER BY Name LIMIT 100`;
    
    const result = await conn.query(query);
    
    const projects = result.records.map(record => ({
      id: record.Id,
      name: record.Name
    }));
    
    res.json(projects);
  } catch (error) {
    console.error('Error searching projects:', error);
    // Return empty array on error (non-breaking)
    res.json([]);
  }
}));

module.exports = router;

