const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { getSalesforceConnection } = require('./updateObjectFields/utils');
const { escapeSoql } = require('../utils/security');

const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Get Onboarding Contributors
router.get('/contributors', authenticate, authorize('view_project', 'all'), asyncHandler(async (req, res) => {
  try {
    const conn = await getSalesforceConnection();
    const { 
      limit = 1000, 
      offset = 0, 
      search = '',
      orderBy = 'CreatedDate', 
      orderDirection = 'DESC' 
    } = req.query;
    
    // First, describe the Contact object to get available fields
    const describeResult = await conn.sobject('Contact').describe();
    const validFieldNames = new Set(describeResult.fields.map(f => f.name));
    
    // Discover onboarding status field
    let statusFieldName = null;
    const possibleStatusFields = [
      'Contributor_Status__c',
      'ContributorStatus__c',
      'Status__c',
      'Contact_Status__c',
      'ContactStatus__c',
      'Onboarding_Status__c',
      'OnboardingStatus__c'
    ];
    
    for (const fieldName of possibleStatusFields) {
      if (validFieldNames.has(fieldName)) {
        statusFieldName = fieldName;
        break;
      }
    }
    
    // Build list of fields to query
    const fieldNames = [
      'Id',
      'Name',
      'Email',
      'CreatedDate',
      'LastModifiedDate'
    ];
    
    // Add common contributor fields if they exist
    const commonFields = [
      'Contributor_Type__c',
      'ContributorType__c',
      'Gender__c',
      'Source_Details__c',
      'SourceDetails__c',
      'MailingCountry',
      'MailingCity',
      'MailingState',
      'MailingPostalCode',
      'MailingStreet',
      'Phone',
      'MobilePhone',
      'Birthdate',
      'AccountId',
      'Account.Name'
    ];
    
    commonFields.forEach(field => {
      if (field.includes('.')) {
        // Relationship field - check base field
        const baseField = field.split('.')[0];
        if (validFieldNames.has(baseField)) {
          fieldNames.push(field);
        }
      } else if (validFieldNames.has(field)) {
        fieldNames.push(field);
      }
    });
    
    // Build SOQL query
    let query = `SELECT ${fieldNames.join(', ')} FROM Contact`;
    
    // Build WHERE clause
    const whereConditions = [];
    
    // Filter by onboarding status
    if (statusFieldName) {
      // Try to find what value represents "onboarding" status
      // Common values: 'Onboarding', 'On Boarding', 'In Onboarding', etc.
      whereConditions.push(`(${statusFieldName} = 'Onboarding' OR ${statusFieldName} = 'On Boarding' OR ${statusFieldName} = 'In Onboarding' OR ${statusFieldName} LIKE '%Onboarding%')`);
    } else {
      // If no status field found, we'll return all contacts (with a warning)
      console.warn('No contributor status field found on Contact object');
    }
    
    // Add search filter
    if (search && search.trim()) {
      let searchTerm = search.trim();
      // Check if search term is wrapped in double quotes for exact match
      const isExactMatch = searchTerm.startsWith('"') && searchTerm.endsWith('"');
      if (isExactMatch) {
        searchTerm = searchTerm.slice(1, -1).trim(); // Remove quotes
      }
      
      // Skip search if term is empty or just quotes (to avoid SOQL parsing issues)
      if (!searchTerm || searchTerm === "'" || searchTerm === "''") {
        // Skip search - empty or just quotes
      } else {
        // Escape single quotes for SOQL (using correct SOQL escaping: ' becomes '')
        const escapedTerm = escapeSoql(searchTerm);
        const matchPattern = isExactMatch ? `= '${escapedTerm}'` : `LIKE '%${escapedTerm}%'`;
        const searchConditions = [
          `Name ${matchPattern}`,
          `Email ${matchPattern}`
        ];
        
        // Add search for other common fields if they exist
        if (validFieldNames.has('Contributor_Type__c') || validFieldNames.has('ContributorType__c')) {
          const typeField = validFieldNames.has('Contributor_Type__c') ? 'Contributor_Type__c' : 'ContributorType__c';
          searchConditions.push(`${typeField} ${matchPattern}`);
        }
        
        if (validFieldNames.has('MailingCountry')) {
          searchConditions.push(`MailingCountry ${matchPattern}`);
        }
        
        whereConditions.push(`(${searchConditions.join(' OR ')})`);
      }
    }
    
    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }
    
    // Add ORDER BY
    let orderByField = orderBy;
    if (!validFieldNames.has(orderByField)) {
      orderByField = 'CreatedDate';
    }
    query += ` ORDER BY ${orderByField} ${orderDirection || 'DESC'}`;
    
    // Add LIMIT and OFFSET
    query += ` LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
    
    console.log('Onboarding Contributors Query:', query);
    
    const result = await conn.query(query);
    
    // Flatten relationship fields
    const contributors = result.records.map((record) => {
      const flattened = { ...record };
      
      // Flatten Account relationship
      if (record.Account) {
        flattened['Account.Name'] = record.Account.Name || '';
        flattened['AccountId'] = record.AccountId || '';
      }
      
      return flattened;
    });
    
    res.json({
      success: true,
      contributors: contributors,
      totalSize: result.totalSize,
      hasMore: contributors.length === parseInt(limit)
    });
  } catch (error) {
    console.error('Error fetching Onboarding Contributors:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch Onboarding Contributors'
    });
  }
}));

// Get available fields for Contact object
router.get('/fields', authenticate, authorize('view_project', 'all'), asyncHandler(async (req, res) => {
  try {
    const conn = await getSalesforceConnection();
    const describeResult = await conn.sobject('Contact').describe();
    
    const fields = describeResult.fields
      .filter(field => 
        field.type !== 'base64' && 
        !field.name.startsWith('Jigsaw') &&
        field.name !== 'IsDeleted' &&
        field.name !== 'MasterRecordId' &&
        field.name !== 'HasOptedOutOfEmail' &&
        field.name !== 'HasOptedOutOfFax'
      )
      .map(field => ({
        name: field.name,
        label: field.label,
        type: field.type,
        updateable: field.updateable,
        createable: field.createable,
        picklistValues: field.picklistValues ? field.picklistValues.map(pv => pv.value) : null,
        referenceTo: field.referenceTo && field.referenceTo.length > 0 ? field.referenceTo[0] : null,
        relationshipName: field.relationshipName || null
      }));
    
    res.json({
      success: true,
      fields: fields
    });
  } catch (error) {
    console.error('Error fetching Contact fields:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch Contact fields'
    });
  }
}));

module.exports = router;

