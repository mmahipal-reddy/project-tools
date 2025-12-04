# API Test Script Documentation

This test script allows you to test all API endpoints of the Project Setup Application.

## Prerequisites

1. Make sure the backend server is running:
   ```bash
   npm run server
   ```

2. Ensure you have `axios` installed (it should be in `package.json`):
   ```bash
   npm install
   ```

## Usage

### Basic Usage

Run all tests (login, create test project, create new project, get all projects):
```bash
node test-api.js
```

### Test Only (Create Test Project in Salesforce)

Only test the Salesforce test project creation endpoint:
```bash
node test-api.js --test-only
```

### Create Only (Create New Project)

Only create a new project with all fields:
```bash
node test-api.js --create-only
```

## Test Credentials

The script uses the following test users:

- **Admin User**
  - Email: `admin@example.com`
  - Password: `admin123`
  - Role: `admin`
  - Permissions: `all`

- **Project Manager**
  - Email: `pm@example.com`
  - Password: `pm123`
  - Role: `project_manager`
  - Permissions: `create_project`, `edit_project`, `view_project`

- **Regular User**
  - Email: `user@example.com`
  - Password: `user123`
  - Role: `user`
  - Permissions: `view_project`

## Test Endpoints

The script tests the following endpoints:

1. **POST /api/auth/login**
   - Logs in and retrieves JWT token
   - Used by all other tests

2. **POST /api/salesforce/create-test-project**
   - Creates a test project in Salesforce with dummy data
   - Requires Salesforce credentials to be configured

3. **POST /api/projects**
   - Creates a new project with all form fields
   - Includes all sections: Information, Contributor Active Status, People, Rates, Funnel Totals, Funnel Stages, Lever Requisition Actions, Lever Requisition Fields, Lever Admin, Payment Configurations, Activation

4. **GET /api/projects**
   - Retrieves all projects
   - Lists recent projects

## Project Data Fields

The script includes all project fields from the form:

### Information Section
- `auditorProject` (boolean)
- `projectName` (string, required)
- `shortProjectName` (string, required)
- `contributorProjectName` (string, required)
- `appenPartner` (string, required)
- `jobCategory` (string)
- `projectShortDescription` (string)
- `projectLongDescription` (string)
- `projectType` (string, required)
- `projectPriority` (number, required)
- `projectIdForReports` (string, read-only)
- `workdayProjectId` (string)
- `account` (string, required)
- `programName` (string)
- `hireStartDate` (date, required)
- `predictedCloseDate` (date, required)
- `deliveryToolOrg` (string)
- `deliveryToolName` (string)
- `projectPage` (string)
- `projectStatus` (string, required)

### Contributor Active Status Section
- `paymentSetupRequired` (boolean)
- `manualActivationRequired` (boolean)
- `clientToolAccountRequired` (boolean)

### People Section
- `programManager` (string, email)
- `projectManager` (string, email, required)
- `qualityLead` (string, email)
- `productivityLead` (string, email)
- `reportingLead` (string, email)
- `invoicingLead` (string, email)
- `projectSupportLead` (string, email)
- `casesDCSupportTeam` (boolean)
- `recruitmentLead` (string, email)
- `qualificationLead` (string, email)
- `onboardingLead` (string, email)

### Rates Section
- `projectIncentive` (string, read-only)

### Funnel Totals Section
- `totalApplied` (number, read-only)
- `totalQualified` (number, read-only)

### Funnel Stages Section
- `invitedAvailableContributors` (number, read-only)
- `registeredContributors` (number, read-only)
- `appReceived` (number, read-only)
- `qualifiedContributors` (number, read-only)
- `matchedContributors` (number, read-only)
- `activeContributors` (number, read-only)
- `acAccount` (number, read-only)
- `productionContributors` (number, read-only)
- `appliedContributors` (number, read-only)
- `removed` (number, read-only)

### Lever Requisition Actions Section
- `requisitionAction` (string)

### Lever Requisition Fields Section
- `leverReqName` (string, read-only)
- `requisitionStatus` (string, read-only)
- `leverReqCode` (string, read-only)
- `leverTimeToFillStart` (date, read-only)
- `leverCrowdHiringManagerEmail` (string, email, read-only)
- `leverTimeToFillEnd` (date, read-only)
- `leverCrowdOwnerEmail` (string, email, read-only)
- `leverReqDescription` (string, read-only)
- `leverCompensationBand` (string, read-only)
- `leverLocation` (string, read-only)
- `leverDepartment` (string, read-only)
- `leverWorkType` (string, read-only)
- `leverSVP` (string, read-only)
- `leverSVP2` (string, read-only)

### Lever Admin Section
- `leverRequisitionID` (string)
- `leverRequisitionCreateDate` (date)

### Payment Configurations Section
- `projectPaymentMethod` (string, required)
- `requirePMApprovalForProductivity` (boolean)
- `releaseSystemTrackedData` (string)

### Activation Section
- `activateCommsInvited` (boolean)
- `activateCommsApplied` (boolean)
- `activateCommsOnboarding` (boolean)
- `activateCommsFailed` (boolean)

## Configuration

You can configure the API base URL by setting the `API_URL` environment variable:

```bash
API_URL=http://localhost:5000 node test-api.js
```

## Example Output

```
============================================================
API Test Suite - Project Setup Application
============================================================
ℹ Base URL: http://localhost:5000
ℹ API Base: http://localhost:5000/api

============================================================
Test 1: Login and Get JWT Token
============================================================
ℹ Attempting to login as admin@example.com...
✓ Login successful! Token received.
ℹ User: admin@example.com
ℹ Role: admin
ℹ Permissions: all

============================================================
Test 2: Create Test Project in Salesforce
============================================================
ℹ Creating test project in Salesforce...
✓ Test project created successfully in Salesforce!
ℹ Salesforce ID: 006VC00000NmZpRYAV
ℹ Object Type: Opportunity
ℹ Message: Test project created successfully in Salesforce

============================================================
Test 3: Create New Project with All Fields
============================================================
ℹ Creating new project with all fields...
ℹ Project Name: Test Project 1762442110284
ℹ Total fields: 60
✓ Project created successfully!
ℹ Project ID: PROJ-1762442110284
ℹ Project Name: Test Project 1762442110284
ℹ Status: draft
ℹ Created At: 2025-11-06T15:15:10.000Z
ℹ Salesforce ID: 006VC00000NmZpRYAV
ℹ Salesforce Sync Status: synced

============================================================
Test Suite Completed
============================================================
✓ All tests completed successfully!
```

## Troubleshooting

### Error: Cannot connect to server
- Make sure the backend server is running on port 5000
- Check if the server is accessible: `curl http://localhost:5000/api/auth/login`

### Error: Invalid credentials
- Verify the test user credentials are correct
- Check if the user exists in the database

### Error: Salesforce connection failed
- Make sure Salesforce credentials are configured in Settings
- Test the Salesforce connection first using the UI

### Error: Project creation failed
- Check if all required fields are provided
- Verify the JWT token is valid and not expired
- Check server logs for detailed error messages

## Notes

- The script generates unique project names using timestamps to avoid conflicts
- All dates are automatically calculated (today and next month)
- Read-only fields are included but may be ignored by the backend
- The script uses colored output for better readability
- All API calls include proper error handling and logging


