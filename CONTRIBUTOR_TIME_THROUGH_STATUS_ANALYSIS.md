# Contributor Time Through Status - Deep Analysis & Implementation Plan

## Executive Summary

This document provides a comprehensive analysis of how to calculate and report "Contributor Time Through Status" - tracking how long contributors spend in each status throughout their lifecycle. This metric is critical for understanding bottlenecks, optimizing processes, and improving contributor experience.

---

## 1. Current Data Model Analysis

### 1.1 Available Status Fields

#### Status__c (Contributor_Project__c)
**Status Values:**
- `Draft` - Initial creation
- `Invite` - Invitation sent
- `App Received` - Application received
- `Matched` - Matched to project/objective
- `Qualified` - Qualification completed
- `Active` - Actively working
- `Production` - In production phase
- `Removed` - Removed from project

**Status Lifecycle Flow:**
```
Draft → Invite → App Received → Matched → Qualified → Active → Production
                                                                    ↓
                                                                  Removed
```

#### Queue_Status__c (Contributor_Project__c)
**Queue Values:**
- `Calibration Queue`
- `Production Queue`
- `Test Queue`
- `--None--`

**Note:** Queue Status is independent of Status__c and can change multiple times.

### 1.2 Available Date Fields

#### Explicit Status Date Fields
- `Applied_Date__c` - Date when application was received
- `Qualified_Date__c` - Date when contributor was qualified
- `Onboarded_Date__c` - Date when contributor was onboarded
- `Removed_Date__c` - Date when contributor was removed

#### Standard Salesforce Fields
- `CreatedDate` - Record creation timestamp
- `LastModifiedDate` - Last modification timestamp (updates on any field change)

### 1.3 Data Limitations & Challenges

#### Challenge 1: Incomplete Date Coverage
- **Issue:** Not all statuses have explicit date fields
  - ✅ `Applied_Date__c` → App Received
  - ✅ `Qualified_Date__c` → Qualified
  - ✅ `Onboarded_Date__c` → Active/Production
  - ✅ `Removed_Date__c` → Removed
  - ❌ No date for: Draft, Invite, Matched

#### Challenge 2: Status Change History
- **Issue:** Salesforce doesn't automatically track status change history
- **Current State:** Only current status and `LastModifiedDate` are available
- **Impact:** Cannot accurately determine when status changed if multiple fields were updated

#### Challenge 3: Multiple Status Transitions
- **Issue:** Contributors may cycle through statuses (e.g., Active → Removed → Active)
- **Impact:** Need to track cumulative time across multiple visits to same status

#### Challenge 4: Current Status Time Calculation
- **Issue:** For current status, need to calculate time from last status change to "now"
- **Challenge:** Determining when current status was set (may need to use `LastModifiedDate` as proxy)

---

## 2. Calculation Methodology

### 2.1 Approach 1: Date Field Mapping (Most Accurate)

**When to Use:** For statuses with explicit date fields

**Calculation Logic:**

```javascript
// Time in each status (in days)
const timeInStatus = {
  'App Received': {
    startDate: Applied_Date__c,
    endDate: Qualified_Date__c || Onboarded_Date__c || Removed_Date__c || NOW,
    days: calculateDays(startDate, endDate)
  },
  'Qualified': {
    startDate: Qualified_Date__c,
    endDate: Onboarded_Date__c || Removed_Date__c || NOW,
    days: calculateDays(startDate, endDate)
  },
  'Active/Production': {
    startDate: Onboarded_Date__c,
    endDate: Removed_Date__c || NOW,
    days: calculateDays(startDate, endDate)
  },
  'Removed': {
    startDate: Removed_Date__c,
    endDate: NOW (if still removed) or next status date,
    days: calculateDays(startDate, endDate)
  }
};
```

**Pros:**
- ✅ Most accurate for statuses with explicit dates
- ✅ Handles multiple transitions correctly
- ✅ Clear start/end dates

**Cons:**
- ❌ Only works for statuses with date fields
- ❌ Requires all date fields to be populated

### 2.2 Approach 2: Status Inference from Dates (Hybrid)

**When to Use:** When explicit dates exist but need to infer intermediate statuses

**Calculation Logic:**

