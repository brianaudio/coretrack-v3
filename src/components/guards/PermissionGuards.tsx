/**
 * Permission Guard Components
 * Protect routes and UI elements based on user permissions
 */

import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { Actions, Resources } from '@/lib/rbac';

interface PermissionGuardProps {
  action: string;
  resource: string;
  additionalContext?: Record<string, any>;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Component that renders children only if user has required permission
 */
export function PermissionGuard({ 
  action, 
  resource, 
  additionalContext, 
  fallback = null, 
  children 
}: PermissionGuardProps) {
  const { hasPermission, loading } = usePermissions();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!hasPermission(action, resource, additionalContext)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Component for admin-only content
 */
export function AdminGuard({ 
  fallback = null, 
  children 
}: { 
  fallback?: React.ReactNode; 
  children: React.ReactNode; 
}) {
  const { isAdmin, loading } = usePermissions();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAdmin()) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Role-based content guard
 */
interface RoleGuardProps {
  roles: string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function RoleGuard({ roles, fallback = null, children }: RoleGuardProps) {
  const { getUserRoles, loading } = usePermissions();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const userRoles = getUserRoles();
  const hasRequiredRole = userRoles.some(role => roles.includes(role.id));

  if (!hasRequiredRole) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Access denied fallback component
 */
export function AccessDenied({ 
  title = "Access Denied", 
  message = "You don't have permission to access this content." 
}: { 
  title?: string; 
  message?: string; 
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] p-8 text-center">
      <div className="w-16 h-16 mb-4 rounded-full bg-red-100 flex items-center justify-center">
        <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.232 15.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 max-w-md">{message}</p>
    </div>
  );
}

/**
 * Common permission guards for specific resources
 */

// Inventory Guards
export const InventoryGuard = {
  Read: ({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) => (
    <PermissionGuard action={Actions.READ} resource={Resources.INVENTORY} fallback={fallback}>
      {children}
    </PermissionGuard>
  ),
  
  Create: ({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) => (
    <PermissionGuard action={Actions.CREATE} resource={Resources.INVENTORY} fallback={fallback}>
      {children}
    </PermissionGuard>
  ),
  
  Update: ({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) => (
    <PermissionGuard action={Actions.UPDATE} resource={Resources.INVENTORY} fallback={fallback}>
      {children}
    </PermissionGuard>
  ),
  
  Delete: ({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) => (
    <PermissionGuard action={Actions.DELETE} resource={Resources.INVENTORY} fallback={fallback}>
      {children}
    </PermissionGuard>
  )
};

// POS Guards
export const POSGuard = {
  Access: ({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) => (
    <PermissionGuard action={Actions.READ} resource={Resources.POS} fallback={fallback}>
      {children}
    </PermissionGuard>
  ),
  
  Process: ({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) => (
    <PermissionGuard action={Actions.CREATE} resource={Resources.POS} fallback={fallback}>
      {children}
    </PermissionGuard>
  )
};

// Analytics Guards
export const AnalyticsGuard = {
  Basic: ({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) => (
    <PermissionGuard 
      action={Actions.READ} 
      resource={Resources.ANALYTICS} 
      additionalContext={{ basicOnly: false }}
      fallback={fallback}
    >
      {children}
    </PermissionGuard>
  ),
  
  Advanced: ({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) => (
    <PermissionGuard 
      action={Actions.READ} 
      resource={Resources.ANALYTICS}
      additionalContext={{ requiresAdvanced: true }}
      fallback={fallback}
    >
      {children}
    </PermissionGuard>
  )
};

// User Management Guards
export const UserGuard = {
  Manage: ({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) => (
    <PermissionGuard action={Actions.MANAGE} resource={Resources.USERS} fallback={fallback}>
      {children}
    </PermissionGuard>
  ),
  
  Read: ({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) => (
    <PermissionGuard action={Actions.READ} resource={Resources.USERS} fallback={fallback}>
      {children}
    </PermissionGuard>
  )
};

// Settings Guards
export const SettingsGuard = {
  Manage: ({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) => (
    <PermissionGuard action={Actions.MANAGE} resource={Resources.SETTINGS} fallback={fallback}>
      {children}
    </PermissionGuard>
  )
};
