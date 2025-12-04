// Salesforce accounts routes

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth');
const asyncHandler = require('../../utils/salesforce/asyncHandler');
const { createSalesforceConnection } = require('../../services/salesforce/connectionService');

/**
 * Get available Accounts from Salesforce
 * GET /api/salesforce/accounts
 */
router.get('/accounts', authenticate, authorize('view_project', 'all'), asyncHandler(async (req, res) => {
  try {
    const conn = await createSalesforceConnection();

    // Query for Accounts
    const query = `SELECT Id, Name FROM Account ORDER BY Name LIMIT 500`;
    const result = await conn.query(query);

    const accounts = result.records.map(account => ({
      id: account.Id,
      name: account.Name
    }));

    res.json({
      success: true,
      accounts: accounts
    });
  } catch (error) {
    console.error('Error fetching accounts from Salesforce:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch accounts from Salesforce'
    });
  }
}));

module.exports = router;

