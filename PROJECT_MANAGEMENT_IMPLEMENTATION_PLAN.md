# Project Management System - Implementation Plan

## Executive Summary

This document outlines a comprehensive plan for implementing a Project Management system within the existing application. The system will provide task/workflow management, scheduling, resource management, time tracking, budget management, contributor performance analytics, QA tools, secure communication, role-based access, automation, and reporting capabilities.

**⚠️ CRITICAL CONSTRAINT: NO NEW SALESFORCE OBJECTS CAN BE CREATED**

**Key Design Decision: Use `Contributor_Project__c` as Tasks**
- **Tasks = Contributor_Project__c records** - No separate task object needed
- Contributor_Project__c already has: Status__c, Queue_Status__c, Project__c, Project_Objective__c, Contact__c
- This approach leverages existing data structure and relationships
- Integrates seamlessly with existing Queue Status Management functionality

**Key Principles:**
- **Decomposed Implementation**: Features broken into independent, minimal modules
- **MVP-First Approach**: Prioritize high-value features with maximum usability
- **Salesforce-Native**: Leverage existing Salesforce integration (no separate database)
- **Existing Objects Only**: Use only existing Salesforce objects - no new custom objects
- **Incremental Delivery**: Phased rollout with working features at each stage
- **User-Centric Design**: Intuitive UI/UX for both PMs and contributors

---

## 1. Architecture Overview

### 1.1 Technical Foundation

**Current Stack:**
- Frontend: React 18.2.0, React Router, Recharts, Lucide Icons
- Backend: Node.js/Express, JWT Auth, Salesforce (jsforce)
- Existing: RBAC system, Dashboard components, Analytics patterns

**Data Storage Strategy:**
- **Primary**: Salesforce Custom Objects (no local database)
- **Caching**: LocalStorage for UI state, session data
- **File Storage**: Salesforce Files/Attachments or external storage (if needed)

### 1.2 Salesforce Object Design

**⚠️ CONSTRAINT: NO NEW CUSTOM OBJECTS CAN BE CREATED**

This plan uses **ONLY existing Salesforce objects**. The following objects are available:

**Existing Objects Available:**
- `Project__c` - Main project object
- `Contributor_Project__c` - Links contributors to projects (has fields: Status__c, Queue_Status__c, Project__c, Project_Objective__c, Contact__c/Contributor__c)
- `Project_Objective__c` - Project objectives
- `Contact` - Contributors/users
- `Case` - Standard Salesforce object (can be repurposed for tasks)
- `CaseComment` - Standard object for Case comments
- `FeedItem` - Standard object for Chatter feeds/comments
- `ContentDocument` / `ContentVersion` - Standard objects for file attachments
- `User` - Users
- `Account` - Accounts
- `Contributor_Review__c` - Contributor reviews (may exist)
- `Payment_Transactions_Needing_Approval__c` / `Self_Reported_Time__c` - Time tracking objects (may exist, need discovery)
- `Project_Team_Member__c` / `Team_Member__c` - Team members (may exist)

**Object Mapping Strategy:**

1. **Task Management** → Use `Contributor_Project__c` object (PRIMARY APPROACH)
   - `Contributor_Project__c.Name` → Task name
   - `Contributor_Project__c.Status__c` → Task status (Active, Qualified, Production, etc. - existing values)
   - `Contributor_Project__c.Queue_Status__c` → Task workflow/queue status (Calibration Queue, Production Queue, Test Queue, etc.)
   - `Contributor_Project__c.Project__c` → Link to project (existing lookup)
   - `Contributor_Project__c.Project_Objective__c` → Link to project objective (existing lookup)
   - `Contributor_Project__c.Contact__c` / `Contributor__c` → Assigned contributor (existing lookup)
   - `Contributor_Project__c.CreatedDate` → Task creation date
   - `Contributor_Project__c.LastModifiedDate` → Last update date
   - **Additional Fields (if they exist)**:
     - `Due_Date__c` → Due date (if custom field exists)
     - `Priority__c` → Priority (if custom field exists)
     - `Description__c` → Task description (if custom field exists)
     - `Estimated_Hours__c` → Estimated hours (if custom field exists)
     - `Actual_Hours__c` → Actual hours (if custom field exists)
   - **Advantages**:
     - ✅ Already linked to projects and objectives
     - ✅ Already has contributor assignment
     - ✅ Already has status workflow (Status__c)
     - ✅ Already has queue/workflow status (Queue_Status__c)
     - ✅ No new objects needed
   - **Limitations**: 
     - ❌ Complex task dependencies (cannot be implemented - no relationship fields)
     - ❌ Group assignments (only individual contributors via Contact__c/Contributor__c)
     - ⚠️ Priority, Due Date, Description, Hours (only if custom fields exist, otherwise cannot track)
     - ⚠️ Task description/details (may need to use Name field or existing description fields if available)

2. **Task Comments** → Use `FeedItem` (Chatter Feed) or `CaseComment` (if Cases are linked)
   - `FeedItem.ParentId` → Links to Contributor_Project__c (task)
   - `FeedItem.Body` → Comment/feed text
   - `FeedItem.CreatedBy` → Author
   - `FeedItem.CreatedDate` → Comment date
   - **Alternative**: Use `CaseComment` if linking Cases to Contributor_Project__c
   - **Limitations**:
     - ❌ @mentions (cannot be implemented without custom parsing/notification logic)
     - ⚠️ File attachments (use ContentDocumentLink via FeedItem, but complex)
     - ⚠️ Requires Chatter enabled on Contributor_Project__c object

