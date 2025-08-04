'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { getBranches, initializeBranchesForTenant } from '../firebase/branches'
import { updateUserSelectedBranch } from '../firebase/auth'
import { debugTrace, debugStep, debugError, debugSuccess } from '../utils/debugHelper'

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

export function BranchProvider({ children }: { children: ReactNode }) {
  const { profile, tenant } = useAuth()
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranch, setSelectedBranchState] = useState<Branch | null>(null)
  const [loading, setLoading] = useState(true)

  // Development mode detection
  const isDevelopment = process.env.NODE_ENV === 'development'

  // Mock branch data for development
  const mockBranches: Branch[] = [
    {
      id: 'dev-branch-main',
      name: 'Main Branch',
      address: '123 Business St, Development City',
      phone: '+1 (555) 123-4567',
      manager: 'John Doe',
      status: 'active',
      isMain: true,
      icon: '🏢',
      stats: {
        totalRevenue: 125000,
        totalOrders: 856,
        inventoryValue: 45000,
        lowStockItems: 12
      }
    },
    {
      id: 'dev-branch-west',
      name: 'West Side Branch',
      address: '456 Commerce Ave, Development City',
      phone: '+1 (555) 987-6543',
      manager: 'Jane Smith',
      status: 'active',
      isMain: false,
      icon: '🏪',
      stats: {
        totalRevenue: 89000,
        totalOrders: 623,
        inventoryValue: 32000,
        lowStockItems: 8
      }
    }
  ]

  // Load branches on mount
  useEffect(() => {
    if (isDevelopment) {
      console.log('🔧 Development Mode: Initial load - checking for real branches...')
      
      // In development mode, try to load real branches first, then fall back to mock
      if (profile?.tenantId) {
        getBranches(profile.tenantId).then(realBranches => {
          console.log('🔧 Development Mode: Real branches response:', realBranches.length)
          
          if (realBranches.length > 0) {
            console.log('🔧 Development Mode: Found real branches, using them:', realBranches.map(b => b.name))
            setBranches(realBranches)
            
            // Auto-select the first real branch
            const firstBranch = realBranches[0]
            console.log('🔧 Development Mode: Auto-selecting first real branch:', firstBranch.name)
            setSelectedBranchState(firstBranch)
          } else {
            console.log('🔧 Development Mode: No real branches found, using mock branches')
            setBranches(mockBranches)
            
            // Auto-select mock branch
            const mainBranch = mockBranches.find(b => b.isMain) || mockBranches[0]
            console.log('🔧 Development Mode: Auto-selecting mock main branch:', mainBranch.name)
            setSelectedBranchState(mainBranch)
          }
          setLoading(false)
        }).catch(error => {
          console.log('🔧 Development Mode: Error loading real branches, using mock:', error)
          setBranches(mockBranches)
          
          // Auto-select mock branch
          const mainBranch = mockBranches.find(b => b.isMain) || mockBranches[0]
          console.log('🔧 Development Mode: Auto-selecting mock main branch after error:', mainBranch.name)
          setSelectedBranchState(mainBranch)
          setLoading(false)
        })
      } else {
        console.log('🔧 Development Mode: No tenantId, using mock branches')
        setBranches(mockBranches)
        
        // Auto-select mock branch
        const mainBranch = mockBranches.find(b => b.isMain) || mockBranches[0]
        console.log('🔧 Development Mode: Auto-selecting mock main branch (no tenantId):', mainBranch.name)
        setSelectedBranchState(mainBranch)
        setLoading(false)
      }
      return
    }

    if (profile?.tenantId) {
      debugTrace('BranchProvider Loading', { tenantId: profile.tenantId }, { component: 'BranchContext' })
      loadBranches()
    } else {
      debugStep('No tenant ID available', { hasProfile: !!profile }, { component: 'BranchContext' })
    }
  }, [profile?.tenantId, isDevelopment])

  // Restore selected branch from user profile
  useEffect(() => {
    if (isDevelopment) {
      // In development mode, selection is handled in the initial load effect
      return
    }

    debugStep('Branch selection effect triggered', { 
      branchCount: branches.length,
      hasProfile: !!profile,
      profileUid: profile?.uid,
      profileSelectedBranchId: profile?.selectedBranchId,
      currentSelectedBranch: selectedBranch?.id 
    }, { component: 'BranchContext' })

    if (branches.length > 0 && profile) {
      debugStep('Starting auto-selection process', { 
        branchCount: branches.length,
        savedBranchId: profile.selectedBranchId,
        branches: branches.map(b => ({ id: b.id, name: b.name, isMain: b.isMain }))
      }, { component: 'BranchContext' })
      
      // Try to find the user's previously selected branch
      let branch = profile.selectedBranchId 
        ? branches.find(b => b.id === profile.selectedBranchId) 
        : null
      
      debugStep('Searched for saved branch', { 
        savedBranchId: profile.selectedBranchId,
        foundBranch: branch ? { id: branch.id, name: branch.name } : null 
      }, { component: 'BranchContext' })
      
      // If not found or not set, use the main branch or first available
      if (!branch) {
        branch = branches.find(b => b.isMain) || branches[0]
        debugStep('Using fallback branch selection', { 
          branchName: branch?.name,
          branchId: branch?.id,
          isMain: branch?.isMain 
        }, { component: 'BranchContext' })
      }
      
      if (branch) {
        debugSuccess('Setting selected branch', { 
          branchName: branch.name, 
          branchId: branch.id,
          currentlySelected: selectedBranch?.id
        }, { component: 'BranchContext' })
        
        // Only update if different
        if (selectedBranch?.id !== branch.id) {
          setSelectedBranchState(branch)
          
          // Save to Firebase if it's different from what's stored
          if (profile.selectedBranchId !== branch.id) {
            debugStep('Saving branch selection to Firebase', { branchId: branch.id }, { component: 'BranchContext' })
            updateUserSelectedBranch(profile.uid, branch.id).catch(error => {
              debugError('Failed to save branch selection to Firebase', { error }, { component: 'BranchContext' })
            })
          }
        } else {
          debugStep('Branch already selected, no change needed', { branchId: branch.id }, { component: 'BranchContext' })
        }
      } else {
        debugError('No suitable branch found for auto-selection', { 
          branches: branches.map(b => ({ id: b.id, name: b.name, isMain: b.isMain })) 
        }, { component: 'BranchContext' })
      }
    } else {
      debugStep('Skipping branch selection', { 
        branchCount: branches.length,
        hasProfile: !!profile,
        reason: branches.length === 0 ? 'No branches' : 'No profile'
      }, { component: 'BranchContext' })
    }
  }, [branches, profile?.selectedBranchId, profile?.uid, isDevelopment, selectedBranch?.id])

  const loadBranches = async () => {
    if (!profile?.tenantId) return

    try {
      setLoading(true)
      debugStep('Loading branches from Firebase', { tenantId: profile.tenantId }, { component: 'BranchContext' })
      
      // Get existing branches
      const branchData = await getBranches(profile.tenantId)
      debugStep('Branches fetched', { count: branchData.length }, { component: 'BranchContext' })
      
      // If no branches exist, create a default one
      if (branchData.length === 0) {
        debugStep('No branches found, creating default branch', {}, { component: 'BranchContext' })
        
        const defaultBranch = await initializeBranchesForTenant(
          profile.tenantId, 
          tenant?.name || 'My Business'
        )
        
        debugSuccess('Default branch created', { branchName: defaultBranch.name }, { component: 'BranchContext' })
        setBranches([defaultBranch])
      } else {
        debugSuccess('Branches loaded successfully', { branches: branchData.map(b => b.name) }, { component: 'BranchContext' })
        setBranches(branchData)
      }
    } catch (error) {
      debugError('Failed to load branches', { error }, { component: 'BranchContext' })
      console.error('Error loading branches:', error)
      setBranches([])
    } finally {
      setLoading(false)
    }
  }

  const setSelectedBranch = async (branch: Branch) => {
    if (isDevelopment) {
      console.log('🔧 Development Mode: Mock branch selection:', branch.name)
      setSelectedBranchState(branch)
      
      // Emit event for other components
      window.dispatchEvent(new CustomEvent('branchChanged', { 
        detail: { branchId: branch.id, branch } 
      }))
      return
    }

    debugStep('Manually selecting branch', { branchName: branch.name, branchId: branch.id }, { component: 'BranchContext' })
    
    setSelectedBranchState(branch)
    
    // Save to Firebase user profile
    if (profile?.uid) {
      try {
        await updateUserSelectedBranch(profile.uid, branch.id)
        debugSuccess('Branch selection saved to Firebase', { branchId: branch.id }, { component: 'BranchContext' })
      } catch (error) {
        debugError('Failed to save branch selection to Firebase', { error }, { component: 'BranchContext' })
      }
    }
    
    // Emit event for other components
    window.dispatchEvent(new CustomEvent('branchChanged', { 
      detail: { branchId: branch.id, branch } 
    }))
  }

  const refreshBranches = async () => {
    if (isDevelopment) {
      console.log('🔧 Development Mode: Forcing refresh - checking for real branches first...')
      
      // In development, check if there are real branches created
      if (profile?.tenantId) {
        try {
          const realBranches = await getBranches(profile.tenantId)
          console.log('🔧 Development Mode: Real branches found:', realBranches.length)
          
          if (realBranches.length > 0) {
            console.log('🔧 Development Mode: Using real branches:', realBranches.map(b => b.name))
            setBranches(realBranches)
            
            // Auto-select the first real branch
            const firstBranch = realBranches[0]
            if (!selectedBranch || selectedBranch.id.startsWith('dev-branch-')) {
              console.log('🔧 Development Mode: Auto-selecting first real branch:', firstBranch.name)
              setSelectedBranchState(firstBranch)
            }
            return
          }
        } catch (error) {
          console.log('🔧 Development Mode: Error fetching real branches:', error)
        }
      }
      
      console.log('🔧 Development Mode: No real branches found, using mock branches')
      setBranches(mockBranches)
      return
    }
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
