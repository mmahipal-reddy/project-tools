# Security Implementation Guide

This guide outlines the standard security implementation for all pages, tabs, and fields across the application. **All new pages and fields MUST follow these security practices.**

## Overview

The application implements comprehensive protection against:
- **SQL Injection**: All user inputs are sanitized and validated
- **CSRF (Cross-Site Request Forgery)**: All state-changing requests require CSRF tokens
- **XSS (Cross-Site Scripting)**: All inputs are sanitized and outputs are properly escaped

## Automatic Protection

The following protections are **automatically applied** to all API routes:

### 1. Input Sanitization Middleware
- **Location**: `server/middleware/inputSanitization.js`
- **Applied to**: All `/api/*` routes
- **What it does**:
  - Sanitizes `req.body`, `req.query`, and `req.params`
  - Detects and blocks SQL injection patterns
  - Detects and blocks XSS attack patterns
  - Removes dangerous HTML tags, scripts, and event handlers
  - Validates input length

### 2. CSRF Protection Middleware
- **Location**: `server/middleware/csrf.js`
- **Applied to**: All state-changing routes (POST, PUT, DELETE, PATCH)
- **What it does**:
  - Validates CSRF tokens for all state-changing requests
  - Automatically skips validation for GET, HEAD, OPTIONS requests
  - Automatically skips validation for `/api/auth/*` routes (JWT-based)

### 3. Client-Side CSRF Token Management
- **Location**: `client/src/config/api.js`
- **What it does**:
  - Automatically fetches CSRF tokens
  - Automatically includes CSRF tokens in all POST/PUT/DELETE/PATCH requests
  - Handles token refresh on 403 errors

## Implementation Requirements for New Pages/Fields

### Backend Routes

When creating new API routes, **no additional security code is needed** - the middleware handles everything automatically. However, follow these guidelines:

#### ✅ DO:
```javascript
// Example: New route automatically protected
router.post('/new-endpoint', authenticate, authorize('permission', 'all'), asyncHandler(async (req, res) => {
  // req.body, req.query, req.params are already sanitized
  // CSRF token is already validated
  const data = req.body; // Safe to use
  
  // Your route logic here
  res.json({ success: true, data });
}));
```

#### ❌ DON'T:
```javascript
// Don't manually sanitize - middleware handles it
router.post('/bad-endpoint', authenticate, asyncHandler(async (req, res) => {
  // Don't do this - middleware already sanitized
  const sanitized = sanitizeString(req.body.field);
  
  // Don't manually check CSRF - middleware handles it
  if (!req.body.csrfToken) {
    return res.status(403).json({ error: 'CSRF token missing' });
  }
}));
```

### Frontend Forms

When creating new forms or input fields, follow these guidelines:

#### ✅ DO:
```javascript
// Example: Form with automatic CSRF and XSS protection
import apiClient from '../config/api';
import { validateInputForXss, sanitizeInputRealTime } from '../utils/xssProtection';

const handleSubmit = async (formData) => {
  // Validate for XSS before submission
  const validation = validateInputForXss(formData.userInput, 'User input');
  if (!validation.isValid) {
    toast.error(validation.error);
    return;
  }
  
  try {
    // CSRF token is automatically included by apiClient
    // XSS protection is automatic on server-side
    const response = await apiClient.post('/api/new-endpoint', formData);
    // Handle success
  } catch (error) {
    // Handle error (CSRF errors are automatically retried)
  }
};

// For input fields, sanitize in real-time
const handleInputChange = (e) => {
  const sanitized = sanitizeInputRealTime(e.target.value);
  setValue(sanitized);
};
```

#### ✅ DO: Safe Output Rendering
```javascript
// When rendering user-generated content
import { safeText, safeAttribute, SafeText } from '../utils/xssProtection';

// For text content
<div>{safeText(userInput)}</div>
// Or use SafeText component
<SafeText>{userInput}</SafeText>

// For HTML attributes
<input value={safeAttribute(userInput)} />
<div title={safeAttribute(userInput)}>Content</div>
```

#### ❌ DON'T:
```javascript
// Don't manually add CSRF tokens - apiClient handles it
const handleSubmit = async (formData) => {
  // Don't do this
  const csrfToken = await fetch('/api/csrf-token');
  formData.csrfToken = csrfToken;
  
  // apiClient automatically includes CSRF token
  await apiClient.post('/api/endpoint', formData);
};
```

