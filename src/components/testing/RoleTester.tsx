'use client';

import React, { useState } from 'react';
import { UserRole, DEFAULT_ROLE_PERMISSIONS, AVAILABLE_PERMISSIONS } from '../../lib/types/user';

interface RoleTesterProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
}

const RoleTester: React.FC<RoleTesterProps> = ({ currentRole, onRoleChange }) => {
  const [showPermissions, setShowPermissions] = useState(false);

  const rolePermissions = DEFAULT_ROLE_PERMISSIONS[currentRole];

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'manager': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'staff': return 'bg-green-100 text-green-800 border-green-200';
      case 'viewer': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const hasPermission = (permissionId: string) => {
    return rolePermissions.permissions.includes('*') || rolePermissions.permissions.includes(permissionId);
  };

  return (
    <div className="fixed top-4 right-4 z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-4 w-80">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-gray-900">🧪 Role Tester</h3>
        <div className="text-xs text-green-600 font-medium">DEV MODE ACTIVE</div>
      </div>

      {/* Current Role Display */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Current Role:</label>
        <div className={`inline-flex px-3 py-2 rounded-lg text-sm font-semibold border ${getRoleColor(currentRole)}`}>
          {currentRole.charAt(0).toUpperCase() + currentRole.slice(1)}
        </div>
      </div>

      {/* Role Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Test as Role:</label>
        <div className="grid grid-cols-2 gap-2">
          {(['owner', 'manager', 'staff', 'viewer'] as UserRole[]).map((role) => (
            <button
              key={role}
              onClick={() => onRoleChange(role)}
              className={`px-3 py-2 text-xs font-medium rounded border transition-colors ${
                currentRole === role
                  ? getRoleColor(role)
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
              }`}
            >
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Permissions Summary */}
      <div className="mb-4">
        <div className="text-sm font-medium text-gray-700 mb-2">Quick Access Check:</div>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span>Can Add Items:</span>
            <span className={hasPermission('inventory.create') ? 'text-green-600' : 'text-red-600'}>
              {hasPermission('inventory.create') ? '✅' : '❌'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Can Process Orders:</span>
            <span className={hasPermission('pos.create') ? 'text-green-600' : 'text-red-600'}>
              {hasPermission('pos.create') ? '✅' : '❌'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Can Manage Users:</span>
            <span className={rolePermissions.canManageUsers ? 'text-green-600' : 'text-red-600'}>
              {rolePermissions.canManageUsers ? '✅' : '❌'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Can Delete Items:</span>
            <span className={hasPermission('inventory.delete') ? 'text-green-600' : 'text-red-600'}>
              {hasPermission('inventory.delete') ? '✅' : '❌'}
            </span>
          </div>
        </div>
      </div>

      {/* Show All Permissions Toggle */}
      <button
        onClick={() => setShowPermissions(!showPermissions)}
        className="w-full text-xs text-blue-600 hover:text-blue-800 font-medium"
      >
        {showPermissions ? 'Hide' : 'Show'} All Permissions
      </button>

      {/* Detailed Permissions */}
      {showPermissions && (
        <div className="mt-3 max-h-48 overflow-y-auto border-t pt-3">
          <div className="space-y-2">
            {AVAILABLE_PERMISSIONS.map((permission) => (
              <div key={permission.id} className="flex items-center justify-between text-xs">
                <div>
                  <div className="font-medium text-gray-800">{permission.name}</div>
                  <div className="text-gray-500">{permission.description}</div>
                </div>
                <span className={hasPermission(permission.id) ? 'text-green-600' : 'text-red-600'}>
                  {hasPermission(permission.id) ? '✅' : '❌'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 text-xs text-gray-500 text-center">
        💡 In production, permissions are enforced
      </div>
    </div>
  );
};

export default RoleTester;
