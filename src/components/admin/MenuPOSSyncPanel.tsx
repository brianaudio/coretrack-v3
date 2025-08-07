'use client';

import React, { useState } from 'react';
import { useMenuPOSSync } from '../../lib/context/MenuPOSSyncContext';
import { AlertTriangle, CheckCircle, RefreshCw, Trash2, Shield, Eye } from 'lucide-react';

interface SyncStats {
  valid: boolean;
  issues: string[];
  stats: {
    menuItems: number;
    posItems: number;
    linkedItems: number;
    orphanedItems: number;
  };
}

export default function MenuPOSSyncPanel() {
  const { performFullSync, cleanupOrphanedItems, validateSync, emergencyReset } = useMenuPOSSync();
  const [isLoading, setIsLoading] = useState(false);
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null);
  const [lastAction, setLastAction] = useState<string>('');

  const handleValidateSync = async () => {
    setIsLoading(true);
    setLastAction('Validating sync...');
    
    try {
      const stats = await validateSync();
      setSyncStats(stats);
      setLastAction(`Validation completed - ${stats.valid ? 'Healthy' : `${stats.issues.length} issues found`}`);
    } catch (error) {
      console.error('Validation failed:', error);
      setLastAction('Validation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCleanupOrphaned = async () => {
    setIsLoading(true);
    setLastAction('Cleaning up orphaned items...');
    
    try {
      const cleanedCount = await cleanupOrphanedItems();
      setLastAction(`Cleaned up ${cleanedCount} orphaned POS items`);
      
      // Re-validate after cleanup
      const stats = await validateSync();
      setSyncStats(stats);
    } catch (error) {
      console.error('Cleanup failed:', error);
      setLastAction('Cleanup failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFullSync = async () => {
    if (!confirm('This will sync all menu items to POS. Continue?')) return;
    
    setIsLoading(true);
    setLastAction('Performing full sync...');
    
    try {
      await performFullSync();
      setLastAction('Full sync completed successfully');
      
      // Re-validate after sync
      const stats = await validateSync();
      setSyncStats(stats);
    } catch (error) {
      console.error('Full sync failed:', error);
      setLastAction('Full sync failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmergencyReset = async () => {
    if (!confirm('🚨 EMERGENCY RESET: This will delete ALL POS items and re-create them from menu items. This action cannot be undone. Are you sure?')) {
      return;
    }
    
    if (!confirm('⚠️ FINAL WARNING: This will cause temporary service disruption. Confirm emergency reset?')) {
      return;
    }
    
    setIsLoading(true);
    setLastAction('Performing emergency reset...');
    
    try {
      await emergencyReset();
      setLastAction('Emergency reset completed');
      
      // Re-validate after reset
      const stats = await validateSync();
      setSyncStats(stats);
    } catch (error) {
      console.error('Emergency reset failed:', error);
      setLastAction('Emergency reset failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
          <RefreshCw className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Menu ↔ POS Sync Management</h3>
          <p className="text-sm text-gray-600">Manage synchronization between Menu Builder and POS systems</p>
        </div>
      </div>

      {/* Status Display */}
      {syncStats && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            {syncStats.valid ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            )}
            <h4 className="font-medium">
              Sync Status: {syncStats.valid ? 'Healthy' : `${syncStats.issues.length} Issues`}
            </h4>
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{syncStats.stats.menuItems}</div>
              <div className="text-xs text-gray-600">Menu Items</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{syncStats.stats.posItems}</div>
              <div className="text-xs text-gray-600">POS Items</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{syncStats.stats.linkedItems}</div>
              <div className="text-xs text-gray-600">Linked</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{syncStats.stats.orphanedItems}</div>
              <div className="text-xs text-gray-600">Orphaned</div>
            </div>
          </div>

          {/* Issues List */}
          {!syncStats.valid && (
            <div>
              <h5 className="font-medium text-gray-900 mb-2">Issues Found:</h5>
              <ul className="space-y-1">
                {syncStats.issues.slice(0, 5).map((issue, index) => (
                  <li key={index} className="text-sm text-red-600">
                    • {issue}
                  </li>
                ))}
                {syncStats.issues.length > 5 && (
                  <li className="text-sm text-gray-500">
                    ... and {syncStats.issues.length - 5} more issues
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={handleValidateSync}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
        >
          <Eye className="w-4 h-4" />
          Validate Sync
        </button>

        <button
          onClick={handleCleanupOrphaned}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 disabled:opacity-50 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Cleanup Orphaned
        </button>

        <button
          onClick={handleFullSync}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Full Re-Sync
        </button>

        <button
          onClick={handleEmergencyReset}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
        >
          <Shield className="w-4 h-4" />
          Emergency Reset
        </button>
      </div>

      {/* Status Message */}
      {(lastAction || isLoading) && (
        <div className="mt-4 p-3 bg-gray-100 rounded-lg">
          <div className="flex items-center gap-2">
            {isLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
            <span className="text-sm text-gray-700">
              {isLoading ? lastAction : `Last action: ${lastAction}`}
            </span>
          </div>
        </div>
      )}

      {/* Auto-Sync Info */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h5 className="font-medium text-blue-900 mb-2">🚀 Real-time Sync Active</h5>
        <p className="text-sm text-blue-700">
          The system automatically syncs menu items to POS when you create, update, or delete them. 
          This panel is for manual operations and troubleshooting.
        </p>
      </div>
    </div>
  );
}
