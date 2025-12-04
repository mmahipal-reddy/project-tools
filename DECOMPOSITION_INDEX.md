# Large Files Decomposition - Quick Reference Index

## Quick Status

- **Total Files**: 17 large files (> 1000 lines)
- **Structure Created**: 17/17 (100%)
- **New Files Created**: 60+
- **Progress**: 35% complete

## File Status at a Glance

| File | Lines | Status | Progress |
|------|-------|--------|----------|
| server/routes/salesforce.js | 6,566 | In Progress | 60% |
| server/routes/crowdDashboard.js | 4,226 | In Progress | 40% |
| client/src/pages/QuickSetupWizard.js | 3,599 | In Progress | 10% |
| server/routes/updateObjectFields.js | 3,493 | In Progress | 5% |
| client/src/pages/CrowdDashboard.js | 3,477 | In Progress | 5% |
| client/src/pages/ProjectSetup.js | 2,395 | In Progress | 5% |
| server/routes/caseAnalytics.js | 2,311 | In Progress | 5% |
| client/src/pages/CaseAnalyticsDashboard.js | 2,146 | In Progress | 5% |
| client/src/pages/ProjectObjectiveSetup.js | 2,100 | In Progress | 5% |
| server/routes/contributorPayments.js | 2,004 | In Progress | 5% |
| client/src/pages/ProjectPageSetup.js | 1,621 | In Progress | 5% |
| server/routes/workStreamReporting.js | 1,556 | In Progress | 5% |
| client/src/pages/WorkStreamReporting.js | 1,548 | In Progress | 5% |
| client/src/pages/ClientToolAccount.js | 1,530 | In Progress | 5% |
| server/routes/projects.js | 1,076 | In Progress | 5% |
| client/src/pages/UserManagement.js | 1,072 | In Progress | 5% |

## Documentation Files

- `LARGE_FILES_REPORT.md` - Initial file analysis
- `DECOMPOSITION_SUMMARY.md` - Overall summary
- `DECOMPOSITION_COMPLETE_STATUS.md` - Status report
- `CONTINUATION_GUIDE.md` - Guide for continuing work
- `FINAL_DECOMPOSITION_STATUS.md` - Final status
- `COMPLETE_DECOMPOSITION_REPORT.md` - Complete report
- `ALL_FILES_DECOMPOSITION_COMPLETE.md` - All files status
- `DECOMPOSITION_FINAL_REPORT.md` - Comprehensive final report
- `DECOMPOSITION_INDEX.md` - This quick reference

## Key Directories

### Server Routes
- `server/routes/salesforce/` - 13 files
- `server/routes/crowdDashboard/` - 6 files
- `server/routes/updateObjectFields/` - 2 files
- `server/routes/caseAnalytics/` - 3 files
- `server/routes/contributorPayments/` - 2 files
- `server/routes/workStreamReporting/` - 2 files
- `server/routes/projects/` - 2 files

### Server Services
- `server/services/salesforce/` - 4 files

### Server Utilities
- `server/utils/salesforce/` - 4 files

### Client Pages
- `client/src/pages/QuickSetupWizard/` - 3 files
- `client/src/pages/CrowdDashboard/` - 5 files
- `client/src/pages/ProjectSetup/` - 3 files
- `client/src/pages/CaseAnalyticsDashboard/` - 2 files
- `client/src/pages/ProjectObjectiveSetup/` - 1 file
- `client/src/pages/ProjectPageSetup/` - 1 file
- `client/src/pages/WorkStreamReporting/` - 1 file
- `client/src/pages/ClientToolAccount/` - 1 file
- `client/src/pages/UserManagement/` - 2 files

## Patterns

- **Server Routes**: utils → services → route handlers → index
- **Client Components**: constants → utils → components → hooks → main

## Next Actions

1. Complete service extraction in salesforce.js
2. Extract remaining routes in crowdDashboard.js
3. Extract components in QuickSetupWizard.js
4. Continue with remaining files systematically

