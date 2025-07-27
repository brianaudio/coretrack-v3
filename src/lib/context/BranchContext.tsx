'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useAuth } from './AuthContext'

export interface Branch {
  id: string
  name: string
  address: string
  phone: string
  manager: string
  status: 'active' | 'inactive'
  isMain: boolean
  icon: string
  stats: {
    totalRevenue: number
    totalOrders: number
    inventoryValue: number
    lowStockItems: number
  }
}

interface BranchContextType {
  branches: Branch[]
  selectedBranch: Branch | null
  setSelectedBranch: (branch: Branch) => void
  refreshBranches: () => void
  loading: boolean
}

const BranchContext = createContext<BranchContextType | undefined>(undefined)

// Mock branch data - In real implementation, this would come from Firebase
const MOCK_BRANCHES: Branch[] = [
  {
    id: 'main',
    name: 'Main Branch',
    address: '123 Main Street, Metro Manila',
    phone: '+63 2 123 4567',
    manager: 'Juan Dela Cruz',
    status: 'active',
    isMain: true,
    icon: '🏢',
    stats: {
      totalRevenue: 580000,
      totalOrders: 342,
      inventoryValue: 125000,
      lowStockItems: 8
    }
  },
  {
    id: 'downtown',
    name: 'Downtown Store',
    address: '456 Business District, Makati',
    phone: '+63 2 987 6543',
    manager: 'Maria Santos',
    status: 'active',
    isMain: false,
    icon: '🏪',
    stats: {
      totalRevenue: 420000,
      totalOrders: 256,
      inventoryValue: 98000,
      lowStockItems: 5
    }
  },
  {
    id: 'mall',
    name: 'Mall Location',
    address: 'SM Megamall, Ortigas Center',
    phone: '+63 2 555 0123',
    manager: 'Roberto Garcia',
    status: 'active',
    isMain: false,
    icon: '🛒',
    stats: {
      totalRevenue: 310000,
      totalOrders: 189,
      inventoryValue: 75000,
      lowStockItems: 3
    }
  }
]

export function BranchProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranch, setSelectedBranchState] = useState<Branch | null>(null)
  const [loading, setLoading] = useState(true)

  // Load branches on mount
  useEffect(() => {
    if (profile?.tenantId) {
      loadBranches()
    }
  }, [profile?.tenantId])

  // Restore selected branch from localStorage
  useEffect(() => {
    if (branches.length > 0) {
      const savedBranchId = localStorage.getItem('selectedBranchId')
      const branch = savedBranchId 
        ? branches.find(b => b.id === savedBranchId) 
        : branches.find(b => b.isMain) || branches[0]
      
      if (branch) {
        setSelectedBranchState(branch)
      }
    }
  }, [branches])

  const loadBranches = async () => {
    try {
      setLoading(true)
      // TODO: Replace with real Firebase call
      // const branchData = await getBranches(profile.tenantId)
      
      // For now, use mock data
      setBranches(MOCK_BRANCHES)
    } catch (error) {
      console.error('Error loading branches:', error)
      setBranches(MOCK_BRANCHES) // Fallback to mock data
    } finally {
      setLoading(false)
    }
  }

  const setSelectedBranch = (branch: Branch) => {
    setSelectedBranchState(branch)
    localStorage.setItem('selectedBranchId', branch.id)
    localStorage.setItem('selectedBranch', branch.id) // Backward compatibility
    
    // Emit event for other components
    window.dispatchEvent(new CustomEvent('branchChanged', { 
      detail: { branchId: branch.id, branch } 
    }))
    
    // Optional: Auto-refresh data for the new branch
    // window.location.reload()
  }

  const refreshBranches = () => {
    loadBranches()
  }

  return (
    <BranchContext.Provider value={{
      branches,
      selectedBranch,
      setSelectedBranch,
      refreshBranches,
      loading
    }}>
      {children}
    </BranchContext.Provider>
  )
}

export function useBranch() {
  const context = useContext(BranchContext)
  if (context === undefined) {
    throw new Error('useBranch must be used within a BranchProvider')
  }
  return context
}
