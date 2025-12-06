# Global User Persona-Based Content Filtering (GPC-Filter) - Implementation Plan

## Executive Summary
Implement a persistent, user-defined filtering mechanism that defaults to showing only the user's "interested" Accounts and Projects across all dashboards, reports, and data views, with an override mechanism to view all data.

---

## 1. Architecture Overview

### 1.1 Design Principles
- **Decomposed Implementation**: Each component implemented independently
- **Non-Breaking**: Existing features continue to work unchanged
- **Easily Revertible**: Feature flag + isolated code paths
- **Backward Compatible**: Users without preferences see all data
- **Performance Optimized**: Minimal impact on query performance

### 1.2 Feature Flag Strategy
- Use environment variable or config: `ENABLE_GPC_FILTER=true/false`
- All GPC-Filter code wrapped in feature flag checks
- Easy to disable/revert without code changes

---

## 2. Implementation Phases

### Phase 1: Database Schema & API (Backend)
**Goal**: Create data model and API endpoints for user preferences

**Tasks**:
1. Create database table/model for user preferences
2. Create API endpoints:
   - GET `/api/user/preferences` - Fetch user preferences
   - POST `/api/user/preferences` - Save user preferences
   - GET `/api/user/preferences/accounts` - Search accounts for selection
   - GET `/api/user/preferences/projects` - Search projects for selection
3. Integrate with existing user authentication

**Files to Create**:
- `server/models/UserPreferences.js` (if using ORM)
- `server/routes/userPreferences.js`
- Database migration script

**Files to Modify**:
- `server/index.js` (add routes)
- User authentication middleware (if needed)

---

### Phase 2: User Preferences UI Component (Frontend)
**Goal**: Create UI for users to configure their interested Accounts and Projects

**Tasks**:
1. Create `UserPreferencesPanel` component
2. Implement searchable multi-select for Accounts
3. Implement searchable multi-select for Projects
4. Add to Settings/User Profile page
5. Save preferences via API

**Files to Create**:
- `client/src/components/UserPreferences/UserPreferencesPanel.js`
- `client/src/components/UserPreferences/UserPreferencesPanel.css`
- `client/src/components/UserPreferences/SearchableMultiSelect.js`

**Files to Modify**:
- Settings page or User Profile page

---

### Phase 3: Global Filter State Management (Frontend)
**Goal**: Create global state management for GPC-Filter

**Tasks**:
1. Create Context/Store for GPC-Filter state
2. Fetch user preferences on login
3. Store in global state
4. Provide filter values to all components

**Files to Create**:
- `client/src/context/GPCFilterContext.js`
- `client/src/hooks/useGPCFilter.js`

**Files to Modify**:
- `client/src/context/AuthContext.js` (fetch preferences on login)
- `client/src/App.js` (wrap app with GPCFilterProvider)

---

### Phase 4: Filter Override UI Component (Frontend)
**Goal**: Create UI control for users to override the filter

**Tasks**:
1. Create `GPCFilterToggle` component
2. Implement toggle/checkbox for "View All" vs "My Interested Items"
3. Session-based state (localStorage or sessionStorage)
4. Visual indicator when filter is active

**Files to Create**:
- `client/src/components/GPCFilter/GPCFilterToggle.js`
- `client/src/components/GPCFilter/GPCFilterToggle.css`
- `client/src/components/GPCFilter/GPCFilterIndicator.js`

---

### Phase 5: Integration with Existing Views (Frontend)
**Goal**: Apply GPC-Filter to existing dashboards and views

**Tasks**:
1. Identify all data-fetching components
2. Add GPC-Filter logic to each component
3. Ensure backward compatibility (no preferences = show all)
4. Add override toggle to each view

**Components to Modify**:
- Crowd Dashboard
- PM Approvals
- Case Management
- Project Performance Dashboard
- Any other data-intensive views

**Approach**: 
- Create utility function: `applyGPCFilter(queryParams, userPreferences, override)`
- Use feature flag to enable/disable
- Non-breaking: if feature disabled or no preferences, return original query

