// Crowd dashboard demographics routes (by-age, by-gender, by-education, etc.)

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth');
const { getSalesforceConnection, logMetrics, asyncHandler, discoverContactProjectFields, discoverCountryLanguageFields } = require('./utils');

/**
 * Helper function to get active contributor IDs
 */
async function getActiveContributorIds(conn) {
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
      cpResult.records.forEach(record => {
        const contributorId = record[contactFieldName];
        if (contributorId) contributorIds.add(contributorId);
      });
      batchCount++;
      if (batchCount % 50 === 0) {
        console.log(`[getActiveContributorIds] Processed ${batchCount} batches, ${contributorIds.size} unique contributors so far...`);
      }
      if (cpResult.done || !cpResult.nextRecordsUrl) break;
      try {
        cpResult = await conn.queryMore(cpResult.nextRecordsUrl);
      } catch (queryError) {
        console.error('[getActiveContributorIds] Error in queryMore:', queryError.message);
        break;
      }
    }
    console.log(`[getActiveContributorIds] Found ${contributorIds.size} unique active contributors`);
  } catch (error) {
    console.error('[getActiveContributorIds] Error fetching active contributors:', error);
    throw error;
  }
  
  return Array.from(contributorIds);
}

/**
 * Get contributors by age
 * GET /api/crowd-dashboard/by-age
 */
router.get('/by-age', authenticate, authorize('view_project', 'all'), asyncHandler(async (req, res) => {
  // Prevent caching
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  req.setTimeout(600000); // 10 minutes
  
  try {
    const conn = await getSalesforceConnection();
    
    console.log('[by-age] Starting to fetch active contributors...');
    const contributorIds = await getActiveContributorIds(conn);
    
    if (contributorIds.length === 0) {
      console.log('[by-age] No active contributors found, returning empty array');
      return res.json({ byAge: [] });
    }
    
    // Discover age field on Contact
    const contactDescribe = await conn.sobject('Contact').describe();
    const ageField = contactDescribe.fields.find(f => 
      f.name.toLowerCase().includes('age') && f.name.includes('__c')
    ) || contactDescribe.fields.find(f => f.name.toLowerCase() === 'age');
    
    if (!ageField) {
      return res.json({ byAge: [] });
    }
    
    // Query Contact records for active contributors in batches
    const CONTACT_BATCH_SIZE = 200;
    const ageGroups = {
      '0-18': 0,
      '19-25': 0,
      '26-35': 0,
      '36-45': 0,
      '46-55': 0,
      '56-65': 0,
      '66+': 0
    };
    
    console.log(`[by-age] Querying ${contributorIds.length} contacts in batches of ${CONTACT_BATCH_SIZE}...`);
    const totalBatches = Math.ceil(contributorIds.length / CONTACT_BATCH_SIZE);
    
    for (let i = 0; i < contributorIds.length; i += CONTACT_BATCH_SIZE) {
      const batch = contributorIds.slice(i, i + CONTACT_BATCH_SIZE);
      const idsString = batch.map(id => `'${String(id).replace(/'/g, "''")}'`).join(',');
      const batchNumber = Math.floor(i / CONTACT_BATCH_SIZE) + 1;
      
      if (batchNumber % 10 === 0 || batchNumber === 1) {
        console.log(`[by-age] Processing contact batch ${batchNumber}/${totalBatches}...`);
      }
      
      const contactQuery = `
        SELECT ${ageField.name}
        FROM Contact
        WHERE Id IN (${idsString}) AND ${ageField.name} != null
      `;
      
      try {
        const contactResult = await conn.query(contactQuery);
        if (contactResult.records) {
          contactResult.records.forEach(record => {
            const age = parseInt(record[ageField.name]);
            if (!isNaN(age)) {
              if (age <= 18) ageGroups['0-18']++;
              else if (age <= 25) ageGroups['19-25']++;
              else if (age <= 35) ageGroups['26-35']++;
              else if (age <= 45) ageGroups['36-45']++;
              else if (age <= 55) ageGroups['46-55']++;
              else if (age <= 65) ageGroups['56-65']++;
              else ageGroups['66+']++;
            }
          });
        }
      } catch (error) {
        console.error(`[by-age] Error querying contact batch ${batchNumber}:`, error.message);
        continue;
      }
    }
    
    const ageData = Object.entries(ageGroups)
      .map(([age, count]) => ({ ageRange: age, count }))
      .sort((a, b) => {
        const aStart = parseInt(a.ageRange.split('-')[0] || a.ageRange.replace('+', ''));
        const bStart = parseInt(b.ageRange.split('-')[0] || b.ageRange.replace('+', ''));
        return aStart - bStart;
      });
    
    console.log(`[by-age] Returning ${ageData.length} age groups`);
    res.json({ byAge: ageData });
  } catch (error) {
    console.error('Error fetching contributors by age:', error);
    res.status(500).json({ 
      error: 'Failed to fetch contributors by age',
      message: error.message 
    });
  }
}));

