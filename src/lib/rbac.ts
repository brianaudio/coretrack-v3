/**
 * Role-Based Access Control (RBAC) System
 * Comprehensive permission management with real-time updates
 */

export interface Permission {
  action: string;
  resource: string;
  conditions?: Record<string, any>;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  inheritFrom?: string[]; // Role inheritance
  isSystemRole: boolean;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRole {
  userId: string;
  roleId: string;
  tenantId: string;
  branchId?: string;
  expiresAt?: Date; // Time-based permissions
  grantedBy: string;
  grantedAt: Date;
}

export enum SystemRoles {
  SUPER_ADMIN = 'super_admin',
  TENANT_ADMIN = 'tenant_admin',
  BRANCH_MANAGER = 'branch_manager',
  STAFF = 'staff',
  VIEWER = 'viewer'
}

export enum Resources {
  INVENTORY = 'inventory',
  POS = 'pos',
  ANALYTICS = 'analytics',
  EXPENSES = 'expenses',
  USERS = 'users',
  SETTINGS = 'settings',
  PURCHASE_ORDERS = 'purchase_orders',
  MENU_BUILDER = 'menu_builder'
}

export enum Actions {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  APPROVE = 'approve',
  EXPORT = 'export',
  MANAGE = 'manage'
}

/**
 * Default system roles with comprehensive permissions
 */
export const DEFAULT_ROLES: Record<SystemRoles, Omit<Role, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>> = {
  [SystemRoles.SUPER_ADMIN]: {
    name: 'Super Administrator',
    description: 'Full system access across all tenants',
    permissions: [
      { action: '*', resource: '*' } // Wildcard permission
    ],
    isSystemRole: true
  },
  
  [SystemRoles.TENANT_ADMIN]: {
    name: 'Tenant Administrator',
    description: 'Full access within organization',
    permissions: [
      { action: Actions.MANAGE, resource: Resources.USERS },
      { action: Actions.MANAGE, resource: Resources.SETTINGS },
      { action: '*', resource: Resources.INVENTORY },
      { action: '*', resource: Resources.POS },
      { action: '*', resource: Resources.ANALYTICS },
      { action: '*', resource: Resources.EXPENSES },
      { action: '*', resource: Resources.PURCHASE_ORDERS },
      { action: '*', resource: Resources.MENU_BUILDER }
    ],
    isSystemRole: true
  },
  
  [SystemRoles.BRANCH_MANAGER]: {
    name: 'Branch Manager',
    description: 'Manages specific branch operations',
    permissions: [
      { action: Actions.READ, resource: Resources.USERS },
      { action: Actions.READ, resource: Resources.SETTINGS },
      { action: '*', resource: Resources.INVENTORY, conditions: { branchRestricted: true } },
      { action: '*', resource: Resources.POS, conditions: { branchRestricted: true } },
      { action: Actions.READ, resource: Resources.ANALYTICS, conditions: { branchRestricted: true } },
      { action: '*', resource: Resources.EXPENSES, conditions: { branchRestricted: true } },
      { action: '*', resource: Resources.PURCHASE_ORDERS, conditions: { branchRestricted: true } },
      { action: Actions.READ, resource: Resources.MENU_BUILDER }
    ],
    inheritFrom: [SystemRoles.STAFF],
    isSystemRole: true
  },
  
  [SystemRoles.STAFF]: {
    name: 'Staff Member',
    description: 'Basic operational access',
    permissions: [
      { action: Actions.READ, resource: Resources.INVENTORY },
      { action: Actions.UPDATE, resource: Resources.INVENTORY, conditions: { stockUpdatesOnly: true } },
      { action: '*', resource: Resources.POS },
      { action: Actions.READ, resource: Resources.ANALYTICS, conditions: { basicOnly: true } },
      { action: Actions.CREATE, resource: Resources.EXPENSES, conditions: { ownOnly: true } },
      { action: Actions.READ, resource: Resources.MENU_BUILDER }
    ],
    isSystemRole: true
  },
  
  [SystemRoles.VIEWER]: {
    name: 'Viewer',
    description: 'Read-only access',
    permissions: [
      { action: Actions.READ, resource: Resources.INVENTORY },
      { action: Actions.READ, resource: Resources.ANALYTICS, conditions: { basicOnly: true } },
      { action: Actions.READ, resource: Resources.MENU_BUILDER }
    ],
    isSystemRole: true
  }
};

/**
 * Permission checking utility functions
 */
export class PermissionChecker {
  private userPermissions: Permission[] = [];
  private userRoles: Role[] = [];
  private context: {
    userId: string;
    tenantId: string;
    branchId?: string;
  } = { userId: '', tenantId: '' };

