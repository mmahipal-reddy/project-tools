// Salesforce settings routes

const express = require('express');
const fs = require('fs');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth');
const { getSettingsPath } = require('../../utils/salesforce/dataStorage');
const { encrypt, decrypt } = require('../../utils/salesforce/encryption');

/**
 * Save Salesforce settings
 * POST /api/salesforce/settings
 */
router.post('/settings', authenticate, authorize('all'), (req, res) => {
  try {
    const { salesforceUrl, username, password, securityToken, domain, loginUrl } = req.body;

    // Support both new field name (salesforceUrl) and old field name (loginUrl) for backward compatibility
    const url = salesforceUrl || loginUrl;

    if (!url || !url.trim()) {
      return res.status(400).json({ error: 'Salesforce URL is required' });
    }

    if (!username || !password || !securityToken) {
      return res.status(400).json({ error: 'Username, password, and security token are required' });
    }

    // Auto-detect domain from URL if not provided
    let detectedDomain = domain;
    if (!detectedDomain) {
      const urlLower = url.toLowerCase();
      if (urlLower.includes('test.salesforce.com')) {
        detectedDomain = 'test';
      } else if (urlLower.includes('login.salesforce.com')) {
        detectedDomain = 'login';
      } else {
        detectedDomain = 'custom';
      }
    }

    // Encrypt sensitive data
    const encryptedSettings = {
      salesforceUrl: url,
      username: encrypt(username),
      password: encrypt(password),
      securityToken: encrypt(securityToken),
      domain: detectedDomain,
      loginUrl: url, // Keep for backward compatibility
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.email
    };

    // Save to file
    const settingsPath = getSettingsPath();
    fs.writeFileSync(settingsPath, JSON.stringify(encryptedSettings, null, 2));

    res.json({ 
      message: 'Settings saved successfully',
      settings: {
        salesforceUrl: url,
        domain: detectedDomain
      }
    });
  } catch (error) {
    console.error('Error saving Salesforce settings:', error);
    res.status(500).json({ error: 'Error saving settings' });
  }
});

/**
 * Get Salesforce settings
 * GET /api/salesforce/settings
 */
router.get('/settings', authenticate, (req, res) => {
  try {
    const settingsPath = getSettingsPath();
    
    if (!fs.existsSync(settingsPath)) {
      return res.status(200).json({
        salesforceUrl: '',
        username: '',
        password: '',
        securityToken: '',
        domain: '',
        loginUrl: ''
      });
    }

    let encryptedSettings;
    try {
      encryptedSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    } catch (parseError) {
      console.error('Error parsing settings file:', parseError);
      return res.status(200).json({
        salesforceUrl: '',
        username: '',
        password: '',
        securityToken: '',
        domain: '',
        loginUrl: ''
      });
    }

    // Decrypt sensitive data
    const decryptedSettings = {
      salesforceUrl: encryptedSettings.salesforceUrl || encryptedSettings.loginUrl || '',
      username: decrypt(encryptedSettings.username || ''),
      password: decrypt(encryptedSettings.password || ''),
      securityToken: decrypt(encryptedSettings.securityToken || ''),
      domain: encryptedSettings.domain || '',
      loginUrl: encryptedSettings.salesforceUrl || encryptedSettings.loginUrl || ''
    };

    res.status(200).json(decryptedSettings);
  } catch (error) {
    console.error('Error reading Salesforce settings:', error);
    res.status(200).json({
      salesforceUrl: '',
      username: '',
      password: '',
      securityToken: '',
      domain: '',
      loginUrl: ''
    });
  }
});

module.exports = router;

