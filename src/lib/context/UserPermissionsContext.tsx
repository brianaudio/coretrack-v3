'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { useUser } from '../rbac/UserContext'
import { hasPermission, ModulePermission } from '../rbac/permissions'

interface UserPermissionsContextType {
  loading: boolean;
  hasPermission: (permission: ModulePermission) => boolean;
  canManageUsers: () => boolean;
  canManageSettings: () => boolean;
  isOwner: () => boolean;
  isManager: () => boolean;
  isStaff: () => boolean;
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
  const { currentRole } = useUser();

  const checkPermission = (permission: ModulePermission): boolean => {
    return hasPermission(currentRole, permission);
  };

  const checkCanManageUsers = (): boolean => {
    return currentRole === 'owner' || currentRole === 'manager';
  };

  const checkCanManageSettings = (): boolean => {
    return currentRole === 'owner' || currentRole === 'manager';
  };

  const isOwner = (): boolean => currentRole === 'owner';
  const isManager = (): boolean => currentRole === 'manager';
  const isStaff = (): boolean => currentRole === 'staff';

  const value: UserPermissionsContextType = {
    loading: false,
    hasPermission: checkPermission,
    canManageUsers: checkCanManageUsers,
    canManageSettings: checkCanManageSettings,
    isOwner,
    isManager,
    isStaff,
  };

  return (
    <UserPermissionsContext.Provider value={value}>
      {children}
    </UserPermissionsContext.Provider>
  );
};
