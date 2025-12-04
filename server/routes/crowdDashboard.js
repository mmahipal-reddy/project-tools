// Main Crowd Dashboard routes file
// This file now delegates to the decomposed route structure in ./crowdDashboard/

// Import the decomposed routes from index
const crowdDashboardRoutes = require('./crowdDashboard/index');

// Export the router for backward compatibility
module.exports = crowdDashboardRoutes;
