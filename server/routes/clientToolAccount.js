const express = require('express');
const jsforce = require('jsforce');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { sanitizeSearchTerm } = require('../utils/security');
const { logCreate, logUpdate, logBulkOperation } = require('../utils/historyLogger');

// Async error wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Helper function to get Salesforce settings path
const getSettingsPath = () => {
  const dataDir = path.join(__dirname, '../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, 'salesforce-settings.json');
};

// Helper function to decrypt credentials
const decrypt = (text) => {
  if (!text) return '';
  try {
    const textParts = text.split(':');
    if (textParts.length !== 2) return text; // Not encrypted, return as is
    const iv = Buffer.from(textParts[0], 'hex');
    const encryptedText = textParts[1];
    const crypto = require('crypto');
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY 
      ? Buffer.from(process.env.ENCRYPTION_KEY.slice(0, 64), 'hex')
      : crypto.createHash('sha256').update('default-salesforce-encryption-key-change-in-production').digest();
    const ALGORITHM = 'aes-256-cbc';
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
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

// Get Contributor Projects that require Client Tool Account mapping
router.get('/contributor-projects', authenticate, authorize('view_project', 'all'), asyncHandler(async (req, res) => {
  try {
    const conn = await getSalesforceConnection();

    // Get pagination parameters from query string
    const limit = parseInt(req.query.limit) || 1000; // Default to 1000 records
    const offset = parseInt(req.query.offset) || 0; // Default to 0 (start from beginning)
    
    // Get search parameter from query string
    const searchTerm = req.query.searchTerm || '';
    
    // Build WHERE clause conditions
    let whereConditions = [
      "Client_Tool_Account_Required__c = true",
      "Client_Tool_Account_Used__c = null"
    ];
    
    // Add search term filter (searches in Name and Project__r.Name)
    if (searchTerm && searchTerm.trim() !== '') {
      const sanitizedSearch = searchTerm.trim().replace(/'/g, "\\'");
      whereConditions.push(`(Name LIKE '%${sanitizedSearch}%' OR Project__r.Name LIKE '%${sanitizedSearch}%')`);
    }
    
    // Build WHERE clause
    const whereClause = whereConditions.join(' AND ');
    
    // Build base query - no LIMIT, we'll use queryMore() for pagination
    const query = `SELECT Id, Name, Client_Tool_Account_Required__c, 
                          Client_Tool_Account_Used__c, Client_Tool_Account_Used__r.Name,
                          Project__c, Project__r.Name,
                          Project_Objective__c, Project_Objective__r.Name
                   FROM Contributor_Project__c 
                   WHERE ${whereClause}
                   ORDER BY Name ASC`;
    
    // Calculate how many records we need to fetch
    const totalNeeded = offset + limit;
    
    // Execute initial query (Salesforce returns up to 2000 records per query)
    let result = await conn.query(query);
    let allRecords = [...(result.records || [])];
    
    // Use queryMore() to fetch records until we have enough for the requested page
    // Only fetch more if we haven't reached the total needed yet
    while (allRecords.length < totalNeeded && result.nextRecordsUrl) {
      result = await conn.queryMore(result.nextRecordsUrl);
      if (result.records && result.records.length > 0) {
        allRecords = allRecords.concat(result.records);
      } else {
        break;
      }
    }
    
    // Apply offset and limit to get the requested batch
    const records = allRecords.slice(offset, offset + limit);
    
    // Check if there are more records available
    // hasMore is true if:
    // 1. We fetched more records than needed (offset + limit), OR
    // 2. There's a nextRecordsUrl indicating more records exist
    const hasMore = allRecords.length > (offset + limit) || !!result.nextRecordsUrl;

    // Map Contributor Project records directly
    const projects = records.map(contributorProject => {
      return {
        id: contributorProject.Id,
        name: contributorProject.Name,
        contributorProjectId: contributorProject.Id,
        contributorProjectName: contributorProject.Name,
        project: contributorProject.Project__r ? contributorProject.Project__r.Name : contributorProject.Project__c,
        projectId: contributorProject.Project__c,
        projectObjective: contributorProject.Project_Objective__r ? contributorProject.Project_Objective__r.Name : (contributorProject.Project_Objective__c || null),
        projectObjectiveId: contributorProject.Project_Objective__c || null,
        clientToolAccountRequired: contributorProject.Client_Tool_Account_Required__c || false,
        clientToolAccountUsed: contributorProject.Client_Tool_Account_Used__c,
        clientToolAccountUsedName: contributorProject.Client_Tool_Account_Used__r ? contributorProject.Client_Tool_Account_Used__r.Name : null
      };
    });

    res.json({
      success: true,
      projects: projects,
      hasMore: hasMore,
      offset: offset,
      limit: limit
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch contributor projects',
      errorCode: error.errorCode,
      fields: error.fields
    });
  }
}));

// Get picklist values for Client Tool Name
router.get('/picklist-values', authenticate, authorize('view_project', 'all'), asyncHandler(async (req, res) => {
  try {
    const conn = await getSalesforceConnection();

    // Get picklist values for Client_Tool_Name__c field in Client_Tool_Account__c object
    const describeResult = await conn.sobject('Client_Tool_Account__c').describe();
    const clientToolNameField = describeResult.fields.find(field => 
      field.name === 'Client_Tool_Name__c' || 
      field.name === 'ClientToolName__c' ||
      field.name === 'Tool_Name__c'
    );

    let picklistValues = [];
    if (clientToolNameField && clientToolNameField.picklistValues) {
      picklistValues = clientToolNameField.picklistValues
        .map(pv => pv.value)
        .filter(value => value !== null && value !== '');
    }

    // If no picklist found, return common client tool names as fallback
    if (picklistValues.length === 0) {
      picklistValues = [
        'SRT',
        'UHRS',
        'Appen Connect',
        'Other'
      ];
    }

    res.json({
      success: true,
      values: picklistValues
    });
  } catch (error) {
    // Return fallback values on error
    res.json({
      success: true,
      values: [
        'SRT',
        'UHRS',
        'Appen Connect',
        'Other'
      ]
    });
  }
}));

// Search Client Tool Accounts
router.get('/search', authenticate, authorize('view_project', 'all'), asyncHandler(async (req, res) => {
  try {
    const searchTerm = req.query.term || '';
    if (!searchTerm || searchTerm.trim().length < 2) {
      return res.json({
        success: true,
        accounts: []
      });
    }

    const conn = await getSalesforceConnection();
    
    // Validate and sanitize the search term
    const { validateAndSanitizeSearchTerm } = require('../utils/security');
    const escapedTerm = validateAndSanitizeSearchTerm(searchTerm);
    
    if (!escapedTerm) {
      return res.json({
        success: true,
        accounts: []
      });
    }

    // Search Client_Tool_Account__c by Name field (for update mode)
    // Also search by Client_Tool_Name__c, Client_Tool_Email__c, or Client_Tool_User_ID__c (for general search)
    // Note: Contributor__c is an ID field (lookup), so we can't use LIKE on it
    // Include Contributor__r.Name to get the Contributor Name for display
    const query = `SELECT Id, Name, Client_Tool_Name__c, Contributor__c, 
                          Contributor__r.Name, Contributor__r.Id,
                          Client_Tool_Email__c, Client_Tool_User_ID__c,
                          Account__c, Account__r.Name
                   FROM Client_Tool_Account__c 
                   WHERE (Name LIKE '%${escapedTerm}%' 
                          OR Client_Tool_Name__c LIKE '%${escapedTerm}%' 
                          OR Client_Tool_Email__c LIKE '%${escapedTerm}%' 
                          OR Client_Tool_User_ID__c LIKE '%${escapedTerm}%')
                   ORDER BY Name ASC
                   LIMIT 50`;

    const result = await conn.query(query);

    const accounts = (result.records || []).map(account => ({
      id: account.Id,
      name: account.Name,
      accountName: account.Name,
      contributor: account.Contributor__c,
      contributorName: account.Contributor__r ? account.Contributor__r.Name : null,
      contributorId: account.Contributor__r ? account.Contributor__r.Id : null,
      clientToolName: account.Client_Tool_Name__c,
      clientToolEmail: account.Client_Tool_Email__c,
      clientToolUserId: account.Client_Tool_User_ID__c,
      account: account.Account__c,
      accountId: account.Account__c,
      accountName: account.Account__r ? account.Account__r.Name : null
    }));

    res.json({
      success: true,
      accounts: accounts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to search client tool accounts',
      errorCode: error.errorCode,
      fields: error.fields
    });
  }
}));

// Create Client Tool Account
router.post('/create', authenticate, authorize('create_project', 'all'), asyncHandler(async (req, res) => {
  try {
    const { 
      clientToolAccountName, 
      contributor, 
      clientToolUserId, 
      account, 
      accountName, 
      otpLimitExceeded, 
      deactivated, 
      lastChangedDate, 
      lastChangedTime, 
      clientToolName, 
      clientToolEmail, 
      verified 
    } = req.body;

    if (!clientToolName || !clientToolEmail || !contributor || !account) {
      return res.status(400).json({
        success: false,
        error: 'Client Tool Name, Client Tool Email, Contributor, and Account are required'
      });
    }

    const conn = await getSalesforceConnection();

    // Get object metadata to check if Name field is writable
    let nameFieldWritable = true;
    try {
      const objectDescribe = await conn.sobject('Client_Tool_Account__c').describe();
      const nameField = objectDescribe.fields.find(f => f.name === 'Name');
      if (nameField) {
        nameFieldWritable = nameField.createable && nameField.updateable;
      }
    } catch (describeError) {
      // Default to trying to set Name field
    }

    // Prepare data for Client_Tool_Account__c
    // If clientToolAccountName is not provided, use accountName or generate a name
    const accountNameValue = clientToolAccountName || accountName || `Client Tool Account ${Date.now()}`;
    
    const accountData = {
      Client_Tool_Name__c: clientToolName,
      Contributor__c: contributor || null,
      Client_Tool_Email__c: clientToolEmail || null,
      Client_Tool_User_ID__c: clientToolUserId || null,
      Account__c: account || null,
      OTP_Limit_Exceeded__c: otpLimitExceeded || false,
      Deactivated__c: deactivated || false,
      Verified__c: verified || false
    };

    // Only include Name field if it's writable
    if (nameFieldWritable && accountNameValue) {
      accountData.Name = accountNameValue;
    }

    // Handle Last Changed Date/Time if provided
    if (lastChangedDate && lastChangedTime) {
      try {
        const dateTimeString = `${lastChangedDate}T${lastChangedTime}:00`;
        accountData.Last_Changed_At__c = new Date(dateTimeString).toISOString();
      } catch (dateError) {
        // Ignore date parsing errors
      }
    } else if (lastChangedDate) {
      try {
        accountData.Last_Changed_At__c = new Date(lastChangedDate).toISOString();
      } catch (dateError) {
        // Ignore date parsing errors
      }
    }

    const result = await conn.sobject('Client_Tool_Account__c').create(accountData);

    if (!result.success) {
      const errorMsg = result.errors?.[0]?.message || 'Failed to create client tool account';
      throw new Error(errorMsg);
    }
    
    // Fetch the created record to return full details
    const createdRecord = await conn.sobject('Client_Tool_Account__c').retrieve(result.id);
    
    // Log to history
    try {
      logCreate(
        'Client_Tool_Account__c',
        accountNameValue,
        result.id,
        req.user.email,
        accountData
      );
    } catch (historyError) {
      // Silently fail history logging
    }
    
    // Log to audit logs
    try {
      const auditLogger = require('../utils/auditLogger');
      auditLogger.logAuditEvent({
        user: req.user.email,
        action: 'Added',
        objectType: 'Client Tool Account',
        objectId: result.id,
        objectName: accountNameValue,
        salesforceId: result.id,
        status: 'success',
        details: {
          accountName: accountNameValue
        }
      });
    } catch (auditError) {
      console.error('Error logging audit:', auditError);
    }
    
    res.json({
      success: true,
      account: {
        id: createdRecord.Id,
        name: createdRecord.Name,
        accountName: createdRecord.Name,
        contributor: createdRecord.Contributor__c,
        clientToolName: createdRecord.Client_Tool_Name__c,
        clientToolEmail: createdRecord.Client_Tool_Email__c,
        clientToolUserId: createdRecord.Client_Tool_User_ID__c
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to create client tool account'
    });
  }
}));

// Get object details by type and ID (for view modal) - must be before /:id route
// IMPORTANT: This route must come before router.get('/:id') to avoid route conflicts
router.get('/object/:objectType/:id', authenticate, authorize('view_project', 'all'), asyncHandler(async (req, res) => {
  console.log(`[DEBUG] Route matched: GET /object/${req.params.objectType}/${req.params.id}`);
  try {
    const { objectType, id } = req.params;
    const conn = await getSalesforceConnection();

    // Map object type to Salesforce object name
    const objectTypeMap = {
      'Project': 'Project__c',
      'Project_Objective__c': 'Project_Objective__c',
      'ProjectObjective': 'Project_Objective__c',
      'Contributor_Project__c': 'Contributor_Project__c',
      'ContributorProject': 'Contributor_Project__c'
    };

    const salesforceObjectName = objectTypeMap[objectType] || objectType;

    console.log(`[ObjectViewModal] Fetching ${objectType} (${salesforceObjectName}) with ID: ${id}`);

    // Describe the object to get all fields
    let describeResult;
    try {
      describeResult = await conn.sobject(salesforceObjectName).describe();
    } catch (describeError) {
      console.error(`[ObjectViewModal] Error describing ${salesforceObjectName}:`, describeError);
      return res.status(400).json({
        success: false,
        error: `Invalid object type: ${objectType}. Error: ${describeError.message}`
      });
    }

    // Get all readable fields (include all fields except base64 and system fields)
    // Show all fields from all sections - don't limit
    const readableFields = describeResult.fields
      .filter(f => 
        f.type !== 'base64' && 
        !f.name.includes('__r') && 
        f.name !== 'attributes' &&
        f.name !== 'Id' // Exclude Id field from display (it's in the URL)
      )
      .map(f => f.name);

    if (readableFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No readable fields found for this object'
      });
    }

    // Build field metadata including labels, updateable status, sections, and relationship info
    const fieldMetadata = {};
    const fieldLabels = {};
    const fieldSections = {};
    const relationshipFields = [];
    
    readableFields.forEach(fieldName => {
      const field = describeResult.fields.find(f => f.name === fieldName);
      if (field) {
        fieldLabels[fieldName] = field.label;
        // Determine if field is truly updateable
        // A field is updateable if:
        // - field.updateable is explicitly true AND
        // - It's not a calculated/formula field AND
        // - It's not an auto-number field AND
        // - It's not a system field (Id, CreatedDate, etc.)
        const isCalculated = field.calculated || field.type === 'calculated' || field.type === 'formula';
        const isAutoNumber = field.type === 'autonumber' || field.autoNumber;
        const isSystemField = fieldName === 'Id' || fieldName === 'CreatedDate' || fieldName === 'LastModifiedDate' || 
                              fieldName === 'CreatedById' || fieldName === 'LastModifiedById' || fieldName === 'SystemModstamp';
        const isUpdateable = field.updateable === true && !isCalculated && !isAutoNumber && !isSystemField;
        
        // Only log first few fields to avoid spam
        if (readableFields.indexOf(fieldName) < 5) {
          console.log(`[ObjectViewModal] Field ${fieldName}: updateable=${field.updateable}, isCalculated=${isCalculated}, isAutoNumber=${isAutoNumber}, isSystemField=${isSystemField}, finalUpdateable=${isUpdateable}`);
        }
        
        // Get picklist values if field is a picklist
        let picklistValues = null;
        if (field.type === 'picklist' || field.type === 'multipicklist') {
          picklistValues = (field.picklistValues || [])
            .filter(pv => pv.active !== false) // Only include active values
            .map(pv => ({
              value: pv.value,
              label: pv.label || pv.value,
              active: pv.active !== false
            }));
        }
        
        fieldMetadata[fieldName] = {
          label: field.label,
          updateable: isUpdateable,
          createable: field.createable || false,
          type: field.type,
          relationshipName: field.relationshipName || null,
          referenceTo: field.referenceTo || [],
          calculated: isCalculated,
          autoNumber: isAutoNumber,
          picklistValues: picklistValues
        };
        
        // Track relationship fields to query their names
        if (field.type === 'reference' && field.relationshipName) {
          relationshipFields.push({
            fieldName: fieldName,
            relationshipName: field.relationshipName
          });
        }
        
        // Determine section based on field name patterns and label (similar to Salesforce page layouts)
        // Use a more comprehensive approach to categorize fields
        let section = 'Additional Information'; // Default section for uncategorized fields
        const fieldNameLower = fieldName.toLowerCase();
        const labelLower = (field.label || '').toLowerCase();
        
        // System and audit fields
        if (fieldNameLower.includes('created') || fieldNameLower.includes('modified') || 
            fieldNameLower.includes('systemmodstamp') || fieldNameLower === 'id' ||
            fieldNameLower.includes('ownerid') || fieldNameLower.includes('lastmodifiedby')) {
          section = 'System Information';
        }
        // Name and basic info
        else if (fieldName === 'Name' || (fieldNameLower.includes('name') && !fieldNameLower.includes('project') && !fieldNameLower.includes('account') && !fieldNameLower.includes('contributor'))) {
          section = 'Information';
        }
        // Status fields
        else if (fieldNameLower.includes('status') || fieldNameLower.includes('queue') || 
                 labelLower.includes('status') || labelLower.includes('queue')) {
          section = 'Status';
        }
        // Date/Time fields (but not system dates)
        else if ((fieldNameLower.includes('date') || fieldNameLower.includes('time')) && 
                 !fieldNameLower.includes('created') && !fieldNameLower.includes('modified')) {
          section = 'Dates';
        }
        // Project fields
        else if (fieldNameLower.includes('project') && !fieldNameLower.includes('objective')) {
          section = 'Project';
        }
        // Project Objective fields
        else if (fieldNameLower.includes('objective') || labelLower.includes('objective')) {
          section = 'Project Objective';
        }
        // Contributor fields
        else if (fieldNameLower.includes('contributor') || labelLower.includes('contributor')) {
          section = 'Contributor';
        }
        // Account fields
        else if (fieldNameLower.includes('account') || labelLower.includes('account')) {
          section = 'Account';
        }
        // Client Tool fields
        else if (fieldNameLower.includes('client') || fieldNameLower.includes('tool') || 
                 labelLower.includes('client tool') || labelLower.includes('tool')) {
          section = 'Client Tool';
        }
        // Payment fields
        else if (fieldNameLower.includes('payment') || fieldNameLower.includes('pay') || 
                 labelLower.includes('payment') || labelLower.includes('pay')) {
          section = 'Payment';
        }
        // Contact/Communication fields
        else if (fieldNameLower.includes('email') || fieldNameLower.includes('phone') || 
                 fieldNameLower.includes('contact') || fieldNameLower.includes('address') ||
                 labelLower.includes('email') || labelLower.includes('phone') || 
                 labelLower.includes('contact') || labelLower.includes('address')) {
          section = 'Contact Information';
        }
        // Description/Notes fields
        else if (fieldNameLower.includes('description') || fieldNameLower.includes('notes') || 
                 fieldNameLower.includes('comment') || fieldNameLower.includes('note') ||
                 labelLower.includes('description') || labelLower.includes('notes') || 
                 labelLower.includes('comment')) {
          section = 'Additional Information';
        }
        // Verification/Security fields
        else if (fieldNameLower.includes('verified') || fieldNameLower.includes('otp') || 
                 fieldNameLower.includes('deactivated') || fieldNameLower.includes('active') ||
                 labelLower.includes('verified') || labelLower.includes('otp') || 
                 labelLower.includes('deactivated') || labelLower.includes('active')) {
          section = 'Security & Verification';
        }
        // Custom fields (those ending with __c that don't match other patterns)
        else if (fieldNameLower.endsWith('__c') && !fieldNameLower.includes('project') && 
                 !fieldNameLower.includes('account') && !fieldNameLower.includes('contributor') &&
                 !fieldNameLower.includes('client') && !fieldNameLower.includes('tool')) {
          section = 'Custom Fields';
        }
        // Default to General Information for standard fields
        else {
          section = 'General Information';
        }
        
        fieldSections[fieldName] = section;
        console.log(`[ObjectViewModal] Field ${fieldName} assigned to section: ${section}`);
      }
    });
    
    console.log(`[ObjectViewModal] Total fields: ${readableFields.length}, Sections found: ${Object.keys(fieldSections).length}`);
    console.log(`[ObjectViewModal] Sections: ${JSON.stringify(Object.values(fieldSections).reduce((acc, section) => { acc[section] = (acc[section] || 0) + 1; return acc; }, {}))}`);

    // Build query with relationship field names included
    const relationshipQueries = relationshipFields.map(rel => `${rel.relationshipName}.Name`);
    const allFields = [...readableFields, ...relationshipQueries];
    const query = `SELECT ${allFields.join(', ')} FROM ${salesforceObjectName} WHERE Id = '${id}' LIMIT 1`;
    console.log(`[ObjectViewModal] Executing query: ${query.substring(0, 200)}...`);
    
    let result;
    try {
      result = await conn.query(query);
    } catch (queryError) {
      console.error(`[ObjectViewModal] Query error:`, queryError);
      return res.status(400).json({
        success: false,
        error: `Query failed: ${queryError.message}`
      });
    }

    if (!result.records || result.records.length === 0) {
      console.log(`[ObjectViewModal] No records found for ${salesforceObjectName} with ID: ${id}`);
      return res.status(404).json({
        success: false,
        error: `Object not found: ${objectType} with ID ${id}`
      });
    }

    const record = result.records[0];
    
    // Convert record to plain object with queried fields only
    const objectData = {};
    readableFields.forEach(fieldName => {
      objectData[fieldName] = record[fieldName];
    });
    
    // Add relationship field names
    relationshipFields.forEach(rel => {
      const relFieldName = rel.relationshipName;
      if (record[relFieldName] && record[relFieldName].Name) {
        objectData[`${rel.fieldName}_Name`] = record[relFieldName].Name;
      }
    });

    res.json({
      success: true,
      object: objectData,
      fieldLabels: fieldLabels,
      fieldMetadata: fieldMetadata,
      fieldSections: fieldSections
    });
  } catch (error) {
    console.error('Error fetching object details:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch object details'
    });
  }
}));

// Update object by type and ID (for edit modal)
router.put('/object/:objectType/:id', authenticate, authorize('create_project', 'all'), asyncHandler(async (req, res) => {
  try {
    const { objectType, id } = req.params;
    const updateData = req.body;
    const conn = await getSalesforceConnection();

    // Map object type to Salesforce object name
    const objectTypeMap = {
      'Project': 'Project__c',
      'Project_Objective__c': 'Project_Objective__c',
      'ProjectObjective': 'Project_Objective__c',
      'Contributor_Project__c': 'Contributor_Project__c',
      'ContributorProject': 'Contributor_Project__c'
    };

    const salesforceObjectName = objectTypeMap[objectType] || objectType;

    // Describe the object to check which fields are updateable
    const describeResult = await conn.sobject(salesforceObjectName).describe();
    const updateableFields = describeResult.fields
      .filter(f => f.updateable && f.name !== 'Id')
      .map(f => f.name);

    // Filter updateData to only include updateable fields
    const filteredData = { Id: id };
    Object.keys(updateData).forEach(key => {
      if (updateableFields.includes(key)) {
        filteredData[key] = updateData[key];
      }
    });

    // Update the object
    const result = await conn.sobject(salesforceObjectName).update(filteredData);

    if (!result.success) {
      const errorMsg = result.errors?.[0]?.message || 'Failed to update object';
      throw new Error(errorMsg);
    }

    // Fetch the updated record
    const updatedRecord = await conn.sobject(salesforceObjectName).retrieve(id);

    res.json({
      success: true,
      object: updatedRecord
    });
  } catch (error) {
    console.error('Error updating object:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to update object'
    });
  }
}));

// Get a single Client Tool Account by ID
router.get('/:id', authenticate, authorize('view_project', 'all'), asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Account ID is required'
      });
    }

    const conn = await getSalesforceConnection();

    // Fetch the account with related fields
    const query = `SELECT Id, Name, Client_Tool_Name__c, Contributor__c, 
                          Contributor__r.Name, Contributor__r.Id,
                          Client_Tool_Email__c, Client_Tool_User_ID__c,
                          Account__c, Account__r.Name,
                          OTP_Limit_Exceeded__c, Deactivated__c, 
                          Last_Changed_At__c, Verified__c
                   FROM Client_Tool_Account__c 
                   WHERE Id = '${id}'`;

    const result = await conn.query(query);

    if (!result.records || result.records.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Client Tool Account not found'
      });
    }

    const account = result.records[0];
    
    res.json({
      success: true,
      account: {
        id: account.Id,
        name: account.Name,
        accountName: account.Name,
        contributor: account.Contributor__c,
        contributorId: account.Contributor__r ? account.Contributor__r.Id : null,
        contributorName: account.Contributor__r ? account.Contributor__r.Name : null,
        clientToolName: account.Client_Tool_Name__c,
        clientToolEmail: account.Client_Tool_Email__c,
        clientToolUserId: account.Client_Tool_User_ID__c,
        account: account.Account__c,
        accountId: account.Account__c,
        accountName: account.Account__r ? account.Account__r.Name : null,
        otpLimitExceeded: account.OTP_Limit_Exceeded__c || false,
        deactivated: account.Deactivated__c || false,
        lastChangedAt: account.Last_Changed_At__c,
        verified: account.Verified__c || false
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch client tool account'
    });
  }
}));