/**
 * Get contributors by gender
 * GET /api/crowd-dashboard/by-gender
 */
router.get('/by-gender', authenticate, authorize('view_project', 'all'), asyncHandler(async (req, res) => {
  // Prevent caching
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  req.setTimeout(600000);
  
  try {
    const conn = await getSalesforceConnection();
    
    const contributorIds = await getActiveContributorIds(conn);
    
    if (contributorIds.length === 0) {
      return res.json({ byGender: [] });
    }
    
    // Discover gender field on Contact
    const contactDescribe = await conn.sobject('Contact').describe();
    const genderField = contactDescribe.fields.find(f => 
      f.name.toLowerCase().includes('gender') && f.name.includes('__c')
    ) || contactDescribe.fields.find(f => f.name.toLowerCase() === 'gender');
    
    if (!genderField) {
      return res.json({ byGender: [] });
    }
    
    // Query Contact records for active contributors in batches
    const CONTACT_BATCH_SIZE = 200;
    const genderCounts = {};
    
    console.log(`[by-gender] Querying ${contributorIds.length} contacts in batches of ${CONTACT_BATCH_SIZE}...`);
    const totalBatches = Math.ceil(contributorIds.length / CONTACT_BATCH_SIZE);
    
    for (let i = 0; i < contributorIds.length; i += CONTACT_BATCH_SIZE) {
      const batch = contributorIds.slice(i, i + CONTACT_BATCH_SIZE);
      const idsString = batch.map(id => `'${String(id).replace(/'/g, "''")}'`).join(',');
      const batchNumber = Math.floor(i / CONTACT_BATCH_SIZE) + 1;
      
      if (batchNumber % 10 === 0 || batchNumber === 1) {
        console.log(`[by-gender] Processing contact batch ${batchNumber}/${totalBatches}...`);
      }
      
      const contactQuery = `
        SELECT ${genderField.name}
        FROM Contact
        WHERE Id IN (${idsString}) AND ${genderField.name} != null
      `;
      
      try {
        const contactResult = await conn.query(contactQuery);
        if (contactResult.records) {
          contactResult.records.forEach(record => {
            const gender = record[genderField.name] || 'Unknown';
            genderCounts[gender] = (genderCounts[gender] || 0) + 1;
          });
        }
      } catch (error) {
        console.error(`[by-gender] Error querying contact batch ${batchNumber}:`, error.message);
        continue;
      }
    }
    
    const genderData = Object.entries(genderCounts)
      .map(([gender, count]) => ({ gender, count }))
      .sort((a, b) => b.count - a.count);
    
    res.json({ byGender: genderData });
  } catch (error) {
    console.error('Error fetching contributors by gender:', error);
    res.status(500).json({ 
      error: 'Failed to fetch contributors by gender',
      message: error.message 
    });
  }
}));

/**
 * Get contributors by education
 * GET /api/crowd-dashboard/by-education
 */
