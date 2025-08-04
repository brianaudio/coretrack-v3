/**
 * React hooks for permission management
 */

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { PermissionService } from '@/lib/permissionService';
import { PermissionChecker, PermissionError } from '@/lib/rbac';

/**
 * React hook for permission management
 */
export function usePermissions(branchId?: string) {
  const { user, tenant } = useAuth();
  const [permissionChecker, setPermissionChecker] = useState<PermissionChecker | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const permissionService = PermissionService.getInstance();

  useEffect(() => {
    if (!user || !tenant) {
      setPermissionChecker(null);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadPermissions = async () => {
      try {
        setLoading(true);
        const checker = await permissionService.getUserPermissions(
          user.uid,
          tenant.id,
          branchId
        );
        
        if (isMounted) {
          setPermissionChecker(checker);
          setError(null);
        }
      } catch (err) {
        console.error('Failed to load permissions:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load permissions');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadPermissions();

    // Listen for permission updates
    const handlePermissionUpdate = (event: CustomEvent) => {
      const { userId, tenantId } = event.detail;
      if (userId === user.uid && tenantId === tenant.id) {
        loadPermissions();
      }
    };

    window.addEventListener('permissionsUpdated', handlePermissionUpdate as EventListener);

    return () => {
      isMounted = false;
      window.removeEventListener('permissionsUpdated', handlePermissionUpdate as EventListener);
    };
  }, [user, tenant, branchId, permissionService]);

  const hasPermission = useCallback((action: string, resource: string, additionalContext?: Record<string, any>) => {
    if (!permissionChecker) return false;
    return permissionChecker.hasPermission(action, resource, additionalContext);
  }, [permissionChecker]);

  const validatePermission = useCallback(async (action: string, resource: string, additionalContext?: Record<string, any>) => {
    if (!user || !tenant) {
      throw new PermissionError('User not authenticated', 'NOT_AUTHENTICATED', `${action}:${resource}`);
    }

    await permissionService.validatePermission(
      user.uid,
      tenant.id,
      action,
      resource,
      branchId,
      additionalContext
    );
  }, [user, tenant, branchId, permissionService]);

  const isAdmin = useCallback(() => {
    return permissionChecker?.isAdmin() || false;
  }, [permissionChecker]);

  const canManageUsers = useCallback(() => {
    return permissionChecker?.canManageUsers() || false;
  }, [permissionChecker]);

  const getUserRoles = useCallback(() => {
    return permissionChecker?.getUserRoles() || [];
  }, [permissionChecker]);

  const getPermissionSummary = useCallback(() => {
    return permissionChecker?.getPermissionSummary() || {
      roles: [],
      permissions: [],
      context: {}
    };
  }, [permissionChecker]);

  return {
    permissionChecker,
    hasPermission,
    validatePermission,
    isAdmin,
    canManageUsers,
    getUserRoles,
    getPermissionSummary,
    loading,
    error
  };
}

/**
 * Hook for checking if user has specific permission
 */
export function useHasPermission(action: string, resource: string, additionalContext?: Record<string, any>) {
  const { hasPermission, loading } = usePermissions();
  
  return {
    hasPermission: hasPermission(action, resource, additionalContext),
    loading
  };
}

/**
 * Hook for checking if user is admin
 */
export function useIsAdmin() {
  const { isAdmin, loading } = usePermissions();
  
  return {
    isAdmin: isAdmin(),
    loading
  };
}

/**
 * Hook for getting user roles
 */
export function useUserRoles() {
  const { getUserRoles, loading } = usePermissions();
  
  return {
    roles: getUserRoles(),
    loading
  };
}
