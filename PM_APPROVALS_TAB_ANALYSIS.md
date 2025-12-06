# PM Approvals Tab - Detailed Feasibility Analysis

## Executive Summary

This document provides a focused analysis of implementing the **PM Approvals for Self Reported Time** tab based on the screenshot. The analysis covers only the content visible within the PM Approvals tab, excluding other navigation tabs.

**Overall Feasibility: ✅ HIGHLY FEASIBLE**

The application has strong existing patterns that match 85-90% of the required functionality.

---

## Screenshot Analysis - PM Approvals Tab Only

### Tab Content Structure

The PM Approvals tab consists of three main sections:

1. **Left Sidebar Panel** (within the tab)
2. **Main Content Area** (summary metrics + data table)
3. **Data Table** (detailed transaction records)

---

## Section 1: Left Sidebar Panel

### 1.1 Deadlines Section

**Visual Elements:**
```
Contributor Deadline for Submitting Hours: 12/2/2025, 6:00 PM
PM Approval Deadline: 12/4/2025, 11:30 PM
Payment Generation Date: 12/14/2025, 12:00 PM
```

**Analysis:**
- **Type**: Static or configurable date/time display
- **Feasibility**: ✅ **EASY**
- **Complexity**: Low
- **Data Source Options**:
  1. Configuration file (JSON)
  2. Salesforce Custom Settings
  3. Environment variables
  4. Database/API endpoint
- **Implementation Pattern**: Similar to settings display in existing pages
- **Components Needed**: `DeadlinesPanel.js` (NEW, simple component)

**Technical Details:**
- Display format: Date + Time (MM/DD/YYYY, HH:MM AM/PM)
- Styling: Text labels with date values
- Updates: Can be static or refreshable
- **Estimated Effort**: 2-4 hours

---

### 1.2 Records Count

**Visual Elements:**
```
No. of records: 20,145
```

**Analysis:**
- **Type**: Dynamic count display
- **Feasibility**: ✅ **EASY**
- **Complexity**: Low
- **Data Source**: Query result count from Salesforce
- **Implementation Pattern**: Similar to count displays in `CaseManagement.js`, `POPayRates.js`
- **Components Needed**: `RecordsCount.js` (NEW, simple component)

**Technical Details:**
- Updates when filters change
- Format: Number with comma separator (20,145)
- **Estimated Effort**: 1-2 hours

---

### 1.3 Filters Section

**Visual Elements:**
```
[Clear Filter] button

Account: [All ▼]
Project: [All ▼]
Project Objective: [All ▼]
Email: [All ▼]
```

**Analysis:**
- **Type**: Multi-level cascading dropdown filters
- **Feasibility**: ✅ **EASY** (pattern exists)
- **Complexity**: Low-Medium
- **Existing Pattern**: Very similar to filters in:
  - `CaseManagement.js` - Has FilterBuilder component
  - `POPayRates.js` - Has filter dropdowns
  - `POProductivityTargets.js` - Has cascading filters
- **Components Needed**: `FilterPanel.js` (NEW, but can reuse existing FilterBuilder pattern)

**Filter Behavior:**
1. **Account Filter**:
   - Dropdown with all accounts
   - "All" option to clear filter
   - **Data Source**: Distinct Account values from Salesforce

2. **Project Filter**:
   - Dropdown with projects
   - Filtered by selected Account (cascading)
   - "All" option
   - **Data Source**: Projects filtered by Account

3. **Project Objective Filter**:
   - Dropdown with project objectives
   - Filtered by selected Project (cascading)
   - "All" option
   - **Data Source**: Project Objectives filtered by Project

4. **Email Filter**:
   - Dropdown or search/autocomplete
   - "All" option
   - **Data Source**: Distinct contributor emails

5. **Clear Filter Button**:
   - Resets all filters to "All"
   - Triggers data refresh

**Technical Details:**
- Cascading filters: Project depends on Account, Project Objective depends on Project
- Filter state management: React state or URL params
- Filter application: Pass to API as query parameters
- **Estimated Effort**: 8-12 hours (reusing existing patterns)

---

## Section 2: Main Content Area - Summary Metrics