router.get('/by-education', authenticate, authorize('view_project', 'all'), asyncHandler(async (req, res) => {
  // Prevent caching
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  req.setTimeout(600000);
  
  try {
    const conn = await getSalesforceConnection();
    
    const contributorIds = await getActiveContributorIds(conn);
    
    if (contributorIds.length === 0) {
      return res.json({ byEducation: [] });
    }
    
    // Discover education field on Contact
    const contactDescribe = await conn.sobject('Contact').describe();
    const educationField = contactDescribe.fields.find(f => 
      f.name.toLowerCase().includes('education') && f.name.includes('__c')
    );
    
    if (!educationField) {
      return res.json({ byEducation: [] });
    }
    
    // Query Contact records for active contributors in batches
    const CONTACT_BATCH_SIZE = 200;
    const educationCounts = {};
    
    console.log(`[by-education] Querying ${contributorIds.length} contacts in batches of ${CONTACT_BATCH_SIZE}...`);
    const totalBatches = Math.ceil(contributorIds.length / CONTACT_BATCH_SIZE);
    
    for (let i = 0; i < contributorIds.length; i += CONTACT_BATCH_SIZE) {
      const batch = contributorIds.slice(i, i + CONTACT_BATCH_SIZE);
      const idsString = batch.map(id => `'${String(id).replace(/'/g, "''")}'`).join(',');
      const batchNumber = Math.floor(i / CONTACT_BATCH_SIZE) + 1;
      
      if (batchNumber % 10 === 0 || batchNumber === 1) {
        console.log(`[by-education] Processing contact batch ${batchNumber}/${totalBatches}...`);
      }
      
      const contactQuery = `
        SELECT ${educationField.name}
        FROM Contact
        WHERE Id IN (${idsString}) AND ${educationField.name} != null
      `;
      
      try {
        const contactResult = await conn.query(contactQuery);
        if (contactResult.records) {
          contactResult.records.forEach(record => {
            const education = record[educationField.name] || 'Unknown';
            educationCounts[education] = (educationCounts[education] || 0) + 1;
          });
        }
      } catch (error) {
        console.error(`[by-education] Error querying contact batch ${batchNumber}:`, error.message);
        continue;
      }
    }
    
    const educationData = Object.entries(educationCounts)
      .map(([education, count]) => ({ education, count }))
      .sort((a, b) => b.count - a.count);
    
    res.json({ byEducation: educationData });
  } catch (error) {
    console.error('Error fetching contributors by education:', error);
    res.status(500).json({ 
      error: 'Failed to fetch contributors by education',
      message: error.message 
    });
  }
}));

/**
 * Get age distribution by country
 * GET /api/crowd-dashboard/demographics/age-by-country
 */
