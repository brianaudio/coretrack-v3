/**
 * Branch Switcher Component
 * UI for switching between branches with loading states and validation
 */

import React, { useState } from 'react';
import { useBranch } from '@/lib/context/BranchContext';
import { useAuth } from '@/lib/context/AuthContext';
import { AlertCircle, Building2, CheckCircle, Loader2, MapPin, Users, Trash2 } from 'lucide-react';
import { deleteLocation } from '@/lib/firebase/locationManagement';
import { deleteBranchByLocationId } from '@/lib/firebase/branches';

interface BranchSwitcherProps {
  showDetails?: boolean;
  className?: string;
}

export function BranchSwitcher({ showDetails = false, className = '' }: BranchSwitcherProps) {
  const {
    branches,
    selectedBranch,
    switchBranch,
    switchingInProgress,
    error,
    canAccessBranch,
    getCacheStats,
    refreshBranches
  } = useBranch();

  const { profile } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const handleBranchSwitch = async (branchId: string) => {
    if (switchingInProgress || !canAccessBranch(branchId)) {
      return;
    }

    await switchBranch(branchId);
    setShowDropdown(false);
    
    // Auto-refresh the app after branch switch (perfect for PWA mode)
    console.log('🔄 Refreshing app after branch switch for clean state...')
    setTimeout(() => {
      window.location.reload()
    }, 500) // Small delay to ensure the branch switch is saved
  };

  const handleDeleteBranch = async (branch: any, event: React.MouseEvent) => {
    event.stopPropagation();
    
    // Prevent deletion of main branch
    if (branch.isMain) {
      alert('Cannot delete the main branch.');
      return;
    }
    
    if (!confirm(`Delete ${branch.name}? This action cannot be undone and will remove all data associated with this branch.`)) {
      return;
    }

    try {
      // Delete the location (this will also handle the branch deletion)
      await deleteLocation(branch.id);
      
      // Delete the corresponding branch from branches collection
      if (profile?.tenantId) {
        await deleteBranchByLocationId(profile.tenantId, branch.id);
      }
      
      // Refresh branches to update the UI
      refreshBranches();
      
      // Close dropdown if currently selected branch was deleted
      if (selectedBranch?.id === branch.id) {
        setShowDropdown(false);
      }
      
      console.log(`✅ Branch "${branch.name}" deleted successfully`);
    } catch (error) {
      console.error('Error deleting branch:', error);
      alert('Error deleting branch. Please try again.');
    }
  };

  const cacheStats = getCacheStats();

  if (!selectedBranch) {
    return (
      <div className="flex items-center text-gray-500">
        <Building2 className="h-4 w-4 mr-2" />
        <span>No branch selected</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Error Display */}
      {error && (
        <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-md flex items-center text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 mr-2" />
          {error}
        </div>
      )}

      {/* Branch Switcher Button */}
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          disabled={switchingInProgress}
          className={`
            flex items-center w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-md shadow-sm
            hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            ${switchingInProgress ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <div className="flex items-center flex-1 min-w-0">
            {switchingInProgress ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin text-blue-600" />
            ) : (
              <Building2 className="h-4 w-4 mr-2 text-gray-600" />
            )}
            
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 truncate">
                {selectedBranch.name}
              </div>
              {showDetails && (
                <div className="text-xs text-gray-500 truncate">
                  {selectedBranch.address}
                </div>
              )}
            </div>
            
            <div className="flex items-center ml-2">
              {selectedBranch.status === 'active' ? (
                <CheckCircle className="h-3 w-3 text-green-500" />
              ) : (
                <AlertCircle className="h-3 w-3 text-yellow-500" />
              )}
              
              <svg
                className={`ml-2 h-4 w-4 transition-transform ${
                  showDropdown ? 'rotate-180' : ''
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </button>

        {/* Dropdown Menu */}
        {showDropdown && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
            <div className="py-1 max-h-60 overflow-auto">
              {branches.map((branch) => {
                const isSelected = branch.id === selectedBranch.id;
                const canAccess = canAccessBranch(branch.id);
                
                return (
                  <div
                    key={branch.id}
                    className={`group relative flex items-center hover:bg-gray-50 ${
                      isSelected ? 'bg-blue-50' : ''
                    }`}
                  >
                    <button
                      onClick={() => handleBranchSwitch(branch.id)}
                      disabled={!canAccess || switchingInProgress}
                      className={`
                        flex-1 px-4 py-2 text-left flex items-center
                        ${isSelected ? 'text-blue-700' : 'text-gray-900'}
                        ${!canAccess ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                        ${switchingInProgress ? 'opacity-50' : ''}
                      `}
                    >
                      <div className="flex items-center flex-1 min-w-0">
                        <Building2 className="h-4 w-4 mr-3 text-gray-400" />
                        
                        <div className="flex-1 min-w-0">
                          <div className={`font-medium truncate ${
                            isSelected ? 'text-blue-700' : 'text-gray-900'
                          }`}>
                            {branch.name}
                            {branch.isMain && (
                              <span className="ml-2 text-xs text-purple-600">👑</span>
                            )}
                          </div>
                          
                          <div className="flex items-center text-xs text-gray-500 mt-1">
                            <MapPin className="h-3 w-3 mr-1" />
                            <span className="truncate">{branch.address}</span>
                          </div>
                          
                          {showDetails && branch.stats && (
                            <div className="flex items-center space-x-3 text-xs text-gray-500 mt-1">
                              <span>${branch.stats.totalRevenue.toLocaleString()}</span>
                              <span>{branch.stats.totalOrders} orders</span>
                              <span>{branch.stats.lowStockItems} low stock</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center ml-2">
                          {branch.status === 'active' ? (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          ) : (
                            <AlertCircle className="h-3 w-3 text-yellow-500" />
                          )}
                          
                          {isSelected && (
                            <CheckCircle className="h-4 w-4 ml-2 text-blue-600" />
                          )}
                        </div>
                      </div>
                    </button>
                    
                    {/* Delete button - only for non-main branches */}
                    {!branch.isMain && (
                      <button
                        onClick={(e) => handleDeleteBranch(branch, e)}
                        className="opacity-0 group-hover:opacity-100 p-2 m-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                        title={`Delete ${branch.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Cache Stats (Development) */}
            {process.env.NODE_ENV === 'development' && (
              <div className="border-t border-gray-200 p-2">
                <button
                  onClick={() => setShowStats(!showStats)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Cache Stats {showStats ? '▼' : '▶'}
                </button>
                
                {showStats && (
                  <div className="mt-1 text-xs text-gray-500 space-y-1">
                    <div>Branches: {cacheStats.branches}</div>
                    <div>Collections: {cacheStats.collections}</div>
                    <div>Subscriptions: {cacheStats.subscriptions}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Click outside to close dropdown */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
}

/**
 * Compact Branch Indicator (for headers/status bars)
 */
export function BranchIndicator({ className = '' }: { className?: string }) {
  const { selectedBranch, switchingInProgress } = useBranch();

  if (!selectedBranch) {
    return null;
  }

  return (
    <div className={`flex items-center text-sm text-gray-600 ${className}`}>
      {switchingInProgress ? (
        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
      ) : (
        <Building2 className="h-3 w-3 mr-1" />
      )}
      <span className="truncate max-w-32">{selectedBranch.name}</span>
      {selectedBranch.status === 'active' ? (
        <CheckCircle className="h-3 w-3 ml-1 text-green-500" />
      ) : (
        <AlertCircle className="h-3 w-3 ml-1 text-yellow-500" />
      )}
    </div>
  );
}

/**
 * Branch Stats Card
 */
export function BranchStatsCard({ className = '' }: { className?: string }) {
  const { selectedBranch, getSwitchHistory } = useBranch();
  const switchHistory = getSwitchHistory();

  if (!selectedBranch) {
    return null;
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-900 flex items-center">
          <Building2 className="h-4 w-4 mr-2" />
          {selectedBranch.name}
        </h3>
        <span className={`px-2 py-1 rounded-full text-xs ${
          selectedBranch.status === 'active' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-yellow-100 text-yellow-800'
        }`}>
          {selectedBranch.status}
        </span>
      </div>

      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex items-center">
          <MapPin className="h-3 w-3 mr-2" />
          <span className="truncate">{selectedBranch.address}</span>
        </div>
        
        {selectedBranch.phone && (
          <div className="flex items-center">
            <Users className="h-3 w-3 mr-2" />
            <span>{selectedBranch.phone}</span>
          </div>
        )}
      </div>

      {selectedBranch.stats && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              ${selectedBranch.stats.totalRevenue.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">Revenue</div>
          </div>
          
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              {selectedBranch.stats.totalOrders}
            </div>
            <div className="text-xs text-gray-500">Orders</div>
          </div>
        </div>
      )}

      {process.env.NODE_ENV === 'development' && switchHistory.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            Last switch: {switchHistory[switchHistory.length - 1]?.timestamp.toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  );
}