### 2.1 Page Title

**Visual Elements:**
```
PM Approvals for Self Reported Time
```

**Analysis:**
- **Type**: Static page title
- **Feasibility**: ✅ **TRIVIAL**
- **Complexity**: None
- **Estimated Effort**: < 1 hour

---

### 2.2 TOTAL PENDING HOURS Card

**Visual Elements:**
```
TOTAL PENDING HOURS
0

[Progress Bar showing: 126,950]
```

**Analysis:**
- **Type**: KPI card with progress bar
- **Feasibility**: ✅ **EASY**
- **Complexity**: Low
- **Existing Pattern**: Similar to KPI cards in `ContributorPaymentsDashboard.js`
- **Components Needed**: `PendingHoursCard.js` (NEW)

**Technical Details:**
- **Metric Calculation**: 
  - Total Pending Hours: Sum of hours where Status = "PM Review" or pending status
  - Total Hours: Sum of all hours (126,950 shown in progress bar)
- **Progress Bar**: Visual representation of pending vs total
  - Formula: `(Pending Hours / Total Hours) * 100%`
  - In screenshot: 0 / 126,950 = 0%
- **Data Source**: Aggregation query from Salesforce
- **Updates**: Refresh on filter changes
- **Estimated Effort**: 4-6 hours

**API Endpoint Needed:**
```javascript
GET /api/pm-approvals/summary
Response: {
  totalPendingHours: 0,
  totalHours: 126950,
  // ... other metrics
}
```

---

### 2.3 Metrics Row

**Visual Elements:**
```
Self Reported Time: 0
System Tracked: 0
Payment: 0
```

**Analysis:**
- **Type**: Three metric displays in a row
- **Feasibility**: ✅ **EASY**
- **Complexity**: Low
- **Existing Pattern**: Similar to metric rows in `ContributorPaymentsDashboard.js`
- **Components Needed**: `MetricsRow.js` (NEW)

**Technical Details:**
- **Self Reported Time**: Sum of self-reported hours/units (pending records)
- **System Tracked**: Sum of system-tracked hours/units (pending records)
- **Payment**: Sum of total payment amounts (pending records)
- **Data Source**: Same aggregation query as Pending Hours
- **Format**: Numbers with appropriate formatting (currency for Payment)
- **Estimated Effort**: 3-4 hours

---

### 2.4 TOTAL PENDING UNITS Card

**Visual Elements:**
```
TOTAL PENDING UNITS
0
```

**Analysis:**
- **Type**: Simple KPI card
- **Feasibility**: ✅ **EASY**
- **Complexity**: Low
- **Components Needed**: `PendingUnitsCard.js` (NEW)

**Technical Details:**
- **Metric Calculation**: Sum of pending units (where Status = pending)
- **Data Source**: Same aggregation query
- **Estimated Effort**: 2-3 hours

---

## Section 3: Data Table

### 3.1 Table Structure

**Visual Elements:**
- Scrollable table with multiple rows
- Column headers
- Data rows with various statuses

**Analysis:**
- **Type**: Advanced data table with sorting, filtering, pagination
- **Feasibility**: ✅ **EASY** (strong pattern exists)
- **Complexity**: Medium
- **Existing Pattern**: Very similar to tables in:
  - `CaseManagement.js` - Full-featured table
  - `POPayRates.js` - Table with infinite scroll
  - `POProductivityTargets.js` - Table with filters
  - `AuditLogs.js` - Table with sorting
- **Components Needed**: `ApprovalsTable.js` (NEW, but reuse existing patterns)

**Technical Details:**
- **Pagination**: Infinite scroll or pagination (20K+ records)
- **Sorting**: Click column headers to sort
- **Filtering**: Applied via sidebar filters
- **Row Selection**: For bulk actions (not shown but likely needed)
- **Estimated Effort**: 12-16 hours (reusing existing patterns)

---

### 3.2 Table Columns

#### Column 1: Transaction ID

**Visual Elements:**
```
299908
299909
299910
...
```