// Update Client Tool Account
router.put('/:id', authenticate, authorize('create_project', 'all'), asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      clientToolAccountName, 
      contributor, 
      clientToolUserId, 
      account, 
      accountName, 
      otpLimitExceeded, 
      deactivated, 
      lastChangedDate, 
      lastChangedTime, 
      clientToolName, 
      clientToolEmail, 
      verified 
    } = req.body;

    if (!clientToolName || !clientToolEmail || !contributor || !account) {
      return res.status(400).json({
        success: false,
        error: 'Client Tool Name, Client Tool Email, Contributor, and Account are required'
      });
    }

    const conn = await getSalesforceConnection();

    // Get object metadata to check if Name field is writable
    let nameFieldWritable = true;
    try {
      const objectDescribe = await conn.sobject('Client_Tool_Account__c').describe();
      const nameField = objectDescribe.fields.find(f => f.name === 'Name');
      if (nameField) {
        nameFieldWritable = nameField.createable && nameField.updateable;
      }
    } catch (describeError) {
      // Ignore describe errors
    }

    // Prepare data for Client_Tool_Account__c
    const accountNameValue = clientToolAccountName || accountName || `Client Tool Account ${Date.now()}`;
    
    const accountData = {
      Id: id,
      Client_Tool_Name__c: clientToolName,
      Contributor__c: contributor || null,
      Client_Tool_Email__c: clientToolEmail || null,
      Client_Tool_User_ID__c: clientToolUserId || null,
      Account__c: account || null,
      OTP_Limit_Exceeded__c: otpLimitExceeded || false,
      Deactivated__c: deactivated || false,
      Verified__c: verified || false
    };

    // Only include Name field if it's writable
    if (nameFieldWritable && accountNameValue) {
      accountData.Name = accountNameValue;
    }

    // Handle Last Changed Date/Time if provided
    if (lastChangedDate && lastChangedTime) {
      try {
        const dateTimeString = `${lastChangedDate}T${lastChangedTime}:00`;
        accountData.Last_Changed_At__c = new Date(dateTimeString).toISOString();
      } catch (dateError) {
        // Ignore date parsing errors
      }
    } else if (lastChangedDate) {
      try {
        accountData.Last_Changed_At__c = new Date(lastChangedDate).toISOString();
      } catch (dateError) {
        // Ignore date parsing errors
      }
    }

    const result = await conn.sobject('Client_Tool_Account__c').update(accountData);

    if (!result.success) {
      const errorMsg = result.errors?.[0]?.message || 'Failed to update client tool account';
      throw new Error(errorMsg);
    }

    // Fetch the updated record to return full details
    const updatedRecord = await conn.sobject('Client_Tool_Account__c').retrieve(id);
    
    // Log to history
    try {
      logUpdate(
        'Client_Tool_Account__c',
        updatedRecord.Name || accountNameValue,
        id,
        req.user.email,
        accountData
      );
    } catch (historyError) {
      // Silently fail history logging
    }
    
    // Log to audit logs
    try {
      const auditLogger = require('../utils/auditLogger');
      auditLogger.logAuditEvent({
        user: req.user.email,
        action: 'Modified',
        objectType: 'Client Tool Account',
        objectId: id,
        objectName: updatedRecord.Name || accountNameValue,
        salesforceId: id,
        status: 'success',
        details: {
          accountName: accountNameValue
        }
      });
    } catch (auditError) {
      console.error('Error logging audit:', auditError);
    }
    
    res.json({
      success: true,
      account: {
        id: updatedRecord.Id,
        name: updatedRecord.Name,
        accountName: updatedRecord.Name,
        contributor: updatedRecord.Contributor__c,
        clientToolName: updatedRecord.Client_Tool_Name__c,
        clientToolEmail: updatedRecord.Client_Tool_Email__c,
        clientToolUserId: updatedRecord.Client_Tool_User_ID__c
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to update client tool account'
    });
  }
}));