```javascript
// Infer status timeline from dates
const statusTimeline = [];

if (Applied_Date__c) {
  statusTimeline.push({
    status: 'App Received',
    startDate: Applied_Date__c,
    endDate: Qualified_Date__c || Onboarded_Date__c || LastModifiedDate
  });
}

if (Qualified_Date__c && Qualified_Date__c >= Applied_Date__c) {
  statusTimeline.push({
    status: 'Qualified',
    startDate: Qualified_Date__c,
    endDate: Onboarded_Date__c || Removed_Date__c || LastModifiedDate
  });
}

if (Onboarded_Date__c) {
  statusTimeline.push({
    status: 'Active', // or 'Production' based on current Status__c
    startDate: Onboarded_Date__c,
    endDate: Removed_Date__c || LastModifiedDate || NOW
  });
}

if (Removed_Date__c) {
  statusTimeline.push({
    status: 'Removed',
    startDate: Removed_Date__c,
    endDate: NOW // if Status__c is still 'Removed'
  });
}
```

**Pros:**
- ✅ Uses available date fields
- ✅ Handles gaps in status progression
- ✅ More accurate than LastModifiedDate alone

**Cons:**
- ❌ May miss intermediate statuses (Invite, Matched)
- ❌ Assumes linear progression

### 2.3 Approach 3: LastModifiedDate Proxy (Fallback)

**When to Use:** When explicit dates are missing or incomplete

**Calculation Logic:**

```javascript
// Use LastModifiedDate as proxy for status change date
// This assumes LastModifiedDate updates when Status__c changes
const currentStatusStartDate = LastModifiedDate;
const timeInCurrentStatus = calculateDays(currentStatusStartDate, NOW);

// For historical statuses, use CreatedDate as proxy
const timeInInitialStatus = calculateDays(CreatedDate, LastModifiedDate);
```

**Pros:**
- ✅ Always available
- ✅ Works for all statuses

**Cons:**
- ❌ Less accurate (LastModifiedDate updates on ANY field change)
- ❌ Cannot distinguish between status changes and other updates
- ❌ May overestimate time in status

### 2.4 Recommended Hybrid Approach

**Combine all three approaches with priority:**

1. **Primary:** Use explicit date fields when available (Approach 1)
2. **Secondary:** Infer from date progression (Approach 2)
3. **Fallback:** Use LastModifiedDate for missing statuses (Approach 3)

**Implementation Priority:**
```javascript
function calculateTimeInStatus(contributorProject) {
  const timeline = [];
  const now = new Date();
  
  // 1. Use explicit dates (highest priority)
  if (contributorProject.Applied_Date__c) {
    timeline.push({
      status: 'App Received',
      startDate: new Date(contributorProject.Applied_Date__c),
      endDate: contributorProject.Qualified_Date__c 
        ? new Date(contributorProject.Qualified_Date__c)
        : (contributorProject.Onboarded_Date__c 
          ? new Date(contributorProject.Onboarded_Date__c)
          : (contributorProject.Removed_Date__c 
            ? new Date(contributorProject.Removed_Date__c)
            : now))
    });
  }
  
  if (contributorProject.Qualified_Date__c) {
    timeline.push({
      status: 'Qualified',
      startDate: new Date(contributorProject.Qualified_Date__c),
      endDate: contributorProject.Onboarded_Date__c
        ? new Date(contributorProject.Onboarded_Date__c)
        : (contributorProject.Removed_Date__c
          ? new Date(contributorProject.Removed_Date__c)
          : now)
    });
  }
  
  if (contributorProject.Onboarded_Date__c) {
    const activeStatus = contributorProject.Status__c === 'Production' 
      ? 'Production' 
      : 'Active';
    timeline.push({
      status: activeStatus,
      startDate: new Date(contributorProject.Onboarded_Date__c),
      endDate: contributorProject.Removed_Date__c
        ? new Date(contributorProject.Removed_Date__c)
        : now
    });
  }
  
  if (contributorProject.Removed_Date__c && 
      contributorProject.Status__c === 'Removed') {
    timeline.push({
      status: 'Removed',
      startDate: new Date(contributorProject.Removed_Date__c),
      endDate: now
    });
  }
  
  // 2. Fill gaps with CreatedDate/LastModifiedDate (fallback)
  if (timeline.length === 0) {
    // No explicit dates, use CreatedDate as start
    timeline.push({
      status: contributorProject.Status__c || 'Draft',
      startDate: new Date(contributorProject.CreatedDate),
      endDate: new Date(contributorProject.LastModifiedDate)
    });
  }
  
  // 3. Calculate time in each status
  const timeByStatus = {};
  timeline.forEach(period => {
    const days = Math.floor((period.endDate - period.startDate) / (1000 * 60 * 60 * 24));
    if (!timeByStatus[period.status]) {
      timeByStatus[period.status] = {
        totalDays: 0,
        periods: []
      };
    }
    timeByStatus[period.status].totalDays += days;
    timeByStatus[period.status].periods.push({
      startDate: period.startDate,
      endDate: period.endDate,
      days: days
    });
  });
  
  return timeByStatus;
}
```

