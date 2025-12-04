# Large Files Report - Files with More Than 1000 Lines

**Analysis Date**: November 2024
**Threshold**: Files with > 1000 lines of code

## Summary

**Total Files Found**: 17 files exceed 1000 lines

## Files by Size (Largest First)

### Client-Side Files (Frontend)

| Lines | File Path | Category |
|-------|-----------|----------|
| **8,712** | `client/src/pages/UpdateObjectFields.js` | ⚠️ **CRITICAL** - Already being decomposed |
| **3,599** | `client/src/pages/QuickSetupWizard.js` | ⚠️ **HIGH** - Needs decomposition |
| **3,477** | `client/src/pages/CrowdDashboard.js` | ⚠️ **HIGH** - Needs decomposition |
| **2,395** | `client/src/pages/ProjectSetup.js` | ⚠️ **MEDIUM** - Consider decomposition |
| **2,146** | `client/src/pages/CaseAnalyticsDashboard.js` | ⚠️ **MEDIUM** - Consider decomposition |
| **2,100** | `client/src/pages/ProjectObjectiveSetup.js` | ⚠️ **MEDIUM** - Consider decomposition |
| **1,621** | `client/src/pages/ProjectPageSetup.js` | ⚠️ **MEDIUM** - Consider decomposition |
| **1,548** | `client/src/pages/WorkStreamReporting.js` | ⚠️ **MEDIUM** - Consider decomposition |
| **1,530** | `client/src/pages/ClientToolAccount.js` | ⚠️ **MEDIUM** - Consider decomposition |
| **1,072** | `client/src/pages/UserManagement.js` | ⚠️ **LOW** - Monitor for growth |

### Server-Side Files (Backend)

| Lines | File Path | Category |
|-------|-----------|----------|
| **6,566** | `server/routes/salesforce.js` | ⚠️ **CRITICAL** - Needs decomposition |
| **4,226** | `server/routes/crowdDashboard.js` | ⚠️ **HIGH** - Needs decomposition |
| **3,493** | `server/routes/updateObjectFields.js` | ⚠️ **HIGH** - Needs decomposition |
| **2,311** | `server/routes/caseAnalytics.js` | ⚠️ **MEDIUM** - Consider decomposition |
| **2,004** | `server/routes/contributorPayments.js` | ⚠️ **MEDIUM** - Consider decomposition |
| **1,556** | `server/routes/workStreamReporting.js` | ⚠️ **MEDIUM** - Consider decomposition |
| **1,076** | `server/routes/projects.js` | ⚠️ **LOW** - Monitor for growth |

## Priority Recommendations

### 🔴 Critical Priority (Immediate Action Recommended)

1. **`client/src/pages/UpdateObjectFields.js`** (8,712 lines)
   - ✅ **Status**: Currently being decomposed
   - **Progress**: 61% decomposed into 42 smaller files
   - **Action**: Continue decomposition work

2. **`server/routes/salesforce.js`** (6,566 lines)
   - **Status**: Large monolithic route file
   - **Recommendation**: Decompose into:
     - Separate route handlers
     - Service layer for business logic
     - Utility functions
     - Middleware components

### 🟠 High Priority (Should Be Addressed Soon)

3. **`server/routes/crowdDashboard.js`** (4,226 lines)
   - **Recommendation**: Break into:
     - Route handlers by feature
     - Service modules
     - Data access layer

4. **`server/routes/updateObjectFields.js`** (3,493 lines)
   - **Recommendation**: Similar decomposition as UpdateObjectFields.js

5. **`client/src/pages/QuickSetupWizard.js`** (3,599 lines)
   - **Recommendation**: Break into:
     - Step components
     - Wizard navigation component
     - Step-specific logic modules

6. **`client/src/pages/CrowdDashboard.js`** (3,477 lines)
   - **Recommendation**: Break into:
     - Dashboard sections/components
     - Data fetching hooks
     - Chart/visualization components

### 🟡 Medium Priority (Consider for Future Refactoring)

7. **`client/src/pages/ProjectSetup.js`** (2,395 lines)
8. **`server/routes/caseAnalytics.js`** (2,311 lines)
9. **`client/src/pages/CaseAnalyticsDashboard.js`** (2,146 lines)
10. **`client/src/pages/ProjectObjectiveSetup.js`** (2,100 lines)
11. **`server/routes/contributorPayments.js`** (2,004 lines)
12. **`client/src/pages/ProjectPageSetup.js`** (1,621 lines)
13. **`server/routes/workStreamReporting.js`** (1,556 lines)
14. **`client/src/pages/WorkStreamReporting.js`** (1,548 lines)
15. **`client/src/pages/ClientToolAccount.js`** (1,530 lines)

### 🟢 Low Priority (Monitor)

16. **`server/routes/projects.js`** (1,076 lines)
17. **`client/src/pages/UserManagement.js`** (1,072 lines)

## Decomposition Guidelines

Based on the successful decomposition of `UpdateObjectFields.js`, consider:

1. **Single Responsibility Principle**: Each file should have one clear purpose
2. **Component Extraction**: Break large components into smaller, reusable ones
3. **Service Layer**: Extract business logic into service modules
4. **Custom Hooks**: Extract state management into reusable hooks
5. **Utility Functions**: Move helper functions to utility modules
6. **Constants**: Extract constants and configuration to separate files

## Statistics

- **Total Large Files**: 17
- **Client Files**: 10 files
- **Server Files**: 7 files
- **Largest File**: 8,712 lines (UpdateObjectFields.js)
- **Average Size**: ~2,500 lines per large file
- **Total Lines in Large Files**: ~42,500 lines

## Notes

- Files under 1000 lines are not included in this report
- The threshold of 1000 lines is a general guideline; files between 800-1000 lines should also be monitored
- Consider code complexity metrics in addition to line count
- Some files may be appropriately large due to their nature (e.g., configuration files, data definitions)

