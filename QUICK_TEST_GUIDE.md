# Quick Test Guide

## Quick Start

1. **Start the server:**
   ```bash
   npm run server
   ```

2. **Run all tests:**
   ```bash
   node test-api.js
   ```

3. **Test only Salesforce test project creation:**
   ```bash
   node test-api.js --test-only
   ```

4. **Create only a new project:**
   ```bash
   node test-api.js --create-only
   ```

## Test Credentials

- **Admin:** `admin@example.com` / `admin123`
- **PM:** `pm@example.com` / `pm123`
- **User:** `user@example.com` / `user123`

## What Gets Tested

1. ✅ Login and get JWT token
2. ✅ Create test project in Salesforce (with dummy data)
3. ✅ Create new project with all 60+ form fields
4. ✅ Get all projects

## Example cURL Commands

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
```

### Create Test Project in Salesforce
```bash
curl -X POST http://localhost:5000/api/salesforce/create-test-project \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Create New Project
```bash
curl -X POST http://localhost:5000/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d @project-data.json
```

## Project Data Structure

The script includes all fields from the form:
- Information (20 fields)
- Contributor Active Status (3 fields)
- People (11 fields)
- Rates (1 field)
- Funnel Totals (2 fields)
- Funnel Stages (10 fields)
- Lever Requisition Actions (1 field)
- Lever Requisition Fields (15 fields)
- Lever Admin (2 fields)
- Payment Configurations (3 fields)
- Activation (4 fields)

**Total: 60+ fields**

## Troubleshooting

- **Connection refused:** Make sure the server is running on port 5000
- **401 Unauthorized:** Check if your token is valid (tokens expire after 24 hours)
- **Salesforce errors:** Make sure Salesforce credentials are configured in Settings

For more details, see `TEST_API_README.md`.