3. **Time Tracking** → Use existing time objects (if they exist)
   - `Payment_Transactions_Needing_Approval__c` (if exists)
   - `Self_Reported_Time__c` (if exists)
   - **Fallback**: Use `Case` with custom fields or `Contributor_Project__c` fields
   - **Limitations**:
     - ⚠️ Depends on object existence (may not be available)
     - ❌ Cannot create if doesn't exist

4. **Budget Management** → Use `Project__c` fields
   - Use existing budget fields on `Project__c` (if any)
   - Store budget data in JSON/text fields (limited functionality)
   - **Limitations**:
     - ❌ Proper budget tracking (requires custom fields)
     - ❌ Budget categories (cannot be implemented properly)
     - ⚠️ Variance calculations (limited)

5. **QA Feedback** → Use `Contributor_Review__c` or `Case`
   - `Contributor_Review__c` (if exists) for QA feedback
   - Or repurpose `Case` with Type = "QA Review"
   - **Limitations**:
     - ⚠️ Depends on object existence
     - ❌ Cannot create if doesn't exist

6. **Workflow Templates** → ❌ **CANNOT BE IMPLEMENTED**
   - No object to store templates
   - Cannot create custom objects

7. **Automation Rules** → ❌ **CANNOT BE IMPLEMENTED**
   - No object to store rules
   - Cannot create custom objects
   - ⚠️ Can implement hardcoded automation logic (limited)

