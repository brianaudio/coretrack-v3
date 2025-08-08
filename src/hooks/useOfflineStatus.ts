'use client';

import { useState, useEffect } from 'react';
import { backgroundSyncService, type BackgroundSyncItem } from '@/lib/services/BackgroundSyncService';

export interface OfflineStatus {
  isOnline: boolean;
  pendingSync: number;
  totalQueued: number;
  isSyncing: boolean;
  lastSyncAttempt: Date | null;
}

/**
 * React hook for managing offline status and background sync
 */
export function useOfflineStatus() {
  const [status, setStatus] = useState<OfflineStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    pendingSync: 0,
    totalQueued: 0,
    isSyncing: false,
    lastSyncAttempt: null
  });

  useEffect(() => {
    // Update status initially
    updateStatus();

    // Listen for online/offline events
    const handleOnline = () => updateStatus();
    const handleOffline = () => updateStatus();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for sync events
    const unsubscribeSync = backgroundSyncService.addSyncListener((item: BackgroundSyncItem) => {
      updateStatus();
      console.log(`🔄 Sync completed for: ${item.type}`);
    });

    // Periodic status update
    const interval = setInterval(updateStatus, 5000); // Every 5 seconds

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribeSync();
      clearInterval(interval);
    };
  }, []);

  const updateStatus = () => {
    const queueStatus = backgroundSyncService.getQueueStatus();
    
    setStatus({
      isOnline: queueStatus.isOnline,
      pendingSync: queueStatus.pendingItems,
      totalQueued: queueStatus.totalItems,
      isSyncing: queueStatus.isSyncing,
      lastSyncAttempt: queueStatus.totalItems > 0 ? new Date() : null
    });
  };

  /**
   * Add item to background sync queue
   */
  const addToSyncQueue = (
    type: 'pos-order' | 'inventory-update' | 'audit-report' | 'expense-record',
    data: any,
    maxRetries: number = 5
  ) => {
    backgroundSyncService.addToQueue({
      type,
      data,
      maxRetries
    });
    updateStatus();
  };

  /**
   * Force sync all pending items
   */
  const forceSyncAll = async () => {
    try {
      await backgroundSyncService.forceSyncAll();
      updateStatus();
    } catch (error) {
      console.error('Failed to force sync:', error);
      throw error;
    }
  };

  /**
   * Clear all pending sync items
   */
  const clearSyncQueue = () => {
    backgroundSyncService.clearQueue();
    updateStatus();
  };

  return {
    ...status,
    addToSyncQueue,
    forceSyncAll,
    clearSyncQueue,
    refresh: updateStatus
  };
}

/**
 * Network status hook with simple online/offline detection
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