**Analysis:**
- **Type**: Unique identifier
- **Feasibility**: ✅ **EASY**
- **Data Source**: Salesforce record `Id` or custom `Transaction_ID__c` field
- **Display**: Plain text, possibly clickable for drill-down
- **Estimated Effort**: Included in table component

---

#### Column 2: Contributor

**Visual Elements:**
```
Samantha Roberts
April Vance
Rachel Shaw
```

**Analysis:**
- **Type**: Contributor name (from Contact lookup)
- **Feasibility**: ✅ **EASY**
- **Data Source**: `Contact.Name` via lookup relationship
- **Display**: Plain text, possibly clickable to view contributor profile
- **Estimated Effort**: Included in table component

---

#### Column 3: Email

**Visual Elements:**
```
[Email addresses]
```

**Analysis:**
- **Type**: Contributor email address
- **Feasibility**: ✅ **EASY**
- **Data Source**: `Contact.Email` via lookup relationship
- **Display**: Plain text or mailto link
- **Estimated Effort**: Included in table component

---

#### Column 4: Project Objective

**Visual Elements:**
```
[Project Objective names]
```

**Analysis:**
- **Type**: Project Objective name
- **Feasibility**: ✅ **EASY**
- **Data Source**: `Project_Objective__c.Name` via lookup relationship
- **Display**: Plain text, possibly clickable to view project objective
- **Estimated Effort**: Included in table component

---

#### Column 5: Transaction Date

**Visual Elements:**
```
2024-11-26
2024-11-29
2024-12-01
2024-12-02
2024-12-03
```

**Analysis:**
- **Type**: Date field
- **Feasibility**: ✅ **EASY**
- **Data Source**: `Transaction_Date__c` or `CreatedDate`
- **Display Format**: YYYY-MM-DD (ISO format)
- **Sortable**: Yes
- **Estimated Effort**: Included in table component

---

#### Column 6: Productivity (Self-Reported, System Tracked)

**Visual Elements:**
```
[Shows two values - likely hours or units]
Example: 3 (self-reported), 0 (system tracked)
Example: 10 (self-reported), 0 (system tracked)
```

**Analysis:**
- **Type**: Dual value display in single column
- **Feasibility**: ⚠️ **MEDIUM** (requires custom cell component)
- **Complexity**: Medium
- **Data Source**: 
  - `Self_Reported_Hours__c` or `Self_Reported_Units__c`
  - `System_Tracked_Hours__c` or `System_Tracked_Units__c`
- **Display Format**: 
  - Option 1: "3 / 0" (self-reported / system tracked)
  - Option 2: "3 (SR), 0 (ST)"
  - Option 3: Two-line display
- **Components Needed**: `DualProductivityCell.js` (NEW, custom cell component)
- **Estimated Effort**: 4-6 hours

**Implementation Options:**
```javascript
// Option 1: Inline with separator
<div>3 / 0</div>
<div className="label">SR / ST</div>

// Option 2: Two-line display
<div>
  <div>Self-Reported: 3</div>
  <div>System Tracked: 0</div>
</div>

// Option 3: Side-by-side with labels
<div className="productivity-cell">
  <span className="self-reported">3</span>
  <span className="system-tracked">0</span>
</div>
```

---

#### Column 7: Variance %

**Visual Elements:**
```
0%
0%
0%
```

**Analysis:**
- **Type**: Calculated percentage
- **Feasibility**: ✅ **EASY**
- **Complexity**: Low
- **Calculation**: 
  - Formula: `((Self_Reported - System_Tracked) / System_Tracked) * 100`
  - Or: `((Self_Reported - System_Tracked) / Self_Reported) * 100`
  - Handle division by zero
- **Data Source**: Calculated field or computed in backend/frontend
- **Display Format**: Percentage with sign (+/-) and color coding
  - Positive variance: Green (self-reported > system tracked)
  - Negative variance: Red (self-reported < system tracked)
  - Zero variance: Gray or neutral
- **Estimated Effort**: 2-3 hours

**Implementation:**
```javascript
const calculateVariance = (selfReported, systemTracked) => {
  if (systemTracked === 0) return selfReported > 0 ? 100 : 0;
  return ((selfReported - systemTracked) / systemTracked) * 100;
};
```

