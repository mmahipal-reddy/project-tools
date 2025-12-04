# Continuation Guide for Large Files Decomposition

This guide provides a clear path forward for completing the decomposition of all large files.

## Current Status

- ✅ **salesforce.js**: 40% complete - Route handlers extracted, services need extraction
- ✅ **crowdDashboard.js**: 5% complete - Utilities extracted, routes need extraction
- ⏳ **15 remaining files**: Not started

## Quick Start for Next Developer

### 1. Complete salesforce.js

**Priority**: Extract service functions
- Create `server/services/salesforce/projectService.js`
  - Move `createProjectInSalesforce` function (~2,500 lines)
  - Break into smaller helpers: `convertPersonFieldToId`, `getProjectManagerRecordTypeId`, `buildProjectFields`, etc.
- Create `server/services/salesforce/projectObjectiveService.js`
  - Move `createProjectObjectiveInSalesforce` function (~1,000 lines)
- Create `server/services/salesforce/qualificationStepService.js`
  - Move `createQualificationStepInSalesforce` function (~600 lines)

**Files to update:**
- `server/routes/salesforce/projectCreation.js` - Import from service
- `server/routes/salesforce/projectObjectiveCreation.js` - Import from service
- `server/routes/salesforce/qualificationSteps.js` - Import from service

### 2. Complete crowdDashboard.js

**Priority**: Extract remaining 22 routes

**Create route files:**
- `server/routes/crowdDashboard/kyc.js` - KYC status route
- `server/routes/crowdDashboard/contributors.js` - Active/onboarding contributors, avg times
- `server/routes/crowdDashboard/analytics.js` - by-country, by-language, by-project, by-source, by-contributor-*
- `server/routes/crowdDashboard/demographics.js` - by-age, by-gender, by-education, demographics/*

**Update:**
- `server/routes/crowdDashboard/index.js` - Add all route imports

### 3. Start QuickSetupWizard.js

**Strategy:**
1. Extract constants to `client/src/pages/QuickSetupWizard/constants.js`
2. Extract utilities to `client/src/pages/QuickSetupWizard/utils.js`
3. Create custom hooks:
   - `useWizardState.js` - Wizard state management
   - `useWizardNavigation.js` - Navigation logic
4. Extract step components:
   - `Step1.js`, `Step2.js`, etc. (one per step)
5. Extract main component to `QuickSetupWizard.js` (orchestrator)

### 4. Continue with Remaining Files

Follow the same patterns:
- **Server routes**: Extract utilities → services → route handlers → index
- **Client components**: Extract constants → utilities → hooks → components → main

## File Structure Template

### Server Route File Decomposition

```
routes/
└── [feature]/
    ├── utils.js              # Shared utilities
    ├── [feature1].js         # Route group 1
    ├── [feature2].js         # Route group 2
    ├── index.js              # Main router
    └── DECOMPOSITION_PLAN.md # Documentation
```

### Client Component Decomposition

```
pages/
└── [Component]/
    ├── constants.js          # Constants
    ├── utils.js              # Utilities
    ├── hooks/
    │   ├── use[Feature].js  # Custom hooks
    │   └── index.js
    ├── components/
    │   ├── [SubComponent].js
    │   └── index.js
    ├── services/
    │   └── [feature]Service.js
    └── [Component].js        # Main component
```

## Testing Checklist

After each decomposition:
- [ ] All routes/components still work
- [ ] No breaking changes
- [ ] Build succeeds
- [ ] Linter passes
- [ ] Original functionality preserved

## Best Practices

1. **One feature per file** - Each file should have a single responsibility
2. **Reusable utilities** - Extract common logic to utilities
3. **Service layer** - Business logic goes in services, not routes
4. **Documentation** - Update DECOMPOSITION_PLAN.md as you go
5. **Incremental** - Test after each major extraction

## Resources

- See `DECOMPOSITION_SUMMARY.md` for overall progress
- See `LARGE_FILES_REPORT.md` for file analysis
- See `server/routes/salesforce/DECOMPOSITION_PLAN.md` for example plan

