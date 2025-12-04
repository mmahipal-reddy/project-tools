// Crowd dashboard analytics routes (by-country, by-language, by-project, etc.)

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth');
const { getSalesforceConnection, logMetrics, asyncHandler } = require('./utils');

/**
 * Get contributors by country
 * GET /api/crowd-dashboard/by-country
 */
router.get('/by-country', authenticate, authorize('view_project', 'all'), asyncHandler(async (req, res) => {
  try {
    const conn = await getSalesforceConnection();
    
    try {
      const contributorDescribe = await conn.sobject('Contributor__c').describe();
      const countryField = contributorDescribe.fields.find(f => 
        f.name.toLowerCase().includes('country') && f.name.includes('__c')
      ) || contributorDescribe.fields.find(f => f.name.toLowerCase() === 'country');

      if (countryField) {
        const query = `SELECT ${countryField.name}
                      FROM Contributor__c
                      WHERE ${countryField.name} != null
                      LIMIT 5000`;
        
        let result = await conn.query(query);
        const countryCounts = {};
        let batchCount = 0;
        const MAX_BATCHES = 5;
        
        while (result.records && result.records.length > 0 && batchCount < MAX_BATCHES) {
          result.records.forEach(record => {
            const country = record[countryField.name] || 'Unknown';
            countryCounts[country] = (countryCounts[country] || 0) + 1;
          });
          
          if (result.done) break;
          batchCount++;
          result = await conn.queryMore(result.nextRecordsUrl);
        }
        
        const countryData = Object.entries(countryCounts)
          .map(([country, count]) => ({ country, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 50);

        res.json({ byCountry: countryData });
      } else {
        res.json({ byCountry: [] });
      }
    } catch (error) {
      console.log('Could not fetch by country:', error.message);
      res.json({ byCountry: [] });
    }
  } catch (error) {
    console.error('Error fetching contributors by country:', error);
    res.status(500).json({ 
      error: 'Failed to fetch contributors by country',
      message: error.message 
    });
  }
}));

/**
 * Get contributors by language
 * GET /api/crowd-dashboard/by-language
 */
router.get('/by-language', authenticate, authorize('view_project', 'all'), asyncHandler(async (req, res) => {
  try {
    const conn = await getSalesforceConnection();
    
    try {
      const contributorDescribe = await conn.sobject('Contributor__c').describe();
      const languageField = contributorDescribe.fields.find(f => 
        (f.name.toLowerCase().includes('language') && f.name.includes('__c'))
      ) || contributorDescribe.fields.find(f => f.name.toLowerCase() === 'language');

      if (languageField) {
        const query = `SELECT ${languageField.name}
                      FROM Contributor__c
                      WHERE ${languageField.name} != null
                      LIMIT 5000`;
        
        let result = await conn.query(query);
        const languageCounts = {};
        let batchCount = 0;
        const MAX_BATCHES = 5;
        
        while (result.records && result.records.length > 0 && batchCount < MAX_BATCHES) {
          result.records.forEach(record => {
            const language = record[languageField.name] || 'Unknown';
            languageCounts[language] = (languageCounts[language] || 0) + 1;
          });
          
          if (result.done) break;
          batchCount++;
          result = await conn.queryMore(result.nextRecordsUrl);
        }
        
        const languageData = Object.entries(languageCounts)
          .map(([language, count]) => ({ language, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 50);

        res.json({ byLanguage: languageData });
      } else {
        res.json({ byLanguage: [] });
      }
    } catch (error) {
      console.log('Could not fetch by language:', error.message);
      res.json({ byLanguage: [] });
    }
  } catch (error) {
    console.error('Error fetching contributors by language:', error);
    res.status(500).json({ 
      error: 'Failed to fetch contributors by language',
      message: error.message 
    });
  }
}));

/**
 * Get contributors by project
 * GET /api/crowd-dashboard/by-project
 */
router.get('/by-project', authenticate, authorize('view_project', 'all'), asyncHandler(async (req, res) => {
  // Set cache control headers to allow fresh data
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  try {
    const conn = await getSalesforceConnection();
    const startTime = Date.now();
    logMetrics('=== FETCHING ACTIVE CONTRIBUTORS BY PROJECT (FAST OPTIMIZED) ===');
    
    // Discover field names
    const { discoverContactProjectFields } = require('./utils');
    const fields = await discoverContactProjectFields(conn);
    const { contactFieldName, projectFieldName, projectRelationshipName, projectNameField } = fields;
    
    // Optimized approach: Use Map for O(1) lookups and process in single pass
    const projectContributorMap = new Map(); // projectName -> Set of contributor IDs
    let totalRecordsProcessed = 0;
    let batchCount = 0;
    const MAX_BATCHES = 200;
    
    // Build optimized query - use the actual relationship name, not constructed one
    const relationshipField = `${projectRelationshipName}.${projectNameField}`;
    const query = `SELECT ${projectFieldName}, ${relationshipField}, ${contactFieldName}
                  FROM Contributor_Project__c
                  WHERE ${projectFieldName} != null AND ${contactFieldName} != null AND Status__c = 'Active'
                  ORDER BY ${projectFieldName}`; // Order by project for better caching
    
    logMetrics(`Executing optimized query with fields: ${projectFieldName}, ${relationshipField}, ${contactFieldName}`);
    let result = await conn.query(query);
    
    // Process records in streaming fashion for better memory efficiency
    while (result.records && result.records.length > 0 && batchCount < MAX_BATCHES) {
      // Process batch in parallel chunks for speed
      const batchSize = 1000;
      for (let i = 0; i < result.records.length; i += batchSize) {
        const chunk = result.records.slice(i, i + batchSize);
        
        chunk.forEach(record => {
          // Use the actual relationship name from field discovery
          const projectName = record[projectRelationshipName]?.[projectNameField] ||
                            record.Project__r?.Name ||
                            record.Project__r?.name ||
                            null;
          const contributorId = record[contactFieldName] || record.Contributor__c || record.Contact__c;
          
          if (contributorId && projectName) {
            if (!projectContributorMap.has(projectName)) {
              projectContributorMap.set(projectName, new Set());
            }
            projectContributorMap.get(projectName).add(contributorId);
          }
        });
      }
      
      totalRecordsProcessed += result.records.length;
      
      if (result.done) break;
      batchCount++;
      
      if (batchCount % 10 === 0) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        logMetrics(`[${elapsed}s] Processed ${batchCount} batches, ${totalRecordsProcessed} records, ${projectContributorMap.size} unique projects`);
      }
      
      try {
        result = await conn.queryMore(result.nextRecordsUrl);
      } catch (err) {
        logMetrics(`Error in queryMore at batch ${batchCount}: ${err.message}`);
        break;
      }
    }
    
    // Convert to array and sort in descending order (highest count first)
    const projectData = Array.from(projectContributorMap.entries())
      .map(([projectName, contributorSet]) => ({ 
        projectName, 
        count: contributorSet.size 
      }))
      .sort((a, b) => b.count - a.count); // Descending order - largest to smallest

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    logMetrics(`✓ Completed in ${elapsed}s: ${projectData.length} projects, ${totalRecordsProcessed} records processed`);
    logMetrics(`Top 10 projects: ${projectData.slice(0, 10).map(p => `${p.projectName} (${p.count})`).join(', ')}`);
    
    return res.json({ byProject: projectData });
  } catch (error) {
    logMetrics('Error fetching contributors by project:', { error: error.message, stack: error.stack });
    console.error('[Crowd Dashboard] Error fetching by project:', error.message, error.stack);
    if (!res.headersSent) {
      return res.status(500).json({ 
        byProject: [],
        error: 'Failed to fetch project data',
        message: error.message 
      });
    }
  }
}));

/**
 * Get active contributors by country and language
 * GET /api/crowd-dashboard/by-country-language
 */
router.get('/by-country-language', authenticate, authorize('view_project', 'all'), asyncHandler(async (req, res) => {
  try {
    const conn = await getSalesforceConnection();
    const startTime = Date.now();
    const topOnly = req.query.topOnly === 'true' || req.query.topOnly === true;
    
    logMetrics(`=== FETCHING ACTIVE CONTRIBUTORS BY COUNTRY-LANGUAGE (FAST OPTIMIZED) ${topOnly ? '(TOP 20)' : '(ALL DATA)'} ===`);
    
    // Set headers to prevent caching
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    try {
      // Discover field names
      const { discoverContactProjectFields, discoverCountryLanguageFields } = require('./utils');
      const cpFields = await discoverContactProjectFields(conn);
      const contactFields = await discoverCountryLanguageFields(conn);
      const { contactFieldName, contactRelationshipName } = cpFields;
      const { country: countryField, language: languageField } = contactFields;
      
      // Use the actual relationship name, not constructed one
      const actualContactRelationship = contactRelationshipName || (contactFieldName.replace('__c', '__r'));
      
      logMetrics(`Using fields - Contact: ${contactFieldName} (relationship: ${actualContactRelationship}), Country: ${countryField}, Language: ${languageField}`);
      
      // Optimized: Use relationship query to get Contact data directly in one pass
      // This avoids the two-step approach and is much faster
      const countryLanguageMap = new Map(); // country -> Map(language -> Set of contributor IDs)
      let totalRecordsProcessed = 0;
      let batchCount = 0;
      const MAX_BATCHES = 200;
      
      // Try to use relationship query to get Contact fields directly
      // Build query with fallback fields
      const countryFields = [countryField];
      if (countryField !== 'MailingCountry') countryFields.push('MailingCountry');
      if (countryField !== 'OtherCountry') countryFields.push('OtherCountry');
      
      const languageFields = [languageField];
      if (languageField !== 'Primary_Language_Spoken__c') languageFields.push('Primary_Language_Spoken__c');
      if (languageField !== 'Verification_Language__c') languageFields.push('Verification_Language__c');
      
      // Use the actual relationship name
      const relationshipFields = countryFields.map(f => `${actualContactRelationship}.${f}`).join(', ') +
                                 ', ' +
                                 languageFields.map(f => `${actualContactRelationship}.${f}`).join(', ');
      
      try {
        // Try relationship query first (fastest if it works)
        const cpQuery = `SELECT ${actualContactRelationship}.Id, ${relationshipFields}
                       FROM Contributor_Project__c
                       WHERE ${contactFieldName} != null AND Status__c = 'Active'`;
      
        logMetrics('Attempting optimized relationship query...');
        let cpResult = await conn.query(cpQuery);
      
        while (cpResult.records && cpResult.records.length > 0 && batchCount < MAX_BATCHES) {
          cpResult.records.forEach(record => {
            // Use the actual relationship name
            const contact = record[actualContactRelationship] || record.Contributor__r || record.Contact__r;
            if (!contact || !contact.Id) return;
            
            // Get country and language from relationship
            const country = contact[countryField] ||
                          contact.MailingCountry ||
                          contact.OtherCountry ||
                          'Unknown';
            const language = contact[languageField] ||
                           contact.Primary_Language_Spoken__c ||
                           contact.Verification_Language__c ||
                           'Unknown';
            
            if (country !== 'Unknown') {
              if (!countryLanguageMap.has(country)) {
                countryLanguageMap.set(country, new Map());
              }
              const langMap = countryLanguageMap.get(country);
              if (!langMap.has(language)) {
                langMap.set(language, new Set());
              }
              langMap.get(language).add(contact.Id);
            }
          });
          
          totalRecordsProcessed += cpResult.records.length;
        
          if (cpResult.done) break;
          batchCount++;
          
          if (batchCount % 10 === 0) {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            logMetrics(`[${elapsed}s] Processed ${batchCount} batches, ${totalRecordsProcessed} records, ${countryLanguageMap.size} countries`);
          }
          
          try {
            cpResult = await conn.queryMore(cpResult.nextRecordsUrl);
          } catch (err) {
            logMetrics(`Error in queryMore at batch ${batchCount}: ${err.message}`);
            break;
          }
        }
        
        logMetrics(`Relationship query completed: ${countryLanguageMap.size} countries found`);
      } catch (relErr) {
        // Fallback: Two-step approach (slower but more reliable)
        logMetrics(`Relationship query failed: ${relErr.message}. Using optimized two-step approach...`);
        
        // Step 1: Get unique Contact IDs
        const contributorIds = new Set();
        let cpBatchCount = 0;
        const cpQuery = `SELECT ${contactFieldName}
                         FROM Contributor_Project__c
                         WHERE ${contactFieldName} != null AND Status__c = 'Active'`;
        
        let cpResult = await conn.query(cpQuery);
        while (cpResult.records && cpResult.records.length > 0 && cpBatchCount < MAX_BATCHES) {
          cpResult.records.forEach(record => {
            const contactId = record[contactFieldName] || record.Contributor__c || record.Contact__c;
            if (contactId) contributorIds.add(contactId);
          });
          
          if (cpResult.done) break;
          cpBatchCount++;
          
          try {
            cpResult = await conn.queryMore(cpResult.nextRecordsUrl);
          } catch (err) {
            break;
          }
        }
        
        logMetrics(`Found ${contributorIds.size} unique Contact IDs`);
        
        // Step 2: Query Contacts in parallel batches
        const contributorIdArray = Array.from(contributorIds);
        const BATCH_SIZE = 200;
        const PARALLEL_BATCHES = 10; // Increased parallelism
        
        for (let i = 0; i < contributorIdArray.length; i += BATCH_SIZE * PARALLEL_BATCHES) {
          const parallelBatches = [];
          for (let j = 0; j < PARALLEL_BATCHES && (i + j * BATCH_SIZE) < contributorIdArray.length; j++) {
            const batch = contributorIdArray.slice(i + j * BATCH_SIZE, i + j * BATCH_SIZE + BATCH_SIZE);
            if (batch.length > 0) {
              parallelBatches.push(batch);
            }
          }
          
          const batchPromises = parallelBatches.map(async (batch) => {
            const idsString = batch.map(id => {
              const escapedId = String(id).replace(/'/g, "''");
              return `'${escapedId}'`;
            }).join(',');
            const contactQuery = `SELECT Id, ${countryFields.join(', ')}, ${languageFields.join(', ')}
                             FROM Contact
                             WHERE Id IN (${idsString})`;
        
            try {
              const contactResult = await conn.query(contactQuery);
              return contactResult.records || [];
            } catch (err) {
              logMetrics(`Error querying Contact batch: ${err.message}`);
              return [];
            }
          });
          
          const batchResults = await Promise.all(batchPromises);
          
          batchResults.forEach(contacts => {
            contacts.forEach(contact => {
              const country = contact[countryField] ||
                            contact.MailingCountry ||
                            contact.OtherCountry ||
                            'Unknown';
              const language = contact[languageField] ||
                             contact.Primary_Language_Spoken__c ||
                             contact.Verification_Language__c ||
                             'Unknown';
              
              if (country !== 'Unknown') {
                if (!countryLanguageMap.has(country)) {
                  countryLanguageMap.set(country, new Map());
                }
                const langMap = countryLanguageMap.get(country);
                if (!langMap.has(language)) {
                  langMap.set(language, new Set());
                }
                langMap.get(language).add(contact.Id);
              }
            });
          });
          
          if (i % (BATCH_SIZE * PARALLEL_BATCHES * 5) === 0) {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            logMetrics(`[${elapsed}s] Processed ${Math.min(i + BATCH_SIZE * PARALLEL_BATCHES, contributorIdArray.length)}/${contributorIdArray.length} contacts, ${countryLanguageMap.size} countries`);
          }
        }
      }
      
      if (countryLanguageMap.size === 0) {
        logMetrics('No country-language data found');
        return res.json({ byCountryLanguage: [] });
      }
      
      // Get all unique languages
      const allLanguages = new Set();
      countryLanguageMap.forEach(langMap => {
        langMap.forEach((_, lang) => allLanguages.add(lang));
      });
      const sortedLanguages = Array.from(allLanguages).sort();
      
      // Calculate totals and sort countries by total (descending)
      const countryTotals = new Map();
      countryLanguageMap.forEach((langMap, country) => {
        let total = 0;
        langMap.forEach(contributorSet => {
          total += contributorSet.size;
        });
        countryTotals.set(country, total);
      });
      
      // Sort countries by total (descending - largest to smallest)
      const sortedCountries = Array.from(countryLanguageMap.keys()).sort((a, b) => {
        return (countryTotals.get(b) || 0) - (countryTotals.get(a) || 0);
      });
      
      // Build response data (already sorted descending)
      // Format: { country, total, [language1]: count, [language2]: count, ... }
      let countryLanguageData = sortedCountries.map(country => {
        const data = { country, total: countryTotals.get(country) || 0 };
        const langMap = countryLanguageMap.get(country);
        sortedLanguages.forEach(language => {
          const contributorSet = langMap?.get(language);
          data[language] = contributorSet ? contributorSet.size : 0;
        });
        return data;
      });

      // Limit to top 20 if requested
      if (topOnly) {
        countryLanguageData = countryLanguageData.slice(0, 20);
      }
      
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      logMetrics(`✓ Completed in ${elapsed}s: ${countryLanguageData.length} countries, ${totalRecordsProcessed} records`);
      logMetrics(`Top 10: ${sortedCountries.slice(0, 10).map(c => `${c} (${countryTotals.get(c)})`).join(', ')}`);
      
      return res.json({
        byCountryLanguage: countryLanguageData,
        totalCountries: sortedCountries.length,
        isPartial: topOnly || false
      });
    } catch (error) {
      logMetrics('Error in country-language query:', { error: error.message, stack: error.stack });
      console.error('Error fetching country-language data:', error);
      return res.json({ byCountryLanguage: [] });
    }
  } catch (error) {
    logMetrics('Error fetching contributors by country-language:', { error: error.message });
    console.error('Error fetching contributors by country-language:', error);
    if (!res.headersSent) {
      return res.status(500).json({
        error: 'Failed to fetch contributors by country-language',
        message: error.message
      });
    }
  }
}));

module.exports = router;