---

#### Column 8: Payrate

**Visual Elements:**
```
$10.00
$10.00
$10.00
```

**Analysis:**
- **Type**: Currency field
- **Feasibility**: ✅ **EASY**
- **Data Source**: `Payrate__c` or calculated from Project Objective
- **Display Format**: Currency ($10.00)
- **Sortable**: Yes
- **Estimated Effort**: Included in table component

---

#### Column 9: Total Payment

**Visual Elements:**
```
$30.00
$20.00
$100.00
```

**Analysis:**
- **Type**: Calculated currency field
- **Feasibility**: ✅ **EASY**
- **Data Source**: 
  - `Total_Payment__c` (if stored)
  - Or calculated: `Self_Reported_Hours * Payrate`
- **Display Format**: Currency ($30.00)
- **Sortable**: Yes
- **Estimated Effort**: Included in table component

---

#### Column 10: Status

**Visual Elements:**
```
Contributor Approved
PM Review
Contributor Approved
```

**Analysis:**
- **Type**: Status badge with color coding
- **Feasibility**: ✅ **EASY**
- **Complexity**: Low
- **Data Source**: `Status__c` field
- **Display Format**: Badge component with colors
  - "Contributor Approved": Green badge
  - "PM Review": Yellow/Amber badge (pending)
  - Other statuses: Appropriate colors
- **Components Needed**: `StatusBadge.js` (NEW, simple component)
- **Estimated Effort**: 2-3 hours

**Status Values (from screenshot):**
- Contributor Approved
- PM Review
- (Possibly others: Rejected, Approved, etc.)

---

## Data Model Requirements

### Salesforce Object: Self_Reported_Time__c (or equivalent)

**Required Fields:**
```javascript
{
  Id: string,                          // Transaction ID
  Contact__c: string,                 // Lookup to Contact (Contributor)
  Project_Objective__c: string,       // Lookup to Project_Objective__c
  Transaction_Date__c: date,          // Transaction date
  Self_Reported_Hours__c: number,     // Self-reported hours
  Self_Reported_Units__c: number,     // Self-reported units
  System_Tracked_Hours__c: number,    // System tracked hours
  System_Tracked_Units__c: number,    // System tracked units
  Payrate__c: number,                 // Pay rate
  Total_Payment__c: number,           // Total payment (or calculated)
  Status__c: string,                  // Approval status
  CreatedDate: datetime,              // Created date
  LastModifiedDate: datetime          // Last modified date
}
```

**Lookup Relationships:**
- `Contact__r.Name` - Contributor name
- `Contact__r.Email` - Contributor email
- `Project_Objective__r.Name` - Project Objective name
- `Project_Objective__r.Project__r.Name` - Project name
- `Project_Objective__r.Project__r.Account__r.Name` - Account name

**Calculated Fields:**
- Variance %: Calculated in SOQL or frontend
- Total Payment: `Self_Reported_Hours__c * Payrate__c` (if not stored)

---

## API Endpoints Required

### 1. GET /api/pm-approvals/list

**Purpose**: Fetch paginated list of approval records

**Query Parameters:**
```javascript
{
  account?: string,           // Account filter
  project?: string,           // Project filter (filtered by account)
  projectObjective?: string,  // Project Objective filter (filtered by project)
  email?: string,             // Email filter/search
  status?: string,            // Status filter
  dateFrom?: string,          // Transaction date from (YYYY-MM-DD)
  dateTo?: string,            // Transaction date to (YYYY-MM-DD)
  offset?: number,            // Pagination offset (default: 0)
  limit?: number,             // Records per page (default: 1000, max: 1000)
  sortBy?: string,            // Column to sort by
  sortOrder?: 'asc' | 'desc'  // Sort direction (default: 'desc')
}
```

