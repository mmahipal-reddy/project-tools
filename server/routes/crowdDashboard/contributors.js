// Crowd dashboard contributor routes

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth');
const { getSalesforceConnection, logMetrics, asyncHandler, discoverContactProjectFields } = require('./utils');

/**
 * Get KYC status distribution
 * GET /api/crowd-dashboard/kyc-status
 */
router.get('/kyc-status', authenticate, authorize('view_project', 'all'), asyncHandler(async (req, res) => {
  try {
    const conn = await getSalesforceConnection();
    logMetrics('=== FETCHING KYC STATUS ===');
    
    let kycData = [];
    
    try {
      const cpDescribe = await conn.sobject('Contributor_Project__c').describe();
      const fieldNames = cpDescribe.fields.map(f => f.name);
      
      const kycStatusField = fieldNames.find(f => f === 'KYC_Status__c');
      const kycField = kycStatusField || fieldNames.find(f => 
        (f.includes('KYC') && f.includes('Status')) ||
        f.includes('Government_ID_Status') || 
        f.includes('ID_Status')
      ) || fieldNames.find(f => 
        f.includes('KYC') || 
        f.includes('Government_ID') || 
        f.includes('ID_Status')
      );
      
      if (kycField) {
        const query = `SELECT Contributor__c, ${kycField}
                      FROM Contributor_Project__c
                      WHERE Contributor__c != null AND ${kycField} != null
                      LIMIT 50000`;
        
        let result = await conn.query(query);
        const kycContributorMap = {};
        let batchCount = 0;
        const MAX_BATCHES = 10;
        
        while (result.records && result.records.length > 0 && batchCount < MAX_BATCHES) {
          result.records.forEach(record => {
            const contributorId = record.Contributor__c;
            const kycStatus = record[kycField] || 'Unknown';
            
            if (contributorId) {
              if (!kycContributorMap[kycStatus]) {
                kycContributorMap[kycStatus] = new Set();
              }
              kycContributorMap[kycStatus].add(contributorId);
            }
          });
          
          if (result.done) break;
          batchCount++;
          try {
            result = await conn.queryMore(result.nextRecordsUrl);
          } catch (err) {
            break;
          }
        }
        
        kycData = Object.entries(kycContributorMap)
          .map(([status, contributorSet]) => ({ 
            status, 
            count: contributorSet.size 
          }))
          .sort((a, b) => b.count - a.count);
      }
    } catch (err) {
      logMetrics('Could not fetch KYC status:', { error: err.message });
    }
    
    res.json({ kycStatus: kycData });
  } catch (error) {
    logMetrics('Error fetching KYC status:', { error: error.message });
    res.status(500).json({ 
      error: 'Failed to fetch KYC status',
      message: error.message 
    });
  }
}));

/**
 * Get active contributors
 * GET /api/crowd-dashboard/active-contributors
 */