router.get('/demographics/age-by-country', authenticate, authorize('view_project', 'all'), asyncHandler(async (req, res) => {
  // Prevent caching
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  req.setTimeout(600000);
  
  try {
    const conn = await getSalesforceConnection();
    
    const contributorIds = await getActiveContributorIds(conn);
    
    if (contributorIds.length === 0) {
      return res.json([]);
    }
    
    // Discover fields
    const contactDescribe = await conn.sobject('Contact').describe();
    const ageField = contactDescribe.fields.find(f => 
      f.name.toLowerCase().includes('age') && f.name.includes('__c')
    ) || contactDescribe.fields.find(f => f.name.toLowerCase() === 'age');
    
    const countryFields = await discoverCountryLanguageFields(conn);
    const countryField = countryFields.country;
    
    if (!ageField || !countryField) {
      return res.json([]);
    }
    
    // Query Contact records in batches
    const CONTACT_BATCH_SIZE = 200;
    const ageByCountry = {};
    
    for (let i = 0; i < contributorIds.length; i += CONTACT_BATCH_SIZE) {
      const batch = contributorIds.slice(i, i + CONTACT_BATCH_SIZE);
      const idsString = batch.map(id => `'${String(id).replace(/'/g, "''")}'`).join(',');
      
      const contactQuery = `
        SELECT ${ageField.name}, ${countryField}
        FROM Contact
        WHERE Id IN (${idsString}) AND ${ageField.name} != null AND ${countryField} != null
      `;
      
      try {
        const contactResult = await conn.query(contactQuery);
        if (contactResult.records) {
          contactResult.records.forEach(record => {
            const age = parseInt(record[ageField.name]);
            const country = record[countryField] || 'Unknown';
            
            if (!isNaN(age) && country) {
              if (!ageByCountry[country]) {
                ageByCountry[country] = {
                  '0-18': 0, '19-25': 0, '26-35': 0, '36-45': 0,
                  '46-55': 0, '56-65': 0, '66+': 0
                };
              }
              
              if (age <= 18) ageByCountry[country]['0-18']++;
              else if (age <= 25) ageByCountry[country]['19-25']++;
              else if (age <= 35) ageByCountry[country]['26-35']++;
              else if (age <= 45) ageByCountry[country]['36-45']++;
              else if (age <= 55) ageByCountry[country]['46-55']++;
              else if (age <= 65) ageByCountry[country]['56-65']++;
              else ageByCountry[country]['66+']++;
            }
          });
        }
      } catch (error) {
        console.error(`[age-by-country] Error querying contact batch:`, error.message);
        continue;
      }
    }
    
    // Format response
    const result = Object.entries(ageByCountry).map(([country, ageGroups]) => ({
      country,
      ...ageGroups
    }));
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching age by country:', error);
    res.status(500).json({ 
      error: 'Failed to fetch age by country',
      message: error.message 
    });
  }
}));

/**
 * Get gender distribution by country
 * GET /api/crowd-dashboard/demographics/gender-by-country
 */
router.get('/demographics/gender-by-country', authenticate, authorize('view_project', 'all'), asyncHandler(async (req, res) => {
  // Prevent caching
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  req.setTimeout(600000);
  
  try {
    const conn = await getSalesforceConnection();
    
    const contributorIds = await getActiveContributorIds(conn);
    
    if (contributorIds.length === 0) {
      return res.json([]);
    }
    
    // Discover fields
    const contactDescribe = await conn.sobject('Contact').describe();
    const genderField = contactDescribe.fields.find(f => 
      f.name.toLowerCase().includes('gender') && f.name.includes('__c')
    ) || contactDescribe.fields.find(f => f.name.toLowerCase() === 'gender');
    
    const countryFields = await discoverCountryLanguageFields(conn);
    const countryField = countryFields.country;
    
    if (!genderField || !countryField) {
      return res.json([]);
    }
    
    // Query Contact records in batches
    const CONTACT_BATCH_SIZE = 200;
    const genderByCountry = {};
    
    for (let i = 0; i < contributorIds.length; i += CONTACT_BATCH_SIZE) {
      const batch = contributorIds.slice(i, i + CONTACT_BATCH_SIZE);
      const idsString = batch.map(id => `'${String(id).replace(/'/g, "''")}'`).join(',');
      
      const contactQuery = `
        SELECT ${genderField.name}, ${countryField}
        FROM Contact
        WHERE Id IN (${idsString}) AND ${genderField.name} != null AND ${countryField} != null
      `;
      
      try {
        const contactResult = await conn.query(contactQuery);
        if (contactResult.records) {
          contactResult.records.forEach(record => {
            const gender = record[genderField.name] || 'Unknown';
            const country = record[countryField] || 'Unknown';
            
            if (!genderByCountry[country]) {
              genderByCountry[country] = {};
            }
            genderByCountry[country][gender] = (genderByCountry[country][gender] || 0) + 1;
          });
        }
      } catch (error) {
        console.error(`[gender-by-country] Error querying contact batch:`, error.message);
        continue;
      }
    }
    
    // Format response
    const result = Object.entries(genderByCountry).map(([country, genders]) => ({
      country,
      ...genders
    }));
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching gender by country:', error);
    res.status(500).json({ 
      error: 'Failed to fetch gender by country',
      message: error.message 
    });
  }
}));