---

## 3. Reporting Requirements

### 3.1 High-Level Metrics Dashboard

#### Overview Cards
1. **Average Time by Status**
   - Show average days spent in each status
   - Color-coded by status
   - Include count of contributors who reached each status

2. **Total Time Distribution**
   - Pie/Donut chart showing percentage of total time spent in each status
   - Helps identify bottlenecks

3. **Status Transition Times**
   - Average time to move from one status to next
   - Example: "Average time from Qualified to Active: 5.2 days"

#### Visualizations
1. **Time-in-Status Bar Chart**
   - X-axis: Status (Draft, Invite, App Received, Matched, Qualified, Active, Production, Removed)
   - Y-axis: Average Days
   - Show min, max, average for each status

2. **Status Timeline Gantt Chart**
   - Individual contributor view
   - Horizontal bars showing time spent in each status
   - Color-coded by status

3. **Funnel with Time Metrics**
   - Traditional funnel showing count
   - Overlay average time in each stage
   - Conversion rate + time metrics

### 3.2 Detailed Reports

#### Report 1: Contributor Status Timeline
**Purpose:** Show individual contributor's journey through statuses

**Columns:**
- Contributor Name
- Project Name
- Project Objective
- Status Timeline (visual timeline)
- Time in Each Status (days)
- Total Time to Active/Production
- Current Status
- Days in Current Status

**Drill-Down:** Click contributor to see detailed timeline

#### Report 2: Status Performance Summary
**Purpose:** Aggregate metrics by status

**Metrics per Status:**
- Count of Contributors
- Average Time (days)
- Median Time (days)
- Min Time (days)
- Max Time (days)
- Standard Deviation
- Contributors Currently in Status
- Average Time for Current Contributors

**Grouping Options:**
- By Project
- By Project Objective
- By Account
- By Time Period (Month/Quarter)

#### Report 3: Bottleneck Analysis
**Purpose:** Identify where contributors spend most time

**Visualizations:**
1. **Heatmap**
   - Rows: Projects/Objectives
   - Columns: Statuses
   - Color intensity: Average time in status

2. **Top Bottlenecks Table**
   - Status
   - Average Time
   - Contributors Affected
   - % of Total Time

#### Report 4: Status Transition Analysis
**Purpose:** Understand time between status transitions

**Metrics:**
- Time from Draft → Invite
- Time from Invite → App Received
- Time from App Received → Matched
- Time from Matched → Qualified
- Time from Qualified → Active
- Time from Active → Production
- Time from Any Status → Removed

**Visualization:**
- Sankey diagram showing flow and time between statuses

### 3.3 Drill-Down Capabilities

#### Level 1: Status Summary → Contributors in Status
- Click on a status in the summary
- See list of all contributors who were/are in that status
- Show time spent for each

#### Level 2: Contributor → Detailed Timeline
- Click on a contributor
- See complete timeline with dates
- Show all status transitions
- Highlight longest/shortest time periods

#### Level 3: Project/Objective → Contributors
- Filter by Project or Project Objective
- See status distribution and time metrics for that project
- Compare against overall averages

---

## 4. Implementation Architecture

### 4.1 Backend API Endpoints

#### Endpoint 1: `/api/contributor-time-status/overview`
**Purpose:** High-level metrics dashboard