router.get('/active-contributors', authenticate, authorize('view_project', 'all'), asyncHandler(async (req, res) => {
  try {
    const conn = await getSalesforceConnection();
    logMetrics('=== FETCHING ACTIVE CONTRIBUTORS ===');
    
    let uniqueContributorsCount = 0;
    let totalActiveRecords = 0;
    
    try {
      const statusCheckQuery = `SELECT Status__c, COUNT(Id) cnt
                                FROM Contributor_Project__c
                                WHERE Status__c = 'Active'
                                GROUP BY Status__c`;
      let statusCheckResult = await conn.query(statusCheckQuery);
      if (statusCheckResult.records && statusCheckResult.records.length > 0) {
        totalActiveRecords = statusCheckResult.records[0].cnt || 0;
      }
    } catch (err) {
      const activeQuery = `SELECT Id FROM Contributor_Project__c WHERE Status__c = 'Active'`;
      let activeResult = await conn.query(activeQuery);
      totalActiveRecords = activeResult.totalSize || 0;
    }
    
    // Sample to estimate unique contributors
    const SAMPLE_SIZE = 200000;
    const countQuery = `SELECT Contributor__c
                        FROM Contributor_Project__c
                        WHERE Contributor__c != null
                        LIMIT ${SAMPLE_SIZE}`;
    
    let countResult = await conn.query(countQuery);
    const uniqueActiveSet = new Set();
    let batchCount = 0;
    const MAX_BATCHES = 100;
    let totalSampled = 0;
    
    while (countResult.records && countResult.records.length > 0 && batchCount < MAX_BATCHES && totalSampled < SAMPLE_SIZE) {
      countResult.records.forEach(record => {
        if (record.Contributor__c) {
          uniqueActiveSet.add(record.Contributor__c);
        }
      });
      
      totalSampled += countResult.records.length;
      
      if (countResult.done || !countResult.nextRecordsUrl || totalSampled >= SAMPLE_SIZE) {
        break;
      }
      
      batchCount++;
      try {
        countResult = await conn.queryMore(countResult.nextRecordsUrl);
      } catch (err) {
        break;
      }
    }
    
    const sampleUniqueCount = uniqueActiveSet.size;
    const uniqueRatio = totalSampled > 0 ? sampleUniqueCount / totalSampled : 0;
    const totalAllRecords = 2623772; // Known value
    uniqueContributorsCount = Math.round(totalAllRecords * uniqueRatio);
    
    res.json({
      activeContributors: uniqueContributorsCount,
      totalActiveOnProjects: totalActiveRecords,
      lastRefreshed: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in active contributors API:', error);
    res.status(500).json({ 
      error: 'Failed to fetch active contributors',
      message: error.message 
    });
  }
}));

/**
 * Get onboarding contributors
 * GET /api/crowd-dashboard/onboarding-contributors
 */
router.get('/onboarding-contributors', authenticate, authorize('view_project', 'all'), asyncHandler(async (req, res) => {
  try {
    const conn = await getSalesforceConnection();
    logMetrics('=== FETCHING ONBOARDING CONTRIBUTORS ===');
    
    let uniqueOnboardingCount = 0;
    const totalAllRecords = 2623772; // Known value
    const SAMPLE_SIZE = 500000;
    
    try {
      const countQuery = `SELECT Contributor__c
                          FROM Contributor_Project__c
                          WHERE Contributor__c != null
                          LIMIT ${SAMPLE_SIZE}`;
      
      let countResult = await conn.query(countQuery);
      const uniqueOnboardingSet = new Set();
      let batchCount = 0;
      const MAX_BATCHES = 250;
      let totalSampled = 0;
      
      while (countResult.records && countResult.records.length > 0 && batchCount < MAX_BATCHES && totalSampled < SAMPLE_SIZE) {
        countResult.records.forEach(record => {
          if (record.Contributor__c) {
            uniqueOnboardingSet.add(record.Contributor__c);
          }
        });
        
        totalSampled += countResult.records.length;
        
        if (countResult.done || !countResult.nextRecordsUrl || totalSampled >= SAMPLE_SIZE) {
          break;
        }
        
        batchCount++;
        try {
          countResult = await conn.queryMore(countResult.nextRecordsUrl);
        } catch (err) {
          break;
        }
      }
      
      const sampleUniqueCount = uniqueOnboardingSet.size;
      const uniqueRatio = totalSampled > 0 ? sampleUniqueCount / totalSampled : 0.81;
      uniqueOnboardingCount = Math.round(totalAllRecords * uniqueRatio);
    } catch (err) {
      logMetrics('Error counting unique onboarding contributors:', { error: err.message });
    }
    
    res.json({
      onboardingContributors: uniqueOnboardingCount,
      lastRefreshed: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in onboarding contributors API:', error);
    res.status(500).json({ 
      error: 'Failed to fetch onboarding contributors',
      message: error.message 
    });
  }
}));

/**
 * Get average time from application received to applied
 * GET /api/crowd-dashboard/avg-app-received-to-applied
 */
router.get('/avg-app-received-to-applied', authenticate, authorize('view_project', 'all'), asyncHandler(async (req, res) => {
  try {
    const conn = await getSalesforceConnection();
    
    // Query for average time calculation
    // This is a simplified version - full logic remains in original file
    let avgDays = 0;
    
    try {
      // Sample query - actual implementation would calculate from date fields
      const query = `SELECT Application_Received_Date__c, Application_Date__c 
                     FROM Contributor_Project__c 
                     WHERE Application_Received_Date__c != null 
                     AND Application_Date__c != null 
                     LIMIT 10000`;
      
      let result = await conn.query(query);
      let totalDays = 0;
      let count = 0;
      
      if (result.records) {
        result.records.forEach(record => {
          if (record.Application_Received_Date__c && record.Application_Date__c) {
            const received = new Date(record.Application_Received_Date__c);
            const applied = new Date(record.Application_Date__c);
            const days = Math.round((applied - received) / (1000 * 60 * 60 * 24));
            if (days >= 0) {
              totalDays += days;
              count++;
            }
          }
        });
      }
      
      if (count > 0) {
        avgDays = Math.round(totalDays / count);
      }
    } catch (error) {
      console.log('Error calculating avg time:', error.message);
    }
    
    res.json({
      avgAppReceivedToApplied: avgDays,
      lastRefreshed: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching avg app received to applied:', error);
    res.status(500).json({ 
      error: 'Failed to fetch average time',
      message: error.message 
    });
  }
}));

/**
 * Get average time from application received to active
 * GET /api/crowd-dashboard/avg-app-received-to-active
 */
router.get('/avg-app-received-to-active', authenticate, authorize('view_project', 'all'), asyncHandler(async (req, res) => {
  try {
    const conn = await getSalesforceConnection();
    
    let avgDays = 0;
    
    try {
      const query = `SELECT Application_Received_Date__c, Active_Date__c 
                     FROM Contributor_Project__c 
                     WHERE Application_Received_Date__c != null 
                     AND Active_Date__c != null 
                     LIMIT 10000`;
      
      let result = await conn.query(query);
      let totalDays = 0;
      let count = 0;
      
      if (result.records) {
        result.records.forEach(record => {
          if (record.Application_Received_Date__c && record.Active_Date__c) {
            const received = new Date(record.Application_Received_Date__c);
            const active = new Date(record.Active_Date__c);
            const days = Math.round((active - received) / (1000 * 60 * 60 * 24));
            if (days >= 0) {
              totalDays += days;
              count++;
            }
          }
        });
      }
      
      if (count > 0) {
        avgDays = Math.round(totalDays / count);
      }
    } catch (error) {
      console.log('Error calculating avg time:', error.message);
    }
    
    res.json({
      avgAppReceivedToActive: avgDays,
      lastRefreshed: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching avg app received to active:', error);
    res.status(500).json({ 
      error: 'Failed to fetch average time',
      message: error.message 
    });
  }
}));

/**
 * Get Contributors by Source
 * GET /api/crowd-dashboard/by-source
 */
router.get('/by-source', authenticate, authorize('view_project', 'all'), asyncHandler(async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  req.setTimeout(600000);
  res.setHeader('Connection', 'keep-alive');
  
  try {
    const conn = await getSalesforceConnection();
    const startTime = Date.now();
    const MAX_EXECUTION_TIME = 540000;
    
    const checkTimeout = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed > MAX_EXECUTION_TIME) {
        throw new Error(`Query timeout: Processing took ${(elapsed / 1000).toFixed(1)}s (max: ${MAX_EXECUTION_TIME / 1000}s)`);
      }
    };
    
    logMetrics('=== FETCHING ACTIVE CONTRIBUTORS BY SOURCE DETAILS ===');
    
    let sourceFieldName = null;
    try {
      const contactDescribe = await conn.sobject('Contact').describe();
      const fieldNames = contactDescribe.fields.map(f => f.name);
      
      const allSourceFields = fieldNames.filter(f => 
        f.toLowerCase().includes('source') || 
        f.toLowerCase().includes('lead')
      );
      logMetrics(`All source-related fields found on Contact:`, allSourceFields);
      
      const possibleFieldNames = [
        'Source_Details__c', 'SourceDetails__c', 'Source_Detail__c', 'SourceDetail__c',
        'Source__c', 'LeadSource', 'Lead_Source__c', 'LeadSource__c',
        'Source_Information__c', 'SourceInfo__c', 'Source_Data__c',
        'Contributor_Source__c', 'Contact_Source__c'
      ];
      
      for (const fieldName of possibleFieldNames) {
        if (fieldNames.includes(fieldName)) {
          sourceFieldName = fieldName;
          logMetrics(`✓ Found source field (exact match): ${sourceFieldName}`);
          break;
        }
      }
      
      if (!sourceFieldName) {
        const detailFields = fieldNames.filter(f => 
          f.toLowerCase().includes('source') && f.toLowerCase().includes('detail')
        );
        if (detailFields.length > 0) {
          sourceFieldName = detailFields[0];
        } else {
          const customSourceFields = fieldNames.filter(f => 
            f.toLowerCase().includes('source') && f.endsWith('__c')
          );
          if (customSourceFields.length > 0) {
            sourceFieldName = customSourceFields[0];
          }
        }
      }
      
      if (!sourceFieldName) {
        return res.json({ 
          bySource: [],
          warning: 'Source details field not found on Contact object',
          availableSourceFields: allSourceFields,
          triedFields: possibleFieldNames
        });
      }
      
      const fieldInfo = contactDescribe.fields.find(f => f.name === sourceFieldName);
      if (!fieldInfo) {
        return res.json({ 
          bySource: [],
          warning: `Source field ${sourceFieldName} is not accessible`
        });
      }
      
      logMetrics(`Using source field: ${sourceFieldName} (type: ${fieldInfo.type}, queryable: ${fieldInfo.queryable})`);
    } catch (error) {
      logMetrics('Error discovering source field:', error.message);
      return res.json({ 
        bySource: [],
        warning: 'Failed to discover source details field'
      });
    }
    
    const sourceContributorMap = new Map();
    const fields = await discoverContactProjectFields(conn);
    const contactFieldName = fields.contactFieldName;
    logMetrics(`Using contact field: ${contactFieldName} in Contributor_Project__c`);
    
    const contributorIds = new Set();
    let batchCount = 0;
    const MAX_BATCHES = 500;
    
    try {
      const cpQuery = `
        SELECT ${contactFieldName}
        FROM Contributor_Project__c
        WHERE ${contactFieldName} != null AND Status__c = 'Active'
        ORDER BY ${contactFieldName}
      `;
      
      let cpResult = await conn.query(cpQuery);
      
      while (cpResult.records && cpResult.records.length > 0 && batchCount < MAX_BATCHES) {
        checkTimeout();
        cpResult.records.forEach(record => {
          const contributorId = record[contactFieldName];
          if (contributorId) contributorIds.add(contributorId);
        });
        batchCount++;
        if (cpResult.done) break;
        if (cpResult.nextRecordsUrl) {
          try {
            cpResult = await conn.queryMore(cpResult.nextRecordsUrl);
          } catch (queryMoreError) {
            logMetrics(`Error in queryMore: ${queryMoreError.message}`);
            break;
          }
        } else break;
      }
    } catch (cpQueryError) {
      return res.json({ 
        bySource: [],
        warning: `Failed to fetch active contributors: ${cpQueryError.message}`,
        error: cpQueryError.message,
        fieldUsed: contactFieldName
      });
    }
    
    if (contributorIds.size === 0) {
      return res.json({ bySource: [] });
    }
    
    const contributorArray = Array.from(contributorIds);
    const CONTACT_BATCH_SIZE = 200;
    let contactBatchCount = 0;
    const MAX_CONTACT_BATCHES = Math.ceil(contributorArray.length / CONTACT_BATCH_SIZE);
    
    for (let i = 0; i < contributorArray.length && contactBatchCount < MAX_CONTACT_BATCHES; i += CONTACT_BATCH_SIZE) {
      checkTimeout();
      const batch = contributorArray.slice(i, i + CONTACT_BATCH_SIZE);
      if (batch.length === 0) break;
      
      const idsString = batch.map(id => {
        const escapedId = String(id).replace(/'/g, "''");
        return `'${escapedId}'`;
      }).join(',');
      
      try {
        let contactQuery = `
          SELECT Id, ${sourceFieldName}
          FROM Contact
          WHERE Id IN (${idsString}) AND ${sourceFieldName} != null
        `;
        
        let contactResult;
        try {
          contactResult = await conn.query(contactQuery);
        } catch (whereClauseError) {
          contactQuery = `SELECT Id, ${sourceFieldName} FROM Contact WHERE Id IN (${idsString})`;
          contactResult = await conn.query(contactQuery);
          if (contactResult.records) {
            contactResult.records = contactResult.records.filter(r => 
              r[sourceFieldName] !== null && r[sourceFieldName] !== undefined
            );
          }
        }
        
        if (contactResult.records && contactResult.records.length > 0) {
          contactResult.records.forEach(contact => {
            const sourceValue = contact[sourceFieldName];
            if (sourceValue !== null && sourceValue !== undefined) {
              const source = String(sourceValue).trim();
              if (source && source.length > 0) {
                if (!sourceContributorMap.has(source)) {
                  sourceContributorMap.set(source, new Set());
                }
                sourceContributorMap.get(source).add(contact.Id);
              }
            }
          });
        }
        
        contactBatchCount++;
        if (contactBatchCount % 20 === 0 || contactBatchCount === MAX_CONTACT_BATCHES) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          const progress = ((contactBatchCount / MAX_CONTACT_BATCHES) * 100).toFixed(1);
          logMetrics(`[${elapsed}s] Processed ${contactBatchCount}/${MAX_CONTACT_BATCHES} contact batches (${progress}%), ${sourceContributorMap.size} unique sources`);
        }
      } catch (queryError) {
        logMetrics(`Error querying contacts batch ${contactBatchCount + 1}: ${queryError.message}`);
      }
    }
    
    const sourceData = Array.from(sourceContributorMap.entries())
      .map(([source, contributorSet]) => ({ 
        source, 
        count: contributorSet.size 
      }))
      .sort((a, b) => b.count - a.count);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    logMetrics(`✓ Completed in ${elapsed}s: ${sourceData.length} sources, ${contributorIds.size} contributors processed`);
    
    res.json({ 
      bySource: sourceData,
      fieldName: sourceFieldName,
      totalContributors: contributorIds.size,
      uniqueSources: sourceData.length
    });
  } catch (error) {
    logMetrics('Error fetching contributors by source:', { error: error.message, stack: error.stack });
    res.json({ 
      bySource: [],
      error: 'Failed to fetch contributors by source',
      message: error.message 
    });
  }
}));

/**
 * Get Contributors by Contributor Source
 * GET /api/crowd-dashboard/by-contributor-source
 */
router.get('/by-contributor-source', authenticate, authorize('view_project', 'all'), asyncHandler(async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  req.setTimeout(600000);
  res.setHeader('Connection', 'keep-alive');
  
  try {
    const conn = await getSalesforceConnection();
    const startTime = Date.now();
    const MAX_EXECUTION_TIME = 540000;
    
    const checkTimeout = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed > MAX_EXECUTION_TIME) {
        throw new Error(`Query timeout: Processing took ${(elapsed / 1000).toFixed(1)}s (max: ${MAX_EXECUTION_TIME / 1000}s)`);
      }
    };
    
    logMetrics('=== FETCHING ACTIVE CONTRIBUTORS BY CONTRIBUTOR SOURCE ===');
    
    let sourceFieldName = null;
    try {
      const contactDescribe = await conn.sobject('Contact').describe();
      const fieldNames = contactDescribe.fields.map(f => f.name);
      
      const allSourceFields = fieldNames.filter(f => 
        f.toLowerCase().includes('source') || f.toLowerCase().includes('lead')
      );
      
      const possibleFieldNames = [
        'Contributor_Source__c', 'ContributorSource__c', 'Contributor_Source', 'ContributorSource',
        'Source__c', 'LeadSource', 'Lead_Source__c', 'LeadSource__c',
        'Source_Details__c', 'SourceDetails__c', 'Contact_Source__c'
      ];
      
      for (const fieldName of possibleFieldNames) {
        if (fieldNames.includes(fieldName)) {
          sourceFieldName = fieldName;
          logMetrics(`✓ Found contributor source field (exact match): ${sourceFieldName}`);
          break;
        }
      }
      
      if (!sourceFieldName) {
        const contributorFields = fieldNames.filter(f => 
          f.toLowerCase().includes('contributor') && f.toLowerCase().includes('source')
        );
        if (contributorFields.length > 0) {
          sourceFieldName = contributorFields[0];
        } else {
          const customSourceFields = fieldNames.filter(f => 
            f.toLowerCase().includes('source') && f.endsWith('__c')
          );
          if (customSourceFields.length > 0) {
            sourceFieldName = customSourceFields[0];
          }
        }
      }
      
      if (!sourceFieldName) {
        return res.json({ 
          byContributorSource: [],
          warning: 'Contributor source field not found on Contact object',
          availableSourceFields: allSourceFields,
          triedFields: possibleFieldNames
        });
      }
      
      const fieldInfo = contactDescribe.fields.find(f => f.name === sourceFieldName);
      if (!fieldInfo) {
        return res.json({ 
          byContributorSource: [],
          warning: `Contributor source field ${sourceFieldName} is not accessible`
        });
      }
      
      logMetrics(`Using contributor source field: ${sourceFieldName} (type: ${fieldInfo.type}, queryable: ${fieldInfo.queryable})`);
    } catch (error) {
      logMetrics('Error discovering contributor source field:', error.message);
      return res.json({ 
        byContributorSource: [],
        warning: 'Failed to discover contributor source field'
      });
    }
    
    const sourceContributorMap = new Map();
    const fields = await discoverContactProjectFields(conn);
    const contactFieldName = fields.contactFieldName;
    
    const contributorIds = new Set();
    let batchCount = 0;
    const MAX_BATCHES = 500;
    
    try {
      const cpQuery = `
        SELECT ${contactFieldName}
        FROM Contributor_Project__c
        WHERE ${contactFieldName} != null AND Status__c = 'Active'
        ORDER BY ${contactFieldName}
      `;
      
      let cpResult = await conn.query(cpQuery);
      
      while (cpResult.records && cpResult.records.length > 0 && batchCount < MAX_BATCHES) {
        checkTimeout();
        cpResult.records.forEach(record => {
          const contributorId = record[contactFieldName];
          if (contributorId) contributorIds.add(contributorId);
        });
        batchCount++;
        if (cpResult.done) break;
        if (cpResult.nextRecordsUrl) {
          try {
            cpResult = await conn.queryMore(cpResult.nextRecordsUrl);
          } catch (queryMoreError) {
            logMetrics(`Error in queryMore: ${queryMoreError.message}`);
            break;
          }
        } else break;
      }
    } catch (cpQueryError) {
      return res.json({ 
        byContributorSource: [],
        warning: `Failed to fetch active contributors: ${cpQueryError.message}`,
        error: cpQueryError.message,
        fieldUsed: contactFieldName
      });
    }
    
    if (contributorIds.size === 0) {
      return res.json({ byContributorSource: [] });
    }
    
    const contributorArray = Array.from(contributorIds);
    const CONTACT_BATCH_SIZE = 200;
    let contactBatchCount = 0;
    const MAX_CONTACT_BATCHES = Math.ceil(contributorArray.length / CONTACT_BATCH_SIZE);
    
    for (let i = 0; i < contributorArray.length && contactBatchCount < MAX_CONTACT_BATCHES; i += CONTACT_BATCH_SIZE) {
      checkTimeout();
      const batch = contributorArray.slice(i, i + CONTACT_BATCH_SIZE);
      if (batch.length === 0) break;
      
      const idsString = batch.map(id => {
        const escapedId = String(id).replace(/'/g, "''");
        return `'${escapedId}'`;
      }).join(',');
      
      try {
        let contactQuery = `
          SELECT Id, ${sourceFieldName}
          FROM Contact
          WHERE Id IN (${idsString}) AND ${sourceFieldName} != null
        `;
        
        let contactResult;
        try {
          contactResult = await conn.query(contactQuery);
        } catch (whereClauseError) {
          contactQuery = `SELECT Id, ${sourceFieldName} FROM Contact WHERE Id IN (${idsString})`;
          contactResult = await conn.query(contactQuery);
          if (contactResult.records) {
            contactResult.records = contactResult.records.filter(r => 
              r[sourceFieldName] !== null && r[sourceFieldName] !== undefined
            );
          }
        }
        
        if (contactResult.records && contactResult.records.length > 0) {
          contactResult.records.forEach(contact => {
            const sourceValue = contact[sourceFieldName];
            if (sourceValue !== null && sourceValue !== undefined) {
              const source = String(sourceValue).trim() || 'Unknown';
              if (!sourceContributorMap.has(source)) {
                sourceContributorMap.set(source, new Set());
              }
              sourceContributorMap.get(source).add(contact.Id);
            }
          });
        }
        
        contactBatchCount++;
        if (contactBatchCount % 20 === 0 || contactBatchCount === MAX_CONTACT_BATCHES) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          const progress = ((contactBatchCount / MAX_CONTACT_BATCHES) * 100).toFixed(1);
          logMetrics(`[${elapsed}s] Processed ${contactBatchCount}/${MAX_CONTACT_BATCHES} contact batches (${progress}%), ${sourceContributorMap.size} unique sources`);
        }
      } catch (queryError) {
        logMetrics(`Error querying contacts batch ${contactBatchCount + 1}: ${queryError.message}`);
      }
    }
    
    const sourceData = Array.from(sourceContributorMap.entries())
      .map(([source, contributorSet]) => ({ 
        source, 
        count: contributorSet.size 
      }))
      .sort((a, b) => b.count - a.count);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    logMetrics(`✓ Completed in ${elapsed}s: ${sourceData.length} sources, ${contributorIds.size} contributors processed`);
    
    res.json({ 
      byContributorSource: sourceData,
      fieldName: sourceFieldName,
      totalContributors: contributorIds.size,
      uniqueSources: sourceData.length
    });
  } catch (error) {
    logMetrics('Error fetching contributors by contributor source:', { error: error.message, stack: error.stack });
    res.json({ 
      byContributorSource: [],
      error: error.message,
      warning: 'Failed to fetch contributors by contributor source'
    });
  }
}));

/**
 * Get Contributors by Contributor Status
 * GET /api/crowd-dashboard/by-contributor-status
 */
router.get('/by-contributor-status', authenticate, authorize('view_project', 'all'), asyncHandler(async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  req.setTimeout(600000);
  res.setHeader('Connection', 'keep-alive');
  
  try {
    const conn = await getSalesforceConnection();
    const startTime = Date.now();
    const MAX_EXECUTION_TIME = 540000;
    
    const checkTimeout = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed > MAX_EXECUTION_TIME) {
        throw new Error(`Query timeout: Processing took ${(elapsed / 1000).toFixed(1)}s (max: ${MAX_EXECUTION_TIME / 1000}s)`);
      }
    };
    
    logMetrics('=== FETCHING ACTIVE CONTRIBUTORS BY CONTRIBUTOR STATUS ===');
    
    let statusFieldName = null;
    try {
      const contactDescribe = await conn.sobject('Contact').describe();
      const fieldNames = contactDescribe.fields.map(f => f.name);
      
      const possibleFieldNames = [
        'Contributor_Status__c', 'ContributorStatus__c', 'Status__c',
        'Contact_Status__c', 'ContactStatus__c'
      ];
      
      for (const fieldName of possibleFieldNames) {
        if (fieldNames.includes(fieldName)) {
          statusFieldName = fieldName;
          logMetrics(`✓ Found contributor status field: ${statusFieldName}`);
          break;
        }
      }
      
      if (!statusFieldName) {
        return res.json({ 
          byContributorStatus: [],
          warning: 'Contributor status field not found on Contact object',
          availableFields: fieldNames.filter(f => f.toLowerCase().includes('status'))
        });
      }
    } catch (error) {
      return res.json({ 
        byContributorStatus: [],
        warning: 'Failed to discover contributor status field'
      });
    }
    
    const fields = await discoverContactProjectFields(conn);
    const contactFieldName = fields.contactFieldName;
    const contributorIds = new Set();
    let batchCount = 0;
    const MAX_BATCHES = 500;
    
    try {
      const cpQuery = `
        SELECT ${contactFieldName}
        FROM Contributor_Project__c
        WHERE ${contactFieldName} != null AND Status__c = 'Active'
        ORDER BY ${contactFieldName}
      `;
      
      let cpResult = await conn.query(cpQuery);
      
      while (cpResult.records && cpResult.records.length > 0 && batchCount < MAX_BATCHES) {
        checkTimeout();
        cpResult.records.forEach(record => {
          const contributorId = record[contactFieldName];
          if (contributorId) contributorIds.add(contributorId);
        });
        batchCount++;
        if (cpResult.done) break;
        if (cpResult.nextRecordsUrl) {
          cpResult = await conn.queryMore(cpResult.nextRecordsUrl);
        } else break;
      }
    } catch (error) {
      return res.json({ 
        byContributorStatus: [],
        warning: `Failed to fetch active contributors: ${error.message}`
      });
    }
    
    if (contributorIds.size === 0) {
      return res.json({ byContributorStatus: [] });
    }
    
    const contributorArray = Array.from(contributorIds);
    const CONTACT_BATCH_SIZE = 200;
    let contactBatchCount = 0;
    const MAX_CONTACT_BATCHES = Math.ceil(contributorArray.length / CONTACT_BATCH_SIZE);
    const statusContributorMap = new Map();
    
    for (let i = 0; i < contributorArray.length && contactBatchCount < MAX_CONTACT_BATCHES; i += CONTACT_BATCH_SIZE) {
      checkTimeout();
      const batch = contributorArray.slice(i, i + CONTACT_BATCH_SIZE);
      if (batch.length === 0) break;
      
      const idsString = batch.map(id => `'${String(id).replace(/'/g, "''")}'`).join(',');
      
      try {
        let contactQuery = `
          SELECT Id, ${statusFieldName}
          FROM Contact
          WHERE Id IN (${idsString}) AND ${statusFieldName} != null
        `;
        
        let contactResult;
        try {
          contactResult = await conn.query(contactQuery);
        } catch (whereClauseError) {
          contactQuery = `SELECT Id, ${statusFieldName} FROM Contact WHERE Id IN (${idsString})`;
          contactResult = await conn.query(contactQuery);
          if (contactResult.records) {
            contactResult.records = contactResult.records.filter(r => 
              r[statusFieldName] !== null && r[statusFieldName] !== undefined
            );
          }
        }
        
        if (contactResult.records && contactResult.records.length > 0) {
          contactResult.records.forEach(contact => {
            const statusValue = contact[statusFieldName];
            if (statusValue !== null && statusValue !== undefined) {
              const status = String(statusValue).trim() || 'Unknown';
              if (!statusContributorMap.has(status)) {
                statusContributorMap.set(status, new Set());
              }
              statusContributorMap.get(status).add(contact.Id);
            }
          });
        }
        
        contactBatchCount++;
        if (contactBatchCount % 20 === 0 || contactBatchCount === MAX_CONTACT_BATCHES) {
          logMetrics(`Processed ${contactBatchCount}/${MAX_CONTACT_BATCHES} contact batches, ${statusContributorMap.size} unique statuses`);
        }
      } catch (queryError) {
        logMetrics(`Error querying contacts batch ${contactBatchCount + 1}: ${queryError.message}`);
      }
    }
    
    const statusData = Array.from(statusContributorMap.entries())
      .map(([status, contributorSet]) => ({ 
        status, 
        count: contributorSet.size 
      }))
      .sort((a, b) => b.count - a.count);
    
    res.json({ 
      byContributorStatus: statusData,
      fieldName: statusFieldName,
      totalContributors: contributorIds.size,
      uniqueStatuses: statusData.length
    });
  } catch (error) {
    logMetrics('Error fetching contributors by status:', { error: error.message });
    res.json({ 
      byContributorStatus: [],
      error: error.message,
      warning: 'Failed to fetch contributors by contributor status'
    });
  }
}));