/**
 * Get education distribution by country
 * GET /api/crowd-dashboard/demographics/education-by-country
 */
router.get('/demographics/education-by-country', authenticate, authorize('view_project', 'all'), asyncHandler(async (req, res) => {
  // Prevent caching
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  req.setTimeout(600000);
  
  try {
    const conn = await getSalesforceConnection();
    
    const contributorIds = await getActiveContributorIds(conn);
    
    if (contributorIds.length === 0) {
      return res.json([]);
    }
    
    // Discover fields
    const contactDescribe = await conn.sobject('Contact').describe();
    const educationField = contactDescribe.fields.find(f => 
      f.name.toLowerCase().includes('education') && f.name.includes('__c')
    );
    
    const countryFields = await discoverCountryLanguageFields(conn);
    const countryField = countryFields.country;
    
    if (!educationField || !countryField) {
      return res.json([]);
    }
    
    // Query Contact records in batches
    const CONTACT_BATCH_SIZE = 200;
    const educationByCountry = {};
    
    for (let i = 0; i < contributorIds.length; i += CONTACT_BATCH_SIZE) {
      const batch = contributorIds.slice(i, i + CONTACT_BATCH_SIZE);
      const idsString = batch.map(id => `'${String(id).replace(/'/g, "''")}'`).join(',');
      
      const contactQuery = `
        SELECT ${educationField.name}, ${countryField}
        FROM Contact
        WHERE Id IN (${idsString}) AND ${educationField.name} != null AND ${countryField} != null
      `;
      
      try {
        const contactResult = await conn.query(contactQuery);
        if (contactResult.records) {
          contactResult.records.forEach(record => {
            const education = record[educationField.name] || 'Unknown';
            const country = record[countryField] || 'Unknown';
            
            if (!educationByCountry[country]) {
              educationByCountry[country] = {};
            }
            educationByCountry[country][education] = (educationByCountry[country][education] || 0) + 1;
          });
        }
      } catch (error) {
        console.error(`[education-by-country] Error querying contact batch:`, error.message);
        continue;
      }
    }
    
    // Format response
    const result = Object.entries(educationByCountry).map(([country, educations]) => ({
      country,
      ...educations
    }));
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching education by country:', error);
    res.status(500).json({ 
      error: 'Failed to fetch education by country',
      message: error.message 
    });
  }
}));

/**
 * Get age vs gender cross-tabulation
 * GET /api/crowd-dashboard/demographics/age-vs-gender
 */
