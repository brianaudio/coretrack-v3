'use client'

import { useState, useRef, useEffect } from 'react'
import { useBranch } from '../lib/context/BranchContext'
import { useAuth } from '../lib/context/AuthContext'
import { deleteLocation } from '../lib/firebase/locationManagement'
import { deleteBranchByLocationId } from '../lib/firebase/branches'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'

export default function BranchSelector() {
  const { branches, selectedBranch, switchBranch, loading, refreshBranches, setSelectedBranch } = useBranch()
  const { profile } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
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
      
      console.log(`✅ Branch "${branch.name}" deleted successfully`);
    } catch (error) {
      console.error('Error deleting branch:', error);
      alert('Error deleting branch. Please try again.');
    }
  };

  const handleBranchSelect = async (branch: typeof branches[0]) => {
    console.log('🔄 Branch selection clicked:', branch.name, branch.id)
    console.log('🔄 Current selected branch before switch:', selectedBranch?.name, selectedBranch?.id)
    
    // Skip if selecting the same branch
    if (selectedBranch?.id === branch.id) {
      console.log('✅ Already selected this branch, closing dropdown')
      setIsOpen(false)
      return
    }
    
    // Close dropdown first
    setIsOpen(false)
    
    try {
      console.log('🔄 Starting branch switch process...')
      
      // Update local state immediately for instant UI feedback
      setLocalSelectedBranch(branch)
      
      // Update Firebase user profile FIRST to prevent auto-selection override
      if (profile?.uid) {
        console.log('🔄 Updating Firebase user profile FIRST...')
        try {
          const userDocRef = doc(db, 'users', profile.uid)
          await updateDoc(userDocRef, {
            selectedBranchId: branch.id,
            lastSwitched: new Date()
          })
          console.log('✅ Firebase user profile updated FIRST')
        } catch (firebaseError) {
          console.error('❌ Firebase update failed:', firebaseError)
          throw firebaseError // Stop if Firebase update fails
        }
      }
      
      // Give Firebase a moment to propagate before updating context
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Now use the context method (which should read the updated Firebase value)
      if (setSelectedBranch) {
        console.log('🔄 Calling setSelectedBranch...')
        setSelectedBranch(branch)
        console.log('✅ setSelectedBranch called')
      } else if (switchBranch) {
        console.log('🔄 Using switchBranch method...')
        await switchBranch(branch.id)
        console.log('✅ switchBranch completed')
      }
      
      console.log('✅ Branch switch completed successfully')
      
      // Verify the switch after a longer delay (after auto-selection timeout)
      setTimeout(() => {
        console.log('🔄 Final verification after auto-selection period:', {
          selectedBranch: selectedBranch?.name,
          selectedBranchId: selectedBranch?.id,
          localBranch: localSelectedBranch?.name,
          targetBranch: branch.name,
          targetBranchId: branch.id,
          switchSuccessful: selectedBranch?.id === branch.id
        })
        
        if (selectedBranch?.id !== branch.id) {
          console.log('⚠️ Branch switch was overridden, forcing local state update')
          // Keep the local state showing the intended branch
          setLocalSelectedBranch(branch)
        }
      }, 1500) // Wait longer than the auto-selection delay
      
    } catch (error) {
      console.error('❌ Branch switch failed:', error)
      // Revert local state on error
      setLocalSelectedBranch(selectedBranch)
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
    console.log('🔄 BranchSelector: selectedBranch changed to:', selectedBranch?.name, selectedBranch?.id)
    setLocalSelectedBranch(selectedBranch)
  }, [selectedBranch])

  // Debug the branches data
  useEffect(() => {
    console.log('🏪 BranchSelector: branches data updated:', {
      branchesCount: branches.length,
      branches: branches.map(b => ({ id: b.id, name: b.name, status: b.status })),
      loading,
      selectedBranchId: selectedBranch?.id,
      selectedBranchName: selectedBranch?.name
    })
  }, [branches, loading, selectedBranch])

  // Use local state if available, fallback to context state
  const displayBranch = localSelectedBranch || selectedBranch

  console.log('🎯 BranchSelector render state:', {
    loading,
    branchesCount: branches.length,
    displayBranch: displayBranch ? { id: displayBranch.id, name: displayBranch.name } : null,
    hasSetSelectedBranch: !!setSelectedBranch
  })

  if (loading) {
    console.log('⏳ BranchSelector: Still loading...')
    return (
      <div className="flex items-center space-x-2 bg-surface-50 border border-surface-200 rounded-lg px-3 py-2">
        <div className="w-4 h-4 bg-surface-300 rounded animate-pulse"></div>
        <div className="w-20 h-4 bg-surface-300 rounded animate-pulse"></div>
      </div>
    )
  }

  if (!displayBranch) {
    console.log('❌ BranchSelector: No display branch available')
    return (
      <div className="flex items-center space-x-2 bg-surface-50 border border-surface-200 rounded-lg px-3 py-2">
        <div className="text-sm text-red-600">No branch selected</div>
      </div>
    )
  }

  if (branches.length === 0) {
    console.log('❌ BranchSelector: No branches available')
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
        className="flex items-center space-x-3 bg-white border border-surface-200 rounded-lg px-4 py-2 shadow-sm hover:bg-surface-50 hover:border-surface-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
      >
        {/* Branch Icon */}
        <div className="text-lg">
          {displayBranch.icon}
        </div>
        
        {/* Branch Info */}
        <div className="flex flex-col items-start min-w-0">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-surface-900 truncate">
              📍 {displayBranch.name}
            </span>
            {displayBranch.isMain && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                Main
              </span>
            )}
          </div>
          <span className="text-xs text-surface-500 truncate">
            ID: {displayBranch.id.slice(-8)} • {displayBranch.manager}
          </span>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            displayBranch.status === 'active' ? 'bg-green-500' : 'bg-red-500'
          }`}></div>
          
          {/* Dropdown Arrow */}
          <svg 
            className={`w-4 h-4 text-surface-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-surface-200 rounded-xl shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-surface-50 border-b border-surface-200">
            <h3 className="text-sm font-semibold text-surface-900">Select Branch</h3>
            <p className="text-xs text-surface-500">{branches.length} locations available</p>
          </div>

          {/* Branch List */}
          <div className="max-h-64 overflow-y-auto">
            {branches.map((branch) => (
              <div
                key={branch.id}
                className={`group relative flex items-center space-x-3 px-4 py-3 hover:bg-surface-50 transition-colors ${
                  displayBranch.id === branch.id ? 'bg-primary-50 border-r-2 border-primary-500' : ''
                }`}
              >
                {/* Main clickable area for branch selection */}
                <button
                  onClick={() => handleBranchSelect(branch)}
                  className="flex-1 flex items-center space-x-3 text-left"
                >
                  {/* Branch Icon */}
                  <div className="text-lg flex-shrink-0">
                    {branch.icon}
                  </div>
                  
                  {/* Branch Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`text-sm font-medium truncate ${
                        displayBranch.id === branch.id ? 'text-primary-900' : 'text-surface-900'
                      }`}>
                        {branch.name}
                      </span>
                      {branch.isMain && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                          Main
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-4 text-xs text-surface-500">
                      <span className="truncate">{branch.manager}</span>
                      <div className="flex items-center space-x-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          branch.status === 'active' ? 'bg-green-500' : 'bg-red-500'
                        }`}></div>
                        <span className="capitalize">{branch.status}</span>
                      </div>
                    </div>

                    {/* Branch Stats */}
                    <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                      <div className="text-surface-600">
                        <span className="font-medium">₱{(branch.stats.totalRevenue / 1000).toFixed(0)}k</span>
                        <span className="text-surface-400 ml-1">revenue</span>
                      </div>
                      <div className="text-surface-600">
                        <span className="font-medium">{branch.stats.totalOrders}</span>
                        <span className="text-surface-400 ml-1">orders</span>
                      </div>
                    </div>
                  </div>
                </button>

                {/* Action buttons - visible on hover */}
                <div className="flex-shrink-0 flex items-center space-x-1">
                  {/* Selection Indicator */}
                  {displayBranch.id === branch.id && (
                    <div className="mr-2">
                      <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                  
                  {/* Delete button - only for non-main branches */}
                  {!branch.isMain && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBranch(branch);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                      title={`Delete ${branch.name}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-surface-50 border-t border-surface-200">
            <button 
              onClick={() => alert('Add New Branch functionality coming soon!')}
              className="text-xs text-primary-600 hover:text-primary-700 font-medium"
            >
              + Add New Branch
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
