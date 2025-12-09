const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const asyncHandler = require('../utils/salesforce/asyncHandler');
const { createSalesforceConnection } = require('../services/salesforce/connectionService');
const { validateAndSanitizeSearchTerm } = require('../utils/security');

/**
 * Get available fields for Payment Adjustments
 * GET /api/payment-adjustments/fields
 */
router.get('/fields', authenticate, authorize('view_project', 'all'), asyncHandler(async (req, res) => {
  try {
    const conn = await createSalesforceConnection();
    
    // Get all fields from Payment_Adjustment__c
    const describeResult = await conn.sobject('Payment_Adjustment__c').describe();
    const allFields = describeResult.fields || [];
    
    // Return all fields from Payment_Adjustment__c (excluding deprecated)
    const fields = allFields
      .filter(field => !field.deprecated)
      .map(field => {
        // Map CreatedById to show as "Created By" in the UI
        let label = field.label;
        if (field.name === 'CreatedById') {
          label = 'Created By';
        }
        return {
          name: field.name,
          label: label,
          type: field.type,
          deprecated: field.deprecated || false
        };
      });
    
    res.json({
      success: true,
      fields: fields
    });
  } catch (error) {
    console.error('Error fetching Payment Adjustments fields:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch Payment Adjustments fields'
    });
  }
}));

/**
 * Get Payment Adjustments data
 * GET /api/payment-adjustments
 * Query params: offset, limit, search, filters
 */
