// Salesforce connection service

const jsforce = require('jsforce');
const fs = require('fs');
const { getSettingsPath } = require('../../utils/salesforce/dataStorage');
const { decrypt } = require('../../utils/salesforce/encryption');

/**
 * Normalize Salesforce URL for connection
 * @param {string} salesforceUrl - Raw Salesforce URL
 * @returns {string} Normalized URL
 */
const normalizeSalesforceUrl = (salesforceUrl) => {
  let normalizedUrl = String(salesforceUrl).trim();
  normalizedUrl = normalizedUrl.replace(/\/+$/, '');
  normalizedUrl = normalizedUrl.replace(/\/services\/.*$/i, '');
  return normalizedUrl;
};

/**
 * Get login URL for jsforce connection based on Salesforce URL
 * @param {string} salesforceUrl - Salesforce URL
 * @returns {string} Login URL for jsforce
 */
const getLoginUrlForConnection = (salesforceUrl) => {
  const normalizedUrl = normalizeSalesforceUrl(salesforceUrl);
  const urlLower = normalizedUrl.toLowerCase();
  
  if (urlLower.includes('lightning.force.com')) {
    if (urlLower.includes('.sandbox.') || urlLower.includes('--staging') || urlLower.includes('--dev')) {
      return 'https://test.salesforce.com';
    } else {
      return 'https://login.salesforce.com';
    }
  } else if (urlLower.includes('.my.salesforce.com')) {
    return 'https://login.salesforce.com';
  } else if (urlLower.includes('test.salesforce.com') || urlLower.includes('--staging') || urlLower.includes('--dev')) {
    return 'https://test.salesforce.com';
  }
  
  return 'https://login.salesforce.com';
};

/**
 * Load and decrypt Salesforce settings
 * @returns {Object} Decrypted Salesforce settings
 * @throws {Error} If settings are not configured or invalid
 */
const loadSalesforceSettings = () => {
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

  // Decrypt credentials
  const salesforceUrl = encryptedSettings.salesforceUrl || encryptedSettings.loginUrl || '';
  const username = decrypt(encryptedSettings.username || '');
  const password = decrypt(encryptedSettings.password || '');
  const securityToken = decrypt(encryptedSettings.securityToken || '');

  if (!salesforceUrl || !username || !password || !securityToken) {
    throw new Error('Salesforce credentials are incomplete. Please reconfigure your Salesforce settings.');
  }

  return {
    salesforceUrl,
    username,
    password,
    securityToken,
    domain: encryptedSettings.domain || ''
  };
};

/**
 * Create and authenticate Salesforce connection
 * @param {Object} settings - Optional settings (if not provided, loads from file)
 * @returns {Promise<jsforce.Connection>} Authenticated Salesforce connection
 */
const createSalesforceConnection = async (settings = null) => {
  const creds = settings || loadSalesforceSettings();
  
  const loginUrl = getLoginUrlForConnection(creds.salesforceUrl);
  
  // Create Salesforce connection
  const conn = new jsforce.Connection({
    loginUrl: loginUrl
  });

  // Login to Salesforce
  const fullPassword = creds.password + creds.securityToken;
  const userInfo = await conn.login(creds.username, fullPassword);
  console.log('Salesforce login successful, user ID:', userInfo.id);

  return conn;
};

/**
 * Test Salesforce connection with provided credentials
 * @param {Object} credentials - Connection credentials
 * @returns {Promise<Object>} Connection test result
 */
const testSalesforceConnection = async (credentials) => {
  const { salesforceUrl, username, password, securityToken } = credentials;

  // Normalize Salesforce URL
  let normalizedUrl = String(salesforceUrl).trim();
  normalizedUrl = normalizedUrl.replace(/\/+$/, '');
  normalizedUrl = normalizedUrl.replace(/\/services\/.*$/i, '');

  // Validate URL
  if (!normalizedUrl || !normalizedUrl.startsWith('https://')) {
    throw new Error(`Salesforce URL must start with https:// (e.g., https://login.salesforce.com or https://test.salesforce.com). Received: "${normalizedUrl}"`);
  }

  // Validate Salesforce domain
  const urlLower = normalizedUrl.toLowerCase();
  const hasSalesforceDomain = urlLower.includes('salesforce.com') ||
                             urlLower.includes('lightning.force.com') ||
                             urlLower.includes('force.com');

  if (!hasSalesforceDomain) {
    throw new Error(`Invalid Salesforce URL. URL must contain a Salesforce domain (salesforce.com, lightning.force.com, or force.com). Received: "${normalizedUrl}"`);
  }

  // Get login URL
  const loginUrl = getLoginUrlForConnection(normalizedUrl);

  // Create connection
  const conn = new jsforce.Connection({
    loginUrl: loginUrl
  });

  // Test login
  const fullPassword = password + securityToken;
  const userInfo = await conn.login(username, fullPassword);

  return {
    success: true,
    userId: userInfo.id,
    organizationId: userInfo.organizationId,
    url: conn.instanceUrl
  };
};

module.exports = {
  normalizeSalesforceUrl,
  getLoginUrlForConnection,
  loadSalesforceSettings,
  createSalesforceConnection,
  testSalesforceConnection
};