// Update Client Tool Account mapping for a single Contributor Project
router.post('/update-mapping', authenticate, authorize('create_project', 'all'), asyncHandler(async (req, res) => {
  try {
    const { projectId, accountId } = req.body;

    if (!projectId || !accountId) {
      return res.status(400).json({
        success: false,
        error: 'Project ID and Account ID are required'
      });
    }

    const conn = await getSalesforceConnection();

    // Update Contributor_Project__c with Client_Tool_Account_Used__c
    // Note: projectId is now the Contributor_Project__c ID
    const updateData = {
      Id: projectId,
      Client_Tool_Account_Used__c: accountId
    };

    const result = await conn.sobject('Contributor_Project__c').update(updateData);

    if (!result.success) {
      const errorMsg = result.errors?.[0]?.message || 'Failed to update mapping';
      throw new Error(errorMsg);
    }

    // Log to history
    try {
      logUpdate(
        'Contributor_Project__c',
        `Contributor Project ${projectId}`,
        projectId,
        req.user.email,
        updateData,
        1,
        { operation: 'map_client_tool_account' }
      );
    } catch (historyError) {
      // Silently fail history logging
    }
    
    // Log to audit logs
    try {
      const auditLogger = require('../utils/auditLogger');
      auditLogger.logAuditEvent({
        user: req.user.email,
        action: 'Modified',
        objectType: 'Contributor Project',
        objectId: projectId,
        objectName: `Contributor Project ${projectId}`,
        salesforceId: projectId,
        status: 'success',
        details: {
          operation: 'map_client_tool_account',
          accountId: accountId
        }
      });
    } catch (auditError) {
      console.error('Error logging audit:', auditError);
    }

    res.json({
      success: true,
      message: 'Client Tool Account mapping updated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to update client tool account mapping'
    });
  }
}));

