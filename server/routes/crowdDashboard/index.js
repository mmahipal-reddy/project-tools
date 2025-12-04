// Main crowd dashboard routes index

const express = require('express');
const router = express.Router();

// Import route handlers
const metricsRoutes = require('./metrics');
const contributorsRoutes = require('./contributors');
const analyticsRoutes = require('./analytics');
const demographicsRoutes = require('./demographics');

// Mount route handlers
router.use('/', metricsRoutes);
router.use('/', contributorsRoutes);
router.use('/', analyticsRoutes);
router.use('/', demographicsRoutes);

// Note: Some complex routes (by-project, by-country-language, demographics/*, etc.)
// remain in original file for now and will be extracted as needed

module.exports = router;