**Response:**
```javascript
{
  success: true,
  records: [
    {
      id: "a0X5g000000abcD",
      transactionId: "299908",
      contributorId: "0035g000000xyz",
      contributorName: "Samantha Roberts",
      email: "samantha.roberts@example.com",
      projectObjectiveId: "a0Y5g000000def",
      projectObjectiveName: "Project Objective Name",
      transactionDate: "2024-11-26",
      selfReportedHours: 3,
      selfReportedUnits: 3,
      systemTrackedHours: 0,
      systemTrackedUnits: 0,
      variancePercent: 0,
      payrate: 10.00,
      totalPayment: 30.00,
      status: "Contributor Approved"
    }
    // ... more records
  ],
  total: 20145,
  hasMore: true,
  offset: 0
}
```

**SOQL Query Example:**
```sql
SELECT 
  Id,
  Transaction_ID__c,
  Contact__c,
  Contact__r.Name,
  Contact__r.Email,
  Project_Objective__c,
  Project_Objective__r.Name,
  Transaction_Date__c,
  Self_Reported_Hours__c,
  Self_Reported_Units__c,
  System_Tracked_Hours__c,
  System_Tracked_Units__c,
  Payrate__c,
  Total_Payment__c,
  Status__c
FROM Self_Reported_Time__c
WHERE Status__c IN ('PM Review', 'Contributor Approved')
  AND (Account filter if provided)
  AND (Project filter if provided)
  AND (Project Objective filter if provided)
  AND (Email filter if provided)
ORDER BY Transaction_Date__c DESC
LIMIT 1000
OFFSET 0
```

**Estimated Effort**: 8-12 hours

---

### 2. GET /api/pm-approvals/summary

**Purpose**: Fetch summary metrics for the dashboard

**Query Parameters:**
```javascript
{
  account?: string,           // Apply same filters as list
  project?: string,
  projectObjective?: string,
  email?: string,
  status?: string,
  dateFrom?: string,
  dateTo?: string
}
```

**Response:**
```javascript
{
  success: true,
  data: {
    totalPendingHours: 0,
    totalHours: 126950,
    selfReportedTime: 0,
    systemTracked: 0,
    totalPayment: 0,
    totalPendingUnits: 0
  }
}
```

**SOQL Query Example:**
```sql
SELECT 
  SUM(Self_Reported_Hours__c) totalPendingHours,
  SUM(Self_Reported_Hours__c) totalHours,
  SUM(Self_Reported_Units__c) totalPendingUnits,
  SUM(Total_Payment__c) totalPayment
FROM Self_Reported_Time__c
WHERE Status__c = 'PM Review'
  AND (filters applied)
```

**Estimated Effort**: 4-6 hours

---

### 3. GET /api/pm-approvals/filters

**Purpose**: Fetch available filter options

**Response:**
```javascript
{
  success: true,
  filters: {
    accounts: [
      { id: "001...", name: "Account Name" }
    ],
    projects: [
      { id: "a0X...", name: "Project Name", accountId: "001..." }
    ],
    projectObjectives: [
      { id: "a0Y...", name: "PO Name", projectId: "a0X..." }
    ],
    emails: [
      "email1@example.com",
      "email2@example.com"
    ],
    statuses: [
      "Contributor Approved",
      "PM Review",
      "Approved",
      "Rejected"
    ]
  }
}
```

**Estimated Effort**: 4-6 hours

---

### 4. GET /api/pm-approvals/deadlines

**Purpose**: Fetch deadline dates

**Response:**
```javascript
{
  success: true,
  deadlines: {
    contributorDeadline: "2025-12-02T18:00:00Z",
    pmApprovalDeadline: "2025-12-04T23:30:00Z",
    paymentGenerationDate: "2025-12-14T12:00:00Z"
  }
}
```

**Data Source Options:**
1. Configuration file
2. Salesforce Custom Settings
3. Environment variables
4. Hardcoded (if static)

**Estimated Effort**: 2-4 hours

---

## Component Architecture

### Main Page Component

```javascript
PMApprovalsPage.js
├── Sidebar Section
│   ├── DeadlinesPanel.js
│   ├── RecordsCount.js
│   └── FilterPanel.js
│       ├── AccountFilter.js
│       ├── ProjectFilter.js
│       ├── ProjectObjectiveFilter.js
│       └── EmailFilter.js
├── Main Content
│   ├── SummaryMetrics.js
│   │   ├── PendingHoursCard.js
│   │   ├── MetricsRow.js
│   │   └── PendingUnitsCard.js
│   └── ApprovalsTable.js
│       ├── TableHeader.js (sortable)
│       ├── TableRow.js
│       │   └── DualProductivityCell.js
│       ├── StatusBadge.js
│       └── TablePagination.js (or infinite scroll)
└── Modals (if needed)
    └── DetailModal.js (for drill-down)
```

