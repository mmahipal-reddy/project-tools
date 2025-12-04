// Salesforce project routes

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth');
const asyncHandler = require('../../utils/salesforce/asyncHandler');
const { loadProjects, saveProjects } = require('../../utils/salesforce/dataStorage');
const { createSalesforceConnection } = require('../../services/salesforce/connectionService');
const { logCreate } = require('../../utils/historyLogger');

// Import the large createProjectInSalesforce function (will be extracted to service)
// For now, we'll keep it in the original file and import it
// This will be refactored once we extract it to projectService.js

/**
 * Get projects from Salesforce
 * GET /api/salesforce/projects
 */
router.get('/projects', authenticate, authorize('view_project', 'all'), asyncHandler(async (req, res) => {
  try {
    const conn = await createSalesforceConnection();

    // Query for Projects
    const query = `SELECT Id, Name, Project_Status__c FROM Project__c ORDER BY Name LIMIT 500`;
    const result = await conn.query(query);

    const projects = result.records.map(project => ({
      id: project.Id,
      name: project.Name,
      status: project.Project_Status__c
    }));

    res.json({
      success: true,
      projects: projects
    });
  } catch (error) {
    console.error('Error fetching projects from Salesforce:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch projects from Salesforce'
    });
  }
}));

/**
 * Search projects
 * GET /api/salesforce/search-projects
 */
router.get('/search-projects', authenticate, authorize('view_project', 'all'), asyncHandler(async (req, res) => {
  try {
    const { searchTerm } = req.query;
    
    if (!searchTerm || searchTerm.trim() === '') {
      return res.json({
        success: true,
        projects: []
      });
    }

    const conn = await createSalesforceConnection();
    const { validateAndSanitizeSearchTerm } = require('../../utils/security');
    const sanitizedTerm = validateAndSanitizeSearchTerm(searchTerm);
    
    if (!sanitizedTerm) {
      return res.json({
        success: true,
        projects: []
      });
    }

    // Search for projects by name
    const query = `SELECT Id, Name, Project_Status__c FROM Project__c WHERE Name LIKE '%${sanitizedTerm}%' ORDER BY Name LIMIT 50`;
    const result = await conn.query(query);

    const projects = result.records.map(project => ({
      id: project.Id,
      name: project.Name,
      status: project.Project_Status__c
    }));

    res.json({
      success: true,
      projects: projects
    });
  } catch (error) {
    console.error('Error searching projects:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to search projects'
    });
  }
}));

/**
 * Update project status
 * PATCH /api/salesforce/update-project-status/:projectId
 */
router.patch('/update-project-status/:projectId', authenticate, authorize('create_project', 'all'), asyncHandler(async (req, res) => {
  try {
    const { projectId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }

    const conn = await createSalesforceConnection();

    // Update project status
    const updateResult = await conn.sobject('Project__c').update({
      Id: projectId,
      Project_Status__c: status
    });

    if (updateResult.success) {
      // Log to audit logs
      try {
        const auditLogger = require('../../utils/auditLogger');
        auditLogger.log({
          action: 'update',
          objectType: 'Project__c',
          objectId: projectId,
          userId: req.user.id,
          userEmail: req.user.email,
          changes: { Project_Status__c: status },
          timestamp: new Date().toISOString()
        });
      } catch (auditError) {
        console.error('Error logging to audit:', auditError);
      }

      res.json({
        success: true,
        message: 'Project status updated successfully',
        projectId: projectId
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to update project status'
      });
    }
  } catch (error) {
    console.error('Error updating project status:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update project status'
    });
  }
}));

// Note: create-project route will be added once createProjectInSalesforce is extracted to service

module.exports = router;

