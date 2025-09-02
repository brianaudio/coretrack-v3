// Enhanced branch management utilities for multi-branch system

export const getCurrentBranch = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('selectedBranchId') || localStorage.getItem('selectedBranch') || 'main'
  }
  return 'main'
}

export const setCurrentBranch = (branchId: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('selectedBranchId', branchId)
    localStorage.setItem('selectedBranch', branchId) // Backward compatibility
  }
}

export const getBranchName = (branchId: string): string => {
  // Fallback function - actual branch names should come from BranchContext/Firebase
  return branchId.charAt(0).toUpperCase() + branchId.slice(1)
}

// Enhanced utility functions for the branch system with safeguards
export const getBranchLocationId = (branchId: string): string => {
  // Input validation and normalization for consistency
  if (!branchId || typeof branchId !== 'string') {
    console.warn('Invalid branchId provided to getBranchLocationId:', branchId)
    return 'location_main' // Safe fallback
  }
  
  // Normalize the branch ID (trim whitespace, convert to lowercase)
  const normalizedBranchId = branchId.trim().toLowerCase()
  
  if (normalizedBranchId === '') {
    console.warn('Empty branchId provided, using main branch')
    return 'location_main'
  }
  
  return `location_${normalizedBranchId}`
}

export const isMainBranch = (branchId: string): boolean => {
  if (!branchId || typeof branchId !== 'string') {
    return false
  }
  return branchId.trim().toLowerCase() === 'main'
}

export const getBranchIcon = (branchId: string): string => {
  // Return default icon - actual icons should be stored in Firebase branch data
  return branchId === 'main' ? '🏢' : '🏪'
}