---

## Implementation Effort Breakdown

### Phase 1: Backend API (Week 1-2)
- Field discovery for Self_Reported_Time object: **4-6 hours**
- `/api/pm-approvals/list` endpoint: **8-12 hours**
- `/api/pm-approvals/summary` endpoint: **4-6 hours**
- `/api/pm-approvals/filters` endpoint: **4-6 hours**
- `/api/pm-approvals/deadlines` endpoint: **2-4 hours**
- **Total Backend**: **22-34 hours** (~3-4 days)

### Phase 2: Frontend Components (Week 2-3)
- `PMApprovalsPage.js` main component: **4-6 hours**
- `DeadlinesPanel.js`: **2-4 hours**
- `RecordsCount.js`: **1-2 hours**
- `FilterPanel.js` with cascading filters: **8-12 hours**
- `SummaryMetrics.js` and sub-components: **8-10 hours**
- `ApprovalsTable.js` with all columns: **12-16 hours**
- `DualProductivityCell.js`: **4-6 hours**
- `StatusBadge.js`: **2-3 hours**
- **Total Frontend**: **41-59 hours** (~5-7 days)

### Phase 3: Integration & Testing (Week 3-4)
- API integration: **4-6 hours**
- Filter application logic: **4-6 hours**
- Sorting implementation: **3-4 hours**
- Pagination/infinite scroll: **4-6 hours**
- Error handling: **2-4 hours**
- Testing & bug fixes: **8-12 hours**
- **Total Integration**: **25-38 hours** (~3-5 days)

### **Total Estimated Effort**: **88-131 hours** (~11-16 days / 2-3 weeks)

---

## Technical Challenges & Solutions

### Challenge 1: Dual Productivity Column Display
**Challenge**: Displaying two values (self-reported and system tracked) in a single table column

**Solution**: Create custom `DualProductivityCell` component
```javascript
<DualProductivityCell 
  selfReported={3} 
  systemTracked={0} 
  unit="hours"
/>
```

**Complexity**: Medium
**Estimated Time**: 4-6 hours

---

### Challenge 2: Large Dataset Performance (20,145 records)
**Challenge**: Loading and displaying 20K+ records efficiently

**Solution**: 
- Implement pagination (1000 records per page)
- Use infinite scroll pattern (like `POPayRates.js`)
- Virtual scrolling for visible rows only
- Lazy load detail views

**Complexity**: Medium
**Estimated Time**: 4-6 hours (reusing existing patterns)

---

### Challenge 3: Cascading Filters
**Challenge**: Project filter depends on Account, Project Objective depends on Project

**Solution**: 
- Fetch projects when account changes
- Fetch project objectives when project changes
- Use existing pattern from `POProductivityTargets.js`
- Debounce filter changes

**Complexity**: Low-Medium
**Estimated Time**: 4-6 hours (reusing existing patterns)

---

### Challenge 4: Variance Calculation
**Challenge**: Calculating variance percentage with division by zero handling

**Solution**: 
```javascript
const calculateVariance = (selfReported, systemTracked) => {
  if (systemTracked === 0) {
    return selfReported > 0 ? 100 : 0;
  }
  return ((selfReported - systemTracked) / systemTracked) * 100;
};
```

**Complexity**: Low
**Estimated Time**: 1-2 hours

---

### Challenge 5: Field Discovery
**Challenge**: Identifying exact Salesforce object and field names

**Solution**: 
- Use existing `discoverPaymentConfigFields` pattern
- Support multiple possible object/field names
- Graceful fallback if fields don't exist
- Configuration file for field mappings

**Complexity**: Low-Medium
**Estimated Time**: 4-6 hours

---

## Reusable Components & Patterns