router.get('/', authenticate, authorize('view_project', 'all'), asyncHandler(async (req, res) => {
  try {
    const conn = await createSalesforceConnection();
    const offset = parseInt(req.query.offset) || 0;
    const limit = parseInt(req.query.limit) || 1000;
    
    // Parse filters with error handling
    let filters = {};
    if (req.query.filters) {
      try {
        // Decode the filters JSON string if it's URL encoded
        let filtersString = req.query.filters;
        try {
          filtersString = decodeURIComponent(filtersString);
        } catch (e) {
          // If decode fails, use as-is
        }
        filters = JSON.parse(filtersString);
      } catch (parseError) {
        console.error('Error parsing filters:', parseError);
        // If parsing fails, continue with empty filters
        filters = {};
      }
    }
    
    // Build WHERE clause - exclude Closed and Removed statuses
    let whereConditions = ["(Status__c = null OR (Status__c != 'Removed' AND Status__c != 'Closed'))"];
    
    // Add search filter - search by contributor name
    const sanitizedSearch = validateAndSanitizeSearchTerm(req.query.search);
    if (sanitizedSearch) {
      whereConditions.push(`(Contributor__r.Name LIKE '%${sanitizedSearch}%' OR Contributor__r.FirstName LIKE '%${sanitizedSearch}%' OR Contributor__r.LastName LIKE '%${sanitizedSearch}%')`);
    }
    
    // Add filters
    if (filters && typeof filters === 'object') {
      for (const fieldName of Object.keys(filters)) {
        const filter = filters[fieldName];
        if (filter && typeof filter === 'object' && filter.operator && filter.value !== undefined && filter.value !== '') {
          // Decode URL-encoded value (handle + as space, decodeURIComponent)
          let filterValue = String(filter.value);
          // Replace + with space (URL encoding)
          filterValue = filterValue.replace(/\+/g, ' ');
          // Decode URI component
          try {
            filterValue = decodeURIComponent(filterValue);
          } catch (e) {
            // If decode fails, use as-is
          }
          
          // Validate the decoded value BEFORE any escaping or processing
          // This prevents false positives from SQL injection detection
          const { validateForSqlInjection } = require('../utils/security');
          const validationResult = validateForSqlInjection(filterValue);
          if (!validationResult.isValid) {
            console.warn(`Filter value rejected for ${fieldName}: ${validationResult.error}`);
            // Skip this filter if validation fails
            continue;
          }
          
          let actualFieldName = fieldName;
          
          // Handle Contributor__c filter - if value looks like a name, look up the ID
          if (fieldName === 'Contributor__c' && !filterValue.startsWith('003') && !filterValue.startsWith('a0')) {
            // Value is likely a name, need to look up the ID
            try {
              // Use validateAndSanitizeSearchTerm for the lookup query (validates and sanitizes)
              const sanitizedValue = validateAndSanitizeSearchTerm(filterValue);
              if (!sanitizedValue) {
                // Invalid search term, skip this filter
                continue;
              }
              const contributorQuery = `SELECT Id FROM Contact WHERE Name LIKE '%${sanitizedValue}%' OR FirstName LIKE '%${sanitizedValue}%' OR LastName LIKE '%${sanitizedValue}%' LIMIT 1`;
              const contributorResult = await conn.query(contributorQuery);
              if (contributorResult.records && contributorResult.records.length > 0) {
                filterValue = contributorResult.records[0].Id;
              } else {
                // No matching contributor found, skip this filter
                continue;
              }
            } catch (err) {
              console.error('Error looking up contributor ID:', err);
              // Skip this filter if lookup fails
              continue;
            }
          }
          
          // Handle CreatedBy filter - use CreatedById field instead
          if (fieldName === 'CreatedBy' || fieldName === 'CreatedBy.Id') {
            actualFieldName = 'CreatedById';
            // If value looks like a name, look up the user ID
            if (!filterValue.startsWith('005') && !filterValue.startsWith('00G')) {
              try {
                // Use validateAndSanitizeSearchTerm for the lookup query (validates and sanitizes)
                const sanitizedValue = validateAndSanitizeSearchTerm(filterValue);
                if (!sanitizedValue) {
                  // Invalid search term, skip this filter
                  continue;
                }
                const userQuery = `SELECT Id FROM User WHERE Name LIKE '%${sanitizedValue}%' AND IsActive = true LIMIT 1`;
                const userResult = await conn.query(userQuery);
                if (userResult.records && userResult.records.length > 0) {
                  filterValue = userResult.records[0].Id;
                } else {
                  // No matching user found, skip this filter (don't return empty - let other filters work)
                  continue;
                }
              } catch (err) {
                console.error('Error looking up user ID:', err);
                // Skip this filter if lookup fails (don't return error - let other filters work)
                continue;
              }
            }
          }
          
          // Escape single quotes for SOQL (only for the final WHERE clause, not for lookups)
          const escapedFilterValue = filterValue.replace(/'/g, "''");
          
          // Handle different operators
          switch (filter.operator) {
            case 'equals':
              whereConditions.push(`${actualFieldName} = '${escapedFilterValue}'`);
              break;
            case 'not_equals':
              whereConditions.push(`${actualFieldName} != '${escapedFilterValue}'`);
              break;
            case 'contains':
              // For ID fields, use equals instead of LIKE
              if (actualFieldName.endsWith('__c') && (actualFieldName.includes('Id') || actualFieldName === 'Contributor__c')) {
                whereConditions.push(`${actualFieldName} = '${escapedFilterValue}'`);
              } else {
                whereConditions.push(`${actualFieldName} LIKE '%${escapedFilterValue}%'`);
              }
              break;
            case 'starts_with':
              if (actualFieldName.endsWith('__c') && (actualFieldName.includes('Id') || actualFieldName === 'Contributor__c')) {
                whereConditions.push(`${actualFieldName} = '${escapedFilterValue}'`);
              } else {
                whereConditions.push(`${actualFieldName} LIKE '${escapedFilterValue}%'`);
              }
              break;
            case 'greater_than':
              whereConditions.push(`${actualFieldName} > ${isNaN(filter.value) ? `'${escapedFilterValue}'` : filter.value}`);
              break;
            case 'less_than':
              whereConditions.push(`${actualFieldName} < ${isNaN(filter.value) ? `'${escapedFilterValue}'` : filter.value}`);
              break;
            default:
              whereConditions.push(`${actualFieldName} = '${escapedFilterValue}'`);
          }
        } else if (filter === true || filter === false) {
          // Boolean filter
          whereConditions.push(`${fieldName} = ${filter}`);
        }
      }
    }
    
    // Apply GPC-Filter
    const { applyGPCFilterToWhereClause } = require('../utils/gpcFilterQueryBuilder');
    let whereClause = whereConditions.length > 0 ? whereConditions.join(' AND ') : '';
    whereClause = applyGPCFilterToWhereClause(whereClause, req, { 
      accountField: 'Contributor_Project__r.Project__r.Account__c', 
      projectField: 'Contributor_Project__r.Project__c' 
    });
    const finalWhereClause = whereClause ? `WHERE ${whereClause}` : '';
    
    // Default fields to select
    const defaultFields = [
      'Id',
      'Name',
      'Contributor__c',
      'Contributor__r.Name',
      'Contributor__r.FirstName',
      'Contributor__r.LastName',
      'Contributor_Project__c',
      'Contributor_Project__r.Name',
      'Payment_Adjustment_Amount__c',
      'Adjustment_Type__c',
      'Adjustment_Notes__c',
      'Payment_Adjustment_Date__c',
      'Payment_ID__c',
      'Status__c',
      'CreatedBy.Name',
      'CreatedBy.Id',
      'CreatedDate'
    ];
    
    // Fetch limit + 1 to check if there are more records
    const queryLimit = limit + 1;
    const query = `SELECT ${defaultFields.join(', ')} 
                   FROM Payment_Adjustment__c 
                   ${finalWhereClause}
                   ORDER BY Name
                   LIMIT ${queryLimit}
                   OFFSET ${offset}`;
    
    const result = await conn.query(query);
    const allRecords = result.records || [];
    
    // Check if we got more than the requested limit
    const hasMore = allRecords.length > limit;
    
    // Return only the requested number of records
    const records = hasMore ? allRecords.slice(0, limit) : allRecords;
    
    // Format records
    const formattedRecords = (records || []).map(record => {
      const formatted = {
        Id: record.Id,
        Name: record.Name || '',
        Contributor__c: record.Contributor__c || '',
        Contributor__r: record.Contributor__r ? {
          Name: record.Contributor__r.Name || '',
          FirstName: record.Contributor__r.FirstName || '',
          LastName: record.Contributor__r.LastName || ''
        } : null,
        Contributor_Project__c: record.Contributor_Project__c || '',
        Contributor_Project__r: record.Contributor_Project__r ? {
          Name: record.Contributor_Project__r.Name || ''
        } : null,
        Payment_Adjustment_Amount__c: record.Payment_Adjustment_Amount__c || null,
        Adjustment_Type__c: record.Adjustment_Type__c || '',
        Adjustment_Notes__c: record.Adjustment_Notes__c || '',
        Payment_Adjustment_Date__c: record.Payment_Adjustment_Date__c || null,
        Payment_ID__c: record.Payment_ID__c || '',
        Status__c: record.Status__c || '',
        CreatedBy: record.CreatedBy ? {
          Name: record.CreatedBy.Name || '',
          Id: record.CreatedBy.Id || ''
        } : null,
        CreatedDate: record.CreatedDate || null
      };
      
      return formatted;
    });
    
    // Calculate total - use result.totalSize if available, otherwise estimate
    const totalRecords = result.totalSize || (offset + allRecords.length);
    
    res.json({
      success: true,
      records: formattedRecords,
      hasMore: hasMore,
      total: totalRecords,
      offset: offset,
      limit: limit
    });
  } catch (error) {
    console.error('Error fetching Payment Adjustments:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch Payment Adjustments'
    });
  }
}));