router.get('/demographics/age-vs-gender', authenticate, authorize('view_project', 'all'), asyncHandler(async (req, res) => {
  // Prevent caching
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  req.setTimeout(600000);
  
  try {
    const conn = await getSalesforceConnection();
    
    const contributorIds = await getActiveContributorIds(conn);
    
    if (contributorIds.length === 0) {
      return res.json([]);
    }
    
    // Discover fields
    const contactDescribe = await conn.sobject('Contact').describe();
    const ageField = contactDescribe.fields.find(f => 
      f.name.toLowerCase().includes('age') && f.name.includes('__c')
    ) || contactDescribe.fields.find(f => f.name.toLowerCase() === 'age');
    
    const genderField = contactDescribe.fields.find(f => 
      f.name.toLowerCase().includes('gender') && f.name.includes('__c')
    ) || contactDescribe.fields.find(f => f.name.toLowerCase() === 'gender');
    
    if (!ageField || !genderField) {
      return res.json([]);
    }
    
    // Query Contact records in batches
    const CONTACT_BATCH_SIZE = 200;
    const ageVsGender = {};
    
    for (let i = 0; i < contributorIds.length; i += CONTACT_BATCH_SIZE) {
      const batch = contributorIds.slice(i, i + CONTACT_BATCH_SIZE);
      const idsString = batch.map(id => `'${String(id).replace(/'/g, "''")}'`).join(',');
      
      const contactQuery = `
        SELECT ${ageField.name}, ${genderField.name}
        FROM Contact
        WHERE Id IN (${idsString}) AND ${ageField.name} != null AND ${genderField.name} != null
      `;
      
      try {
        const contactResult = await conn.query(contactQuery);
        if (contactResult.records) {
          contactResult.records.forEach(record => {
            const age = parseInt(record[ageField.name]);
            const gender = record[genderField.name] || 'Unknown';
            
            if (!isNaN(age) && gender) {
              let ageRange;
              if (age <= 18) ageRange = '0-18';
              else if (age <= 25) ageRange = '19-25';
              else if (age <= 35) ageRange = '26-35';
              else if (age <= 45) ageRange = '36-45';
              else if (age <= 55) ageRange = '46-55';
              else if (age <= 65) ageRange = '56-65';
              else ageRange = '66+';
              
              if (!ageVsGender[ageRange]) {
                ageVsGender[ageRange] = {};
              }
              ageVsGender[ageRange][gender] = (ageVsGender[ageRange][gender] || 0) + 1;
            }
          });
        }
      } catch (error) {
        console.error(`[age-vs-gender] Error querying contact batch:`, error.message);
        continue;
      }
    }
    
    // Format response
    const result = Object.entries(ageVsGender).map(([ageRange, genders]) => ({
      ageRange,
      ...genders
    }));
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching age vs gender:', error);
    res.status(500).json({ 
      error: 'Failed to fetch age vs gender',
      message: error.message 
    });
  }
}));

/**
 * Get education vs age cross-tabulation
 * GET /api/crowd-dashboard/demographics/education-vs-age
 */
router.get('/demographics/education-vs-age', authenticate, authorize('view_project', 'all'), asyncHandler(async (req, res) => {
  // Prevent caching
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  req.setTimeout(600000);
  
  try {
    const conn = await getSalesforceConnection();
    
    const contributorIds = await getActiveContributorIds(conn);
    
    if (contributorIds.length === 0) {
      return res.json([]);
    }
    
    // Discover fields
    const contactDescribe = await conn.sobject('Contact').describe();
    const ageField = contactDescribe.fields.find(f => 
      f.name.toLowerCase().includes('age') && f.name.includes('__c')
    ) || contactDescribe.fields.find(f => f.name.toLowerCase() === 'age');
    
    const educationField = contactDescribe.fields.find(f => 
      f.name.toLowerCase().includes('education') && f.name.includes('__c')
    );
    
    if (!ageField || !educationField) {
      return res.json([]);
    }
    
    // Query Contact records in batches
    const CONTACT_BATCH_SIZE = 200;
    const educationVsAge = {};
    
    for (let i = 0; i < contributorIds.length; i += CONTACT_BATCH_SIZE) {
      const batch = contributorIds.slice(i, i + CONTACT_BATCH_SIZE);
      const idsString = batch.map(id => `'${String(id).replace(/'/g, "''")}'`).join(',');
      
      const contactQuery = `
        SELECT ${ageField.name}, ${educationField.name}
        FROM Contact
        WHERE Id IN (${idsString}) AND ${ageField.name} != null AND ${educationField.name} != null
      `;
      
      try {
        const contactResult = await conn.query(contactQuery);
        if (contactResult.records) {
          contactResult.records.forEach(record => {
            const age = parseInt(record[ageField.name]);
            const education = record[educationField.name] || 'Unknown';
            
            if (!isNaN(age) && education) {
              let ageRange;
              if (age <= 18) ageRange = '0-18';
              else if (age <= 25) ageRange = '19-25';
              else if (age <= 35) ageRange = '26-35';
              else if (age <= 45) ageRange = '36-45';
              else if (age <= 55) ageRange = '46-55';
              else if (age <= 65) ageRange = '56-65';
              else ageRange = '66+';
              
              if (!educationVsAge[education]) {
                educationVsAge[education] = {};
              }
              educationVsAge[education][ageRange] = (educationVsAge[education][ageRange] || 0) + 1;
            }
          });
        }
      } catch (error) {
        console.error(`[education-vs-age] Error querying contact batch:`, error.message);
        continue;
      }
    }
    
    // Format response
    const result = Object.entries(educationVsAge).map(([education, ageRanges]) => ({
      education,
      ...ageRanges
    }));
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching education vs age:', error);
    res.status(500).json({ 
      error: 'Failed to fetch education vs age',
      message: error.message 
    });
  }
}));

