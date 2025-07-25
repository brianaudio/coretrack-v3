'use client';

import React from 'react';
import { useDemoMode } from '../../lib/context/DemoModeContext';
import { UserRole } from '../../lib/types/user';

const DemoModeToggle: React.FC = () => {
  const { isDemoMode, setDemoMode, demoRole, setDemoRole } = useDemoMode();

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'manager': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'staff': return 'bg-green-100 text-green-800 border-green-200';
      case 'viewer': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-4 w-80">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-gray-900">🧪 RBAC Testing</h3>
        <div className={`text-xs font-medium px-2 py-1 rounded ${
          isDemoMode ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
        }`}>
          {isDemoMode ? 'DEMO MODE' : 'DEV MODE'}
        </div>
      </div>

      {/* Demo Mode Toggle */}
      <div className="mb-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={isDemoMode}
            onChange={(e) => setDemoMode(e.target.checked)}
            className="mr-2 h-4 w-4 text-primary-600 rounded focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700">
            Enable Role-Based Permissions
          </span>
        </label>
        <p className="text-xs text-gray-500 mt-1">
          {isDemoMode 
            ? 'Permissions enforced based on selected role' 
            : 'All permissions granted (dev mode)'
          }
        </p>
      </div>

      {/* Role Selector - only show when demo mode is enabled */}
      {isDemoMode && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Test as Role:
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(['owner', 'manager', 'staff', 'viewer'] as UserRole[]).map((role) => (
              <button
                key={role}
                onClick={() => setDemoRole(role)}
                className={`px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
                  demoRole === role
                    ? getRoleColor(role)
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </button>
            ))}
          </div>

          {/* Current Role Info */}
          <div className="mt-3 p-2 bg-gray-50 rounded-md">
            <div className="text-xs text-gray-600 mb-1">Current Role:</div>
            <div className={`inline-flex px-2 py-1 rounded text-xs font-semibold border ${getRoleColor(demoRole)}`}>
              {demoRole.charAt(0).toUpperCase() + demoRole.slice(1)}
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-4 p-2 bg-blue-50 rounded-md">
        <div className="text-xs text-blue-800">
          <div className="font-medium mb-1">How to test:</div>
          <ol className="list-decimal list-inside space-y-1 text-blue-700">
            <li>Enable role-based permissions</li>
            <li>Select a role to test</li>
            <li>Navigate through the app to see enforced permissions</li>
            <li>Try actions like adding inventory, processing orders, etc.</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default DemoModeToggle;
