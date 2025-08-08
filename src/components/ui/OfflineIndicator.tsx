'use client';

import React from 'react';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';

interface OfflineIndicatorProps {
  className?: string;
  showSyncButton?: boolean;
  compact?: boolean;
}

export default function OfflineIndicator({ 
  className = '', 
  showSyncButton = true,
  compact = false 
}: OfflineIndicatorProps) {
  const { 
    isOnline, 
    pendingSync, 
    totalQueued, 
    isSyncing, 
    forceSyncAll,
    clearSyncQueue 
  } = useOfflineStatus();

  const handleSyncNow = async () => {
    try {
      await forceSyncAll();
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${
          isOnline 
            ? 'bg-green-100 text-green-700' 
            : 'bg-orange-100 text-orange-700'
        }`}>
          <div className={`w-1.5 h-1.5 rounded-full ${
            isOnline ? 'bg-green-500' : 'bg-orange-500'
          }`}></div>
          {isOnline ? 'Online' : 'Offline'}
        </div>
        
        {pendingSync > 0 && (
          <div className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-xs font-medium">
            {pendingSync} pending
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Online/Offline Status */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
            isOnline 
              ? 'bg-green-100 text-green-800' 
              : 'bg-orange-100 text-orange-800'
          }`}>
            <div className={`w-3 h-3 rounded-full ${
              isOnline ? 'bg-green-500' : 'bg-orange-500'
            } ${isSyncing ? 'animate-pulse' : ''}`}></div>
            <span className="font-medium">
              {isOnline ? 'Online' : 'Offline'}
              {isSyncing && ' • Syncing...'}
            </span>
          </div>

          {/* Pending Sync Count */}
          {totalQueued > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-800 rounded-lg">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <span className="font-medium">
                {pendingSync} pending sync
              </span>
            </div>
          )}

          {/* Offline Mode Notice */}
          {!isOnline && (
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9z"/>
              </svg>
              <span className="text-sm">
                Operating offline • Data will sync when connection returns
              </span>
            </div>
          )}
        </div>

        {/* Sync Actions */}
        {showSyncButton && totalQueued > 0 && (
          <div className="flex items-center gap-2">
            {isOnline && (
              <button
                onClick={handleSyncNow}
                disabled={isSyncing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors text-sm font-medium"
              >
                {isSyncing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Syncing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
                    </svg>
                    Sync Now
                  </>
                )}
              </button>
            )}

            <button
              onClick={clearSyncQueue}
              className="px-3 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              title="Clear sync queue"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Detailed Status (when expanded) */}
      {totalQueued > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">{totalQueued}</div>
              <div className="text-xs text-gray-600">Total Queued</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-900">{pendingSync}</div>
              <div className="text-xs text-blue-700">Pending Sync</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-900">{totalQueued - pendingSync}</div>
              <div className="text-xs text-green-700">Completed</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