// Bulk update Client Tool Account mapping for multiple Contributor Projects
router.post('/bulk-update', authenticate, authorize('create_project', 'all'), asyncHandler(async (req, res) => {
  try {
    const { projectIds, accountId } = req.body;

    if (!projectIds || !Array.isArray(projectIds) || projectIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Project IDs array is required'
      });
    }

    if (!accountId) {
      return res.status(400).json({
        success: false,
        error: 'Account ID is required'
      });
    }

    const conn = await getSalesforceConnection();

    // Prepare bulk update records
    // Note: projectIds are now Contributor_Project__c IDs
    const records = projectIds.map(projectId => ({
      Id: projectId,
      Client_Tool_Account_Used__c: accountId
    }));

    const results = await conn.sobject('Contributor_Project__c').update(records);

    // Check for errors
    const errors = results.filter(r => !r.success);
    if (errors.length > 0) {
      const errorMsg = errors[0].errors?.[0]?.message || 'Some updates failed';
      throw new Error(errorMsg);
    }

    // Log to history
    try {
      logBulkOperation(
        'update',
        'Contributor_Project__c',
        req.user.email,
        results,
        { operation: 'bulk_map_client_tool_account', accountId }
      );
    } catch (historyError) {
      // Silently fail history logging
    }
    
    // Log to audit logs
    try {
      const auditLogger = require('../utils/auditLogger');
      auditLogger.logAuditEvent({
        user: req.user.email,
        action: 'Modified',
        objectType: 'Contributor Project',
        objectId: null, // Bulk operation
        objectName: `Bulk Update: ${results.length} project(s)`,
        salesforceId: null,
        status: 'success',
        details: {
          operation: 'bulk_map_client_tool_account',
          accountId: accountId,
          recordsUpdated: results.length
        }
      });
    } catch (auditError) {
      console.error('Error logging audit:', auditError);
    }

    res.json({
      success: true,
      message: `Successfully updated ${results.length} project(s)`,
      updatedCount: results.length
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to bulk update client tool account mappings'
    });
  }
}));

