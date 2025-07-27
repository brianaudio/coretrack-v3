'use client';

import React from 'react';
import { useAuth } from '../../lib/context/AuthContext';
import { useUser } from '../../lib/rbac/UserContext';
import RoleSwitcher from '../../components/testing/RoleSwitcher';

export default function ShiftTestPage() {
  const { user, profile } = useAuth();
  const { currentUser, currentRole, setCurrentUser } = useUser();

  const forceStaffUser = () => {
    setCurrentUser({
      uid: 'test-staff-123',
      email: 'staff@coretrack.dev',
      role: 'staff'
    });
  };

  const effectiveRole = currentUser?.role || profile?.role;
  const userEmail = currentUser?.email || user?.email || profile?.email;
  const isStaffByRole = effectiveRole === 'staff' || effectiveRole === 'manager';
  const isStaffByEmail = userEmail?.includes('staff@') || userEmail?.includes('manager@');
  const requiresShift = isStaffByRole || isStaffByEmail;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Shift Lock Screen Test</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Current State */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 text-blue-600">Current Authentication</h2>
          <div className="space-y-2">
            <div>
              <span className="font-medium">Effective Role:</span>
              <p className="text-sm text-gray-600">{effectiveRole || 'None'}</p>
            </div>
            <div>
              <span className="font-medium">User Email:</span>
              <p className="text-sm text-gray-600">{userEmail || 'None'}</p>
            </div>
            <div>
              <span className="font-medium">Is Staff by Role:</span>
              <p className="text-sm text-gray-600">{isStaffByRole ? 'Yes' : 'No'}</p>
            </div>
            <div>
              <span className="font-medium">Is Staff by Email:</span>
              <p className="text-sm text-gray-600">{isStaffByEmail ? 'Yes' : 'No'}</p>
            </div>
            <div>
              <span className="font-medium">Requires Shift:</span>
              <p className={`text-sm font-medium ${requiresShift ? 'text-green-600' : 'text-red-600'}`}>
                {requiresShift ? 'YES - Should show shift lock screen' : 'NO - Should skip shift lock screen'}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 text-green-600">Test Actions</h2>
          <div className="space-y-3">
            <button
              onClick={forceStaffUser}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Set Staff User (staff@coretrack.dev)
            </button>
            <a
              href="/"
              className="block w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors text-center"
            >
              Go to Main App (Test Shift Lock)
            </a>
          </div>
        </div>
      </div>

      {/* Role Switcher */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Role Switcher</h2>
        <RoleSwitcher />
      </div>

      {/* Raw Data */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Raw Data</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium mb-2">Current User (Demo Auth):</h3>
            <pre className="text-xs bg-white p-3 rounded border overflow-auto">
              {JSON.stringify(currentUser, null, 2)}
            </pre>
          </div>
          <div>
            <h3 className="font-medium mb-2">Firebase Profile:</h3>
            <pre className="text-xs bg-white p-3 rounded border overflow-auto">
              {JSON.stringify(profile, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
