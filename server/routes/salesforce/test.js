// Salesforce connection test route

const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth');
const asyncHandler = require('../../utils/salesforce/asyncHandler');
const { testSalesforceConnection } = require('../../services/salesforce/connectionService');

/**
 * Test Salesforce connection
 * POST /api/salesforce/test
 */
router.post('/test', authenticate, asyncHandler(async (req, res) => {
  const { salesforceUrl, username, password, securityToken, domain, loginUrl } = req.body;

  console.log('Test connection request received:', {
    salesforceUrl: salesforceUrl,
    loginUrl: loginUrl,
    domain: domain,
    hasUsername: !!username,
    hasPassword: !!password,
    hasSecurityToken: !!securityToken
  });

  // Support both new field name (salesforceUrl) and old field name (loginUrl) for backward compatibility
  const connectionUrl = salesforceUrl || loginUrl;
  
  console.log('Connection URL extracted:', connectionUrl);

  // Validate required fields
  if (!connectionUrl || !connectionUrl.trim()) {
    return res.status(400).json({ 
      success: false,
      message: 'Salesforce URL is required. Please provide your Salesforce URL.' 
    });
  }

  if (!username || username.trim() === '') {
    return res.status(400).json({ 
      success: false,
      message: 'Username is required' 
    });
  }

  if (!password || password.trim() === '') {
    return res.status(400).json({ 
      success: false,
      message: 'Password is required' 
    });
  }

  if (!securityToken || securityToken.trim() === '') {
    return res.status(400).json({ 
      success: false,
      message: 'Security token is required' 
    });
  }

  try {
    const result = await testSalesforceConnection({
      salesforceUrl: connectionUrl,
      username,
      password,
      securityToken
    });

    res.json({
      success: true,
      message: 'Connection successful',
      userId: result.userId,
      organizationId: result.organizationId,
      url: result.url
    });
  } catch (error) {
    console.error('Salesforce connection test error:', error);
    
    let errorMessage = 'Connection failed';
    if (error.message) {
      if (error.message.includes('INVALID_LOGIN') || error.message.includes('authentication failure')) {
        errorMessage = 'Invalid username, password, or security token. Please check your credentials.';
      } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        errorMessage = 'Authentication failed. Please verify your username, password, and security token.';
      } else if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
        errorMessage = 'Unable to resolve the Salesforce URL. Please check that the URL is correct and accessible.';
      } else {
        errorMessage = error.message;
      }
    }
    
    res.status(400).json({
      success: false,
      message: errorMessage
    });
  }
}));

module.exports = router;

