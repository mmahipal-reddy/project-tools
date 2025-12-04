// Shared utilities for workStreamReporting routes

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const jsforce = require('jsforce');

/**
 * Get Salesforce settings path
 */
const getSettingsPath = () => {
  const dataDir = path.join(__dirname, '../../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, 'salesforce-settings.json');
};

/**
 * Get encryption key
 */
const getEncryptionKey = () => {
  if (process.env.ENCRYPTION_KEY) {
    const key = process.env.ENCRYPTION_KEY;
    if (key.length >= 64) {
      return Buffer.from(key.slice(0, 64), 'hex');
    }
    return crypto.createHash('sha256').update(key).digest();
  }
  return crypto.createHash('sha256').update('default-salesforce-encryption-key-change-in-production').digest();
};

const ENCRYPTION_KEY = getEncryptionKey();
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

/**
 * Decrypt credentials
 */
const decrypt = (text) => {
  if (!text) return '';
  try {
    const textParts = text.split(':');
    if (textParts.length !== 2) {
      return text;
    }
    const iv = Buffer.from(textParts[0], 'hex');
    const encryptedText = Buffer.from(textParts[1], 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    console.error('Decryption error:', error);
    return text;
  }
};

/**
 * Get Salesforce connection
 */
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
  await conn.login(username, fullPassword);

  return conn;
};

/**
 * Async error wrapper
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  getSettingsPath,
  decrypt,
  getSalesforceConnection,
  asyncHandler
};