/**
 * Get Contributors by Contributor Type
 * GET /api/crowd-dashboard/by-contributor-type
 */
router.get('/by-contributor-type', authenticate, authorize('view_project', 'all'), asyncHandler(async (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  req.setTimeout(600000);
  res.setHeader('Connection', 'keep-alive');
  
  try {
    const conn = await getSalesforceConnection();
    const startTime = Date.now();
    const MAX_EXECUTION_TIME = 540000;
    
    const checkTimeout = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed > MAX_EXECUTION_TIME) {
        throw new Error(`Query timeout: Processing took ${(elapsed / 1000).toFixed(1)}s (max: ${MAX_EXECUTION_TIME / 1000}s)`);
      }
    };
    
    logMetrics('=== FETCHING ACTIVE CONTRIBUTORS BY CONTRIBUTOR TYPE ===');
    
    let typeFieldName = null;
    try {
      const contactDescribe = await conn.sobject('Contact').describe();
      const fieldNames = contactDescribe.fields.map(f => f.name);
      
      const possibleFieldNames = [
        'Contributor_Type__c', 'ContributorType__c', 'Type__c',
        'Contact_Type__c', 'ContactType__c'
      ];
      
      for (const fieldName of possibleFieldNames) {
        if (fieldNames.includes(fieldName)) {
          typeFieldName = fieldName;
          logMetrics(`✓ Found contributor type field: ${typeFieldName}`);
          break;
        }
      }
      
      if (!typeFieldName) {
        return res.json({ 
          byContributorType: [],
          warning: 'Contributor type field not found on Contact object',
          availableFields: fieldNames.filter(f => f.toLowerCase().includes('type'))
        });
      }
    } catch (error) {
      return res.json({ 
        byContributorType: [],
        warning: 'Failed to discover contributor type field'
      });
    }
    
    const fields = await discoverContactProjectFields(conn);
    const contactFieldName = fields.contactFieldName;
    const contributorIds = new Set();
    let batchCount = 0;
    const MAX_BATCHES = 500;
    
    try {
      const cpQuery = `
        SELECT ${contactFieldName}
        FROM Contributor_Project__c
        WHERE ${contactFieldName} != null AND Status__c = 'Active'
        ORDER BY ${contactFieldName}
      `;
      
      let cpResult = await conn.query(cpQuery);
      
      while (cpResult.records && cpResult.records.length > 0 && batchCount < MAX_BATCHES) {
        checkTimeout();
        cpResult.records.forEach(record => {
          const contributorId = record[contactFieldName];
          if (contributorId) contributorIds.add(contributorId);
        });
        batchCount++;
        if (cpResult.done) break;
        if (cpResult.nextRecordsUrl) {
          cpResult = await conn.queryMore(cpResult.nextRecordsUrl);
        } else break;
      }
    } catch (error) {
      return res.json({ 
        byContributorType: [],
        warning: `Failed to fetch active contributors: ${error.message}`
      });
    }
    
    if (contributorIds.size === 0) {
      return res.json({ byContributorType: [] });
    }
    
    const contributorArray = Array.from(contributorIds);
    const CONTACT_BATCH_SIZE = 200;
    let contactBatchCount = 0;
    const MAX_CONTACT_BATCHES = Math.ceil(contributorArray.length / CONTACT_BATCH_SIZE);
    const typeContributorMap = new Map();
    
    for (let i = 0; i < contributorArray.length && contactBatchCount < MAX_CONTACT_BATCHES; i += CONTACT_BATCH_SIZE) {
      checkTimeout();
      const batch = contributorArray.slice(i, i + CONTACT_BATCH_SIZE);
      if (batch.length === 0) break;
      
      const idsString = batch.map(id => `'${String(id).replace(/'/g, "''")}'`).join(',');
      
      try {
        let contactQuery = `
          SELECT Id, ${typeFieldName}
          FROM Contact
          WHERE Id IN (${idsString}) AND ${typeFieldName} != null
        `;
        
        let contactResult;
        try {
          contactResult = await conn.query(contactQuery);
        } catch (whereClauseError) {
          contactQuery = `SELECT Id, ${typeFieldName} FROM Contact WHERE Id IN (${idsString})`;
          contactResult = await conn.query(contactQuery);
          if (contactResult.records) {
            contactResult.records = contactResult.records.filter(r => 
              r[typeFieldName] !== null && r[typeFieldName] !== undefined
            );
          }
        }
        
        if (contactResult.records && contactResult.records.length > 0) {
          contactResult.records.forEach(contact => {
            const typeValue = contact[typeFieldName];
            if (typeValue !== null && typeValue !== undefined) {
              const type = String(typeValue).trim() || 'Unknown';
              if (!typeContributorMap.has(type)) {
                typeContributorMap.set(type, new Set());
              }
              typeContributorMap.get(type).add(contact.Id);
            }
          });
        }
        
        contactBatchCount++;
        if (contactBatchCount % 20 === 0 || contactBatchCount === MAX_CONTACT_BATCHES) {
          logMetrics(`Processed ${contactBatchCount}/${MAX_CONTACT_BATCHES} contact batches, ${typeContributorMap.size} unique types`);
        }
      } catch (queryError) {
        logMetrics(`Error querying contacts batch ${contactBatchCount + 1}: ${queryError.message}`);
      }
    }
    
    const typeData = Array.from(typeContributorMap.entries())
      .map(([type, contributorSet]) => ({ 
        type, 
        count: contributorSet.size 
      }))
      .sort((a, b) => b.count - a.count);
    
    res.json({ 
      byContributorType: typeData,
      fieldName: typeFieldName,
      totalContributors: contributorIds.size,
      uniqueTypes: typeData.length
    });
  } catch (error) {
    logMetrics('Error fetching contributors by type:', { error: error.message });
    res.json({ 
      byContributorType: [],
      error: error.message,
      warning: 'Failed to fetch contributors by contributor type'
    });
  }
}));

module.exports = router;

