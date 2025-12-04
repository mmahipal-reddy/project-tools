const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const { ROLES } = require('../utils/roles');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

// Async error wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Get roles file path
const getRolesPath = () => {
  const dataDir = path.join(__dirname, '../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, 'roles.json');
};

// Load roles from file
const loadRoles = () => {
  try {
    const rolesPath = getRolesPath();
    if (fs.existsSync(rolesPath)) {
      const fileContent = fs.readFileSync(rolesPath, 'utf8');
      return JSON.parse(fileContent);
    }
  } catch (error) {
    console.error('Error loading roles from file:', error);
  }
  // Return default roles if file doesn't exist
  return [
    {
      id: 1,
      name: ROLES.ADMIN,
      description: 'Super user with full access to all features',
      permissions: ['all'],
      createdAt: new Date().toISOString(),
      isSystem: true
    },
    {
      id: 2,
      name: ROLES.REPORTS_VIEWER,
      description: 'Read-only access to dashboards and reports',
      permissions: ['view_dashboards', 'view_reports'],
      createdAt: new Date().toISOString(),
      isSystem: true
    },
    {
      id: 3,
      name: ROLES.REPORTS_MANAGER,
      description: 'Full access to dashboards and reports, but no user management',
      permissions: ['view_dashboards', 'manage_dashboards', 'view_reports', 'create_reports', 'edit_reports', 'delete_reports', 'schedule_reports'],
      createdAt: new Date().toISOString(),
      isSystem: true
    },
    {
      id: 4,
      name: ROLES.SALESFORCE_MANAGER,
      description: 'Access to all features except full administration',
      permissions: ['view_dashboards', 'manage_dashboards', 'view_reports', 'create_reports', 'edit_reports', 'delete_reports', 'schedule_reports', 'view_projects', 'create_projects', 'edit_projects', 'delete_projects', 'view_client_tool_account', 'manage_client_tool_account', 'view_queue_status', 'manage_queue_status', 'view_workstreams', 'manage_workstreams', 'view_update_fields', 'manage_update_fields', 'view_administration', 'manage_salesforce_connection'],
      createdAt: new Date().toISOString(),
      isSystem: true
    }
  ];
};

// Save roles to file
const saveRoles = (roles) => {
  try {
    const rolesPath = getRolesPath();
    fs.writeFileSync(rolesPath, JSON.stringify(roles, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving roles to file:', error);
    return false;
  }
};

// Get all roles (admin only)
router.get('/', authenticate, requireRole(ROLES.ADMIN), asyncHandler(async (req, res) => {
  try {
    const roles = loadRoles();
    res.json({
      success: true,
      roles
    });
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch roles'
    });
  }
}));

// Create role (admin only)
router.post('/', authenticate, requireRole(ROLES.ADMIN), asyncHandler(async (req, res) => {
  try {
    const { name, description, permissions } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Role name is required' });
    }

    const roles = loadRoles();

    // Check if role already exists
    const existingRole = roles.find(r => r.name.toLowerCase() === name.toLowerCase().trim());
    if (existingRole) {
      return res.status(400).json({ error: 'Role with this name already exists' });
    }

    // Create new role
    const newRole = {
      id: roles.length > 0 ? Math.max(...roles.map(r => r.id)) + 1 : 1,
      name: name.toLowerCase().trim(),
      description: description || '',
      permissions: permissions || [],
      createdAt: new Date().toISOString(),
      isSystem: false
    };

    roles.push(newRole);
    saveRoles(roles);

    console.log('Role created by admin:', newRole.name);
    res.status(201).json({
      success: true,
      role: newRole
    });
  } catch (error) {
    console.error('Create role error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create role'
    });
  }
}));

// Update role (admin only)
router.put('/:id', authenticate, requireRole(ROLES.ADMIN), asyncHandler(async (req, res) => {
  try {
    const roleId = parseInt(req.params.id);
    const { name, description, permissions } = req.body;

    const roles = loadRoles();

    const roleIndex = roles.findIndex(r => r.id === roleId);
    if (roleIndex === -1) {
      return res.status(404).json({ error: 'Role not found' });
    }

    const role = roles[roleIndex];

    // Prevent modifying system roles
    if (role.isSystem && role.name === ROLES.ADMIN) {
      return res.status(400).json({ error: 'Cannot modify admin role' });
    }

    // Update role fields
    if (name && name !== role.name) {
      // Check if new name already exists
      const existingRole = roles.find(r => r.name.toLowerCase() === name.toLowerCase().trim() && r.id !== roleId);
      if (existingRole) {
        return res.status(400).json({ error: 'Role with this name already exists' });
      }
      role.name = name.toLowerCase().trim();
    }

    if (description !== undefined) role.description = description;
    if (permissions !== undefined) role.permissions = permissions;

    role.updatedAt = new Date().toISOString();

    saveRoles(roles);

    console.log('Role updated by admin:', role.name);
    res.json({
      success: true,
      role
    });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update role'
    });
  }
}));

// Delete role (admin only)
router.delete('/:id', authenticate, requireRole(ROLES.ADMIN), asyncHandler(async (req, res) => {
  try {
    const roleId = parseInt(req.params.id);

    const roles = loadRoles();

    const roleIndex = roles.findIndex(r => r.id === roleId);
    if (roleIndex === -1) {
      return res.status(404).json({ error: 'Role not found' });
    }

    const role = roles[roleIndex];

    // Prevent deleting system roles
    if (role.isSystem) {
      return res.status(400).json({ error: 'Cannot delete system role' });
    }

    roles.splice(roleIndex, 1);
    saveRoles(roles);

    console.log('Role deleted by admin:', role.name);
    res.json({
      success: true,
      message: 'Role deleted successfully'
    });
  } catch (error) {
    console.error('Delete role error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete role'
    });
  }
}));

module.exports = router;

