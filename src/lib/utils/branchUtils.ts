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

// New utility functions for the enhanced branch system
export const getBranchLocationId = (branchId: string): string => {
  return `location_${branchId}`
}

export const isMainBranch = (branchId: string): boolean => {
  return branchId === 'main'
}

export const getBranchIcon = (branchId: string): string => {
  // Return default icon - actual icons should be stored in Firebase branch data
  return branchId === 'main' ? '🏢' : '🏪'
}
