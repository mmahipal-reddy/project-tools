// Shared utilities for crowd dashboard routes

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const jsforce = require('jsforce');

/**
 * Log metrics to both console and file
 */
const logMetrics = (message, data = null) => {
  const logMessage = `[${new Date().toISOString()}] ${message}${data ? '\n' + JSON.stringify(data, null, 2) : ''}`;
  console.log(logMessage);
  const logPath = path.join(__dirname, '../../../metrics-debug.log');
  try {
    fs.appendFileSync(logPath, logMessage + '\n', 'utf8');
  } catch (err) {
    // Ignore file write errors
  }
};

/**
 * Get settings path
 */
const getSettingsPath = () => {
  const dataDir = path.join(__dirname, '../../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, 'salesforce-settings.json');
};

/**
 * Decrypt credentials
 */
const decrypt = (text) => {
  if (!text) return '';
  try {
    const textParts = text.split(':');
    if (textParts.length !== 2) return text;
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
  } else if (urlLower.includes('test.salesforce.com') || urlLower.includes('--staging') || urlLower.includes('--dev')) {
    loginUrlForConnection = 'https://test.salesforce.com';
  } else {
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
 * Discover Contact and Project fields in Contributor_Project__c
 */
const discoverContactProjectFields = async (conn) => {
  try {
    // Discover Contact field in Contributor_Project__c
    let contactFieldName = 'Contributor__c'; // Default
    let contactRelationshipName = null;
    let projectFieldName = 'Project__c'; // Default
    let projectRelationshipName = null; // The actual relationship name (e.g., 'Project__r', not 'Project__c__r')
    let projectNameField = 'Name'; // Default
    
    try {
      const cpDescribe = await conn.sobject('Contributor_Project__c').describe();
      
      // Find Contact reference field
      const contactField = cpDescribe.fields.find(f => 
        f.name === 'Contact__c' || 
        (f.name === 'Contributor__c' && f.referenceTo && f.referenceTo.includes('Contact'))
      );
      if (contactField) {
        contactFieldName = contactField.name;
        contactRelationshipName = contactField.relationshipName;
      } else {
        const anyContactField = cpDescribe.fields.find(f => 
          f.type === 'reference' && f.referenceTo && f.referenceTo.includes('Contact')
        );
        if (anyContactField) {
          contactFieldName = anyContactField.name;
          contactRelationshipName = anyContactField.relationshipName;
        }
      }
      
      // Find Project reference field
      const projectField = cpDescribe.fields.find(f => 
        f.name === 'Project__c' || 
        (f.type === 'reference' && f.referenceTo && f.referenceTo.some(ref => ref.includes('Project')))
      );
      if (projectField) {
        projectFieldName = projectField.name;
        projectRelationshipName = projectField.relationshipName; // This is the actual relationship name
      }
      
      // Try to get Project object name and Name field
      if (projectField && projectField.referenceTo && projectField.referenceTo.length > 0) {
        const projectObjectName = projectField.referenceTo[0];
        try {
          const projectDescribe = await conn.sobject(projectObjectName).describe();
          const nameField = projectDescribe.fields.find(f => f.name === 'Name' || f.nameField);
          if (nameField) {
            projectNameField = nameField.name;
          }
        } catch (err) {
          logMetrics(`Could not describe Project object, using default Name field`);
        }
      }
      
      logMetrics(`Discovered fields - Contact: ${contactFieldName} (relationship: ${contactRelationshipName}), Project: ${projectFieldName} (relationship: ${projectRelationshipName}), Project Name: ${projectNameField}`);
    } catch (describeErr) {
      logMetrics(`Could not describe Contributor_Project__c, using defaults: ${contactFieldName}, ${projectFieldName}`);
    }
    
    return { 
      contactFieldName, 
      contactRelationshipName: contactRelationshipName || (contactFieldName.replace('__c', '__r')),
      projectFieldName, 
      projectRelationshipName: projectRelationshipName || (projectFieldName.replace('__c', '__r')),
      projectNameField 
    };
  } catch (error) {
    logMetrics(`Error in discoverContactProjectFields: ${error.message}`);
    return { 
      contactFieldName: 'Contributor__c', 
      contactRelationshipName: 'Contributor__r',
      projectFieldName: 'Project__c', 
      projectRelationshipName: 'Project__r',
      projectNameField: 'Name' 
    };
  }
};

/**
 * Discover Country and Language fields on Contact object
 */
const discoverCountryLanguageFields = async (conn) => {
  try {
    const describe = await conn.sobject('Contact').describe();
    const fieldNames = describe.fields.map(f => f.name);
    
    // Discover country fields
    const countryField = fieldNames.find(f => f === 'MailingCountry') ||
      fieldNames.find(f => f === 'OtherCountry') ||
      fieldNames.find(f => f.toLowerCase().includes('country') && !f.toLowerCase().includes('code')) ||
      null;
    
    // Discover language fields
    const languageField = fieldNames.find(f => f === 'Primary_Language_Spoken__c') ||
      fieldNames.find(f => f === 'Verification_Language__c') ||
      fieldNames.find(f => f.toLowerCase().includes('language') && f.endsWith('__c')) ||
      fieldNames.find(f => f.toLowerCase().includes('language')) ||
      null;
    
    logMetrics(`Discovered fields - Country: ${countryField || 'MailingCountry'}, Language: ${languageField || 'Primary_Language_Spoken__c'}`);
    
    return {
      country: countryField || 'MailingCountry',
      language: languageField || 'Primary_Language_Spoken__c'
    };
  } catch (error) {
    logMetrics(`Error in discoverCountryLanguageFields: ${error.message}`);
    return {
      country: 'MailingCountry',
      language: 'Primary_Language_Spoken__c'
    };
  }
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
  logMetrics,
  getSettingsPath,
  decrypt,
  getSalesforceConnection,
  discoverContactProjectFields,
  discoverCountryLanguageFields,
  asyncHandler
};

