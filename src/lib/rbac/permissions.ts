// Role-Based Access Control (RBAC) Configuration
// Defines which modules each role can access

export type UserRole = 'staff' | 'manager' | 'owner';

export type ModulePermission = 
  | 'pos'
  | 'inventory' 
  | 'purchase-orders'
  | 'menu-builder'
  | 'dashboard'
  | 'expenses'
  | 'team-management'
  | 'location-management'
  | 'settings'
  | 'discrepancy-monitoring'
  | 'business-reports';

// Define what modules each role can access
export const ROLE_PERMISSIONS: Record<UserRole, ModulePermission[]> = {
  staff: ['pos', 'inventory', 'purchase-orders'],
  manager: [
    'pos', 
    'inventory', 
    'purchase-orders', 
    'menu-builder',
    'dashboard',
    'expenses',
    'team-management',
    'location-management',
    'business-reports',
    'settings',
    'discrepancy-monitoring'
  ],
  owner: [
    'pos', 
    'inventory', 
    'purchase-orders', 
    'menu-builder',
    'dashboard',
    'expenses',
    'team-management',
    'location-management',
    'business-reports',
    'settings',
    'discrepancy-monitoring'
  ]
}

// Helper function to check if a role has permission for a module
export const hasPermission = (role: UserRole | null, module: ModulePermission): boolean => {
  if (!role) return false;
  return ROLE_PERMISSIONS[role].includes(module);
};

// Helper function to get allowed modules for a role
export const getAllowedModules = (role: UserRole | null): ModulePermission[] => {
  if (!role) return [];
  return ROLE_PERMISSIONS[role];
};
