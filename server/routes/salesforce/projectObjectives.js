// Salesforce project objectives routes

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth');
const asyncHandler = require('../../utils/salesforce/asyncHandler');
const { createSalesforceConnection } = require('../../services/salesforce/connectionService');
const { validateAndSanitizeSearchTerm } = require('../../utils/security');

/**
 * Get available Project Objectives from Salesforce
 * GET /api/salesforce/project-objectives
 */
router.get('/project-objectives', authenticate, authorize('view_project', 'all'), asyncHandler(async (req, res) => {
  try {
    const { projectId } = req.query;
    const conn = await createSalesforceConnection();

    let query;
    if (projectId) {
      const sanitizedProjectId = sanitizeSearchTerm(projectId);
      query = `SELECT Id, Name, Project__c, Project__r.Name FROM Project_Objective__c WHERE Project__c = '${sanitizedProjectId}' ORDER BY Name LIMIT 500`;
    } else {
      query = `SELECT Id, Name, Project__c, Project__r.Name FROM Project_Objective__c ORDER BY Name LIMIT 500`;
    }

    const result = await conn.query(query);

    const objectives = result.records.map(obj => ({
      id: obj.Id,
      name: obj.Name,
      projectId: obj.Project__c,
      projectName: obj.Project__r ? obj.Project__r.Name : null
    }));

    res.json({
      success: true,
      projectObjectives: objectives
    });
  } catch (error) {
    console.error('Error fetching project objectives from Salesforce:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch project objectives from Salesforce'
    });
  }
}));

/**
 * Search project objectives
 * GET /api/salesforce/search-project-objectives
 */
router.get('/search-project-objectives', authenticate, authorize('view_project', 'all'), asyncHandler(async (req, res) => {
  try {
    const { searchTerm, projectId } = req.query;
    
    if (!searchTerm || searchTerm.trim() === '') {
      return res.json({
        success: true,
        projectObjectives: []
      });
    }

    const conn = await createSalesforceConnection();
    const sanitizedTerm = validateAndSanitizeSearchTerm(searchTerm);
    
    if (!sanitizedTerm) {
      return res.json({
        success: true,
        projectObjectives: []
      });
    }

    let query;
    if (projectId) {
      // Validate projectId is a valid Salesforce ID
      const { isValidSalesforceId } = require('../../utils/security');
      if (!isValidSalesforceId(projectId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid project ID'
        });
      }
      query = `SELECT Id, Name, Project__c, Project__r.Name FROM Project_Objective__c WHERE Name LIKE '%${sanitizedTerm}%' AND Project__c = '${projectId}' ORDER BY Name LIMIT 50`;
    } else {
      query = `SELECT Id, Name, Project__c, Project__r.Name FROM Project_Objective__c WHERE Name LIKE '%${sanitizedTerm}%' ORDER BY Name LIMIT 50`;
    }

    const result = await conn.query(query);

    const objectives = result.records.map(obj => ({
      id: obj.Id,
      name: obj.Name,
      projectId: obj.Project__c,
      projectName: obj.Project__r ? obj.Project__r.Name : null
    }));

    res.json({
      success: true,
      projectObjectives: objectives
    });
  } catch (error) {
    console.error('Error searching project objectives:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to search project objectives'
    });
  }
}));

// Note: create-project-objective route will be added once createProjectObjectiveInSalesforce is extracted to service

module.exports = router;