---

### Phase 6: Backend Query Integration (Backend)
**Goal**: Apply GPC-Filter to backend queries

**Tasks**:
1. Create middleware/utility to apply GPC-Filter to queries
2. Integrate with existing query builders
3. Ensure RBAC is not compromised
4. Optimize query performance

**Files to Create**:
- `server/middleware/gpcFilter.js`
- `server/utils/gpcFilterQueryBuilder.js`

**Files to Modify**:
- Existing route files (add GPC-Filter logic conditionally)

---

### Phase 7: Testing & Validation
**Goal**: Ensure feature works correctly and doesn't break existing functionality

**Tasks**:
1. Unit tests for filter logic
2. Integration tests for API endpoints
3. E2E tests for user flow
4. Performance testing
5. Regression testing for existing features

---

## 3. Detailed Implementation Plan

### 3.1 Phase 1: Database Schema & API

#### 3.1.1 Database Schema
**Table Name**: `user_preferences` (or `UserPreferences`)

**Schema**:
```sql
CREATE TABLE user_preferences (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL UNIQUE,
  interested_accounts TEXT, -- JSON array of account IDs
  interested_projects TEXT, -- JSON array of project IDs
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Alternative**: If using Salesforce, store in custom object:
- `User_Preferences__c` object
- Fields: `User__c` (lookup), `Interested_Accounts__c` (text, JSON), `Interested_Projects__c` (text, JSON)

#### 3.1.2 API Endpoints

**GET `/api/user/preferences`**
- Returns: `{ interestedAccounts: [], interestedProjects: [] }`
- Auth: Required (user can only see their own)

**POST `/api/user/preferences`**
- Body: `{ interestedAccounts: [id1, id2], interestedProjects: [id1, id2] }`
- Returns: Updated preferences
- Auth: Required

**GET `/api/user/preferences/accounts/search?q=searchTerm`**
- Returns: List of accounts matching search term
- Used for searchable dropdown
- Auth: Required

**GET `/api/user/preferences/projects/search?q=searchTerm`**
- Returns: List of projects matching search term
- Used for searchable dropdown
- Auth: Required

---

### 3.2 Phase 2: User Preferences UI

#### 2.1 Component Structure
```
UserPreferencesPanel
  ├── SearchableMultiSelect (Accounts)
  │   ├── Search input
  │   ├── Dropdown with search results
  │   └── Selected items chips
  ├── SearchableMultiSelect (Projects)
  │   ├── Search input
  │   ├── Dropdown with search results
  │   └── Selected items chips
  └── Save Button
