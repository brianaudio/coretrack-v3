/**
 * Branch Access Security Module
 * Validates user access to specific branches/locations
 */

import { getUserProfile, UserProfile } from '../firebase/auth';

export interface BranchAccessResult {
  hasAccess: boolean;
  reason?: string;
  accessLevel?: 'view' | 'edit' | 'manage';
}

/**
 * Validate if a user has access to a specific branch/location
 */
export const validateBranchAccess = async (
  userId: string,
  tenantId: string,
  locationId: string
): Promise<BranchAccessResult> => {
  try {
    const userProfile = await getUserProfile(userId);
    
    if (!userProfile) {
      return { 
        hasAccess: false, 
        reason: 'User profile not found' 
      };
    }
    
    if (userProfile.tenantId !== tenantId) {
      return { 
        hasAccess: false, 
        reason: 'User not member of tenant' 
      };
    }
    
    // Owners and managers can access all branches
    if (['owner', 'manager'].includes(userProfile.role)) {
      return { 
        hasAccess: true, 
        accessLevel: 'manage',
        reason: 'Full access based on role' 
      };
    }
    
    // Staff can only access assigned branches
    if (userProfile.assignedBranches?.includes(locationId)) {
      const permissions = userProfile.branchPermissions?.[locationId];
      const accessLevel = permissions?.canManage ? 'manage' : 
                         permissions?.canEdit ? 'edit' : 'view';
      
      return { 
        hasAccess: true, 
        accessLevel,
        reason: 'Access granted via branch assignment' 
      };
    }
    
    return { 
      hasAccess: false, 
      reason: 'No access permission for this branch' 
    };
    
  } catch (error) {
    console.error('Error validating branch access:', error);
    return { 
      hasAccess: false, 
      reason: 'Access validation failed' 
    };
  }
};

/**
 * Get all branches a user has access to
 */
export const getUserAccessibleBranches = async (
  userId: string,
  tenantId: string
): Promise<string[]> => {
  try {
    const userProfile = await getUserProfile(userId);
    
    if (!userProfile || userProfile.tenantId !== tenantId) {
      return [];
    }
    
    // Owners and managers can access all branches (return empty to indicate "all")
    if (['owner', 'manager'].includes(userProfile.role)) {
      return []; // Empty array means "all branches"
    }
    
    // Staff get their assigned branches
    return userProfile.assignedBranches || [];
    
  } catch (error) {
    console.error('Error getting user accessible branches:', error);
    return [];
  }
};

/**
 * Validate branch access and throw error if denied
 */
export const requireBranchAccess = async (
  userId: string,
  tenantId: string,
  locationId: string,
  requiredLevel: 'view' | 'edit' | 'manage' = 'view'
): Promise<void> => {
  const access = await validateBranchAccess(userId, tenantId, locationId);
  
  if (!access.hasAccess) {
    throw new Error(`Access denied: ${access.reason}`);
  }
  
  // Check if user has required access level
  const levelHierarchy = { view: 0, edit: 1, manage: 2 };
  const userLevel = levelHierarchy[access.accessLevel || 'view'];
  const requiredLevelNum = levelHierarchy[requiredLevel];
  
  if (userLevel < requiredLevelNum) {
    throw new Error(`Insufficient permissions: ${requiredLevel} access required`);
  }
};

/**
 * Update user branch assignments (admin only)
 */
export const updateUserBranchAccess = async (
  adminUserId: string,
  targetUserId: string,
  tenantId: string,
  branchAssignments: {
    assignedBranches: string[];
    primaryBranch?: string;
    branchPermissions?: UserProfile['branchPermissions'];
  }
): Promise<void> => {
  // Validate admin has permission to modify branch access
  const adminAccess = await validateBranchAccess(adminUserId, tenantId, '');
  if (!adminAccess.hasAccess || adminAccess.accessLevel !== 'manage') {
    throw new Error('Only owners and managers can modify branch access');
  }
  
  const targetProfile = await getUserProfile(targetUserId);
  if (!targetProfile || targetProfile.tenantId !== tenantId) {
    throw new Error('Target user not found or not in same tenant');
  }
  
  // Don't allow modifying owner permissions
  if (targetProfile.role === 'owner') {
    throw new Error('Cannot modify branch access for owners');
  }
  
  // Update the user profile with new branch assignments
  // This would be implemented as a Firebase function or admin SDK call
  console.log('Updating branch access for user:', targetUserId, branchAssignments);
  // TODO: Implement actual update logic
};
