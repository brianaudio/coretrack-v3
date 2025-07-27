'use client';

import React from 'react';
import { useAuth } from '../../lib/context/AuthContext';
import { useUser } from '../../lib/rbac/UserContext';

export default function AuthDebugger() {
  const { user, profile } = useAuth();
  const { currentUser, currentRole } = useUser();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Authentication Debugger</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Firebase Auth */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 text-blue-600">Firebase Auth</h2>
          <div className="space-y-2">
            <div>
              <span className="font-medium">User:</span>
              <p className="text-sm text-gray-600">{user ? 'Authenticated' : 'Not authenticated'}</p>
            </div>
            <div>
              <span className="font-medium">UID:</span>
              <p className="text-sm text-gray-600">{user?.uid || 'None'}</p>
            </div>
            <div>
              <span className="font-medium">Email:</span>
              <p className="text-sm text-gray-600">{user?.email || 'None'}</p>
            </div>
            <div>
              <span className="font-medium">Display Name:</span>
              <p className="text-sm text-gray-600">{user?.displayName || 'None'}</p>
            </div>
          </div>
        </div>

        {/* Profile Data */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 text-green-600">Profile Data</h2>
          <div className="space-y-2">
            <div>
              <span className="font-medium">Profile:</span>
              <p className="text-sm text-gray-600">{profile ? 'Loaded' : 'Not loaded'}</p>
            </div>
            <div>
              <span className="font-medium">Role:</span>
              <p className="text-sm text-gray-600">{profile?.role || 'None'}</p>
            </div>
            <div>
              <span className="font-medium">Email:</span>
              <p className="text-sm text-gray-600">{profile?.email || 'None'}</p>
            </div>
            <div>
              <span className="font-medium">Tenant ID:</span>
              <p className="text-sm text-gray-600">{profile?.tenantId || 'None'}</p>
            </div>
          </div>
        </div>

        {/* Demo Auth (UserContext) */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 text-purple-600">Demo Auth (UserContext)</h2>
          <div className="space-y-2">
            <div>
              <span className="font-medium">Current User:</span>
              <p className="text-sm text-gray-600">{currentUser ? 'Active' : 'None'}</p>
            </div>
            <div>
              <span className="font-medium">Role:</span>
              <p className="text-sm text-gray-600">{currentRole || 'None'}</p>
            </div>
            <div>
              <span className="font-medium">Email:</span>
              <p className="text-sm text-gray-600">{currentUser?.email || 'None'}</p>
            </div>
            <div>
              <span className="font-medium">UID:</span>
              <p className="text-sm text-gray-600">{currentUser?.uid || 'None'}</p>
            </div>
          </div>
        </div>

        {/* Effective Values */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 text-orange-600">Effective Values</h2>
          <div className="space-y-2">
            <div>
              <span className="font-medium">Effective Role:</span>
              <p className="text-sm text-gray-600">{currentUser?.role || profile?.role || 'None'}</p>
            </div>
            <div>
              <span className="font-medium">Effective Email:</span>
              <p className="text-sm text-gray-600">{currentUser?.email || user?.email || profile?.email || 'None'}</p>
            </div>
            <div>
              <span className="font-medium">Should Show Shift Lock:</span>
              <p className="text-sm text-gray-600">
                {(() => {
                  const effectiveRole = currentUser?.role || profile?.role;
                  const userEmail = currentUser?.email || user?.email || profile?.email;
                  const isStaffByRole = effectiveRole === 'staff' || effectiveRole === 'manager';
                  const isStaffByEmail = userEmail?.includes('staff@') || userEmail?.includes('manager@');
                  return (isStaffByRole || isStaffByEmail) ? 'Yes' : 'No';
                })()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Raw Data */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Raw Data</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium mb-2">Firebase User:</h3>
            <pre className="text-xs bg-white p-3 rounded border overflow-auto">
              {JSON.stringify(user, null, 2)}
            </pre>
          </div>
          <div>
            <h3 className="font-medium mb-2">Profile:</h3>
            <pre className="text-xs bg-white p-3 rounded border overflow-auto">
              {JSON.stringify(profile, null, 2)}
            </pre>
          </div>
          <div>
            <h3 className="font-medium mb-2">Current User:</h3>
            <pre className="text-xs bg-white p-3 rounded border overflow-auto">
              {JSON.stringify(currentUser, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
