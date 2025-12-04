# RBAC (Role-Based Access Control) Implementation

## Overview
A comprehensive Role-Based Access Control (RBAC) system has been implemented to manage user access to features and pages based on their assigned roles. The system ensures that users can only access features they are authorized to use, both through the UI and direct URL access.

## Roles

### 1. Admin
- **Description**: Super user with full access to all features
- **Permissions**: All permissions (`all`)
- **Access**:
  - All dashboards (view and manage)
  - All reports (view, create, edit, delete, schedule)
  - All project management features
  - All administration features (User Management, Settings, Audit Logs, History, Salesforce Settings)

### 2. Reports Viewer
- **Description**: Read-only access to dashboards and reports
- **Permissions**:
  - `view_dashboards`
  - `view_reports`
- **Access**:
  - View dashboards (Crowd Dashboard, Case Analytics, Contributor Payments)
  - View existing reports (cannot create, edit, delete, or schedule)
  - Cannot access project management features
  - Cannot access administration features

### 3. Reports Manager
- **Description**: Full access to dashboards and reports, but no user management
- **Permissions**:
  - `view_dashboards`
  - `manage_dashboards`
  - `view_reports`
  - `create_reports`
  - `edit_reports`
  - `delete_reports`
  - `schedule_reports`
- **Access**:
  - All dashboard features (view and manage)
  - All report features (view, create, edit, delete, schedule)
  - Cannot access project management features
  - Cannot access administration features (no User Management)

### 4. Salesforce Manager
- **Description**: Access to all features except full administration
- **Permissions**:
  - All dashboard and report permissions
  - All project management permissions
  - `view_administration`
  - `manage_salesforce_connection`
  - **NOT** `manage_users` or `manage_settings`
- **Access**:
  - All dashboards and reports
  - All project management features
  - Administration page with **only** Salesforce Settings tab (no User Management, Settings, Audit Logs, or History tabs)

## Implementation Details

### Backend

#### 1. Role Definitions (`server/utils/roles.js`)
- Defines all roles and permissions
- Maps roles to their permissions
- Maps routes to required permissions
- Provides utility functions for permission checking

#### 2. RBAC Middleware (`server/middleware/rbac.js`)
- `requireRole(...roles)`: Checks if user has one of the specified roles
- `requirePermission(...permissions)`: Checks if user has one of the required permissions
- `requireRouteAccess`: Checks if user can access a specific route
- `checkFeatureAccess`: Helper for checking feature access in route handlers

#### 3. Route Protection
All routes are protected using the RBAC middleware:
- **Reports Routes** (`server/routes/reports.js`):
  - `/preview`: Requires `VIEW_REPORTS`
  - `/generate`: Requires `CREATE_REPORTS`
  - `/history`: Requires `VIEW_REPORTS`
  - `/history/:id` (GET): Requires `VIEW_REPORTS`
  - `/history/:id` (DELETE): Requires `DELETE_REPORTS`
  - `/lookup-search`: Requires `VIEW_REPORTS`

- **Scheduled Reports Routes** (`server/routes/scheduledReports.js`):
  - `POST /`: Requires `SCHEDULE_REPORTS`
  - `GET /`: Requires `VIEW_REPORTS`
  - `PUT /:id`: Requires `SCHEDULE_REPORTS`
  - `DELETE /:id`: Requires `SCHEDULE_REPORTS`

- **Auth Routes** (`server/routes/auth.js`):
  - User management endpoints require `ADMIN` role
  - Updated to use `ROLES.ADMIN` constant

### Frontend

#### 1. Role Utilities (`client/src/utils/rbac.js`)
- Mirrors backend role definitions
- Provides utility functions:
  - `hasPermission(role, permission)`: Check if role has permission
  - `canAccessRoute(userRole, route)`: Check if user can access a route
  - `canAccessFeature(userRole, feature)`: Check if user can access a feature
  - `isAdmin(userRole)`: Check if user is admin

#### 2. Role-Protected Route Component (`client/src/components/RoleProtectedRoute.js`)
- Wraps routes to check role-based access
- Redirects unauthorized users to dashboard
- Shows loading state while checking permissions
- Displays error toast for unauthorized access attempts

#### 3. Sidebar (`client/src/components/Sidebar.js`)
- Filters menu items based on user role
- Only shows menu items the user has permission to access
- Uses `canAccessRoute()` to determine visibility

#### 4. Administration Page (`client/src/pages/Administration.js`)
- Shows/hides tabs based on user role:
  - **Admin**: All tabs (User Management, Settings, Audit Logs, History, Salesforce Settings)
  - **Salesforce Manager**: Only Salesforce Settings tab
  - Other roles: No access to Administration page

