'use client';

import React, { useState } from 'react';
import { useRealtimeSync } from '@/lib/context/RealtimeSyncContext';
import { 
  Wifi, 
  WifiOff, 
  RotateCcw, 
  Check, 
  AlertCircle, 
  Clock,
  RefreshCw,
  Activity
} from 'lucide-react';

interface SyncStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export function SyncStatusIndicator({ className = '', showDetails = false }: SyncStatusIndicatorProps) {
  const {
    isOnline,
    isSyncing,
    lastSyncTime,
    state,
    retryFailedOperations,
    syncPendingChanges,
    forceSyncDocument
  } = useRealtimeSync();
  
  const [showDetailPanel, setShowDetailPanel] = useState(false);

  const pendingChangesCount = state.pendingChanges.size;
  const retryQueueCount = state.retryQueue.length;
  const conflictsCount = state.conflicts.filter(c => c.action === 'pending').length;
  const activeListenersCount = state.listeners.size;
  const optimisticUpdatesCount = state.optimisticUpdates.size;

  const getSyncStatus = () => {
    if (!isOnline) {
      return {
        status: 'offline',
        color: 'text-red-500',
        bgColor: 'bg-red-100',
        icon: WifiOff,
        message: 'Offline'
      };
    }
    
    if (isSyncing) {
      return {
        status: 'syncing',
        color: 'text-blue-500',
        bgColor: 'bg-blue-100',
        icon: RotateCcw,
        message: 'Syncing...'
      };
    }
    
    if (conflictsCount > 0) {
      return {
        status: 'conflicts',
        color: 'text-red-500',
        bgColor: 'bg-red-100',
        icon: AlertCircle,
        message: `${conflictsCount} conflict${conflictsCount !== 1 ? 's' : ''}`
      };
    }
    
    if (pendingChangesCount > 0 || retryQueueCount > 0) {
      return {
        status: 'pending',
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-100',
        icon: Clock,
        message: 'Changes pending'
      };
    }
    
    return {
      status: 'synced',
      color: 'text-green-500',
      bgColor: 'bg-green-100',
      icon: Check,
      message: 'All synced'
    };
  };

  const syncStatus = getSyncStatus();
  const StatusIcon = syncStatus.icon;

  const formatLastSyncTime = (date: Date | null) => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    
    if (diffSeconds < 60) return 'Just now';
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  const handleManualSync = async () => {
    try {
      await syncPendingChanges();
      await retryFailedOperations();
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Main Status Indicator */}
      <button
        onClick={() => setShowDetailPanel(!showDetailPanel)}
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${syncStatus.bgColor} hover:opacity-80`}
        title={`Sync Status: ${syncStatus.message}`}
      >
        <StatusIcon 
          className={`w-4 h-4 ${syncStatus.color} ${isSyncing ? 'animate-spin' : ''}`} 
        />
        {showDetails && (
          <span className={`text-sm font-medium ${syncStatus.color}`}>
            {syncStatus.message}
          </span>
        )}
        {(pendingChangesCount > 0 || retryQueueCount > 0 || conflictsCount > 0) && (
          <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
            {pendingChangesCount + retryQueueCount + conflictsCount}
          </span>
        )}
      </button>

      {/* Detailed Status Panel */}
      {showDetailPanel && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Sync Status</h3>
              <button
                onClick={handleManualSync}
                disabled={isSyncing || !isOnline}
                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Manual sync"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="flex items-center space-x-2 mt-2">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600">
                {isOnline ? 'Online' : 'Offline'}
              </span>
              {lastSyncTime && (
                <>
                  <span className="text-gray-400">•</span>
                  <span className="text-sm text-gray-600">
                    Last sync: {formatLastSyncTime(lastSyncTime)}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Metrics */}
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-blue-500" />
                <span className="text-gray-600">Active listeners:</span>
                <span className="font-medium">{activeListenersCount}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-yellow-500" />
                <span className="text-gray-600">Pending changes:</span>
                <span className="font-medium">{pendingChangesCount}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <RotateCcw className="w-4 h-4 text-orange-500" />
                <span className="text-gray-600">Retry queue:</span>
                <span className="font-medium">{retryQueueCount}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-gray-600">Conflicts:</span>
                <span className="font-medium">{conflictsCount}</span>
              </div>
              
              <div className="flex items-center space-x-2 col-span-2">
                <Check className="w-4 h-4 text-purple-500" />
                <span className="text-gray-600">Optimistic updates:</span>
                <span className="font-medium">{optimisticUpdatesCount}</span>
              </div>
            </div>

            {/* Status Messages */}
            {!isOnline && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <WifiOff className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-medium text-red-800">Offline Mode</span>
                </div>
                <p className="text-xs text-red-600 mt-1">
                  Changes will sync when connection is restored
                </p>
              </div>
            )}

            {conflictsCount > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-medium text-red-800">Data Conflicts</span>
                </div>
                <p className="text-xs text-red-600 mt-1">
                  {conflictsCount} conflict{conflictsCount !== 1 ? 's' : ''} require{conflictsCount === 1 ? 's' : ''} resolution
                </p>
              </div>
            )}

            {pendingChangesCount > 0 && isOnline && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm font-medium text-yellow-800">Pending Sync</span>
                </div>
                <p className="text-xs text-yellow-600 mt-1">
                  {pendingChangesCount} change{pendingChangesCount !== 1 ? 's' : ''} waiting to sync
                </p>
              </div>
            )}

            {retryQueueCount > 0 && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <RotateCcw className="w-4 h-4 text-orange-500" />
                  <span className="text-sm font-medium text-orange-800">Retry Queue</span>
                </div>
                <p className="text-xs text-orange-600 mt-1">
                  {retryQueueCount} operation{retryQueueCount !== 1 ? 's' : ''} being retried
                </p>
              </div>
            )}

            {syncStatus.status === 'synced' && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-green-800">All Synced</span>
                </div>
                <p className="text-xs text-green-600 mt-1">
                  All data is up to date and synchronized
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          {(pendingChangesCount > 0 || retryQueueCount > 0) && isOnline && (
            <div className="border-t border-gray-200 p-4">
              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function SyncStatusBar() {
  return (
    <div className="fixed bottom-4 right-4 z-40">
      <SyncStatusIndicator showDetails={true} />
    </div>
  );
}