### Input Validation

While the middleware provides automatic sanitization, you should still validate business logic:

#### ✅ DO:
```javascript
// Validate business logic (in addition to automatic sanitization)
router.post('/endpoint', authenticate, asyncHandler(async (req, res) => {
  const { email, age } = req.body; // Already sanitized by middleware
  
  // Validate business rules
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  
  if (age < 0 || age > 150) {
    return res.status(400).json({ error: 'Invalid age' });
  }
  
  // Proceed with logic
}));
```

## Security Features by Layer

### Server-Side Security (`server/utils/security.js`)

1. **SQL Injection Detection**
   - Detects SQL keywords (SELECT, INSERT, UPDATE, DELETE, etc.)
   - Detects encoded injection attempts
   - Detects time-based injection patterns
   - Detects comment-based injection

2. **XSS Detection and Prevention**
   - Detects script tags and variations (`<script>`, encoded versions)
   - Detects event handlers (`onclick`, `onerror`, `onload`, etc.)
   - Detects dangerous HTML tags (`<iframe>`, `<object>`, `<embed>`, etc.)
   - Detects dangerous protocols (`javascript:`, `vbscript:`, `data:text/html`)
   - Detects SVG-based XSS attacks
   - Detects CSS injection (`@import`, `expression()`)
   - Detects encoded XSS attempts (HTML entities, URL encoding)

3. **Input Sanitization**
   - Removes script tags and content
   - Removes event handlers
   - Removes dangerous protocols (javascript:, vbscript:)
   - Removes dangerous HTML tags
   - Removes null bytes
   - Limits input length

4. **Output Encoding**
   - `escapeHtml()` - Escapes HTML entities for safe text rendering
   - `escapeHtmlAttribute()` - Escapes HTML attributes for safe attribute values

5. **SOQL Escaping**
   - Escapes single quotes for Salesforce queries
   - Used by `sanitizeSearchTerm()` function

### Client-Side Security (`client/src/utils/security.js` and `client/src/utils/xssProtection.js`)

1. **XSS Detection**
   - Same comprehensive pattern detection as server-side
   - Real-time validation before form submission

2. **Input Sanitization**
   - Client-side sanitization before sending to API
   - Real-time sanitization for input fields

3. **Output Encoding**
   - `escapeHtml()` - Escapes HTML entities
   - `escapeHtmlAttribute()` - Escapes HTML attributes
   - `SafeText` component - React component for safe text rendering
   - `safeText()` and `safeAttribute()` helper functions

### Client-Side Security (`client/src/utils/security.js`)

1. **Client-Side Validation**
   - Validates input length
   - Checks for SQL injection patterns (client-side warning)
   - Sanitizes objects before sending to API

## Testing Security

### Testing SQL Injection Protection

```javascript
// These inputs should be blocked/rejected:
const maliciousInputs = [
  "'; DROP TABLE users; --",
  "1' OR '1'='1",
  "admin'--",
  "1 UNION SELECT * FROM users"
];

// Test in your forms - they should be sanitized/blocked
```

### Testing XSS Protection

```javascript
// These inputs should be blocked/rejected:
const xssInputs = [
  "<script>alert('XSS')</script>",
  "<img src=x onerror=alert('XSS')>",
  "<iframe src='javascript:alert(\"XSS\")'></iframe>",
  "javascript:alert('XSS')",
  "<svg onload=alert('XSS')>",
  "<body onload=alert('XSS')>",
  "<input onfocus=alert('XSS') autofocus>",
  "&#60;script&#62;alert('XSS')&#60;/script&#62;", // HTML entity encoded
  "%3Cscript%3Ealert('XSS')%3C/script%3E" // URL encoded
];

// Test in your forms - they should be sanitized/blocked
// Test in rendered output - they should be escaped
```

### Testing CSRF Protection

1. Try making a POST request without a CSRF token - should return 403
2. Try making a POST request with an invalid CSRF token - should return 403
3. Normal requests through the app should work automatically

## Exceptions

### Routes That Skip CSRF Validation

