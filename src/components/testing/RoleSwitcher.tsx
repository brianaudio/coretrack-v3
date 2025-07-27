import React from 'react';
import { useUser } from '../../lib/rbac/UserContext';
import { UserRole } from '../../lib/rbac/permissions';

const RoleSwitcher: React.FC = () => {
  const { currentRole, setCurrentRole, setCurrentUser } = useUser();

  const roles: { value: UserRole; label: string; color: string }[] = [
    { value: 'staff', label: 'Staff', color: 'bg-blue-100 text-blue-800' },
    { value: 'manager', label: 'Manager', color: 'bg-green-100 text-green-800' },
    { value: 'owner', label: 'Owner', color: 'bg-purple-100 text-purple-800' }
  ];

  const handleRoleChange = (role: UserRole) => {
    setCurrentRole(role);
    setCurrentUser({
      uid: `dev-user-${role}`,
      email: `${role}@coretrack.dev`,
      role: role
    });
  };

  return (
    <div className="fixed bottom-20 right-4 z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-4 min-w-[200px]">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">🔧 Role Testing</h3>
        <p className="text-xs text-gray-500">Switch between user roles to test RBAC</p>
      </div>
      
      <div className="space-y-2">
        {roles.map((role) => (
          <button
            key={role.value}
            onClick={() => handleRoleChange(role.value)}
            className={`
              w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-all
              ${currentRole === role.value 
                ? `${role.color} border-2 border-current` 
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
              }
            `}
          >
            <div className="flex items-center justify-between">
              <span>{role.label}</span>
              {currentRole === role.value && (
                <span className="text-xs">✓</span>
              )}
            </div>
            <div className="text-xs opacity-75 mt-1">
              {role.value}@coretrack.dev
            </div>
          </button>
        ))}
      </div>
      
      <div className="mt-3 pt-3 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Current: <span className="font-medium">{currentRole}</span>
        </p>
      </div>
    </div>
  );
};

export default RoleSwitcher;