  constructor(permissions: Permission[], roles: Role[], context: any) {
    this.userPermissions = permissions;
    this.userRoles = roles;
    this.context = context;
  }

  /**
   * Check if user has permission for specific action on resource
   */
  hasPermission(action: string, resource: string, additionalContext?: Record<string, any>): boolean {
    // Check for wildcard permissions (super admin)
    if (this.userPermissions.some(p => p.action === '*' && p.resource === '*')) {
      return true;
    }

    // Check for resource wildcard
    if (this.userPermissions.some(p => p.action === '*' && p.resource === resource)) {
      return true;
    }

    // Check for action wildcard on specific resource
    if (this.userPermissions.some(p => p.action === action && p.resource === '*')) {
      return true;
    }

    // Check exact permission match
    const matchingPermissions = this.userPermissions.filter(p => 
      p.action === action && p.resource === resource
    );

    if (matchingPermissions.length === 0) {
      return false;
    }

    // Check conditions if present
    for (const permission of matchingPermissions) {
      if (!permission.conditions) {
        return true; // No conditions, permission granted
      }

      if (this.checkConditions(permission.conditions, additionalContext)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check permission conditions
   */
  private checkConditions(conditions: Record<string, any>, additionalContext?: Record<string, any>): boolean {
    // Branch restriction check
    if (conditions.branchRestricted && this.context.branchId) {
      const contextBranchId = additionalContext?.branchId || this.context.branchId;
      if (contextBranchId !== this.context.branchId) {
        return false;
      }
    }

    // Own resources only
    if (conditions.ownOnly && additionalContext?.ownerId) {
      if (additionalContext.ownerId !== this.context.userId) {
        return false;
      }
    }

    // Basic access only (limited features)
    if (conditions.basicOnly && additionalContext?.requiresAdvanced) {
      return false;
    }

    // Stock updates only (for inventory)
    if (conditions.stockUpdatesOnly && additionalContext?.operationType) {
      const allowedOperations = ['stock_adjustment', 'stock_count', 'stock_receive'];
      if (!allowedOperations.includes(additionalContext.operationType)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get all permissions for current user
   */
  getAllPermissions(): Permission[] {
    return this.userPermissions;
  }

  /**
   * Get user roles
   */
  getUserRoles(): Role[] {
    return this.userRoles;
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(roleIds: string[]): boolean {
    return this.userRoles.some(role => roleIds.includes(role.id));
  }

  /**
   * Check if user is admin (tenant admin or super admin)
   */
  isAdmin(): boolean {
    return this.hasAnyRole([SystemRoles.SUPER_ADMIN, SystemRoles.TENANT_ADMIN]);
  }

  /**
   * Check if user can manage other users
   */
  canManageUsers(): boolean {
    return this.hasPermission(Actions.MANAGE, Resources.USERS);
  }

  /**
   * Get permission summary for debugging
   */
  getPermissionSummary(): {
    roles: string[];
    permissions: string[];
    context: any;
  } {
    return {
      roles: this.userRoles.map(r => r.name),
      permissions: this.userPermissions.map(p => `${p.action}:${p.resource}`),
      context: this.context
    };
  }
}

/**
 * Permission validation errors
 */
export class PermissionError extends Error {
  public readonly code: string;
  public readonly requiredPermission: string;

  constructor(message: string, code: string, requiredPermission: string) {
    super(message);
    this.name = 'PermissionError';
    this.code = code;
    this.requiredPermission = requiredPermission;
  }
}

/**
 * Utility function to create permission strings
 */
export function createPermissionString(action: string, resource: string): string {
  return `${action}:${resource}`;
}

/**
 * Utility function to parse permission strings
 */
export function parsePermissionString(permissionString: string): { action: string; resource: string } {
  const [action, resource] = permissionString.split(':');
  return { action, resource };
}