// Bulk import Client Tool Accounts from Excel/CSV - REWRITTEN FOR PERFORMANCE
router.post('/bulk-import', authenticate, authorize('create_project', 'all'), asyncHandler(async (req, res) => {
  const startTime = Date.now();
  console.log('[Bulk Import] ===== REQUEST RECEIVED =====', new Date().toISOString());
  
  // CRITICAL: Set timeouts IMMEDIATELY
  const timeoutMs = 600000; // 10 minutes
  req.setTimeout(timeoutMs);
  res.setTimeout(timeoutMs);
  if (req.socket) {
    req.socket.setTimeout(timeoutMs);
    req.socket.setKeepAlive(true);
  }
  if (res.socket) {
    res.socket.setTimeout(timeoutMs);
    res.socket.setKeepAlive(true);
  }
  
  // Send immediate response headers
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Cache-Control', 'no-cache');
  
  try {
    const { records, batchSize = 50 } = req.body; // Process in batches of 50
    console.log('[Bulk Import] Request body parsed, records count:', records?.length, 'batchSize:', batchSize);

    if (!records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Records array is required and must not be empty'
      });
    }

    console.log(`[Bulk Import] Starting import of ${records.length} record(s) at ${new Date().toISOString()}`);
    
    // Get Salesforce connection
    let conn;
    try {
      const connectionPromise = getSalesforceConnection();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Salesforce connection timeout')), 30000)
      );
      conn = await Promise.race([connectionPromise, timeoutPromise]);
    } catch (connectionError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to connect to Salesforce',
        details: connectionError.message
      });
    }
    
    // Get object metadata
    let nameFieldWritable = true;
    try {
      const describePromise = conn.sobject('Client_Tool_Account__c').describe();
      const describeTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Describe timeout')), 10000)
      );
      const objectDescribe = await Promise.race([describePromise, describeTimeout]);
      const nameField = objectDescribe.fields.find(f => f.name === 'Name');
      if (nameField) {
        nameFieldWritable = nameField.createable && nameField.updateable;
      }
    } catch (describeError) {
      console.warn('[Bulk Import] Could not describe object, assuming Name field is writable');
    }
    
    // Helper function to get column value
    const getColumnValue = (record, possibleNames) => {
      for (const name of possibleNames) {
        const key = Object.keys(record).find(k => 
          k.toLowerCase().replace(/\s+/g, '') === name.toLowerCase().replace(/\s+/g, '')
        );
        if (key) return record[key];
      }
      return null;
    };
    
    const errors = [];
    let importedCount = 0;
    
    // OPTIMIZATION: Batch fetch all contributor projects at once
    const contributorProjectNames = [...new Set(records.map(r => {
      const name = getColumnValue(r, ['Contributor Project Name', 'ContributorProjectName', 'Contributor Project']);
      return name ? sanitizeSearchTerm(name) : null;
    }).filter(Boolean))];
    
    console.log(`[Bulk Import] Fetching ${contributorProjectNames.length} unique contributor projects...`);
    const projectMap = new Map();
    if (contributorProjectNames.length > 0) {
      try {
        const projectNamesQuery = contributorProjectNames.map(name => `'${name}'`).join(',');
        const projectQuery = `SELECT Id, Name FROM Contributor_Project__c WHERE Name IN (${projectNamesQuery})`;
        const queryPromise = conn.query(projectQuery);
        const queryTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout')), 30000)
        );
        const projectResult = await Promise.race([queryPromise, queryTimeout]);
        if (projectResult.records) {
          projectResult.records.forEach(proj => {
            projectMap.set(proj.Name, proj.Id);
          });
        }
      } catch (err) {
        console.error('[Bulk Import] Error fetching projects:', err.message);
      }
    }
    
    // OPTIMIZATION: Batch fetch existing client tool accounts
    const accountNames = [...new Set(records.map(r => {
      const name = getColumnValue(r, ['Client Tool Account Name', 'ClientToolAccountName', 'Account Name']);
      return name ? sanitizeSearchTerm(name) : null;
    }).filter(Boolean))];
    
    console.log(`[Bulk Import] Fetching ${accountNames.length} existing accounts...`);
    const accountMap = new Map();
    if (accountNames.length > 0) {
      try {
        const accountNamesQuery = accountNames.map(name => `'${name}'`).join(',');
        const accountQuery = `SELECT Id, Name FROM Client_Tool_Account__c WHERE Name IN (${accountNamesQuery})`;
        const queryPromise = conn.query(accountQuery);
        const queryTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout')), 30000)
        );
        const accountResult = await Promise.race([queryPromise, queryTimeout]);
        if (accountResult.records) {
          accountResult.records.forEach(acc => {
            accountMap.set(acc.Name, acc.Id);
          });
        }
      } catch (err) {
        console.error('[Bulk Import] Error fetching accounts:', err.message);
      }
    }
    
    // OPTIMIZATION: Batch fetch Contributors (Contact objects)
    const contributorNames = [...new Set(records.map(r => {
      const name = getColumnValue(r, ['Contributor', 'ContributorName']);
      return name ? sanitizeSearchTerm(name) : null;
    }).filter(Boolean))];
    
    console.log(`[Bulk Import] Fetching ${contributorNames.length} unique contributors...`);
    const contributorMap = new Map();
    if (contributorNames.length > 0) {
      try {
        const contributorNamesQuery = contributorNames.map(name => `'${name}'`).join(',');
        const contributorQuery = `SELECT Id, Name FROM Contact WHERE Name IN (${contributorNamesQuery})`;
        const queryPromise = conn.query(contributorQuery);
        const queryTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout')), 30000)
        );
        const contributorResult = await Promise.race([queryPromise, queryTimeout]);
        if (contributorResult.records) {
          contributorResult.records.forEach(contrib => {
            contributorMap.set(contrib.Name, contrib.Id);
          });
        }
      } catch (err) {
        console.error('[Bulk Import] Error fetching contributors:', err.message);
      }
    }
    
    // OPTIMIZATION: Batch fetch Accounts (Account objects)
    const accountObjectNames = [...new Set(records.map(r => {
      const name = getColumnValue(r, ['Account', 'AccountName']);
      return name ? sanitizeSearchTerm(name) : null;
    }).filter(Boolean))];
    
    console.log(`[Bulk Import] Fetching ${accountObjectNames.length} unique accounts...`);
    const accountObjectMap = new Map();
    if (accountObjectNames.length > 0) {
      try {
        const accountObjectNamesQuery = accountObjectNames.map(name => `'${name}'`).join(',');
        const accountObjectQuery = `SELECT Id, Name FROM Account WHERE Name IN (${accountObjectNamesQuery})`;
        const queryPromise = conn.query(accountObjectQuery);
        const queryTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout')), 30000)
        );
        const accountObjectResult = await Promise.race([queryPromise, queryTimeout]);
        if (accountObjectResult.records) {
          accountObjectResult.records.forEach(acc => {
            accountObjectMap.set(acc.Name, acc.Id);
          });
        }
      } catch (err) {
        console.error('[Bulk Import] Error fetching account objects:', err.message);
      }
    }
    
    // Process records in batches
    const actualBatchSize = Math.min(batchSize, 200); // Max 200 per batch
    const batches = [];
    for (let i = 0; i < records.length; i += actualBatchSize) {
      batches.push(records.slice(i, i + actualBatchSize));
    }
    
    console.log(`[Bulk Import] Processing ${records.length} records in ${batches.length} batch(es)`);
    
    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx];
      console.log(`[Bulk Import] Processing batch ${batchIdx + 1}/${batches.length} (${batch.length} records)`);
      
      const accountsToCreate = [];
      const updatesToProcess = [];
      
      // Prepare batch data
      for (let i = 0; i < batch.length; i++) {
        const record = batch[i];
        const globalIndex = batchIdx * actualBatchSize + i;
        
        try {
          const contributorProjectName = getColumnValue(record, [
            'Contributor Project Name',
            'ContributorProjectName',
            'Contributor Project'
          ]);
          
          if (!contributorProjectName) {
            errors.push({ row: globalIndex + 2, error: 'Contributor Project Name is required' });
            continue;
          }
          
          const sanitizedProjectName = sanitizeSearchTerm(contributorProjectName);
          const contributorProjectId = projectMap.get(sanitizedProjectName);
          
          if (!contributorProjectId) {
            errors.push({ row: globalIndex + 2, error: `Contributor Project "${contributorProjectName}" not found` });
            continue;
          }
          
          const clientToolAccountName = getColumnValue(record, [
            'Client Tool Account Name',
            'ClientToolAccountName',
            'Account Name'
          ]);
          
          if (!clientToolAccountName) {
            errors.push({ row: globalIndex + 2, error: 'Client Tool Account Name is required' });
            continue;
          }
          
          const accountNameSanitized = sanitizeSearchTerm(clientToolAccountName);
          let accountId = accountMap.get(accountNameSanitized);
          
          if (!accountId) {
            // Get Contributor and Account IDs from maps
            const contributorName = getColumnValue(record, ['Contributor', 'ContributorName']);
            const contributorId = contributorName ? contributorMap.get(sanitizeSearchTerm(contributorName)) : null;
            
            const accountObjectName = getColumnValue(record, ['Account', 'AccountName']);
            const accountObjectId = accountObjectName ? accountObjectMap.get(sanitizeSearchTerm(accountObjectName)) : null;
            
            // Prepare account for creation
            const accountData = {
              Name: nameFieldWritable ? clientToolAccountName : undefined,
              Client_Tool_Name__c: getColumnValue(record, ['Client Tool Name', 'ClientToolName', 'Tool Name']) || null,
              Client_Tool_Email__c: getColumnValue(record, ['Client Tool Email', 'ClientToolEmail', 'Email']) || null,
              Client_Tool_User_ID__c: getColumnValue(record, ['Client Tool User ID', 'ClientToolUserId', 'User ID']) || null,
              Contributor__c: contributorId || null,
              Account__c: accountObjectId || null,
              OTP_Limit_Exceeded__c: ['true', 'TRUE', true].includes(getColumnValue(record, ['OTP Limit Exceeded', 'OTPLimitExceeded'])),
              Deactivated__c: ['true', 'TRUE', true].includes(getColumnValue(record, ['Deactivated'])),
              Verified__c: ['true', 'TRUE', true].includes(getColumnValue(record, ['Verified']))
            };
            
            // Remove undefined Name field
            if (!accountData.Name) {
              delete accountData.Name;
            }
            
            accountsToCreate.push({
              data: accountData,
              name: clientToolAccountName,
              projectId: contributorProjectId,
              projectName: contributorProjectName,
              rowIndex: globalIndex + 2
            });
          } else {
            // Use existing account
            updatesToProcess.push({
              accountId,
              projectId: contributorProjectId,
              projectName: contributorProjectName,
              rowIndex: globalIndex + 2
            });
          }
        } catch (error) {
          errors.push({ row: globalIndex + 2, error: error.message || 'Unknown error' });
        }
      }
      
      // Bulk create accounts
      if (accountsToCreate.length > 0) {
        try {
          const accountRecords = accountsToCreate.map(item => item.data);
          const createPromise = conn.sobject('Client_Tool_Account__c').create(accountRecords);
          const createTimeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Create timeout')), 60000)
          );
          const createResults = await Promise.race([createPromise, createTimeout]);
          
          // Process create results
          createResults.forEach((result, idx) => {
            const item = accountsToCreate[idx];
            if (result.success) {
              accountMap.set(sanitizeSearchTerm(item.name), result.id);
              updatesToProcess.push({
                accountId: result.id,
                projectId: item.projectId,
                projectName: item.projectName,
                rowIndex: item.rowIndex
              });
            } else {
              errors.push({
                row: item.rowIndex,
                error: result.errors?.[0]?.message || 'Failed to create account'
              });
            }
          });
        } catch (error) {
          accountsToCreate.forEach(item => {
            errors.push({ row: item.rowIndex, error: error.message || 'Failed to create account' });
          });
        }
      }
      
      // Bulk update projects
      if (updatesToProcess.length > 0) {
        try {
          const updateRecords = updatesToProcess.map(item => ({
            Id: item.projectId,
            Client_Tool_Account_Used__c: item.accountId
          }));
          
          const updatePromise = conn.sobject('Contributor_Project__c').update(updateRecords);
          const updateTimeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Update timeout')), 60000)
          );
          const updateResults = await Promise.race([updatePromise, updateTimeout]);
          
          updateResults.forEach((result, idx) => {
            if (result.success) {
              importedCount++;
            } else {
              errors.push({
                row: updatesToProcess[idx].rowIndex,
                error: result.errors?.[0]?.message || 'Failed to update project'
              });
            }
          });
        } catch (error) {
          updatesToProcess.forEach(item => {
            errors.push({ row: item.rowIndex, error: error.message || 'Failed to update project' });
          });
        }
      }
    }

    console.log(`[Bulk Import] Completed at ${new Date().toISOString()}: ${importedCount} imported, ${errors.length} errors`);
    
    // Ensure response is sent
    if (!res.headersSent) {
      res.json({
        success: true,
        message: `Imported ${importedCount} record(s)${errors.length > 0 ? `, ${errors.length} error(s)` : ''}`,
        importedCount,
        errorCount: errors.length,
        errors: errors.length > 0 ? errors : undefined
      });
    }
  } catch (error) {
    console.error('[Bulk Import] Fatal error at', new Date().toISOString(), ':', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to bulk import client tool accounts',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
}));

module.exports = router;

