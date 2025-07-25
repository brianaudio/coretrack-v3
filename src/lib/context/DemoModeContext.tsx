'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { UserRole, TeamMember } from '../types/user';

interface DemoModeContextType {
  isDemoMode: boolean;
  setDemoMode: (enabled: boolean) => void;
  demoRole: UserRole;
  setDemoRole: (role: UserRole) => void;
  demoMember: TeamMember | null;
}

const DemoModeContext = createContext<DemoModeContextType | undefined>(undefined);

export const useDemoMode = () => {
  const context = useContext(DemoModeContext);
  if (context === undefined) {
    throw new Error('useDemoMode must be used within a DemoModeProvider');
  }
  return context;
};

interface DemoModeProviderProps {
  children: ReactNode;
}

export const DemoModeProvider: React.FC<DemoModeProviderProps> = ({ children }) => {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoRole, setDemoRole] = useState<UserRole>('owner');

  // Create a demo member based on selected role
  const demoMember: TeamMember = {
    uid: 'demo-user',
    email: `demo-${demoRole}@coretrack.com`,
    displayName: `Demo ${demoRole.charAt(0).toUpperCase() + demoRole.slice(1)}`,
    role: demoRole,
    status: 'active',
    locationIds: ['demo-location-1'],
    permissions: demoRole === 'owner' ? ['*'] : 
                 demoRole === 'manager' ? [
                   'inventory.read', 'inventory.create', 'inventory.update',
                   'pos.read', 'pos.create',
                   'analytics.read',
                   'expenses.read', 'expenses.create', 'expenses.update'
                 ] :
                 demoRole === 'staff' ? [
                   'inventory.read',
                   'pos.read', 'pos.create',
                   'expenses.read'
                 ] : [
                   'inventory.read',
                   'analytics.read'
                 ],
    joinedAt: new Date() as any,
    updatedAt: new Date() as any,
  };

  const setDemoMode = (enabled: boolean) => {
    setIsDemoMode(enabled);
    if (enabled) {
      console.log('🧪 Demo Mode Enabled - Role-based permissions are now active');
    } else {
      console.log('🧪 Demo Mode Disabled - Back to development mode');
    }
  };

  const value = {
    isDemoMode,
    setDemoMode,
    demoRole,
    setDemoRole,
    demoMember: isDemoMode ? demoMember : null,
  };

  return (
    <DemoModeContext.Provider value={value}>
      {children}
    </DemoModeContext.Provider>
  );
};