**Response:**
```json
{
  "success": true,
  "data": {
    "averageTimeByStatus": {
      "Draft": { "days": 2.5, "count": 150 },
      "Invite": { "days": 3.2, "count": 140 },
      "App Received": { "days": 1.8, "count": 130 },
      "Matched": { "days": 2.1, "count": 125 },
      "Qualified": { "days": 5.4, "count": 120 },
      "Active": { "days": 45.2, "count": 100 },
      "Production": { "days": 120.5, "count": 80 },
      "Removed": { "days": 10.3, "count": 20 }
    },
    "totalTimeDistribution": {
      "Draft": 2.1,
      "Invite": 2.7,
      "App Received": 1.5,
      "Matched": 1.8,
      "Qualified": 4.5,
      "Active": 37.8,
      "Production": 100.7,
      "Removed": 8.6
    },
    "statusTransitions": {
      "Draft → Invite": { "avgDays": 2.5, "count": 150 },
      "Invite → App Received": { "avgDays": 3.2, "count": 140 },
      "App Received → Matched": { "avgDays": 1.8, "count": 130 },
      "Matched → Qualified": { "avgDays": 2.1, "count": 125 },
      "Qualified → Active": { "avgDays": 5.4, "count": 120 },
      "Active → Production": { "avgDays": 7.2, "count": 100 }
    }
  }
}
```

#### Endpoint 2: `/api/contributor-time-status/timeline`
**Purpose:** Individual contributor timelines

**Query Parameters:**
- `contributorId` (optional) - Filter by contributor
- `projectId` (optional) - Filter by project
- `projectObjectiveId` (optional) - Filter by objective
- `status` (optional) - Filter by current status
- `limit` (default: 100)
- `offset` (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "contributorProjectId": "a0X...",
      "contributorName": "John Doe",
      "projectName": "Project Alpha",
      "projectObjectiveName": "Objective 1",
      "currentStatus": "Active",
      "daysInCurrentStatus": 15,
      "statusTimeline": [
        {
          "status": "App Received",
          "startDate": "2024-01-15",
          "endDate": "2024-01-18",
          "days": 3
        },
        {
          "status": "Qualified",
          "startDate": "2024-01-18",
          "endDate": "2024-01-25",
          "days": 7
        },
        {
          "status": "Active",
          "startDate": "2024-01-25",
          "endDate": null,
          "days": 15
        }
      ],
      "totalTimeToActive": 10,
      "totalTimeInProject": 25
    }
  ],
  "pagination": {
    "total": 500,
    "limit": 100,
    "offset": 0,
    "hasMore": true
  }
}
```

#### Endpoint 3: `/api/contributor-time-status/bottlenecks`
**Purpose:** Identify bottlenecks

**Query Parameters:**
- `groupBy` (optional) - "project", "objective", "account"
- `minDays` (optional) - Minimum days to consider a bottleneck

**Response:**
```json
{
  "success": true,
  "data": {
    "topBottlenecks": [
      {
        "status": "Qualified",
        "averageDays": 12.5,
        "contributorsAffected": 150,
        "percentOfTotalTime": 15.2,
        "projects": ["Project A", "Project B"]
      }
    ],
    "heatmapData": {
      "Project A": {
        "Qualified": 12.5,
        "Active": 45.2
      }
    }
  }
}
```

#### Endpoint 4: `/api/contributor-time-status/transitions`
**Purpose:** Status transition analysis

**Response:**
```json
{
  "success": true,
  "data": {
    "transitions": [
      {
        "fromStatus": "Draft",
        "toStatus": "Invite",
        "averageDays": 2.5,
        "medianDays": 2.0,
        "minDays": 0,
        "maxDays": 10,
        "count": 150
      }
    ],
    "sankeyData": {
      "nodes": ["Draft", "Invite", "App Received", ...],
      "links": [
        {
          "source": "Draft",
          "target": "Invite",
          "value": 2.5,
          "count": 150
        }
      ]
    }
  }
}
```

### 4.2 Frontend Components

#### Component 1: `ContributorTimeStatusDashboard.js`
**Location:** `client/src/pages/ContributorTimeStatusDashboard.js`

**Features:**
- Overview cards with key metrics
- Time-in-status bar chart
- Status distribution pie chart
- Status transition metrics
- Filter by Account, Project, Date Range

#### Component 2: `StatusTimelineTable.js`
**Location:** `client/src/components/ContributorTimeStatus/StatusTimelineTable.js`

**Features:**
- Sortable table with contributor timelines
- Expandable rows for detailed timeline view
- Visual timeline bar chart per contributor
- Export to Excel/CSV
- Infinite scroll for large datasets

#### Component 3: `BottleneckAnalysis.js`
**Location:** `client/src/components/ContributorTimeStatus/BottleneckAnalysis.js`

**Features:**
- Heatmap visualization
- Top bottlenecks table
- Filterable by project/objective
- Drill-down to contributors

#### Component 4: `StatusTransitionChart.js`
**Location:** `client/src/components/ContributorTimeStatus/StatusTransitionChart.js`

**Features:**
- Sankey diagram for status flow
- Transition time metrics
- Interactive hover details

### 4.3 Database/Query Strategy

#### Query 1: Fetch Contributor Projects with Dates
```sql
SELECT 
  Id,
  Name,
  Contact__c,
  Contact__r.Name,
  Project__c,
  Project__r.Name,
  Project_Objective__c,
  Project_Objective__r.Name,
  Status__c,
  Applied_Date__c,
  Qualified_Date__c,
  Onboarded_Date__c,
  Removed_Date__c,
  CreatedDate,
  LastModifiedDate