/**
 * Get demographics summary statistics
 * GET /api/crowd-dashboard/demographics/summary
 */
router.get('/demographics/summary', authenticate, authorize('view_project', 'all'), asyncHandler(async (req, res) => {
  // Prevent caching
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  req.setTimeout(600000);
  
  try {
    const conn = await getSalesforceConnection();
    
    const contributorIds = await getActiveContributorIds(conn);
    const totalContributors = contributorIds.length;
    
    if (totalContributors === 0) {
      return res.json({
        totalContributors: 0,
        withAge: 0,
        withGender: 0,
        withEducation: 0,
        ageCoverage: 0,
        genderCoverage: 0,
        educationCoverage: 0
      });
    }
    
    // Discover fields
    const contactDescribe = await conn.sobject('Contact').describe();
    const ageField = contactDescribe.fields.find(f => 
      f.name.toLowerCase().includes('age') && f.name.includes('__c')
    ) || contactDescribe.fields.find(f => f.name.toLowerCase() === 'age');
    
    const genderField = contactDescribe.fields.find(f => 
      f.name.toLowerCase().includes('gender') && f.name.includes('__c')
    ) || contactDescribe.fields.find(f => f.name.toLowerCase() === 'gender');
    
    const educationField = contactDescribe.fields.find(f => 
      f.name.toLowerCase().includes('education') && f.name.includes('__c')
    );
    
    // Query Contact records in batches to count coverage
    const CONTACT_BATCH_SIZE = 200;
    let withAge = 0;
    let withGender = 0;
    let withEducation = 0;
    
    for (let i = 0; i < contributorIds.length; i += CONTACT_BATCH_SIZE) {
      const batch = contributorIds.slice(i, i + CONTACT_BATCH_SIZE);
      const idsString = batch.map(id => `'${String(id).replace(/'/g, "''")}'`).join(',');
      
      const fieldsToSelect = [];
      if (ageField) fieldsToSelect.push(ageField.name);
      if (genderField) fieldsToSelect.push(genderField.name);
      if (educationField) fieldsToSelect.push(educationField.name);
      
      if (fieldsToSelect.length === 0) break;
      
      const contactQuery = `
        SELECT ${fieldsToSelect.join(', ')}
        FROM Contact
        WHERE Id IN (${idsString})
      `;
      
      try {
        const contactResult = await conn.query(contactQuery);
        if (contactResult.records) {
          contactResult.records.forEach(record => {
            if (ageField && record[ageField.name] != null) withAge++;
            if (genderField && record[genderField.name] != null) withGender++;
            if (educationField && record[educationField.name] != null) withEducation++;
          });
        }
      } catch (error) {
        console.error(`[demographics-summary] Error querying contact batch:`, error.message);
        continue;
      }
    }
    
    const ageCoverage = totalContributors > 0 ? Math.round((withAge / totalContributors) * 100) : 0;
    const genderCoverage = totalContributors > 0 ? Math.round((withGender / totalContributors) * 100) : 0;
    const educationCoverage = totalContributors > 0 ? Math.round((withEducation / totalContributors) * 100) : 0;
    
    res.json({
      totalContributors,
      withAge,
      withGender,
      withEducation,
      ageCoverage,
      genderCoverage,
      educationCoverage
    });
  } catch (error) {
    console.error('Error fetching demographics summary:', error);
    res.status(500).json({ 
      error: 'Failed to fetch demographics summary',
      message: error.message 
    });
  }
}));

module.exports = router;