#### 5. App Routes (`client/src/App.js`)
- All routes wrapped with `RoleProtectedRoute`
- Ensures URL protection (users cannot access pages directly via URL if they don't have permission)

#### 6. Auth Context (`client/src/context/AuthContext.js`)
- Enhanced with role-based utilities:
  - `hasRolePermission(permission)`: Check permission based on role
  - `canAccess(route)`: Check route access
  - `canAccessFeature(feature)`: Check feature access
  - `hasRole(role)`: Check if user has specific role
  - `isAdmin()`: Check if user is admin

## Permission Matrix

| Feature | Admin | Reports Viewer | Reports Manager | Salesforce Manager |
|---------|-------|----------------|-----------------|-------------------|
| View Dashboards | ✅ | ✅ | ✅ | ✅ |
| Manage Dashboards | ✅ | ❌ | ✅ | ✅ |
| View Reports | ✅ | ✅ | ✅ | ✅ |
| Create Reports | ✅ | ❌ | ✅ | ✅ |
| Edit Reports | ✅ | ❌ | ✅ | ✅ |
| Delete Reports | ✅ | ❌ | ✅ | ✅ |
| Schedule Reports | ✅ | ❌ | ✅ | ✅ |
| View Projects | ✅ | ❌ | ❌ | ✅ |
| Create Projects | ✅ | ❌ | ❌ | ✅ |
| Client Tool Account | ✅ | ❌ | ❌ | ✅ |
| Queue Status Management | ✅ | ❌ | ❌ | ✅ |
| Workstream Management | ✅ | ❌ | ❌ | ✅ |
| Update Object Fields | ✅ | ❌ | ❌ | ✅ |
| Administration | ✅ | ❌ | ❌ | ✅ (Salesforce only) |
| User Management | ✅ | ❌ | ❌ | ❌ |
| Settings | ✅ | ❌ | ❌ | ❌ |
| Audit Logs | ✅ | ❌ | ❌ | ❌ |
| History | ✅ | ❌ | ❌ | ❌ |

## Security Features

### 1. URL Protection
- Users cannot access pages directly via URL if they don't have permission
- `RoleProtectedRoute` component checks permissions before rendering
- Unauthorized access attempts redirect to dashboard with error message

### 2. Backend Route Protection
- All API endpoints protected with role-based middleware
- Returns 403 Forbidden for unauthorized access
- Consistent error messages

### 3. UI Element Hiding
- Sidebar menu items hidden based on role
- Administration tabs hidden based on role
- Buttons and actions can be conditionally rendered based on permissions

## Usage Examples

### Backend Route Protection
```javascript
const { requirePermission } = require('../middleware/rbac');
const { PERMISSIONS } = require('../utils/roles');

router.post('/generate', authenticate, requirePermission(PERMISSIONS.CREATE_REPORTS), handler);
```

### Frontend Route Protection
```javascript
<Route
  path="/report-builder"
  element={
    <RoleProtectedRoute>
      <ReportBuilder />
    </RoleProtectedRoute>
  }
/>
```

### Frontend Permission Check
```javascript
const { hasRolePermission, canAccess } = useAuth();

if (hasRolePermission(PERMISSIONS.CREATE_REPORTS)) {
  // Show create button
}

if (canAccess('/report-builder')) {
  // Show menu item
}
```

### Sidebar Menu Filtering
```javascript
const canAccess = (path) => {
  if (!user || !user.role) return false;
  if (user.role === ROLES.ADMIN) return true;
  return canAccessRoute(user.role, path);
};
```

## Testing

To test the RBAC system:

1. **Create test users** with different roles:
   - Admin user
   - Reports Viewer user
   - Reports Manager user
   - Salesforce Manager user

2. **Test URL protection**:
   - Log in as Reports Viewer
   - Try to access `/report-builder` directly via URL
   - Should redirect to dashboard with error message

3. **Test menu visibility**:
   - Log in as Reports Viewer
   - Sidebar should only show Dashboards and Reporting sections
   - Project Management and Administration should not be visible

4. **Test Administration tabs**:
   - Log in as Salesforce Manager
   - Go to Administration page
   - Only Salesforce Settings tab should be visible

5. **Test API protection**:
   - Log in as Reports Viewer
   - Try to create a report via API
   - Should receive 403 Forbidden error

## Migration Notes

- Existing users with `role: 'admin'` and `permissions: ['all']` will continue to work
- New users should be assigned one of the defined roles: `admin`, `reports_viewer`, `reports_manager`, `salesforce_manager`
- The system is backward compatible with the existing permission system
- Role-based checks take precedence over permission-based checks

## Future Enhancements

1. **Granular Permissions**: Add more specific permissions for fine-grained control
2. **Role Assignment UI**: Add UI for admins to assign roles to users
3. **Permission Groups**: Create permission groups for easier management
4. **Audit Logging**: Log all permission checks and access attempts
5. **Dynamic Permissions**: Allow permissions to be configured dynamically