/**
 * Search contributors for Payment Adjustments form
 * GET /api/payment-adjustments/search-contributors?q=searchTerm
 */
router.get('/search-contributors', authenticate, authorize('view_project', 'all'), asyncHandler(async (req, res) => {
  try {
    const conn = await createSalesforceConnection();
    const searchTerm = req.query.q || '';
    
    if (!searchTerm || searchTerm.length < 2) {
      return res.json({
        success: true,
        contributors: []
      });
    }
    
    const sanitizedSearch = validateAndSanitizeSearchTerm(searchTerm);
    if (!sanitizedSearch) {
      return res.json({
        success: true,
        contributors: []
      });
    }
    
    const query = `SELECT Id, Name, FirstName, LastName FROM Contact WHERE (Name LIKE '%${sanitizedSearch}%' OR FirstName LIKE '%${sanitizedSearch}%' OR LastName LIKE '%${sanitizedSearch}%') ORDER BY Name LIMIT 20`;
    const result = await conn.query(query);
    
    res.json({
      success: true,
      contributors: result.records || []
    });
  } catch (error) {
    console.error('Error searching contributors:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to search contributors'
    });
  }
}));

/**
 * Search contributor projects for Payment Adjustments form
 * GET /api/payment-adjustments/search-contributor-projects?q=searchTerm
 */
