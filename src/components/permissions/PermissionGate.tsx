'use client';

import React from 'react';
import { useUserPermissions } from '../../lib/context/UserPermissionsContext';

interface PermissionGateProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  locationId?: string;
}

// Component to conditionally render content based on user permissions
export const PermissionGate: React.FC<PermissionGateProps> = ({ 
  permission, 
  children, 
  fallback,
  locationId 
}) => {
  const { hasPermission, loading } = useUserPermissions();

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-200 rounded-lg h-8 w-32"></div>
    );
  }

  // DEVELOPMENT MODE: Always allow access during testing
  const isDevMode = process.env.NODE_ENV === 'development';
  const hasAccess = isDevMode || hasPermission(permission, locationId);

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return null;
};

interface RoleGateProps {
  roles: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

// Component to conditionally render content based on user role
export const RoleGate: React.FC<RoleGateProps> = ({ 
  roles, 
  children, 
  fallback 
}) => {
  const { member, loading } = useUserPermissions();

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-200 rounded-lg h-8 w-32"></div>
    );
  }

  // DEVELOPMENT MODE: Always allow access during testing
  const isDevMode = process.env.NODE_ENV === 'development';
  const hasAccess = isDevMode || (member && roles.includes(member.role));

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return null;
};

interface NoPermissionMessageProps {
  permission: string;
  action?: string;
}

export const NoPermissionMessage: React.FC<NoPermissionMessageProps> = ({ 
  permission, 
  action = "perform this action" 
}) => {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
      <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
        <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-yellow-800 mb-2">Permission Required</h3>
      <p className="text-yellow-700 mb-4">
        You don&apos;t have permission to {action}. This requires the &quot;{permission}&quot; permission.
      </p>
      <button
        onClick={() => window.location.href = '/team-management'}
        className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700"
      >
        Contact Administrator
      </button>
    </div>
  );
};
