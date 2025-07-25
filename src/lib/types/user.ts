import { Timestamp } from 'firebase/firestore';

export type UserRole = 'owner' | 'manager' | 'staff' | 'viewer';
export type UserStatus = 'active' | 'inactive' | 'pending';

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: 'inventory' | 'pos' | 'analytics' | 'expenses' | 'settings' | 'users';
}

export interface RolePermissions {
  role: UserRole;
  permissions: string[]; // Permission IDs
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canManageUsers: boolean;
  canManageSettings: boolean;
  canViewReports: boolean;
  canExportData: boolean;
}

export interface UserInvitation {
  id: string;
  tenantId: string;
  email: string;
  role: UserRole;
  locationIds?: string[]; // Multi-location access
  invitedBy: string; // User ID
  invitedByName: string;
  status: 'pending' | 'accepted' | 'expired';
  expiresAt: Timestamp;
  createdAt: Timestamp;
}

export interface TeamMember {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  locationIds: string[]; // Which locations they can access
  permissions: string[]; // Custom permissions
  lastLogin?: Timestamp;
  invitedBy?: string;
  joinedAt: Timestamp;
  updatedAt: Timestamp;
}

// Default role permissions
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  owner: {
    role: 'owner',
    permissions: ['*'], // All permissions
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
    canManageUsers: true,
    canManageSettings: true,
    canViewReports: true,
    canExportData: true,
  },
  manager: {
    role: 'manager',
    permissions: [
      'inventory.read',
      'inventory.create',
      'inventory.update',
      'pos.read',
      'pos.create',
      'analytics.read',
      'expenses.read',
      'expenses.create',
      'expenses.update'
    ],
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: false,
    canManageUsers: false,
    canManageSettings: false,
    canViewReports: true,
    canExportData: false,
  },
  staff: {
    role: 'staff',
    permissions: [
      'inventory.read',
      'pos.read',
      'pos.create',
      'expenses.read'
    ],
    canCreate: false,
    canRead: true,
    canUpdate: false,
    canDelete: false,
    canManageUsers: false,
    canManageSettings: false,
    canViewReports: false,
    canExportData: false,
  },
  viewer: {
    role: 'viewer',
    permissions: [
      'inventory.read',
      'analytics.read'
    ],
    canCreate: false,
    canRead: true,
    canUpdate: false,
    canDelete: false,
    canManageUsers: false,
    canManageSettings: false,
    canViewReports: true,
    canExportData: false,
  },
};

// Available permissions
export const AVAILABLE_PERMISSIONS: Permission[] = [
  // Inventory
  { id: 'inventory.read', name: 'View Inventory', description: 'View inventory items and stock levels', category: 'inventory' },
  { id: 'inventory.create', name: 'Add Inventory', description: 'Add new inventory items', category: 'inventory' },
  { id: 'inventory.update', name: 'Update Inventory', description: 'Edit inventory items and adjust stock', category: 'inventory' },
  { id: 'inventory.delete', name: 'Delete Inventory', description: 'Remove inventory items', category: 'inventory' },
  
  // POS
  { id: 'pos.read', name: 'View POS', description: 'Access point of sale system', category: 'pos' },
  { id: 'pos.create', name: 'Process Orders', description: 'Create and process orders', category: 'pos' },
  { id: 'pos.update', name: 'Modify Orders', description: 'Edit existing orders', category: 'pos' },
  { id: 'pos.refund', name: 'Process Refunds', description: 'Handle refunds and returns', category: 'pos' },
  
  // Analytics
  { id: 'analytics.read', name: 'View Analytics', description: 'Access analytics and reports', category: 'analytics' },
  { id: 'analytics.export', name: 'Export Reports', description: 'Export analytics data', category: 'analytics' },
  
  // Expenses
  { id: 'expenses.read', name: 'View Expenses', description: 'View expense records', category: 'expenses' },
  { id: 'expenses.create', name: 'Add Expenses', description: 'Record new expenses', category: 'expenses' },
  { id: 'expenses.update', name: 'Edit Expenses', description: 'Modify expense records', category: 'expenses' },
  { id: 'expenses.delete', name: 'Delete Expenses', description: 'Remove expense records', category: 'expenses' },
  
  // Users
  { id: 'users.read', name: 'View Users', description: 'View team members', category: 'users' },
  { id: 'users.invite', name: 'Invite Users', description: 'Send team invitations', category: 'users' },
  { id: 'users.manage', name: 'Manage Users', description: 'Edit user roles and permissions', category: 'users' },
  { id: 'users.remove', name: 'Remove Users', description: 'Remove team members', category: 'users' },
  
  // Settings
  { id: 'settings.read', name: 'View Settings', description: 'Access system settings', category: 'settings' },
  { id: 'settings.update', name: 'Update Settings', description: 'Modify system configuration', category: 'settings' },
];
