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
  // This now serves as a fallback - the actual branch names should come from BranchContext
  const branches: Record<string, string> = {
    'main': 'Main Branch',
    'downtown': 'Downtown Store', 
    'mall': 'Mall Location'
  }
  return branches[branchId] || branchId
}

// New utility functions for the enhanced branch system
export const getBranchLocationId = (branchId: string): string => {
  return `location_${branchId}`
}

export const isMainBranch = (branchId: string): boolean => {
  return branchId === 'main'
}

export const getBranchIcon = (branchId: string): string => {
  const icons: Record<string, string> = {
    'main': '🏢',
    'downtown': '🏪',
    'mall': '🛒'
  }
  return icons[branchId] || '🏪'
}