FROM Contributor_Project__c
WHERE Status__c != null
ORDER BY CreatedDate DESC
```

#### Query 2: Aggregate Time by Status
**Process:** Fetch all records, calculate time in status in-memory, then aggregate

**Reason:** SOQL doesn't support complex date calculations, so we need to:
1. Fetch all Contributor_Project records with dates
2. Calculate time in status in JavaScript/Node.js
3. Aggregate by status, project, objective, etc.

#### Performance Considerations:
- **Batch Processing:** Process records in batches of 2000 (Salesforce limit)
- **Caching:** Cache calculated metrics for 5-10 minutes
- **Pagination:** Use offset/limit for large datasets
- **Indexing:** Ensure queries use indexed fields (Status__c, CreatedDate)

---

## 5. UI/UX Design Recommendations

### 5.1 Dashboard Layout

```
┌─────────────────────────────────────────────────────────┐
│  Contributor Time Through Status Dashboard             │
│  [Account Filter] [Project Filter] [Date Range] [Refresh] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐│
│  │ Avg Time │  │ Total    │  │ Current  │  │ Bottleneck││
│  │ in Status│  │ Time     │  │ Status   │  │ Status    ││
│  │ 5.2 days │  │ 120 days │  │ Active:  │  │ Qualified ││
│  │          │  │          │  │ 45       │  │ 12.5 days ││
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘│
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │  Time in Status (Bar Chart)                      │ │
│  │  [Visual bar chart showing avg days per status]  │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌──────────────────┐  ┌────────────────────────────┐ │
│  │ Status           │  │ Status Transitions         │ │
│  │ Distribution     │  │ (Sankey Diagram)           │ │
│  │ (Pie Chart)      │  │                            │ │
│  └──────────────────┘  └────────────────────────────┘ │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │  Contributor Status Timeline Table                │ │
│  │  [Sortable table with drill-down]                 │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 5.2 Color Scheme

**Status Colors:**
- Draft: `#94a3b8` (Gray)
- Invite: `#3b82f6` (Blue)
- App Received: `#8b5cf6` (Purple)
- Matched: `#ec4899` (Pink)
- Qualified: `#f59e0b` (Amber)
- Active: `#10b981` (Green)
- Production: `#06b6d4` (Cyan)
- Removed: `#ef4444` (Red)

### 5.3 Interactive Features

1. **Hover Tooltips:**
   - Show detailed metrics on chart hover
   - Include count, min, max, median

2. **Click to Drill-Down:**
   - Click status in chart → See contributors in that status
   - Click contributor → See detailed timeline
   - Click project → See project-specific metrics

3. **Filtering:**
   - Account dropdown (top-level filter)
   - Project multi-select
   - Date range picker
   - Status filter

4. **Export:**
   - Export table data to Excel/CSV
   - Export charts as images
   - Export full report as PDF

---

## 6. Implementation Phases

### Phase 1: Backend Foundation (Week 1)
- [ ] Create `/api/contributor-time-status/overview` endpoint
- [ ] Implement time calculation logic (hybrid approach)
- [ ] Add query optimization and batching
- [ ] Create utility functions for date calculations

### Phase 2: Basic Dashboard (Week 2)
- [ ] Create `ContributorTimeStatusDashboard.js` page
- [ ] Implement overview cards
- [ ] Add time-in-status bar chart
- [ ] Add status distribution pie chart
- [ ] Add basic filtering (Account)

### Phase 3: Detailed Reports (Week 3)
- [ ] Create `StatusTimelineTable.js` component
- [ ] Implement timeline visualization
- [ ] Add drill-down functionality
- [ ] Add export capabilities

