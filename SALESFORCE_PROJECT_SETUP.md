# Salesforce Project__c Object Setup Guide

## Overview

The application creates projects in Salesforce using a custom object called **Project__c**. If this object doesn't exist in your Salesforce instance, you need to create it with the required fields.

## Current Status

The application will **ONLY** create projects in the `Project__c` custom object. It will **NOT** fall back to Opportunity or any other object.

If `Project__c` doesn't exist, you will receive an error message:
```
Project__c custom object does not exist in your Salesforce instance. 
Please create the Project__c custom object in Salesforce with the required fields.
```

## Required Steps

### 1. Create the Project__c Custom Object

1. Log in to Salesforce
2. Go to **Setup** (gear icon → Setup)
3. In the Quick Find box, search for **"Object Manager"**
4. Click **"Create"** → **"Custom Object"**
5. Fill in the details:
   - **Label**: `Project`
   - **Plural Label**: `Projects`
   - **Object Name**: `Project` (this will automatically become `Project__c`)
   - **Record Name**: `Project Name` (Text, 80 characters)
   - **Data Type**: `Text`
   - Check **"Allow Reports"** and **"Allow Activities"**
   - Check **"Track Field History"** (optional but recommended)
6. Click **"Save"**

### 2. Create Required Custom Fields

After creating the object, you need to create the following custom fields. Go to **Object Manager** → **Project** → **Fields & Relationships** → **New**

#### Information Section Fields

- **Project Name** (`Project_Name__c`): Text (255)
- **Short Project Name** (`Short_Project_Name__c`): Text (255)
- **Contributor Project Name** (`Contributor_Project_Name__c`): Text (255)
- **Auditor Project** (`Auditor_Project__c`): Checkbox
- **Appen Partner** (`Appen_Partner__c`): Text (255)
- **Job Category** (`Job_Category__c`): Text (255)
- **Project Short Description** (`Project_Short_Description__c`): Long Text Area (131072)
- **Project Long Description** (`Project_Long_Description__c`): Long Text Area (131072)
- **Project Type** (`Project_Type__c`): Text (255)
- **Project Priority** (`Project_Priority__c`): Number (18, 0)
- **Project ID for Reports** (`Project_ID_for_Reports__c`): Text (255)
- **Workday Project ID** (`Workday_Project_ID__c`): Text (255)
- **Account** (`Account__c`): Text (255) or Lookup to Account
- **Program Name** (`Program_Name__c`): Text (255)
- **Hire Start Date** (`Hire_Start_Date__c`): Date
- **Predicted Close Date** (`Predicted_Close_Date__c`): Date
- **Delivery Tool Org** (`Delivery_Tool_Org__c`): Text (255)
- **Delivery Tool Name** (`Delivery_Tool_Name__c`): Text (255)
- **Project Page** (`Project_Page__c`): URL (255)
- **Project Status** (`Project_Status__c`): Text (255)

#### Contributor Active Status Fields

- **Payment Setup Required** (`Payment_Setup_Required__c`): Checkbox
- **Manual Activation Required** (`Manual_Activation_Required__c`): Checkbox
- **Client Tool Account Required** (`Client_Tool_Account_Required__c`): Checkbox

#### People Section Fields

- **Program Manager** (`Program_Manager__c`): Email (80)
- **Project Manager** (`Project_Manager__c`): Email (80) - **Required**
- **Quality Lead** (`Quality_Lead__c`): Email (80)
- **Productivity Lead** (`Productivity_Lead__c`): Email (80)
- **Reporting Lead** (`Reporting_Lead__c`): Email (80)
- **Invoicing Lead** (`Invoicing_Lead__c`): Email (80)
- **Project Support Lead** (`Project_Support_Lead__c`): Email (80)
- **Cases DC Support Team** (`Cases_DC_Support_Team__c`): Checkbox
- **Recruitment Lead** (`Recruitment_Lead__c`): Email (80)
- **Qualification Lead** (`Qualification_Lead__c`): Email (80)
- **Onboarding Lead** (`Onboarding_Lead__c`): Email (80)

#### Rates Section Fields

- **Project Incentive** (`Project_Incentive__c`): Text (255)

#### Funnel Totals Fields

- **Total Applied** (`Total_Applied__c`): Number (18, 0)
- **Total Qualified** (`Total_Qualified__c`): Number (18, 0)

#### Funnel Stages Fields

- **Invited Available Contributors** (`Invited_Available_Contributors__c`): Number (18, 0)
- **Registered Contributors** (`Registered_Contributors__c`): Number (18, 0)
- **App Received** (`App_Received__c`): Number (18, 0)
- **Qualified Contributors** (`Qualified_Contributors__c`): Number (18, 0)
- **Matched Contributors** (`Matched_Contributors__c`): Number (18, 0)
- **Active Contributors** (`Active_Contributors__c`): Number (18, 0)
- **AC Account** (`AC_Account__c`): Number (18, 0)
- **Production Contributors** (`Production_Contributors__c`): Number (18, 0)
- **Applied Contributors** (`Applied_Contributors__c`): Number (18, 0)
- **Removed** (`Removed__c`): Number (18, 0)

