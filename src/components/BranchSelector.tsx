'use client'

import { useState, useRef, useEffect } from 'react'
import { useBranch } from '../lib/context/BranchContext'
import { useAuth } from '../lib/context/AuthContext'
import { deleteLocation, createLocation } from '../lib/firebase/locationManagement'
import { deleteBranchByLocationId } from '../lib/firebase/branches'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'

export default function BranchSelector() {
  const { branches, selectedBranch, switchBranch, loading, refreshBranches, setSelectedBranch } = useBranch()
  const { profile } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newBranchData, setNewBranchData] = useState({
    name: '',
    address: '',
    city: '',
    phone: ''
  })
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [localSelectedBranch, setLocalSelectedBranch] = useState(selectedBranch)

  // Handle branch deletion
  const handleDeleteBranch = async (branch: any) => {
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
        // The BranchContext will automatically select another branch
        setIsOpen(false);
      }
      
    } catch (error) {
      console.error('Error deleting branch:', error);
      alert('Error deleting branch. Please try again.');
    }
  };

  // Handle adding new branch
  const handleAddBranch = async () => {
    if (!newBranchData.name.trim()) {
      alert('Branch name is required');
      return;
    }

    if (!profile?.tenantId) {
      alert('No tenant ID found');
      return;
    }

    try {
      // Create location data
      const locationData = {
        name: newBranchData.name.trim(),
        type: 'branch' as const,
        tenantId: profile.tenantId,
        address: {
          street: newBranchData.address.trim() || '',
          city: newBranchData.city.trim() || '',
          state: '',
          zipCode: '',
          country: ''
        },
        contact: {
          phone: newBranchData.phone.trim() || undefined,
          email: undefined,
          manager: undefined
        },
        status: 'active' as const,
        settings: {
          timezone: 'Asia/Manila',
          currency: 'PHP',
          businessHours: {
            monday: { open: '08:00', close: '20:00' },
            tuesday: { open: '08:00', close: '20:00' },
            wednesday: { open: '08:00', close: '20:00' },
            thursday: { open: '08:00', close: '20:00' },
            friday: { open: '08:00', close: '20:00' },
            saturday: { open: '08:00', close: '20:00' },
            sunday: { open: '08:00', close: '20:00' }
          },
          features: {
            pos: true,
            inventory: true,
            analytics: true,
            reports: true,
            expenses: true
          }
        }
      };

      // Create the location
      const newLocationId = await createLocation(locationData);
      
      // Reset form and close modal
      setNewBranchData({
        name: '',
        address: '',
        city: '',
        phone: ''
      });
      setShowAddModal(false);
      
      // Refresh branches to show the new one
      await refreshBranches();
      
      alert(`Branch "${newBranchData.name}" created successfully!`);
      
    } catch (error) {
      console.error('Error creating branch:', error);
      alert('Error creating branch. Please try again.');
    }
  };

  const handleBranchSelect = async (branch: typeof branches[0]) => {
    // Skip if selecting the same branch
    if (selectedBranch?.id === branch.id) {
      setIsOpen(false)
      return
    }
    
    // Close dropdown first
    setIsOpen(false)
    
    try {
      // Update local state immediately for instant UI feedback
      setLocalSelectedBranch(branch)
      
      // Update Firebase user profile FIRST to prevent auto-selection override
      if (profile?.uid) {
        try {
          const userDocRef = doc(db, 'users', profile.uid)
          await updateDoc(userDocRef, {
            selectedBranchId: branch.id,
            lastSwitched: new Date()
          })
        } catch (firebaseError) {
          console.error('❌ Firebase update failed:', firebaseError)
          throw firebaseError // Stop if Firebase update fails
        }
      }
      
      // Give Firebase a moment to propagate before updating context
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Now use the context method (which should read the updated Firebase value)
      if (setSelectedBranch) {
        setSelectedBranch(branch)
      } else if (switchBranch) {
        await switchBranch(branch.id)
      }
      
      // Auto-refresh the app after branch switch (perfect for PWA mode)
      setIsRefreshing(true) // Show refreshing state
      setTimeout(() => {
        window.location.reload()
      }, 500) // Small delay to ensure the branch switch is saved
      
      // Verify the switch after a longer delay (after auto-selection timeout)
      setTimeout(() => {
        if (selectedBranch?.id !== branch.id) {
          // Keep the local state showing the intended branch
          setLocalSelectedBranch(branch)
        }
      }, 1500) // Wait longer than the auto-selection delay
      
    } catch (error) {
      console.error('❌ Branch switch failed:', error)
      // Revert local state on error
      setLocalSelectedBranch(selectedBranch)
      setIsRefreshing(false) // Reset refreshing state on error
      alert('Failed to switch branch. Please try again.')
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Force component re-render when selectedBranch changes
  useEffect(() => {
    setLocalSelectedBranch(selectedBranch)
  }, [selectedBranch])

  // Use local state if available, fallback to context state
  const displayBranch = localSelectedBranch || selectedBranch

  if (loading) {
    return (
      <div className="flex items-center space-x-2 bg-surface-50 border border-surface-200 rounded-lg px-3 py-2">
        <div className="w-4 h-4 bg-surface-300 rounded animate-pulse"></div>
        <div className="w-20 h-4 bg-surface-300 rounded animate-pulse"></div>
      </div>
    )
  }

  if (!displayBranch) {
    return (
      <div className="flex items-center space-x-2 bg-surface-50 border border-surface-200 rounded-lg px-3 py-2">
        <div className="text-sm text-red-600">No branch selected</div>
      </div>
    )
  }

  if (branches.length === 0) {
    return (
      <div className="flex items-center space-x-2 bg-surface-50 border border-surface-200 rounded-lg px-3 py-2">
        <div className="text-sm text-red-600">No branches found</div>
      </div>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Current Branch Debug Info */}
      <div className="sr-only">Current: {displayBranch?.name} ({displayBranch?.id})</div>
      
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isRefreshing}
        className={`group flex items-center space-x-3 bg-white/50 backdrop-blur-sm border border-gray-200/60 rounded-xl px-4 py-2.5 shadow-sm transition-all duration-200 hover:bg-white hover:border-gray-300/60 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 ${
          isRefreshing 
            ? 'opacity-75 cursor-not-allowed' 
            : ''
        }`}
      >        
        {/* Branch Info - Minimalist */}
        <div className="flex flex-col items-start min-w-0 flex-1">
          <div className="flex items-center space-x-2 w-full">
            <span className="text-sm font-medium text-gray-900 truncate">
              {isRefreshing ? 'Refreshing...' : displayBranch.name}
            </span>
            {!isRefreshing && displayBranch.isMain && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-700">
                Main
              </span>
            )}
          </div>
          {!isRefreshing && (
            <span className="text-xs text-gray-500 truncate">
              ID: {displayBranch.id.slice(-8)} • {displayBranch.manager || 'Please assign a manager'}
            </span>
          )}
        </div>

        {/* Status & Dropdown */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          <div className={`w-2 h-2 rounded-full ${
            isRefreshing 
              ? 'bg-blue-500 animate-pulse' 
              : displayBranch.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'
          }`}></div>
          
          {/* Dropdown Arrow */}
          {!isRefreshing && (
            <svg 
              className={`w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-all duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </button>

      {/* Dropdown Menu - Modern Design */}
      {isOpen && !isRefreshing && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white/95 backdrop-blur-xl border border-gray-200/50 rounded-2xl shadow-[0_20px_40px_-8px_rgba(0,0,0,0.15)] z-50 overflow-hidden">
          {/* Header - Minimalist */}
          <div className="px-4 py-3 bg-gradient-to-r from-gray-50/50 to-blue-50/50 border-b border-gray-200/30">
            <h3 className="text-sm font-semibold text-gray-900">Select Location</h3>
            <p className="text-xs text-gray-500">{branches.length} locations available</p>
          </div>

          {/* Branch List - Clean */}
          <div className="max-h-64 overflow-y-auto">
            {branches.map((branch) => (
              <div
                key={branch.id}
                className={`group relative flex items-center space-x-3 px-4 py-3 hover:bg-gray-50/50 transition-all duration-200 ${
                  displayBranch.id === branch.id ? 'bg-blue-50/50 border-r-2 border-blue-500' : ''
                }`}
              >
                {/* Main clickable area for branch selection */}
                <button
                  onClick={() => handleBranchSelect(branch)}
                  className="flex-1 flex items-center space-x-3 text-left"
                >
                  {/* Branch Details - Modern Layout */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`text-sm font-medium truncate ${
                        displayBranch.id === branch.id ? 'text-blue-900' : 'text-gray-900'
                      }`}>
                        {branch.name}
                      </span>
                      {branch.isMain && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          Main
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span className="truncate">{branch.manager || 'Please assign a manager'}</span>
                      <div className="flex items-center space-x-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          branch.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'
                        }`}></div>
                        <span className="capitalize text-xs">{branch.status}</span>
                      </div>
                    </div>

                    {/* Branch Stats - Simplified */}
                    <div className="flex items-center space-x-4 mt-2 text-xs">
                      <div className="text-gray-600">
                        <span className="font-medium">₱{(branch.stats?.totalRevenue / 1000 || 0).toFixed(0)}k</span>
                        <span className="text-gray-400 ml-1">revenue</span>
                      </div>
                      <div className="text-gray-600">
                        <span className="font-medium">{branch.stats?.totalOrders || 0}</span>
                        <span className="text-gray-400 ml-1">orders</span>
                      </div>
                    </div>
                  </div>
                </button>

                {/* Action buttons - Modern */}
                <div className="flex-shrink-0 flex items-center space-x-2">
                  {/* Selection Indicator */}
                  {displayBranch.id === branch.id && (
                    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                  
                  {/* Delete button - Modern */}
                  {!branch.isMain && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBranch(branch);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200"
                      title={`Delete ${branch.name}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Footer - Modern */}
          <div className="px-4 py-3 bg-gradient-to-r from-gray-50/50 to-blue-50/50 border-t border-gray-200/30">
            <button 
              onClick={() => setShowAddModal(true)}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1 transition-colors duration-200"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Add New Location</span>
            </button>
          </div>
        </div>
      )}

      {/* Add New Branch Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-surface-200">
              <h2 className="text-lg font-semibold text-surface-900">Add New Branch</h2>
            </div>
            
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">
                  Branch Name *
                </label>
                <input
                  type="text"
                  value={newBranchData.name}
                  onChange={(e) => setNewBranchData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-surface-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter branch name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={newBranchData.address}
                  onChange={(e) => setNewBranchData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-3 py-2 border border-surface-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter address"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={newBranchData.city}
                  onChange={(e) => setNewBranchData(prev => ({ ...prev, city: e.target.value }))}
                  className="w-full px-3 py-2 border border-surface-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter city"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">
                  Phone
                </label>
                <input
                  type="text"
                  value={newBranchData.phone}
                  onChange={(e) => setNewBranchData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-surface-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter phone number"
                />
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-surface-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewBranchData({ name: '', address: '', city: '', phone: '' });
                }}
                className="px-4 py-2 text-sm font-medium text-surface-700 bg-surface-100 rounded-md hover:bg-surface-200 focus:outline-none focus:ring-2 focus:ring-surface-300"
              >
                Cancel
              </button>
              <button
                onClick={handleAddBranch}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                Create Branch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