router.get('/search-contributor-projects', authenticate, authorize('view_project', 'all'), asyncHandler(async (req, res) => {
  try {
    const conn = await createSalesforceConnection();
    const searchTerm = req.query.q || '';
    
    if (!searchTerm || searchTerm.length < 2) {
      return res.json({
        success: true,
        projects: []
      });
    }
    
    const sanitizedSearch = validateAndSanitizeSearchTerm(searchTerm);
    if (!sanitizedSearch) {
      return res.json({
        success: true,
        projects: []
      });
    }
    
    const query = `SELECT Id, Name FROM Contributor_Project__c WHERE Name LIKE '%${sanitizedSearch}%' ORDER BY Name LIMIT 20`;
    const result = await conn.query(query);
    
    res.json({
      success: true,
      projects: result.records || []
    });
  } catch (error) {
    console.error('Error searching contributor projects:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to search contributor projects'
    });
  }
}));

/**
 * Create a new Payment Adjustment
 * POST /api/payment-adjustments
 */
router.post('/', authenticate, authorize('create_project', 'all'), asyncHandler(async (req, res) => {
  try {
    const conn = await createSalesforceConnection();
    const formData = req.body;
    
    // Validate required fields
    if (!formData.Name || formData.Name.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Payment Adjustment Name is required'
      });
    }
    
    // Prepare the record for creation
    const record = {
      Name: formData.Name.trim()
    };
    
    // Add optional fields if provided
    if (formData.Contributor__c) {
      record.Contributor__c = formData.Contributor__c;
    }
    if (formData.Contributor_Project__c) {
      record.Contributor_Project__c = formData.Contributor_Project__c;
    }
    if (formData.Adjustment_Type__c) {
      record.Adjustment_Type__c = formData.Adjustment_Type__c;
    }
    if (formData.Payment_ID__c) {
      record.Payment_ID__c = formData.Payment_ID__c;
    }
    if (formData.Contributor_Facing_Project_Name__c) {
      record.Contributor_Facing_Project_Name__c = formData.Contributor_Facing_Project_Name__c.trim();
    }
    if (formData.Status__c) {
      record.Status__c = formData.Status__c;
    }
    if (formData.Payment_Adjustment_Date__c) {
      record.Payment_Adjustment_Date__c = formData.Payment_Adjustment_Date__c;
    }
    if (formData.Payment_Adjustment_Date_Text__c) {
      record.Payment_Adjustment_Date_Text__c = formData.Payment_Adjustment_Date_Text__c.trim();
    }
    if (formData.Payment_Adjustment_Amount__c !== undefined && formData.Payment_Adjustment_Amount__c !== '') {
      record.Payment_Adjustment_Amount__c = parseFloat(formData.Payment_Adjustment_Amount__c);
    }
    if (formData.Adjustment_Notes__c) {
      record.Adjustment_Notes__c = formData.Adjustment_Notes__c.trim();
    }
    
    // Create the record
    const result = await conn.sobject('Payment_Adjustment__c').create(record);
    
    if (result.success) {
      // Fetch the created record with related data
      const query = `SELECT Id, Name, Contributor__c, Contributor__r.Name, Contributor_Project__c, Contributor_Project__r.Name, Adjustment_Type__c, Payment_ID__c, Contributor_Facing_Project_Name__c, Status__c, Payment_Adjustment_Date__c, Payment_Adjustment_Date_Text__c, Payment_Adjustment_Amount__c, Adjustment_Notes__c, CreatedBy.Name, CreatedDate FROM Payment_Adjustment__c WHERE Id = '${result.id}'`;
      const createdRecord = await conn.query(query);
      
      res.json({
        success: true,
        record: createdRecord.records[0] || { Id: result.id, ...record }
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to create Payment Adjustment',
        details: result.errors
      });
    }
  } catch (error) {
    console.error('Error creating Payment Adjustment:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create Payment Adjustment'
    });
  }
}));

module.exports = router;