#### Lever Requisition Actions Fields

- **Requisition Action** (`Requisition_Action__c`): Text (255)

#### Lever Requisition Fields

- **Lever Req Name** (`Lever_Req_Name__c`): Text (255)
- **Requisition Status** (`Requisition_Status__c`): Text (255)
- **Lever Req Code** (`Lever_Req_Code__c`): Text (255)
- **Lever Time to Fill Start** (`Lever_Time_to_Fill_Start__c`): Date
- **Lever Crowd Hiring Manager Email** (`Lever_Crowd_Hiring_Manager_Email__c`): Email (80)
- **Lever Time to Fill End** (`Lever_Time_to_Fill_End__c`): Date
- **Lever Crowd Owner Email** (`Lever_Crowd_Owner_Email__c`): Email (80)
- **Lever Req Description** (`Lever_Req_Description__c`): Long Text Area (131072)
- **Lever Compensation Band** (`Lever_Compensation_Band__c`): Text (255)
- **Lever Location** (`Lever_Location__c`): Text (255)
- **Lever Department** (`Lever_Department__c`): Text (255)
- **Lever Work Type** (`Lever_Work_Type__c`): Text (255)
- **Lever SVP** (`Lever_SVP__c`): Text (255)
- **Lever SVP2** (`Lever_SVP2__c`): Text (255)

#### Lever Admin Fields

- **Lever Requisition ID** (`Lever_Requisition_ID__c`): Text (255)
- **Lever Requisition Create Date** (`Lever_Requisition_Create_Date__c`): Date

#### Payment Configurations Fields

- **Project Payment Method** (`Project_Payment_Method__c`): Text (255) - **Required**
- **Require PM Approval for Productivity** (`Require_PM_Approval_for_Productivity__c`): Checkbox
- **Release System Tracked Data** (`Release_System_Tracked_Data__c`): Text (255)

#### Activation Fields

- **Activate Comms Invited** (`Activate_Comms_Invited__c`): Checkbox
- **Activate Comms Applied** (`Activate_Comms_Applied__c`): Checkbox
- **Activate Comms Onboarding** (`Activate_Comms_Onboarding__c`): Checkbox
- **Activate Comms Failed** (`Activate_Comms_Failed__c`): Checkbox

### 3. Set Field-Level Security

1. Go to **Object Manager** → **Project** → **Fields & Relationships**
2. For each field, click on it and go to **Field-Level Security**
3. Ensure the appropriate profiles have **Read** and **Edit** access

### 4. Set Object Permissions

1. Go to **Object Manager** → **Project** → **Object Manager** → **Permissions**
2. Ensure the appropriate profiles have:
   - **Read**
   - **Create**
   - **Edit**
   - **Delete** (optional)

### 5. Test the Setup

1. Use the "Test Project Creation API" button in the Salesforce Settings page
2. Or run: `node manual-sync-project.js` to test with a real project
3. Check if the project is created successfully in Salesforce

## Field Naming Convention

All custom fields in Salesforce must end with `__c` (double underscore c). The application automatically maps form fields to Salesforce fields:

- Form field: `projectName` → Salesforce field: `Project_Name__c`
- Form field: `shortProjectName` → Salesforce field: `Short_Project_Name__c`
- etc.

## Important Notes

1. **Required Fields**: Make sure `Project_Manager__c` and `Project_Payment_Method__c` are marked as required in Salesforce if they are required in the form.

2. **Data Types**: 
   - Text fields should be Text or Long Text Area
   - Numbers should be Number
   - Dates should be Date or Date/Time
   - Booleans should be Checkbox
   - Emails should be Email

3. **Field Length**: Ensure field lengths are sufficient for the data being stored.

4. **Permissions**: Ensure the Salesforce user has permissions to create records in Project__c.

## Troubleshooting

### Error: "Project__c custom object does not exist"
- **Solution**: Create the Project__c object as described above

### Error: "INVALID_FIELD" or "No such column"
- **Solution**: Create the missing field(s) in Project__c

### Error: "INSUFFICIENT_ACCESS_OR_READONLY"
- **Solution**: Check object and field-level permissions for the Salesforce user

### Error: "REQUIRED_FIELD_MISSING"
- **Solution**: Ensure all required fields are provided in the form

## Quick Setup Script

You can use Salesforce CLI or Data Loader to create the object and fields programmatically. However, the manual setup through the UI is recommended for first-time setup.

## Support

If you encounter issues, check:
1. Server logs for detailed error messages
2. Salesforce debug logs
3. Field mapping in the application code (`server/routes/salesforce.js`)