- `/api/auth/*` - Uses JWT authentication instead
- GET, HEAD, OPTIONS requests - Read-only operations
- `/api/csrf-token` - Token generation endpoint

### Routes That Skip Input Sanitization

- None - All routes are sanitized by default

## Troubleshooting

### CSRF Token Errors

If you see "CSRF token missing" or "Invalid CSRF token" errors:

1. **Check**: Is the request going through `apiClient`?
   - ✅ Use: `apiClient.post('/api/endpoint', data)`
   - ❌ Don't use: `axios.post('/api/endpoint', data)`

2. **Check**: Is it a state-changing request (POST/PUT/DELETE/PATCH)?
   - GET requests don't need CSRF tokens

3. **Check**: Is it an auth endpoint?
   - `/api/auth/*` routes skip CSRF validation

### Input Sanitization Errors

If you see "Invalid input detected" or "Input sanitization failed":

1. **Check**: Is the input containing SQL injection patterns?
   - Review the input for suspicious patterns
   - Check if legitimate data is being flagged

2. **Check**: Is the input too long?
   - Default max length is 10,000 characters
   - Adjust in middleware if needed for specific routes

## Best Practices

1. **Always use `apiClient`** for API calls (not raw axios)
2. **Always use `authenticate` and `authorize`** middleware for protected routes
3. **Validate business logic** in addition to automatic sanitization
4. **Test with malicious inputs** during development
5. **Review security logs** for blocked attempts

## Security Checklist for New Features

When adding new pages, tabs, or fields:

- [ ] All API routes use `apiClient` (not raw axios)
- [ ] All protected routes use `authenticate` and `authorize` middleware
- [ ] All forms submit through `apiClient` (automatic CSRF protection)
- [ ] All user inputs are validated for XSS before submission
- [ ] All user-generated content is escaped when rendered (`safeText`, `safeAttribute`)
- [ ] HTML attributes use `safeAttribute()` when containing user input
- [ ] Text content uses `safeText()` or `SafeText` component when rendering user input
- [ ] Business logic validation is implemented
- [ ] Error handling includes security error messages
- [ ] Tested with malicious inputs (SQL injection, XSS attempts)
- [ ] Tested output rendering with XSS payloads (should be escaped, not executed)
- [ ] Reviewed security logs for false positives

## XSS Protection Best Practices

### When Rendering User Input

1. **Always escape text content**:
   ```javascript
   // ✅ DO
   <div>{safeText(userInput)}</div>
   
   // ❌ DON'T
   <div>{userInput}</div>
   ```

2. **Always escape HTML attributes**:
   ```javascript
   // ✅ DO
   <input value={safeAttribute(userInput)} />
   
   // ❌ DON'T
   <input value={userInput} />
   ```

3. **Never use `dangerouslySetInnerHTML` with user input**:
   ```javascript
   // ❌ NEVER DO THIS
   <div dangerouslySetInnerHTML={{ __html: userInput }} />
   ```

4. **Validate before submission**:
   ```javascript
   // ✅ DO
   const validation = validateInputForXss(formData.field, 'Field name');
   if (!validation.isValid) {
     // Show error, don't submit
   }
   ```

### Common XSS Attack Vectors (All Blocked)

- Script tags: `<script>alert('XSS')</script>`
- Event handlers: `<img onerror="alert('XSS')">`
- JavaScript protocol: `javascript:alert('XSS')`
- Iframe injection: `<iframe src="javascript:alert('XSS')"></iframe>`
- SVG XSS: `<svg onload="alert('XSS')">`
- Encoded attacks: `&#60;script&#62;` or `%3Cscript%3E`
- CSS injection: `@import` or `expression()`

## Additional Resources

- **Server Security Utils**: `server/utils/security.js`
- **CSRF Middleware**: `server/middleware/csrf.js`
- **Input Sanitization Middleware**: `server/middleware/inputSanitization.js`
- **Client API Config**: `client/src/config/api.js`
- **Client Security Utils**: `client/src/utils/security.js`
- **Client XSS Protection**: `client/src/utils/xssProtection.js`

## Questions?

If you have questions about security implementation, refer to:
1. This guide
2. Existing route implementations (see `server/routes/`)
3. Existing form implementations (see `client/src/pages/`)

---

**Last Updated**: 2024
**Version**: 1.0