### ✅ Can Reuse Directly:
1. **Sidebar.js** - Main sidebar structure
2. **Table patterns** from `CaseManagement.js`, `POPayRates.js`
3. **Filter patterns** from `POProductivityTargets.js`
4. **KPI card patterns** from `ContributorPaymentsDashboard.js`
5. **API client** (`apiClient.js`)
6. **Salesforce connection** service
7. **Error handling** patterns
8. **Loading states** patterns

### 🔨 Need to Create:
1. `DeadlinesPanel.js` - NEW (simple)
2. `RecordsCount.js` - NEW (simple)
3. `FilterPanel.js` - NEW (but similar to existing)
4. `PendingHoursCard.js` - NEW (similar to existing KPIs)
5. `MetricsRow.js` - NEW (similar to existing)
6. `PendingUnitsCard.js` - NEW (simple)
7. `ApprovalsTable.js` - NEW (but reuse table patterns)
8. `DualProductivityCell.js` - NEW (custom)
9. `StatusBadge.js` - NEW (simple)

---

## Data Flow

```
User Opens PM Approvals Tab
  ↓
Fetch Deadlines (GET /api/pm-approvals/deadlines)
Fetch Filter Options (GET /api/pm-approvals/filters)
Fetch Summary Metrics (GET /api/pm-approvals/summary)
Fetch Records List (GET /api/pm-approvals/list)
  ↓
Display Deadlines in Sidebar
Display Records Count in Sidebar
Display Filters in Sidebar
Display Summary Metrics
Display Data Table
  ↓
User Applies Filters
  ↓
Update Query Parameters
Fetch New Data (with filters)
Update All Displays
  ↓
User Sorts Column
  ↓
Update Query Parameters
Fetch Sorted Data
Update Table Display
  ↓
User Scrolls (Infinite Scroll)
  ↓
Fetch Next Page (offset += 1000)
Append to Existing Records
Update Table Display
```

---

## Success Criteria

### Must Have (MVP):
- ✅ All columns from screenshot displayed
- ✅ Filters work (Account, Project, Project Objective, Email)
- ✅ Summary metrics calculate correctly
- ✅ Table displays records with pagination
- ✅ Sorting works on all columns
- ✅ Status badges display correctly
- ✅ Dual productivity column displays both values
- ✅ Deadlines panel displays dates
- ✅ Records count updates with filters

### Should Have (Enhanced):
- ✅ Infinite scroll for large datasets
- ✅ Row click for drill-down detail
- ✅ Export functionality
- ✅ Loading states and error handling
- ✅ Responsive design

### Nice to Have (Future):
- ✅ Bulk approval actions
- ✅ Saved filter presets
- ✅ Column customization
- ✅ Real-time updates
- ✅ Email notifications

---

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Salesforce object name unknown | High | Medium | Use field discovery, support multiple names |
| Missing required fields | Medium | Low | Field discovery with fallbacks, graceful degradation |
| Performance with 20K records | Medium | Medium | Pagination, virtual scrolling, query optimization |
| Cascading filter complexity | Low | Low | Reuse existing patterns |
| Variance calculation edge cases | Low | Low | Proper error handling, division by zero checks |

---

## Conclusion

The PM Approvals tab implementation is **highly feasible** with an estimated **2-3 weeks** of development time. The application already has:

- ✅ 85-90% of required patterns and components
- ✅ Strong Salesforce integration
- ✅ Advanced table and filter components
- ✅ Similar dashboard patterns

**Key Strengths:**
- Most components can reuse existing patterns
- Backend infrastructure is solid
- Frontend patterns are well-established
- Only a few custom components needed (DualProductivityCell, StatusBadge)

**Recommended Approach:**
1. Start with backend API development
2. Build frontend components reusing existing patterns
3. Focus on MVP features first
4. Add enhancements based on user feedback

**Next Steps:**
1. Confirm Salesforce object name for self-reported time
2. Map all required fields
3. Create field discovery logic
4. Begin Phase 1 implementation

---

**Document Version**: 1.0  
**Date**: December 2024  
**Focus**: PM Approvals Tab Only  
**Status**: Analysis Complete - Ready for Implementation