```

#### 2.2 Integration Points
- Add to Settings page: `/settings` or `/profile`
- Or create dedicated page: `/user-preferences`
- Accessible from user menu/profile dropdown

---

### 3.3 Phase 3: Global Filter State

#### 3.1 Context Structure
```javascript
GPCFilterContext {
  // State
  preferences: {
    interestedAccounts: [],
    interestedProjects: []
  },
  override: false, // Session-based override
  loading: false,
  
  // Actions
  setOverride: (value) => void,
  clearOverride: () => void,
  refreshPreferences: () => void
}
```

#### 3.2 Integration with Auth
- Fetch preferences immediately after login
- Store in context
- Available to all components via hook

---

### 3.4 Phase 4: Filter Override UI

#### 4.1 Toggle Component
- Checkbox/Toggle: "Show only my interested items" (default: checked)
- When unchecked: "View all data"
- Visual indicator badge when filter is active
- Session-based (sessionStorage, not localStorage)

#### 4.2 Placement
- Dashboard headers
- Report page headers
- Data list page headers
- Consistent placement across all views

---

### 3.5 Phase 5: View Integration

#### 5.1 Integration Pattern
```javascript
// In each data-fetching component
const { preferences, override } = useGPCFilter();
const queryParams = useMemo(() => {
  const params = new URLSearchParams();
  // ... existing params ...
  
  // Apply GPC-Filter if enabled and not overridden
  if (ENABLE_GPC_FILTER && !override && preferences) {
    if (preferences.interestedAccounts?.length > 0) {
      params.append('gpc_accounts', preferences.interestedAccounts.join(','));
    }
    if (preferences.interestedProjects?.length > 0) {
      params.append('gpc_projects', preferences.interestedProjects.join(','));
    }
  }
  
  return params;
}, [preferences, override, /* other deps */]);
```

#### 5.2 Views to Integrate
1. Crowd Dashboard
2. PM Approvals
3. Case Management
4. Project Performance Dashboard
5. Any other data-intensive views

---

### 3.6 Phase 6: Backend Query Integration

#### 6.1 Query Builder Utility
```javascript
function applyGPCFilter(query, userPreferences, override) {
  if (!ENABLE_GPC_FILTER || override || !userPreferences) {
    return query; // No filtering
  }
  
  const conditions = [];
  
  if (userPreferences.interestedAccounts?.length > 0) {
    conditions.push(`Account__c IN (${userPreferences.interestedAccounts.map(id => `'${id}'`).join(',')})`);
  }
  
  if (userPreferences.interestedProjects?.length > 0) {
    conditions.push(`Project__c IN (${userPreferences.interestedProjects.map(id => `'${id}'`).join(',')})`);
  }
  
  if (conditions.length > 0) {
    const whereClause = query.includes('WHERE') 
      ? ` AND (${conditions.join(' OR ')})`
      : ` WHERE (${conditions.join(' OR ')})`;
    return query + whereClause;
  }
  
  return query;
}
```

#### 6.2 Integration Points
- Add to existing query builders
- Apply before RBAC checks (filter within user's permissions)
- Use feature flag to enable/disable

---

## 4. Feature Flag Implementation

### 4.1 Configuration
**File**: `server/config.js` or `.env`
```javascript
const ENABLE_GPC_FILTER = process.env.ENABLE_GPC_FILTER === 'true' || false;
```

**File**: `client/src/config/featureFlags.js`
```javascript
export const ENABLE_GPC_FILTER = process.env.REACT_APP_ENABLE_GPC_FILTER === 'true' || false;
```

### 4.2 Usage Pattern
```javascript
if (ENABLE_GPC_FILTER) {
  // GPC-Filter code
} else {
  // Original code (unchanged)
}
```

---

## 5. Revertibility Strategy

### 5.1 Code Organization
- All GPC-Filter code in separate files/modules
- Feature flag checks at entry points
- No modification of core logic, only additions

### 5.2 Revert Process
1. Set `ENABLE_GPC_FILTER=false` in config
2. Restart application
3. All GPC-Filter code is bypassed
4. Application behaves as before

### 5.3 Database Revert
- Table can be dropped if needed
- No foreign key dependencies on core tables
- Migration script for rollback

---

## 6. File Structure

### New Files to Create

**Backend**:
- `server/models/UserPreferences.js`
- `server/routes/userPreferences.js`
- `server/middleware/gpcFilter.js`
- `server/utils/gpcFilterQueryBuilder.js`
- `server/migrations/create_user_preferences_table.js`

**Frontend**:
- `client/src/context/GPCFilterContext.js`
- `client/src/hooks/useGPCFilter.js`
- `client/src/components/UserPreferences/UserPreferencesPanel.js`
- `client/src/components/UserPreferences/UserPreferencesPanel.css`
- `client/src/components/UserPreferences/SearchableMultiSelect.js`
- `client/src/components/GPCFilter/GPCFilterToggle.js`
- `client/src/components/GPCFilter/GPCFilterToggle.css`
- `client/src/components/GPCFilter/GPCFilterIndicator.js`
- `client/src/utils/gpcFilter.js`

**Config**:
- `client/src/config/featureFlags.js`

### Files to Modify

**Backend**:
- `server/index.js` (add routes)
- `server/routes/crowdDashboard.js` (add GPC-Filter)
- `server/routes/pmApprovals.js` (add GPC-Filter)
- `server/routes/caseManagement.js` (add GPC-Filter)
- Other data-fetching routes

**Frontend**:
- `client/src/context/AuthContext.js` (fetch preferences on login)
- `client/src/App.js` (add GPCFilterProvider)
- `client/src/pages/CrowdDashboard.js` (add filter toggle + apply filter)
- `client/src/pages/ProjectManagement/PMApprovals/PMApprovals.js` (add filter toggle + apply filter)
- `client/src/pages/CaseManagement.js` (add filter toggle + apply filter)
- Settings/Profile page (add preferences panel)

---

## 7. Testing Strategy

### 7.1 Unit Tests
- UserPreferences API endpoints
- GPC-Filter query builder
- Filter application logic
- Override state management

### 7.2 Integration Tests
- Login → Preferences fetched
- Save preferences → Applied to queries
- Override toggle → Filter disabled
- Session persistence → Override cleared on reload

### 7.3 E2E Tests
- User configures preferences
- Views show filtered data
- Override works correctly
- Existing features still work

---

## 8. Performance Considerations

### 8.1 Optimization Strategies
1. **Caching**: Cache user preferences in memory/session
2. **Query Optimization**: Use indexed fields for IN clauses
3. **Batch Queries**: Combine account/project filters efficiently
4. **Lazy Loading**: Only fetch preferences when needed
5. **Debouncing**: Debounce preference updates

### 8.2 Monitoring
- Query performance metrics
- API response times
- User preference fetch times
- Filter application overhead

---

## 9. Security Considerations

### 9.1 Access Control
- Users can only see/modify their own preferences
- API endpoints validate user ownership
- RBAC still enforced (GPC-Filter is additional layer)

### 9.2 Data Validation
- Validate account/project IDs
- Sanitize input
- Prevent SQL injection
- Rate limiting on preference updates

---

## 10. Implementation Order

1. **Phase 1**: Database & API (Backend foundation)
2. **Phase 2**: Preferences UI (User can configure)
3. **Phase 3**: Global State (Filter available to all components)
4. **Phase 4**: Override UI (User can toggle)
5. **Phase 5**: View Integration (Apply to one view first, then others)
6. **Phase 6**: Backend Integration (Apply to queries)
7. **Phase 7**: Testing & Refinement

---

## 11. Success Criteria

### 11.1 Functional
- ✅ Users can configure interested Accounts/Projects
- ✅ Preferences persist across sessions
- ✅ Default view shows only interested items
- ✅ Override works correctly
- ✅ Existing features unaffected

### 11.2 Technical
- ✅ Feature flag works (can be disabled)
- ✅ No performance degradation
- ✅ RBAC still enforced
- ✅ Code is easily revertible

### 11.3 UX
- ✅ Clear UI for configuration
- ✅ Visible filter indicator
- ✅ Easy override mechanism
- ✅ No confusion about active filters

---

## 12. Rollback Plan

### 12.1 Quick Disable
1. Set `ENABLE_GPC_FILTER=false`
2. Restart application
3. Feature disabled, original behavior restored

### 12.2 Code Removal (if needed)
1. Remove GPC-Filter components
2. Remove API routes
3. Remove database table (optional)
4. Remove feature flag checks
5. Revert modified files

---

## 13. Estimated Timeline

- **Phase 1**: 2-3 days
- **Phase 2**: 2-3 days
- **Phase 3**: 1-2 days
- **Phase 4**: 1-2 days
- **Phase 5**: 3-5 days (per view, can parallelize)
- **Phase 6**: 2-3 days
- **Phase 7**: 2-3 days
- **Total**: 13-21 days (2.5-4 weeks)

---

## 14. Next Steps

1. Review and approve plan
2. Set up feature flag configuration
3. Begin Phase 1 implementation
4. Test each phase before proceeding
5. Iterate based on feedback

