/**
 * Permission Service - Real-time permission management
 * Handles role assignments, permission checking, and real-time updates
 */

import { 
  collection, 
  doc, 
  onSnapshot, 
  updateDoc, 
  addDoc, 
  deleteDoc, 
  query, 
  where, 
  getDocs,
  writeBatch,
  serverTimestamp,
  getDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { 
  Role, 
  UserRole, 
  Permission, 
  PermissionChecker, 
  DEFAULT_ROLES, 
  SystemRoles,
  PermissionError
} from './rbac';

/**
 * Permission Service for managing roles and permissions
 */
export class PermissionService {
  private static instance: PermissionService;
  private permissionCache = new Map<string, PermissionChecker>();
  private activeListeners = new Map<string, () => void>();

  static getInstance(): PermissionService {
    if (!PermissionService.instance) {
      PermissionService.instance = new PermissionService();
    }
    return PermissionService.instance;
  }

  /**
   * Initialize default system roles for a tenant
   */
  async initializeSystemRoles(tenantId: string): Promise<void> {
    const batch = writeBatch(db);
    const rolesRef = collection(db, 'tenants', tenantId, 'roles');

    // Check if roles already exist
    const existingRoles = await getDocs(query(rolesRef, where('isSystemRole', '==', true)));
    if (!existingRoles.empty) {
      console.log('System roles already initialized for tenant:', tenantId);
      return;
    }

    // Create default system roles
    for (const [roleKey, roleData] of Object.entries(DEFAULT_ROLES)) {
      const roleDoc = doc(rolesRef);
      batch.set(roleDoc, {
        ...roleData,
        id: roleKey,
        tenantId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }

    await batch.commit();
    console.log('System roles initialized for tenant:', tenantId);
  }

  /**
   * Assign role to user
   */
  async assignRole(
    userId: string, 
    roleId: string, 
    tenantId: string,
    branchId?: string,
    expiresAt?: Date,
    grantedBy?: string
  ): Promise<void> {
    const userRoleRef = collection(db, 'tenants', tenantId, 'userRoles');
    
    // Check if role assignment already exists
    const existingQuery = query(
      userRoleRef,
      where('userId', '==', userId),
      where('roleId', '==', roleId),
      where('branchId', '==', branchId || null)
    );
    
    const existing = await getDocs(existingQuery);
    if (!existing.empty) {
      throw new Error('Role already assigned to user');
    }

    await addDoc(userRoleRef, {
      userId,
      roleId,
      tenantId,
      branchId: branchId || null,
      expiresAt: expiresAt || null,
      grantedBy: grantedBy || 'system',
      grantedAt: serverTimestamp()
    });

    // Invalidate cache for user
    this.invalidateUserCache(userId);
  }

  /**
   * Remove role from user
   */
  async removeRole(
    userId: string, 
    roleId: string, 
    tenantId: string,
    branchId?: string
  ): Promise<void> {
    const userRoleRef = collection(db, 'tenants', tenantId, 'userRoles');
    
    const roleQuery = query(
      userRoleRef,
      where('userId', '==', userId),
      where('roleId', '==', roleId)
    );

    const docs = await getDocs(roleQuery);
    const batch = writeBatch(db);

    docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    
    // Invalidate cache for user
    this.invalidateUserCache(userId);
  }

  /**
   * Get user permissions with real-time updates
   */
  async getUserPermissions(
    userId: string, 
    tenantId: string, 
    branchId?: string
  ): Promise<PermissionChecker> {
    const cacheKey = `${userId}-${tenantId}-${branchId || 'all'}`;
    
    // Return cached version if available
    if (this.permissionCache.has(cacheKey)) {
      return this.permissionCache.get(cacheKey)!;
    }

    // Fetch user roles
    const userRoles = await this.fetchUserRoles(userId, tenantId, branchId);
    
    // Fetch role permissions
    const permissions = await this.fetchRolePermissions(userRoles, tenantId);
    
    // Create permission checker
    const checker = new PermissionChecker(
      permissions,
      userRoles,
      { userId, tenantId, branchId }
    );

    // Cache the result
    this.permissionCache.set(cacheKey, checker);

    // Set up real-time listener
    this.setupRealtimeListener(userId, tenantId, branchId);

    return checker;
  }

  /**
   * Fetch user roles from Firestore
   */
  private async fetchUserRoles(
    userId: string, 
    tenantId: string, 
    branchId?: string
  ): Promise<Role[]> {
    const userRolesRef = collection(db, 'tenants', tenantId, 'userRoles');
    const rolesRef = collection(db, 'tenants', tenantId, 'roles');

    // Get user role assignments
    let userRoleQuery = query(
      userRolesRef,
      where('userId', '==', userId)
    );

    if (branchId) {
      userRoleQuery = query(
        userRoleQuery,
        where('branchId', 'in', [branchId, null])
      );
    }

    const userRoleAssignments = await getDocs(userRoleQuery);
    const roleIds = userRoleAssignments.docs
      .filter(doc => {
        const data = doc.data() as UserRole;
        // Check if role has expired
        if (data.expiresAt) {
          const expiryDate = data.expiresAt instanceof Timestamp 
            ? data.expiresAt.toDate() 
            : new Date(data.expiresAt);
          if (expiryDate < new Date()) {
            return false;
          }
        }
        return true;
      })
      .map(doc => doc.data().roleId);

    if (roleIds.length === 0) {
      return [];
    }

    // Get role details
    const roleQuery = query(
      rolesRef,
      where('id', 'in', roleIds)
    );

    const roleDocs = await getDocs(roleQuery);
    return roleDocs.docs.map(doc => doc.data() as Role);
  }

  /**
   * Fetch permissions for given roles including inheritance
   */
  private async fetchRolePermissions(roles: Role[], tenantId: string): Promise<Permission[]> {
    const allPermissions: Permission[] = [];
    const processedRoles = new Set<string>();

    // Recursive function to process role inheritance
    const processRole = async (role: Role) => {
      if (processedRoles.has(role.id)) {
        return; // Avoid circular dependencies
      }

      processedRoles.add(role.id);
      
      // Add role's own permissions
      allPermissions.push(...role.permissions);

      // Process inherited roles
      if (role.inheritFrom) {
        const rolesRef = collection(db, 'tenants', tenantId, 'roles');
        const inheritedQuery = query(
          rolesRef,
          where('id', 'in', role.inheritFrom)
        );
        
        const inheritedDocs = await getDocs(inheritedQuery);
        for (const doc of inheritedDocs.docs) {
          await processRole(doc.data() as Role);
        }
      }
    };

    // Process all user roles
    for (const role of roles) {
      await processRole(role);
    }

    // Remove duplicates
    const uniquePermissions = Array.from(
      new Map(
        allPermissions.map(p => [`${p.action}:${p.resource}`, p])
      ).values()
    );

    return uniquePermissions;
  }

  /**
   * Set up real-time listener for permission changes
   */
  private setupRealtimeListener(
    userId: string, 
    tenantId: string, 
    branchId?: string
  ): void {
    const cacheKey = `${userId}-${tenantId}-${branchId || 'all'}`;
    
    // Don't set up duplicate listeners
    if (this.activeListeners.has(cacheKey)) {
      return;
    }

    const userRolesRef = collection(db, 'tenants', tenantId, 'userRoles');
    const userRoleQuery = query(
      userRolesRef,
      where('userId', '==', userId)
    );

    const unsubscribe = onSnapshot(userRoleQuery, async () => {
      // Invalidate cache and refresh permissions
      this.invalidateUserCache(userId);
      
      // Trigger permission refresh
      this.refreshUserPermissions(userId, tenantId, branchId);
    });

    this.activeListeners.set(cacheKey, unsubscribe);
  }

  /**
   * Refresh user permissions
   */
  private async refreshUserPermissions(
    userId: string, 
    tenantId: string, 
    branchId?: string
  ): Promise<void> {
    const cacheKey = `${userId}-${tenantId}-${branchId || 'all'}`;
    
    try {
      // Fetch fresh permissions
      const userRoles = await this.fetchUserRoles(userId, tenantId, branchId);
      const permissions = await this.fetchRolePermissions(userRoles, tenantId);
      
      // Update cache
      const checker = new PermissionChecker(
        permissions,
        userRoles,
        { userId, tenantId, branchId }
      );
      
      this.permissionCache.set(cacheKey, checker);
      
      // Notify components of permission changes
      window.dispatchEvent(new CustomEvent('permissionsUpdated', {
        detail: { userId, tenantId, branchId }
      }));
      
    } catch (error) {
      console.error('Failed to refresh user permissions:', error);
    }
  }

  /**
   * Invalidate user cache
   */
  private invalidateUserCache(userId: string): void {
    // Remove all cache entries for this user
    const keysToDelete: string[] = [];
    this.permissionCache.forEach((_, key) => {
      if (key.startsWith(userId)) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => {
      this.permissionCache.delete(key);
    });
  }

  /**
   * Check if user has permission (with caching)
   */
  async hasPermission(
    userId: string,
    tenantId: string,
    action: string,
    resource: string,
    branchId?: string,
    additionalContext?: Record<string, any>
  ): Promise<boolean> {
    const checker = await this.getUserPermissions(userId, tenantId, branchId);
    return checker.hasPermission(action, resource, additionalContext);
  }

  /**
   * Validate permission or throw error
   */
  async validatePermission(
    userId: string,
    tenantId: string,
    action: string,
    resource: string,
    branchId?: string,
    additionalContext?: Record<string, any>
  ): Promise<void> {
    const hasPermission = await this.hasPermission(
      userId, 
      tenantId, 
      action, 
      resource, 
      branchId, 
      additionalContext
    );

    if (!hasPermission) {
      throw new PermissionError(
        `Access denied: Missing permission for ${action} on ${resource}`,
        'PERMISSION_DENIED',
        `${action}:${resource}`
      );
    }
  }

  /**
   * Clean up listeners
   */
  cleanup(): void {
    this.activeListeners.forEach(unsubscribe => unsubscribe());
    this.activeListeners.clear();
    this.permissionCache.clear();
  }
}
