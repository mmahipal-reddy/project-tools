// Salesforce search routes

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth');
const asyncHandler = require('../../utils/salesforce/asyncHandler');
const { createSalesforceConnection } = require('../../services/salesforce/connectionService');
const { validateAndSanitizeSearchTerm, isValidSalesforceId } = require('../../utils/security');

/**
 * Get project managers
 * GET /api/salesforce/project-managers
 */
router.get('/project-managers', authenticate, authorize('view_project', 'all'), asyncHandler(async (req, res) => {
  try {
    const conn = await createSalesforceConnection();

    // Query for Users (Project Managers)
    const query = `SELECT Id, Name, Email, Username FROM User WHERE IsActive = true ORDER BY Name LIMIT 200`;
    const result = await conn.query(query);

    const projectManagers = result.records.map(user => ({
      id: user.Id,
      name: user.Name,
      email: user.Email,
      username: user.Username
    }));

    res.json({
      success: true,
      projectManagers: projectManagers
    });
  } catch (error) {
    console.error('Error fetching project managers from Salesforce:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch project managers from Salesforce'
    });
  }
}));

/**
 * Search people (Users/Contacts)
 * GET /api/salesforce/search-people
 */
router.get('/search-people', authenticate, authorize('view_project', 'all'), asyncHandler(async (req, res) => {
  try {
    const { search, recordType } = req.query;

    if (!search || search.trim().length < 2) {
      return res.json({
        success: true,
        people: []
      });
    }

    const conn = await createSalesforceConnection();
    const sanitizedTerm = validateAndSanitizeSearchTerm(search);
    
    if (!sanitizedTerm) {
      return res.json({
        success: true,
        people: []
      });
    }

    let people = [];

    // Search Users
    let userQuery = `SELECT Id, Name, Email, Username FROM User WHERE (Name LIKE '%${sanitizedTerm}%' OR Email LIKE '%${sanitizedTerm}%') AND IsActive = true`;
    
    if (recordType) {
      const sanitizedRecordType = isValidSalesforceId(recordType) ? recordType : null;
      if (sanitizedRecordType) {
        userQuery += ` AND RecordTypeId = '${sanitizedRecordType}'`;
      }
    }
    
    userQuery += ' LIMIT 50';
    
    try {
      const userResult = await conn.query(userQuery);
      if (userResult.records) {
        people.push(...userResult.records.map(user => ({
          id: user.Id,
          name: user.Name,
          email: user.Email,
          username: user.Username,
          type: 'User'
        })));
      }
    } catch (userError) {
      console.warn('Error searching users:', userError.message);
    }

    // Search Contacts
    let contactQuery = `SELECT Id, Name, Email FROM Contact WHERE (Name LIKE '%${sanitizedTerm}%' OR Email LIKE '%${sanitizedTerm}%')`;
    contactQuery += ' LIMIT 50';
    
    try {
      const contactResult = await conn.query(contactQuery);
      if (contactResult.records) {
        people.push(...contactResult.records.map(contact => ({
          id: contact.Id,
          name: contact.Name,
          email: contact.Email,
          type: 'Contact'
        })));
      }
    } catch (contactError) {
      console.warn('Error searching contacts:', contactError.message);
    }

    // Remove duplicates and limit results
    const uniquePeople = Array.from(
      new Map(people.map(p => [p.id, p])).values()
    ).slice(0, 50);

    res.json({
      success: true,
      people: uniquePeople
    });
  } catch (error) {
    console.error('Error searching people:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to search people'
    });
  }
}));

module.exports = router;

