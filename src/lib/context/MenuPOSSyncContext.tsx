'use client';

import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import menuPOSSyncService from '../firebase/menuPOSSync';

interface MenuPOSSyncContextType {
  performFullSync: () => Promise<void>;
  cleanupOrphanedItems: () => Promise<number>;
  validateSync: () => Promise<any>;
  emergencyReset: () => Promise<void>;
}

const MenuPOSSyncContext = createContext<MenuPOSSyncContextType | undefined>(undefined);

export function MenuPOSSyncProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const syncListenersRef = useRef<(() => void) | null>(null);

  // Set up real-time sync listeners when user logs in
  useEffect(() => {
    if (profile?.tenantId) {
      console.log(`🚀 [SYNC-PROVIDER] Setting up sync listeners for tenant: ${profile.tenantId}`);
      
      // Clean up existing listeners
      if (syncListenersRef.current) {
        syncListenersRef.current();
      }
      
      // Set up new listeners
      syncListenersRef.current = menuPOSSyncService.setupMenuPOSSyncListeners(profile.tenantId);
      
      // Perform initial validation and cleanup
      (async () => {
        try {
          console.log(`🔍 [SYNC-PROVIDER] Performing initial sync validation...`);
          const validation = await menuPOSSyncService.validateMenuPOSSync(profile.tenantId);
          
          if (!validation.valid) {
            console.log(`⚠️ [SYNC-PROVIDER] Sync issues detected, auto-fixing...`);
            console.log(`📋 [SYNC-PROVIDER] Issues:`, validation.issues);
            
            // Auto-fix by cleaning up orphaned items
            const cleanedCount = await menuPOSSyncService.cleanupOrphanedPOSItems(profile.tenantId);
            console.log(`✅ [SYNC-PROVIDER] Auto-fixed ${cleanedCount} sync issues`);
          } else {
            console.log(`✅ [SYNC-PROVIDER] Sync is healthy`);
          }
        } catch (error) {
          console.error(`❌ [SYNC-PROVIDER] Initial sync validation failed:`, error);
        }
      })();
    }

    // Cleanup function
    return () => {
      if (syncListenersRef.current) {
        syncListenersRef.current();
        syncListenersRef.current = null;
      }
    };
  }, [profile?.tenantId]);

  // Context value with manual operations
  const contextValue: MenuPOSSyncContextType = {
    performFullSync: async () => {
      if (!profile?.tenantId) throw new Error('No tenant ID available');
      return menuPOSSyncService.performFullMenuPOSSync(profile.tenantId);
    },
    
    cleanupOrphanedItems: async () => {
      if (!profile?.tenantId) throw new Error('No tenant ID available');
      return menuPOSSyncService.cleanupOrphanedPOSItems(profile.tenantId);
    },
    
    validateSync: async () => {
      if (!profile?.tenantId) throw new Error('No tenant ID available');
      return menuPOSSyncService.validateMenuPOSSync(profile.tenantId);
    },
    
    emergencyReset: async () => {
      if (!profile?.tenantId) throw new Error('No tenant ID available');
      return menuPOSSyncService.emergencyMenuPOSReset(profile.tenantId);
    }
  };

  return (
    <MenuPOSSyncContext.Provider value={contextValue}>
      {children}
    </MenuPOSSyncContext.Provider>
  );
}

export function useMenuPOSSync() {
  const context = useContext(MenuPOSSyncContext);
  if (!context) {
    throw new Error('useMenuPOSSync must be used within a MenuPOSSyncProvider');
  }
  return context;
}

export default MenuPOSSyncProvider;
