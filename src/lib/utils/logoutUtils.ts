'use client'

import { auth } from '../firebase'
import { signOut as firebaseSignOut } from 'firebase/auth'

/**
 * Utility function to sign out and automatically end shift at current branch only
 * This can be called from anywhere in the app to ensure proper cleanup
 */
export async function signOutWithShiftEnd(): Promise<void> {
  try {
    // Try to get the current shift and end it at the current branch only
    const { endActiveShiftsAtLocation } = await import('../firebase/shiftManagement')
    const { getBranchLocationId } = await import('../utils/branchUtils')
    const currentUser = auth.currentUser
    
    if (currentUser?.uid) {
      try {
        // Get tenantId and current branch from localStorage
        const storedProfile = localStorage.getItem('coretrack_user_profile')
        const storedBranch = localStorage.getItem('coretrack_selected_branch')
        
        let tenantId: string | null = null
        let currentBranchId: string | null = null
        
        if (storedProfile) {
          const profile = JSON.parse(storedProfile)
          tenantId = profile.tenantId
        }
        
        if (storedBranch) {
          const branch = JSON.parse(storedBranch)
          currentBranchId = branch.id
        }
        
        // If we have both tenantId and current branch, end shift at current location only
        if (tenantId && currentBranchId) {
          const locationId = getBranchLocationId(currentBranchId)
          await endActiveShiftsAtLocation(tenantId, currentUser.uid, locationId)
          console.log('✅ Active shift ended at current branch before sign out:', locationId)
        } else {
          console.warn('⚠️ Missing tenantId or branch info - cannot end shift before logout')
        }
      } catch (shiftError) {
        // If shift ending fails, log but don't block signout
        console.warn('⚠️ Could not end shift at current branch before sign out:', shiftError)
      }
    }
  } catch (importError) {
    // If shift utilities import fails, continue with signout
    console.warn('⚠️ Could not import shift utilities for cleanup:', importError)
  }

  // Always sign out from Firebase
  await firebaseSignOut(auth)
}

/**
 * Enhanced logout that handles both auth cleanup and branch-specific shift ending
 */
export async function handleLogoutWithShiftEnd(): Promise<void> {
  try {
    await signOutWithShiftEnd()
    
    // Clear any local storage
    localStorage.removeItem('coretrack_onboarding_completed')
    localStorage.removeItem('coretrack_user_profile')
    
    console.log('✅ Complete logout with branch-specific shift cleanup successful')
  } catch (error) {
    console.error('❌ Error during logout with shift cleanup:', error)
    throw error
  }
}
