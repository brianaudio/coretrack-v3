'use client';

import React from 'react';
import { useUser } from '../../lib/rbac/UserContext';

const SimpleRoleSwitcher: React.FC = () => {
  const { currentUser, setCurrentUser } = useUser();

  const switchToStaff = () => {
    setCurrentUser({
      uid: 'test-staff-123',
      email: 'staff@coretrack.dev',
      role: 'staff'
    });
  };

  const switchToManager = () => {
    setCurrentUser({
      uid: 'test-manager-123',
      email: 'manager@coretrack.dev',
      role: 'manager'
    });
  };

  const switchToOwner = () => {
    setCurrentUser({
      uid: 'test-owner-123',
      email: 'owner@coretrack.dev',
      role: 'owner'
    });
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">🔧 Role Test</h3>
        <p className="text-xs text-gray-500">Current: {currentUser?.role || 'None'}</p>
      </div>
      
      <div className="space-y-2">
        <button
          onClick={switchToStaff}
          className="w-full text-left px-3 py-2 rounded-md text-sm font-medium bg-blue-100 text-blue-800 hover:bg-blue-200"
        >
          Staff
        </button>
        <button
          onClick={switchToManager}
          className="w-full text-left px-3 py-2 rounded-md text-sm font-medium bg-green-100 text-green-800 hover:bg-green-200"
        >
          Manager
        </button>
        <button
          onClick={switchToOwner}
          className="w-full text-left px-3 py-2 rounded-md text-sm font-medium bg-purple-100 text-purple-800 hover:bg-purple-200"
        >
          Owner
        </button>
      </div>
    </div>
  );
};

export default SimpleRoleSwitcher;
