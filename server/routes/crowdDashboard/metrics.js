// Crowd dashboard metrics routes

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth');
const { getSalesforceConnection, logMetrics, asyncHandler } = require('./utils');
const { applyGPCFilterToQuery } = require('../../utils/gpcFilterQueryBuilder');

/**
 * Get main crowd metrics
 * GET /api/crowd-dashboard/metrics
 */
router.get('/metrics', authenticate, authorize('view_project', 'all'), asyncHandler(async (req, res) => {
  try {
    const conn = await getSalesforceConnection();
    
    const metrics = {
      targetHC: 0,
      totalApplications: 0,
      totalQualified: 0,
      totalActiveOnProjects: 0,
      totalProductive: 0,
      lastRefreshed: new Date().toISOString()
    };

    // Get data from Project__c
    try {
      let projectQuery = `SELECT Total_Applied__c, Total_Qualified__c
                            FROM Project__c
                            WHERE (Total_Applied__c != null AND Total_Applied__c > 0) 
                               OR (Total_Qualified__c != null AND Total_Qualified__c > 0)
                            LIMIT 5000`;
      
      // Apply GPC filter (filter by Project__c.Id)
      projectQuery = applyGPCFilterToQuery(projectQuery, req, { projectField: 'Id' });
      
      let projectResult = await conn.query(projectQuery);
      let totalApplied = 0;
      let totalQualified = 0;
      let batchCount = 0;
      const MAX_BATCHES = 10;
      
      while (projectResult.records && projectResult.records.length > 0 && batchCount < MAX_BATCHES) {
        projectResult.records.forEach(record => {
          if (record.Total_Applied__c) {
            totalApplied += parseFloat(record.Total_Applied__c) || 0;
          }
          if (record.Total_Qualified__c) {
            totalQualified += parseFloat(record.Total_Qualified__c) || 0;
          }
        });
        
        if (projectResult.done) break;
        batchCount++;
        projectResult = await conn.queryMore(projectResult.nextRecordsUrl);
      }
      
      metrics.totalApplications = Math.round(totalApplied);
      metrics.totalQualified = Math.round(totalQualified);
    } catch (error) {
      console.log('Could not fetch from Project__c:', error.message);
    }

    // Get productive contributors
    try {
      logMetrics('=== FETCHING PRODUCTIVE CONTRIBUTORS ===');
      
      let productiveQuery = `SELECT Status__c, COUNT(Id) cnt
                               FROM Contributor_Project__c
                               WHERE Status__c = 'Production'
                               GROUP BY Status__c`;
      
      // Apply GPC filter
      productiveQuery = applyGPCFilterToQuery(productiveQuery, req);
      
      let productiveResult = await conn.query(productiveQuery);
      
      if (productiveResult.records && productiveResult.records.length > 0) {
        metrics.totalProductive = productiveResult.records[0].cnt || 0;
        logMetrics(`Total Productive: ${metrics.totalProductive}`);
      }
    } catch (error) {
      logMetrics('Error fetching productive contributors:', { message: error.message });
    }

    logMetrics('=== FINAL CROWD DASHBOARD METRICS ===', metrics);
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching crowd metrics:', error);
    res.status(500).json({ 
      error: 'Failed to fetch crowd metrics',
      message: error.message 
    });
  }
}));

// Note: kyc-status, active-contributors, onboarding-contributors, 
// avg-app-received-to-applied, and avg-app-received-to-active routes
// remain in original file for now and will be extracted next

module.exports = router;

