'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { TeamMember, UserRole } from '../types/user';
import { getTeamMember, updateLastLogin, hasPermission, canManageUsers, canManageSettings } from '../firebase/userManagement';

// Check if demo mode is available
let useDemoMode: any = null;
try {
  const demoModule = require('./DemoModeContext');
  useDemoMode = demoModule.useDemoMode;
} catch (e) {
  // Demo mode not available
}

interface UserPermissionsContextType {
  member: TeamMember | null;
  loading: boolean;
  hasPermission: (permission: string, locationId?: string) => boolean;
  canManageUsers: () => boolean;
  canManageSettings: () => boolean;
  canAccessLocation: (locationId: string) => boolean;
  isOwner: () => boolean;
  isManager: () => boolean;
  isStaff: () => boolean;
  refresh: () => Promise<void>;
}

const UserPermissionsContext = createContext<UserPermissionsContextType | undefined>(undefined);

export const useUserPermissions = () => {
  const context = useContext(UserPermissionsContext);
  if (context === undefined) {
    throw new Error('useUserPermissions must be used within a UserPermissionsProvider');
  }
  return context;
};

interface UserPermissionsProviderProps {
  children: React.ReactNode;
}

export const UserPermissionsProvider: React.FC<UserPermissionsProviderProps> = ({ children }) => {
  const { user, profile, tenant } = useAuth();
  const [member, setMember] = useState<TeamMember | null>(null);
  const [loading, setLoading] = useState(true);

  // Try to use demo mode if available
  const demoMode = useDemoMode ? useDemoMode() : { isDemoMode: false, demoMember: null };

  const loadMemberData = async () => {
    if (!user || !profile?.tenantId) {
      setMember(null);
      setLoading(false);
      return;
    }

    try {
      const memberData = await getTeamMember(profile.tenantId, user.uid);
      setMember(memberData);
      
      // Update last login
      if (memberData) {
        await updateLastLogin(profile.tenantId, user.uid);
      }
    } catch (error) {
      console.error('Error loading member data:', error);
      setMember(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMemberData();
  }, [user, profile?.tenantId]);

  const checkPermission = (permission: string, locationId?: string): boolean => {
    if (!member) return false;
    
    // Development mode override
    if (process.env.NODE_ENV === 'development') return true;
    
    return hasPermission(member, permission, locationId);
  };

  const checkCanManageUsers = (): boolean => {
    if (!member) return false;
    
    // Development mode override
    if (process.env.NODE_ENV === 'development') return true;
    
    return canManageUsers(member);
  };

  const checkCanManageSettings = (): boolean => {
    if (!member) return false;
    
    // Development mode override
    if (process.env.NODE_ENV === 'development') return true;
    
    return canManageSettings(member);
  };

  const checkCanAccessLocation = (locationId: string): boolean => {
    if (!member) return false;
    
    // Development mode override
    if (process.env.NODE_ENV === 'development') return true;
    
    // Owner can access all locations
    if (member.role === 'owner') return true;
    
    // Check if user has access to this location
    return member.locationIds.includes(locationId);
  };

  const isOwner = (): boolean => member?.role === 'owner';
  const isManager = (): boolean => member?.role === 'manager';
  const isStaff = (): boolean => member?.role === 'staff';

  const refresh = async () => {
    setLoading(true);
    await loadMemberData();
  };

  const value = {
    member,
    loading,
    hasPermission: checkPermission,
    canManageUsers: checkCanManageUsers,
    canManageSettings: checkCanManageSettings,
    canAccessLocation: checkCanAccessLocation,
    isOwner,
    isManager,
    isStaff,
    refresh,
  };

  return (
    <UserPermissionsContext.Provider value={value}>
      {children}
    </UserPermissionsContext.Provider>
  );
};