**Features That CANNOT Be Implemented:**
- ❌ Custom workflow templates (no storage object)
- ❌ Automation rule builder/management (no storage object)
- ❌ Complex task dependencies (no relationship fields on Contributor_Project__c)
- ❌ Group task assignments (only individual contributors via Contact__c/Contributor__c)
- ❌ Proper budget tracking with categories (no budget object, limited to Project__c fields)
- ❌ @mentions in comments (no mention field, complex parsing and notification system required)
- ❌ Gantt chart with dependencies (no dependency relationships)
- ❌ Time tracking (if time tracking objects don't exist)
- ❌ QA feedback system (if Contributor_Review__c doesn't exist)
- ❌ Comment reactions (no reaction field on FeedItem)
- ❌ Email notifications (no notification system)

**Features That CAN Be Implemented (with Contributor_Project__c as tasks):**
- ✅ Task creation, assignment, status tracking
- ✅ Kanban board and list views
- ✅ Filtering by project, objective, contributor, status
- ✅ Calendar view (using CreatedDate/LastModifiedDate or custom date fields)
- ✅ Resource workload visualization
- ✅ Performance analytics
- ✅ Basic comments (via FeedItem)
- ✅ File attachments (via ContentDocumentLink)
- ✅ Hardcoded automation rules
- ✅ Customizable dashboards

---

## 2. Implementation Phases

### Phase 1: Foundation & Core Task Management (MVP)
**Timeline**: 4-6 weeks  
**User Value**: High - Core functionality for task tracking  
**Priority**: P0

#### 1.1 Backend Infrastructure
**Files to Create:**
- `server/routes/taskManagement.js` - Task CRUD endpoints
- `server/services/taskService.js` - Task business logic
- `server/utils/taskUtils.js` - Task utilities (dependencies, status transitions)

**API Endpoints:**
```
GET    /api/tasks                    - List tasks (with filters)
GET    /api/tasks/:id                - Get task details
POST   /api/tasks                    - Create task
PUT    /api/tasks/:id                - Update task
DELETE /api/tasks/:id                - Delete task
GET    /api/tasks/:id/dependencies   - Get task dependencies
POST   /api/tasks/:id/assign         - Assign task to user/group
PUT    /api/tasks/:id/status         - Update task status
```

**Key Features:**
- ✅ Create, read, update, delete tasks (using Contributor_Project__c object)
- ✅ Assign to individual contributors (using Contact__c/Contributor__c)
- ✅ Status workflow using Status__c (Active, Qualified, Production, etc.)
- ✅ Queue/workflow status using Queue_Status__c (Calibration Queue, Production Queue, etc.)
- ✅ Link to projects (Project__c) and objectives (Project_Objective__c)
- ✅ Filter by project, objective, contributor, status, queue status
- ❌ Task dependencies (CANNOT be implemented - no relationship fields)
- ⚠️ Priority, Due Date, Description, Hours (only if custom fields exist on Contributor_Project__c)
- ⚠️ Group assignments (only individual contributors, no group field)

#### 1.2 Frontend Components
**Files to Create:**
- `client/src/pages/TaskManagement/TaskManagement.js` - Main page
- `client/src/pages/TaskManagement/components/TaskList.js` - Task list view
- `client/src/pages/TaskManagement/components/TaskCard.js` - Task card component
- `client/src/pages/TaskManagement/components/TaskForm.js` - Create/edit task form
- `client/src/pages/TaskManagement/components/TaskFilters.js` - Filter panel
- `client/src/pages/TaskManagement/components/TaskDetailModal.js` - Task detail view
- `client/src/hooks/useTasks.js` - Task data hook

**UI Features:**
- Kanban board view (columns based on Status__c or Queue_Status__c values)
- List view with sortable columns
- Task creation modal/form (creates new Contributor_Project__c)
- Quick status updates (drag-and-drop in Kanban to change Status__c or Queue_Status__c)
- Basic filters (project, objective, status, queue status, contributor)
- Task detail view (shows Contributor_Project__c details)
- Integration with existing Queue Status Management page

#### 1.3 Integration Points
- ✅ Tasks ARE Contributor_Project__c records (no separate linking needed)
- ✅ Already linked to `Project__c` and `Project_Objective__c`
- ✅ Use existing RBAC for task permissions
- ✅ Integrate with existing Queue Status Management functionality
- ✅ Leverage existing Contributor_Project__c queries and filters
- ✅ Reuse existing contributor lookup patterns

---

### Phase 2: Scheduling & Planning
**Timeline**: 3-4 weeks  
**User Value**: High - Visual planning and timeline management  
**Priority**: P1

#### 2.1 Gantt Chart & Timeline
**Files to Create:**
- `client/src/pages/TaskManagement/components/GanttChart.js` - Gantt chart component
- `client/src/pages/TaskManagement/components/TimelineView.js` - Timeline view
- `client/src/utils/ganttUtils.js` - Gantt calculations
- `server/routes/taskManagement.js` - Add timeline endpoints

**Features:**
- Gantt chart visualization (using library like `dhtmlx-gantt` or custom with Recharts)
- Timeline view (month/week/day views)
- Drag-and-drop task scheduling
- Milestone markers
- Critical path visualization
- Task duration calculations

#### 2.2 Calendar Integration
**Files to Create:**
- `client/src/pages/TaskManagement/components/CalendarView.js` - Calendar component
- `client/src/utils/calendarUtils.js` - Calendar utilities

**Features:**
- ✅ Monthly/weekly calendar view
- ⚠️ Task due dates on calendar (only if Due_Date__c field exists on Contributor_Project__c, otherwise use CreatedDate/LastModifiedDate)
- ✅ Milestone markers (use Project_Objective__c dates if available)
- ✅ Color-coding by Status__c or Queue_Status__c
- **Data Source**: Contributor_Project__c records

#### 2.3 Milestone Management
**Features:**
- Create milestones linked to tasks
- Milestone tracking and completion
- Milestone-based reporting

---

### Phase 3: Resource Management
**Timeline**: 3-4 weeks  
**User Value**: High - Optimize resource allocation  
**Priority**: P1

#### 3.1 Contributor Workload View
**Files to Create:**
- `client/src/pages/ResourceManagement/ResourceManagement.js` - Main page
- `client/src/pages/ResourceManagement/components/WorkloadView.js` - Workload visualization
- `client/src/pages/ResourceManagement/components/CapacityView.js` - Capacity planning
- `server/routes/resourceManagement.js` - Resource endpoints

**API Endpoints:**
```
GET /api/resources/workload          - Get contributor workloads
GET /api/resources/capacity          - Get capacity data
GET /api/resources/allocation       - Get allocation details
GET /api/resources/skills           - Get skill sets
```

**Features:**
- Workload heatmap (contributor vs. time)
- Capacity indicators (over/under allocation)
- Task allocation by contributor
- Skill set display (from existing contributor data or new field)

#### 3.2 Allocation & Assignment Tools
**Features:**
- Bulk task assignment
- Auto-assignment suggestions (based on workload, skills)
- Resource conflict detection
- Capacity warnings

---

### Phase 4: Time Tracking
**Timeline**: 2-3 weeks  
**User Value**: Medium-High - Accurate time tracking for billing/performance  
**Priority**: P2

#### 4.1 Time Entry System
**Files to Create:**
- `client/src/pages/TimeTracking/TimeTracking.js` - Main page
- `client/src/pages/TimeTracking/components/TimeEntryForm.js` - Time entry form
- `client/src/pages/TimeTracking/components/TimeEntryList.js` - Time entries list
- `client/src/pages/TimeTracking/components/TimeReport.js` - Time reports
- `server/routes/timeTracking.js` - Time tracking endpoints

**API Endpoints:**
```
POST   /api/time-entries             - Create time entry
GET    /api/time-entries             - List time entries (filtered)
PUT    /api/time-entries/:id         - Update time entry
DELETE /api/time-entries/:id         - Delete time entry
GET    /api/time-entries/report      - Generate time report
POST   /api/time-entries/approve     - Approve time entries (bulk)
```

**Data Source Options:**
1. **If `Payment_Transactions_Needing_Approval__c` exists** (preferred):
   - Use existing time tracking object
   - Link to Contributor_Project__c via Project_Objective__c or Contributor__c
   - Use existing fields: Self_Reported_Hours__c, Transaction_Date__c, etc.

2. **If `Self_Reported_Time__c` exists**:
   - Use existing time tracking object
   - Link to Contributor_Project__c

3. **Fallback** (if no time objects exist):
   - ❌ **CANNOT BE IMPLEMENTED** - No object to store time entries
   - ⚠️ Can only track if custom fields exist on Contributor_Project__c (Actual_Hours__c, etc.)

**Features:**
- ⚠️ Quick time entry (depends on time object existence)
- ⚠️ Timer functionality (depends on time object existence)
- ⚠️ Time entry approval workflow (if Payment_Transactions_Needing_Approval__c exists)
- ⚠️ Billable vs. non-billable tracking (if field exists)
- ⚠️ Time reports (by Contributor_Project__c, contributor, project, date range)

#### 4.2 Integration with Tasks
- ✅ Link time entries to Contributor_Project__c (via Project_Objective__c or Contributor__c)
- ⚠️ Auto-calculate task `Actual_Hours__c` from time entries (only if field exists on Contributor_Project__c)
- ⚠️ Show time spent vs. estimated on task cards (only if Estimated_Hours__c and Actual_Hours__c fields exist)

---

### Phase 5: Budget Management
**Timeline**: 2-3 weeks  
**User Value**: Medium-High - Financial tracking and control  
**Priority**: P2

#### 5.1 Budget Tracking
**Files to Create:**
- `client/src/pages/BudgetManagement/BudgetManagement.js` - Main page
- `client/src/pages/BudgetManagement/components/BudgetOverview.js` - Budget summary
- `client/src/pages/BudgetManagement/components/BudgetChart.js` - Budget vs. actual charts
- `server/routes/budgetManagement.js` - Budget endpoints

**API Endpoints:**
```
GET  /api/budgets                    - List budgets (from Project__c fields)
POST /api/budgets                    - Update budget (update Project__c fields)
PUT  /api/budgets/:id                - Update budget
GET  /api/budgets/report             - Budget vs. actual report
```

**Data Source**: `Project__c` object
- Use existing budget fields on Project__c (if any exist)
- Examples: `Budget__c`, `Planned_Amount__c`, `Actual_Amount__c`, `Budget_Category__c`, etc.

**Features:**
- ⚠️ Budget categories (only if Budget_Category__c or similar field exists on Project__c)
- ⚠️ Planned vs. actual tracking (only if Planned_Amount__c and Actual_Amount__c fields exist)
- ⚠️ Variance calculations and alerts (only if budget fields exist)
- ⚠️ Budget by period (only if period fields exist)
- ⚠️ Budget health indicators (traffic light: green/yellow/red) - if budget fields exist

**Limitations:**
- ❌ **CANNOT create budget categories** - no object to store them
- ❌ **CANNOT track detailed budget breakdown** - limited to Project__c fields
- ⚠️ **Depends on existing fields** - if no budget fields exist, cannot implement

#### 5.2 Integration with Time Tracking
- ⚠️ Auto-calculate labor costs from time entries × hourly rates (only if time object exists and has rate fields)
- ⚠️ Budget alerts when approaching limits (only if budget fields exist on Project__c)

---

### Phase 6: Contributor Performance Analytics
**Timeline**: 3-4 weeks  
**User Value**: High - Data-driven performance insights  
**Priority**: P1

#### 6.1 Performance Dashboards
**Files to Create:**
- `client/src/pages/ContributorPerformance/ContributorPerformance.js` - Main page
- `client/src/pages/ContributorPerformance/components/PerformanceDashboard.js` - Dashboard
- `client/src/pages/ContributorPerformance/components/QualityScores.js` - Quality metrics
- `client/src/pages/ContributorPerformance/components/EfficiencyMetrics.js` - Efficiency data
- `server/routes/contributorPerformance.js` - Performance endpoints

**API Endpoints:**
```
GET /api/performance/contributor/:id     - Individual contributor performance (from Contributor_Project__c)
GET /api/performance/team               - Team performance (aggregate Contributor_Project__c)
GET /api/performance/quality-scores     - Quality score data (from Contributor_Review__c if exists)
GET /api/performance/completion-rates    - Completion rate data (count by Status__c)
GET /api/performance/efficiency         - Efficiency metrics (from time tracking if available)
```

**Data Sources:**
- ✅ `Contributor_Project__c` - Task completion, status transitions
- ✅ `Contact` - Contributor information
- ⚠️ `Contributor_Review__c` - Quality scores (if object exists)
- ⚠️ Time tracking objects - Efficiency metrics (if objects exist)

**Features:**
- ✅ Individual contributor dashboards (aggregate Contributor_Project__c by Contact__c)
- ✅ Team performance comparisons (group by Contact__c, compare Status__c counts)
- ⚠️ Quality scores (from Contributor_Review__c if exists, otherwise cannot display)
- ✅ Completion rates (count Contributor_Project__c by Status__c - Active vs. Closed/Removed)
- ⚠️ Efficiency metrics (time per task, throughput - only if time tracking objects exist)
- ⚠️ Adherence to guidelines (compliance scores - only if Contributor_Review__c exists)
- ✅ Trend analysis (performance over time - use CreatedDate/LastModifiedDate from Contributor_Project__c)

#### 6.2 Data Sources
- ✅ Integrate with existing Contributor_Project__c data
- ✅ Link to task completion data (Status__c transitions)
- ⚠️ Use Contributor_Review__c for quality scores (if exists)
- ⚠️ Calculate from time tracking data (if time objects exist)

---

### Phase 7: Quality Assurance (QA) Tools
**Timeline**: 3-4 weeks  
**User Value**: High - Quality control and feedback loops  
**Priority**: P1

#### 7.1 QA Feedback System
**Files to Create:**
- `client/src/pages/QATools/QATools.js` - Main page
- `client/src/pages/QATools/components/QAFeedbackForm.js` - Feedback form
- `client/src/pages/QATools/components/ErrorTracking.js` - Error tracking
- `client/src/pages/QATools/components/IssueResolution.js` - Issue resolution workflow
- `server/routes/qaTools.js` - QA endpoints

**API Endpoints:**
```
POST   /api/qa/feedback               - Submit QA feedback
GET    /api/qa/feedback               - List QA feedback (filtered)
PUT    /api/qa/feedback/:id           - Update feedback
POST   /api/qa/feedback/:id/resolve  - Resolve issue
GET    /api/qa/errors                 - Error tracking data
GET    /api/qa/quality-metrics        - Quality metrics
```

**Data Source Options:**
1. **If `Contributor_Review__c` exists** (preferred):
   - Use existing QA/review object
   - Link to Contributor_Project__c via Contributor_Project__c lookup
   - Use existing fields: Quality_Score__c, Feedback__c, Status__c, etc.

2. **Fallback** (if Contributor_Review__c doesn't exist):
   - ❌ **CANNOT BE IMPLEMENTED** - No object to store QA feedback
   - ⚠️ Can only use Status__c or Queue_Status__c on Contributor_Project__c as basic quality indicator

**Features:**
- ⚠️ Submit QA feedback on tasks (only if Contributor_Review__c exists)
- ⚠️ Error type categorization (only if Error_Type__c field exists)
- ⚠️ Quality scoring (only if Quality_Score__c field exists)
- ⚠️ Flag issues directly on tasks (use Status__c or Queue_Status__c, or Contributor_Review__c if exists)
- ⚠️ Resolution workflow (only if Contributor_Review__c with Status__c exists)
- ⚠️ Error tracking and patterns (only if Contributor_Review__c exists)
- ⚠️ Quality trends over time (only if Contributor_Review__c exists)

#### 7.2 Integration with Tasks
- ✅ Link QA feedback to Contributor_Project__c (via Contributor_Review__c.Contributor_Project__c if exists)
- ⚠️ Show QA status on task cards (only if Contributor_Review__c exists or use Status__c)
- ⚠️ Block task completion if QA issues exist (optional - only if Contributor_Review__c exists)

---

### Phase 8: Secure Communication Hub
**Timeline**: 4-5 weeks  
**User Value**: High - Centralized communication  
**Priority**: P1

#### 8.1 Task Comments & Messaging
**Files to Create:**
- `client/src/pages/Communication/Communication.js` - Main hub
- `client/src/pages/Communication/components/TaskComments.js` - Task comments
- `client/src/pages/Communication/components/MentionSystem.js` - @mention functionality
- `client/src/pages/Communication/components/FileSharing.js` - File attachments
- `client/src/components/Communication/CommentThread.js` - Comment threads
- `server/routes/communication.js` - Communication endpoints

**API Endpoints:**
```
POST   /api/comments                  - Add comment (create FeedItem)
GET    /api/comments                  - List comments (query FeedItem by ParentId)
PUT    /api/comments/:id              - Update comment (update FeedItem)
DELETE /api/comments/:id              - Delete comment (delete FeedItem)
POST   /api/comments/:id/mention      - Send mention notification (parse @mentions)
POST   /api/files/upload              - Upload file attachment (ContentVersion)
GET    /api/files/:id                 - Download file (ContentVersion)
```

**Data Source**: 
- `FeedItem` - Chatter feed items (requires Chatter enabled on Contributor_Project__c)
- `ContentVersion` / `ContentDocument` - File attachments
- `ContentDocumentLink` - Links files to Contributor_Project__c

**Features:**
- ✅ Task-specific comment threads (FeedItem.ParentId = Contributor_Project__c.Id)
- ❌ @mention users (CANNOT be implemented - no mention field, would require custom parsing and notification system)
- ⚠️ File attachments (Salesforce Files via ContentDocumentLink - complex but possible)
- ✅ Rich text comments (FeedItem.Body supports HTML/text)
- ❌ Comment reactions (CANNOT be implemented - no reaction field on FeedItem)
- ✅ Search comments (query FeedItem by ParentId and Body)
- ❌ Email notifications for mentions/comments (CANNOT be implemented - no notification system)

#### 8.2 Real-time Updates (Optional - Phase 8.5)
- WebSocket integration for real-time comments
- Live typing indicators
- Push notifications

---

### Phase 9: Role-Based Access & Permissions
**Timeline**: 2-3 weeks  
**User Value**: High - Security and access control  
**Priority**: P0 (Foundation)

#### 9.1 Extend Existing RBAC
**Files to Modify:**
- `server/utils/roles.js` - Add PM permissions
- `server/middleware/rbac.js` - Extend middleware
- `client/src/utils/rbac.js` - Frontend permissions

**New Permissions:**
```javascript
// Task Management
VIEW_TASKS: 'view_tasks',
CREATE_TASKS: 'create_tasks',
EDIT_TASKS: 'edit_tasks',
DELETE_TASKS: 'delete_tasks',
ASSIGN_TASKS: 'assign_tasks',

// Time Tracking
VIEW_TIME_ENTRIES: 'view_time_entries',
CREATE_TIME_ENTRIES: 'create_time_entries',
APPROVE_TIME_ENTRIES: 'approve_time_entries',

// Budget
VIEW_BUDGET: 'view_budget',
MANAGE_BUDGET: 'manage_budget',

// QA
VIEW_QA_FEEDBACK: 'view_qa_feedback',
SUBMIT_QA_FEEDBACK: 'submit_qa_feedback',
RESOLVE_QA_ISSUES: 'resolve_qa_issues',

// Communication
VIEW_COMMENTS: 'view_comments',
POST_COMMENTS: 'post_comments',
DELETE_COMMENTS: 'delete_comments',
```

**Role Definitions:**
- **Project Manager**: Full access to assigned projects
- **Contributor**: View assigned tasks, submit time, view own performance
- **QA Reviewer**: Submit QA feedback, view quality metrics
- **Stakeholder**: View-only access to project status, reports
- **Admin**: Full access

#### 9.2 Field-Level Security
- Contributors can only edit their own time entries
- PMs can edit tasks in their projects
- QA reviewers can submit feedback but not edit tasks

---

### Phase 10: Automation
**Timeline**: 3-4 weeks  
**User Value**: Medium-High - Reduce manual work  
**Priority**: P2

#### 10.1 Automation Engine
**Files to Create:**
- `server/services/automationService.js` - Automation engine
- `server/routes/automation.js` - Automation endpoints (hardcoded rules only)
- `client/src/pages/Automation/Automation.js` - Automation management UI (view only, no rule builder)
- ❌ `client/src/pages/Automation/components/AutomationRuleBuilder.js` - **CANNOT BE IMPLEMENTED** (no storage object)

**API Endpoints:**
```
GET    /api/automation/rules          - List automation rules (hardcoded list)
❌ POST   /api/automation/rules          - **CANNOT IMPLEMENT** (no storage object)
❌ PUT    /api/automation/rules/:id      - **CANNOT IMPLEMENT** (no storage object)
❌ DELETE /api/automation/rules/:id      - **CANNOT IMPLEMENT** (no storage object)
POST   /api/automation/execute        - Manual trigger (testing hardcoded rules)
```

**Automation Types (Hardcoded Only):**
1. ⚠️ **Reminders**: Email/notification when task due date approaches (only if Due_Date__c exists, requires email service)
2. ✅ **Status Updates**: Auto-update Contributor_Project__c.Status__c based on conditions (hardcoded logic)
3. ✅ **Report Generation**: Scheduled reports (daily/weekly/monthly) - use node-cron
4. ❌ **Workflow Handoffs**: Auto-assign tasks when previous task completes (CANNOT - no dependency relationships)
5. ⚠️ **Budget Alerts**: Notify when budget threshold reached (only if budget fields exist on Project__c)
6. ⚠️ **QA Escalation**: Auto-flag tasks with low quality scores (only if Contributor_Review__c exists)

**Rule Builder UI:**
- ❌ **CANNOT BE IMPLEMENTED** - No object to store rules
- ⚠️ Can only display hardcoded automation rules (read-only)
- ⚠️ Can enable/disable hardcoded rules (store in config/env, not database)

**Limitations:**
- ❌ **Cannot create custom automation rules** - no storage object
- ❌ **Cannot manage rules via UI** - only hardcoded rules
- ⚠️ **Limited automation** - only what can be hardcoded in backend

---

### Phase 11: Reporting & Dashboards
**Timeline**: 3-4 weeks  
**User Value**: High - Visibility and insights  
**Priority**: P1

#### 11.1 Customizable Dashboards
**Files to Create:**
- `client/src/pages/ProjectManagementDashboard/ProjectManagementDashboard.js` - Main dashboard
- `client/src/pages/ProjectManagementDashboard/components/DashboardBuilder.js` - Dashboard builder
- `client/src/pages/ProjectManagementDashboard/components/WidgetLibrary.js` - Widget components
- `server/routes/projectManagementDashboard.js` - Dashboard data endpoints

**Dashboard Widgets:**
1. **Project Status Overview**: High-level project health
2. **Task Completion Rate**: % tasks completed
3. **Team Performance**: Contributor performance summary
4. **Budget Health**: Budget vs. actual with variance
5. **Time Tracking Summary**: Hours logged, billable vs. non-billable
6. **QA Quality Scores**: Average quality scores, trend
7. **Bottleneck Analysis**: Tasks blocking progress
8. **Upcoming Milestones**: Milestone timeline
9. **Resource Utilization**: Workload heatmap
10. **Recent Activity**: Task updates, comments, time entries

**Features:**
- Drag-and-drop widget arrangement
- Widget configuration (filters, date ranges)
- Save custom dashboard layouts
- Share dashboards with team
- Export dashboard as PDF/image

#### 11.2 Real-time Reporting
**Files to Create:**
- `client/src/pages/ProjectManagementDashboard/components/RealTimeReports.js` - Real-time report views
- `server/routes/projectManagementReports.js` - Report endpoints

**Report Types:**
- Project health snapshot
- Bottleneck identification
- Progress tracking
- Budget variance report
- Team performance report
- Time tracking summary

**Features:**
- Auto-refresh (configurable interval)
- Export to Excel/PDF
- Scheduled email reports (via automation)

---

### Phase 12: Usability & Integration
**Timeline**: Ongoing (2-3 weeks per iteration)  
**User Value**: High - User experience improvements  
**Priority**: P1

#### 12.1 Intuitive UI/UX
**Design Principles:**
- **Consistency**: Match existing app design patterns
- **Accessibility**: WCAG 2.1 AA compliance
- **Responsive**: Mobile-friendly views
- **Performance**: Fast load times, smooth interactions
- **Onboarding**: Tooltips, help text, guided tours

**UI Components to Create/Enhance:**
- Unified design system (buttons, forms, modals)
- Loading states and skeletons
- Error handling and user feedback
- Keyboard shortcuts
- Bulk actions (select multiple tasks, bulk assign, etc.)

#### 12.2 Integration with Existing Features
- Link tasks to existing projects (from `ViewProjects`)
- Integrate with Queue Status Management
- Connect to Workstream Reporting
- Use existing contributor data from Active Contributors pages
- Leverage existing dashboard patterns

#### 12.3 Mobile Optimization
- Responsive Kanban board
- Mobile-friendly time entry
- Touch-optimized interactions
- Offline capability (cache tasks, sync later)

---

## 3. Technical Implementation Details

### 3.1 Using Existing Contributor_Project__c Object

**Task Management via Contributor_Project__c:**
```javascript
// Contributor_Project__c already has:
- Name (Text) → Task name
- Status__c (Picklist) → Task status (Active, Qualified, Production, etc.)
- Queue_Status__c (Picklist) → Workflow/queue status
- Project__c (Lookup to Project__c) → Link to project
- Project_Objective__c (Lookup to Project_Objective__c) → Link to objective
- Contact__c or Contributor__c (Lookup to Contact) → Assigned contributor
- CreatedDate (DateTime) → Task creation date
- LastModifiedDate (DateTime) → Last update date

// Optional fields (if they exist):
- Due_Date__c (Date) → Due date
- Priority__c (Picklist) → Priority
- Description__c (Long Text Area) → Task description
- Estimated_Hours__c (Number) → Estimated hours
- Actual_Hours__c (Number) → Actual hours
```

**No object creation needed - use existing Contributor_Project__c!**

### 3.2 Backend Service Pattern

**Example: Task Service (using Contributor_Project__c)**
```javascript
// server/services/taskService.js
class TaskService {
  async getTasks(filters, user) {
    // Apply RBAC filters
    // Build SOQL query on Contributor_Project__c
    // Filter by Project__c, Project_Objective__c, Contact__c, Status__c, Queue_Status__c
    // Return Contributor_Project__c records as tasks
  }
  
  async createTask(taskData, user) {
    // Validate data
    // Check permissions
    // Create Contributor_Project__c in Salesforce
    // Map taskData to Contributor_Project__c fields
    // Return created Contributor_Project__c as task
  }
  
  async updateTaskStatus(taskId, newStatus, user) {
    // Validate status transition (Status__c values)
    // Check permissions
    // Update Contributor_Project__c.Status__c in Salesforce
    // Trigger automation if needed (hardcoded rules)
  }
  
  async updateTaskQueueStatus(taskId, queueStatus, user) {
    // Update Contributor_Project__c.Queue_Status__c
    // Similar to updateTaskStatus but for Queue_Status__c
  }
}
```

### 3.3 Frontend Hook Pattern

**Example: useTasks Hook**
```javascript
// client/src/hooks/useTasks.js
export const useTasks = (filters) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    fetchTasks();
  }, [filters]);
  
  const fetchTasks = async () => {
    // API call
    // Update state
  };
  
  return { tasks, loading, error, refetch: fetchTasks };
};
```

### 3.4 Component Structure

```
client/src/pages/TaskManagement/
├── TaskManagement.js              # Main page container
├── components/
│   ├── TaskList.js               # List view
│   ├── TaskKanban.js             # Kanban board
│   ├── TaskCard.js               # Task card component
│   ├── TaskForm.js               # Create/edit form
│   ├── TaskFilters.js            # Filter panel
│   ├── TaskDetailModal.js        # Task detail view
│   └── TaskDependencies.js        # Dependency visualization
├── hooks/
│   ├── useTasks.js               # Task data hook
│   └── useTaskFilters.js         # Filter logic
└── utils/
    ├── taskUtils.js              # Task utilities
    └── statusTransitions.js      # Status workflow logic
```

---

## 4. Prioritization Matrix

### High Value, Low Effort (Quick Wins)
1. ✅ Basic task list view (Phase 1.2)
2. ✅ Task creation form (Phase 1.2)
3. ✅ Simple time entry (Phase 4.1)
4. ✅ Basic performance dashboard (Phase 6.1)

### High Value, High Effort (Strategic)
1. ✅ Full task management system (Phase 1)
2. ✅ Gantt chart/timeline (Phase 2.1)
3. ✅ Resource management (Phase 3)
4. ✅ Communication hub (Phase 8)

### Medium Value, Low Effort (Nice to Have)
1. ✅ Calendar view (Phase 2.2)
2. ✅ Budget overview (Phase 5.1)
3. ✅ Automation reminders (Phase 10.1)

### Medium Value, High Effort (Future)
1. ⏳ Real-time communication (Phase 8.5)
2. ⏳ Advanced automation (Phase 10)
3. ⏳ Mobile app (Phase 12.3)

---

## 5. MVP Scope (Minimum Viable Product)

**Goal**: Deliver working task management in 6-8 weeks

**Included:**
- ✅ Phase 1: Core Task Management (using Contributor_Project__c)
- ✅ Phase 9: Role-Based Access (foundation)
- ✅ Phase 6: Basic Performance Dashboard (from Contributor_Project__c data)
- ✅ Phase 8: Task Comments (using FeedItem, basic, no @mentions)

**Excluded (Post-MVP):**
- ⏳ Gantt charts (Phase 2) - limited without dependencies
- ⏳ Resource management (Phase 3) - can be added
- ⏳ Time tracking (Phase 4) - depends on time object existence
- ⏳ Budget management (Phase 5) - depends on budget fields existence
- ⏳ QA tools (Phase 7) - depends on Contributor_Review__c existence
- ⏳ Automation (Phase 10) - only hardcoded rules
- ⏳ Customizable dashboards (Phase 11) - can be added

**MVP Success Criteria:**
- Users can create, assign, and track tasks
- Tasks linked to projects/objectives
- Basic status workflow works
- Contributors can view assigned tasks
- PMs can manage tasks in their projects
- Basic performance metrics visible

---

## 6. Risk Mitigation

### 6.1 Technical Risks

**Risk**: Salesforce API limits
- **Mitigation**: Implement caching, batch operations, pagination

**Risk**: Performance with large datasets
- **Mitigation**: Lazy loading, virtual scrolling, server-side filtering

**Risk**: Complex dependencies
- **Mitigation**: Start with simple blocking relationships, enhance later

### 6.2 User Adoption Risks

**Risk**: Users prefer existing tools
- **Mitigation**: Focus on integration, not replacement; provide import/export

**Risk**: Learning curve
- **Mitigation**: Intuitive UI, onboarding guides, tooltips

### 6.3 Data Migration Risks

**Risk**: Existing task data in other systems
- **Mitigation**: Provide import tools, support CSV/Excel import

---

## 7. Success Metrics

### 7.1 User Engagement
- Daily active users (DAU) for PM features
- Tasks created per week
- Time entries logged per week
- Comments posted per week

### 7.2 Performance Metrics
- Page load time < 2 seconds
- API response time < 500ms (p95)
- Task creation time < 5 seconds

### 7.3 Business Metrics
- % projects using task management
- Average tasks per project
- Time saved vs. manual tracking
- User satisfaction score (NPS)

---

## 8. Dependencies & Prerequisites

### 8.1 Salesforce Setup
- ✅ Custom objects created and configured
- ✅ Field-level security configured
- ✅ Object permissions for roles
- ✅ API access enabled

### 8.2 Backend Infrastructure
- ✅ Existing authentication/authorization
- ✅ Salesforce connection established
- ✅ API route structure in place

### 8.3 Frontend Infrastructure
- ✅ React app structure
- ✅ Routing configured
- ✅ Component library patterns
- ✅ State management approach

---

## 9. Timeline Summary

| Phase | Duration | Cumulative | Priority |
|-------|----------|------------|----------|
| Phase 1: Core Task Management | 4-6 weeks | 6 weeks | P0 |
| Phase 9: RBAC Extension | 2-3 weeks | 8 weeks | P0 |
| Phase 6: Performance Analytics | 3-4 weeks | 12 weeks | P1 |
| Phase 8: Communication (Basic) | 2-3 weeks | 15 weeks | P1 |
| **MVP Complete** | | **15 weeks** | |
| Phase 2: Scheduling | 3-4 weeks | 19 weeks | P1 |
| Phase 3: Resource Management | 3-4 weeks | 23 weeks | P1 |
| Phase 4: Time Tracking | 2-3 weeks | 26 weeks | P2 |
| Phase 5: Budget Management | 2-3 weeks | 29 weeks | P2 |
| Phase 7: QA Tools | 3-4 weeks | 33 weeks | P1 |
| Phase 8: Communication (Full) | 2-3 weeks | 36 weeks | P1 |
| Phase 10: Automation | 3-4 weeks | 40 weeks | P2 |
| Phase 11: Reporting | 3-4 weeks | 44 weeks | P1 |
| Phase 12: Usability | Ongoing | 46+ weeks | P1 |

**Total Estimated Timeline**: 46-50 weeks for full implementation  
**MVP Timeline**: 15 weeks

---

## 10. Next Steps

1. **Review & Approval**: Review this plan with stakeholders
2. **Salesforce Setup**: Create custom objects and fields
3. **Phase 1 Kickoff**: Begin core task management development
4. **Design Mockups**: Create UI mockups for key screens
5. **Technical Spike**: Proof of concept for Gantt chart library selection
6. **User Research**: Interview PMs and contributors for requirements validation

---

## Appendix A: Technology Recommendations

### Frontend Libraries
- **Gantt Chart**: `dhtmlx-gantt` (commercial) or `@dhtmlx/trial` (free trial), or custom with Recharts
- **Calendar**: `react-big-calendar` or `fullcalendar-react`
- **Rich Text Editor**: `react-quill` or `slate-react`
- **File Upload**: `react-dropzone`
- **Drag & Drop**: `react-beautiful-dnd` or `@dnd-kit/core`

### Backend Libraries
- **Cron Jobs**: `node-cron` (for automation)
- **Email**: `nodemailer` (for notifications)
- **File Storage**: Salesforce Files API or AWS S3 (if needed)

### Testing
- **Unit Tests**: Jest, React Testing Library
- **E2E Tests**: Cypress or Playwright
- **API Tests**: Supertest

---

## Appendix B: Sample API Response Formats

### Task List Response
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": "a0X5g000000ABC",
        "name": "Review transcription guidelines",
        "project": {
          "id": "a0X5g000000XYZ",
          "name": "Project Alpha"
        },
        "status": "In Progress",
        "priority": "High",
        "assignedTo": {
          "id": "0035g000000DEF",
          "name": "John Doe"
        },
        "dueDate": "2024-03-15",
        "estimatedHours": 8,
        "actualHours": 4.5
      }
    ],
    "total": 150,
    "page": 1,
    "pageSize": 50
  }
}
```

### Performance Dashboard Response
```json
{
  "success": true,
  "data": {
    "contributorPerformance": [
      {
        "contributorId": "0035g000000DEF",
        "contributorName": "John Doe",
        "tasksCompleted": 45,
        "tasksAssigned": 50,
        "completionRate": 90,
        "averageQualityScore": 4.5,
        "totalHours": 320,
        "efficiency": 7.1
      }
    ],
    "teamMetrics": {
      "averageCompletionRate": 85,
      "averageQualityScore": 4.2,
      "totalTasks": 500,
      "completedTasks": 425
    }
  }
}
```

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Author**: AI Assistant  
**Status**: Draft - Pending Review