### Phase 4: Advanced Analytics (Week 4)
- [ ] Create `BottleneckAnalysis.js` component
- [ ] Implement heatmap visualization
- [ ] Create `StatusTransitionChart.js` component
- [ ] Add Sankey diagram

### Phase 5: Polish & Optimization (Week 5)
- [ ] Add caching for performance
- [ ] Optimize queries
- [ ] Add loading states and error handling
- [ ] User testing and refinements

---

## 7. Success Metrics

### 7.1 Technical Metrics
- API response time < 3 seconds for overview
- API response time < 5 seconds for detailed reports
- Support for 10,000+ Contributor_Project records
- 99% calculation accuracy (validated against manual calculations)

### 7.2 Business Metrics
- Identify top 3 bottlenecks in contributor lifecycle
- Reduce average time in Qualified status by 20%
- Improve visibility into contributor journey
- Enable data-driven process improvements

---

## 8. Future Enhancements

### 8.1 Status Change History Tracking
**Enhancement:** Implement Salesforce Field History Tracking or custom object to track status changes

**Benefits:**
- Accurate status change timestamps
- Support for multiple status transitions
- Historical analysis

**Implementation:**
- Enable Field History Tracking on `Status__c`
- Query `Status__c` history object
- Use history for accurate time calculations

### 8.2 Predictive Analytics
**Enhancement:** Predict time to next status based on historical data

**Features:**
- ML model to predict time in current status
- Alert when contributor exceeds expected time
- Identify at-risk contributors

### 8.3 Real-Time Updates
**Enhancement:** WebSocket or polling for real-time status updates

**Features:**
- Live dashboard updates
- Notifications for status changes
- Real-time bottleneck alerts

---

## 9. Conclusion

The Contributor Time Through Status feature will provide valuable insights into the contributor lifecycle, enabling data-driven decisions to optimize processes and improve contributor experience. The hybrid calculation approach balances accuracy with data availability, while the comprehensive reporting suite ensures users can drill down from high-level metrics to individual contributor timelines.

**Key Recommendations:**
1. Start with Phase 1-2 for MVP
2. Validate calculation accuracy with sample data
3. Gather user feedback before Phase 3-4
4. Consider implementing Field History Tracking for long-term accuracy
5. Use caching and optimization to ensure good performance

---

## Appendix A: Sample Calculations

### Example 1: Contributor with Complete Dates
```
Contributor: John Doe
Project: Project Alpha

Applied_Date__c: 2024-01-15
Qualified_Date__c: 2024-01-18
Onboarded_Date__c: 2024-01-25
Current Status: Active
Current Date: 2024-02-10

Calculations:
- Time in "App Received": 3 days (Jan 15-18)
- Time in "Qualified": 7 days (Jan 18-25)
- Time in "Active": 16 days (Jan 25 - Feb 10)
- Total Time to Active: 10 days (Jan 15-25)
- Total Time in Project: 26 days (Jan 15 - Feb 10)
```

### Example 2: Contributor with Missing Dates
```
Contributor: Jane Smith
Project: Project Beta

CreatedDate: 2024-01-10
LastModifiedDate: 2024-01-20
Current Status: Qualified
No explicit date fields populated

Calculations (Fallback):
- Time in "Qualified": 10 days (Jan 10-20, using CreatedDate to LastModifiedDate)
- Note: Less accurate, but best estimate available
```

---

## Appendix B: SQL Query Examples

### Query for Status Distribution
```sql
SELECT 
  Status__c,
  COUNT(Id) as Count,
  AVG(DATEDIFF(day, CreatedDate, LastModifiedDate)) as AvgDays
FROM Contributor_Project__c
WHERE Status__c != null
GROUP BY Status__c
```

### Query for Contributors with Dates
```sql
SELECT 
  Id,
  Name,
  Contact__r.Name,
  Project__r.Name,
  Status__c,
  Applied_Date__c,
  Qualified_Date__c,
  Onboarded_Date__c,
  Removed_Date__c,
  CreatedDate,
  LastModifiedDate
FROM Contributor_Project__c
WHERE Status__c != null
  AND (Applied_Date__c != null 
    OR Qualified_Date__c != null 
    OR Onboarded_Date__c != null)
ORDER BY CreatedDate DESC
LIMIT 2000
```

---

**Document Version:** 1.0  
**Last Updated:** 2024-12-19  
**Author:** AI Assistant  
**Status:** Ready for Review



