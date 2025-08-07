'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react'
import { useAuth } from './AuthContext'
import { getLocations } from '../firebase/locationManagement'
import { updateUserSelectedBranch } from '../firebase/auth'
import { debugTrace, debugStep, debugError, debugSuccess } from '../utils/debugHelper'
import { Location } from '../types/location'
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc,
  serverTimestamp,
  addDoc
} from 'firebase/firestore'
import { db } from '../firebase'

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
  // Enhanced fields for comprehensive branch management
  type?: string
  isActive?: boolean
  settings?: Record<string, any>
  createdAt?: Date
  updatedAt?: Date
}

export interface BranchSwitchAuditLog {
  userId: string
  tenantId: string
  fromBranchId: string | null
  toBranchId: string
  timestamp: Date
  sessionId: string
  userAgent: string
  ipAddress?: string
}

// Branch-aware cache manager
class BranchCacheManager {
  private cache = new Map<string, Map<string, any>>()
  private subscriptions = new Map<string, () => void>()

  getCacheKey(branchId: string, collection: string): string {
    return `${branchId}:${collection}`
  }

  get<T>(branchId: string, collection: string): T[] | null {
    const branchCache = this.cache.get(branchId)
    return branchCache?.get(collection) || null
  }

  set<T>(branchId: string, collection: string, data: T[]): void {
    if (!this.cache.has(branchId)) {
      this.cache.set(branchId, new Map())
    }
    this.cache.get(branchId)!.set(collection, data)
  }

  clearBranch(branchId: string): void {
    this.cache.delete(branchId)
    // Clear any subscriptions for this branch
    const keysToDelete: string[] = []
    this.subscriptions.forEach((unsubscribe, key) => {
      if (key.startsWith(branchId)) {
        unsubscribe()
        keysToDelete.push(key)
      }
    })
    keysToDelete.forEach(key => this.subscriptions.delete(key))
  }

  clearAll(): void {
    // Unsubscribe from all listeners
    this.subscriptions.forEach(unsubscribe => unsubscribe())
    this.subscriptions.clear()
    this.cache.clear()
  }

  addSubscription(branchId: string, collection: string, unsubscribe: () => void): void {
    const key = this.getCacheKey(branchId, collection)
    // Clear existing subscription if any
    if (this.subscriptions.has(key)) {
      this.subscriptions.get(key)!()
    }
    this.subscriptions.set(key, unsubscribe)
  }

  getStats(): { branches: number; collections: number; subscriptions: number } {
    let collections = 0
    this.cache.forEach(branchCache => {
      collections += branchCache.size
    })
    
    return {
      branches: this.cache.size,
      collections,
      subscriptions: this.subscriptions.size
    }
  }
}

// Session manager for tracking branch switches
class BranchSessionManager {
  private sessionId: string
  private switchHistory: BranchSwitchAuditLog[] = []

  constructor() {
    this.sessionId = this.generateSessionId()
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  async logBranchSwitch(
    userId: string,
    tenantId: string,
    fromBranchId: string | null,
    toBranchId: string
  ): Promise<void> {
    const log: BranchSwitchAuditLog = {
      userId,
      tenantId,
      fromBranchId,
      toBranchId,
      timestamp: new Date(),
      sessionId: this.sessionId,
      userAgent: navigator.userAgent
    }

    // Store locally
    this.switchHistory.push(log)

    // Store in Firebase for audit trail
    try {
      await addDoc(collection(db, `tenants/${tenantId}/auditLogs`), {
        type: 'branch_switch',
        ...log,
        timestamp: serverTimestamp()
      })
    } catch (error) {
      console.error('Failed to log branch switch:', error)
    }
  }

  getSwitchHistory(): BranchSwitchAuditLog[] {
    return [...this.switchHistory]
  }

  getSessionId(): string {
    return this.sessionId
  }
}

interface BranchContextType {
  branches: Branch[]
  selectedBranch: Branch | null
  setSelectedBranch: (branch: Branch) => void
  refreshBranches: () => void
  loading: boolean
  // Enhanced functionality
  switchingInProgress: boolean
  lastSwitchTime: Date | null
  error: string | null
  switchBranch: (branchId: string) => Promise<void>
  canAccessBranch: (branchId: string) => boolean
  getBranchData: (collection: string, additionalFilters?: any[]) => Promise<any[]>
  clearBranchCache: () => void
  getSwitchHistory: () => BranchSwitchAuditLog[]
  getCacheStats: () => { branches: number; collections: number; subscriptions: number }
}

const BranchContext = createContext<BranchContextType | undefined>(undefined)

export function BranchProvider({ children }: { children: ReactNode }) {
  const { profile, tenant } = useAuth()
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranch, setSelectedBranchState] = useState<Branch | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Enhanced state for comprehensive branch switching
  const [switchingInProgress, setSwitchingInProgress] = useState(false)
  const [lastSwitchTime, setLastSwitchTime] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Managers for enhanced functionality
  const cacheManagerRef = useRef(new BranchCacheManager())
  const sessionManagerRef = useRef(new BranchSessionManager())
  const branchListenerRef = useRef<(() => void) | null>(null)

  // Load branches on mount
  useEffect(() => {
    if (profile?.tenantId) {
      debugTrace('BranchProvider Loading', { tenantId: profile.tenantId }, { component: 'BranchContext' })
      loadBranches()
    } else {
      debugStep('No tenant ID available', { hasProfile: !!profile }, { component: 'BranchContext' })
    }
  }, [profile?.tenantId])

  // Restore selected branch from user profile
  useEffect(() => {
    debugStep('Branch selection effect triggered', { 
      branchCount: branches.length,
      hasProfile: !!profile,
      profileUid: profile?.uid,
      profileSelectedBranchId: profile?.selectedBranchId,
      currentSelectedBranch: selectedBranch?.id 
    }, { component: 'BranchContext' })

    if (branches.length > 0 && profile) {
      // Add a small delay to prevent interference with manual selections
      const autoSelectTimer = setTimeout(() => {
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
      }, 1000) // 1 second delay to allow manual selections to complete
      
      return () => clearTimeout(autoSelectTimer)
    } else {
      debugStep('Skipping branch selection', { 
        branchCount: branches.length,
        hasProfile: !!profile,
        reason: branches.length === 0 ? 'No branches' : 'No profile'
      }, { component: 'BranchContext' })
    }
  }, [branches, profile?.selectedBranchId, profile?.uid, selectedBranch?.id])

  const loadBranches = async () => {
    if (!profile?.tenantId) return

    try {
      setLoading(true)
      debugStep('Loading branches from locations', { tenantId: profile.tenantId }, { component: 'BranchContext' })
      
      // Get locations from location management
      const locations = await getLocations(profile.tenantId)
      debugStep('Locations fetched', { count: locations.length }, { component: 'BranchContext' })
      
      // Convert locations to branch format
      const branchData: Branch[] = locations.map(location => ({
        id: location.id,
        name: location.name,
        address: `${location.address.street}, ${location.address.city}, ${location.address.state} ${location.address.zipCode}`,
        phone: location.contact?.phone || 'No phone provided',
        manager: location.contact?.manager || 'No manager assigned',
        status: location.status === 'active' ? 'active' : 'inactive',
        isMain: location.type === 'main',
        icon: '🏢',
        stats: {
          totalRevenue: 0,
          totalOrders: 0,
          inventoryValue: 0,
          lowStockItems: 0
        },
        type: location.type,
        isActive: location.status === 'active',
        settings: location.settings || {},
        createdAt: location.createdAt instanceof Date ? location.createdAt : new Date(),
        updatedAt: location.updatedAt instanceof Date ? location.updatedAt : new Date()
      }))
      
      if (branchData.length === 0) {
        debugStep('No locations found, branches list will be empty', {}, { component: 'BranchContext' })
        setBranches([])
      } else {
        debugSuccess('Branches loaded from locations', { branches: branchData.map((b: Branch) => b.name) }, { component: 'BranchContext' })
        setBranches(branchData)
      }
    } catch (error) {
      debugError('Failed to load branches from locations', { error }, { component: 'BranchContext' })
      console.error('Error loading branches:', error)
      setBranches([])
    } finally {
      setLoading(false)
    }
  }

  const setSelectedBranch = async (branch: Branch) => {
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
    loadBranches()
  }

  // Enhanced branch switching with comprehensive state management
  const switchBranch = useCallback(async (branchId: string): Promise<void> => {
    if (!profile || !tenant || switchingInProgress) {
      return
    }

    const targetBranch = branches.find(b => b.id === branchId)
    if (!targetBranch) {
      setError(`Branch not found: ${branchId}`)
      return
    }

    setSwitchingInProgress(true)
    setError(null)

    try {
      const fromBranchId = selectedBranch?.id || null

      // Step 1: Log the switch for audit trail
      await sessionManagerRef.current.logBranchSwitch(
        profile.uid,
        tenant.id,
        fromBranchId,
        branchId
      )

      // Step 2: Clear cache for old branch (if switching)
      if (fromBranchId && fromBranchId !== branchId) {
        cacheManagerRef.current.clearBranch(fromBranchId)
      }

      // Step 3: Update selected branch
      debugStep('Updating selected branch state', { from: selectedBranch?.name, to: targetBranch.name }, { component: 'BranchContext' })
      setSelectedBranchState(targetBranch)
      setLastSwitchTime(new Date())
      debugSuccess('Selected branch updated', { newBranch: targetBranch.name, newId: targetBranch.id }, { component: 'BranchContext' })

      // Step 4: Save to Firebase user profile
      if (profile.uid) {
        try {
          await updateUserSelectedBranch(profile.uid, branchId)
        } catch (error) {
          console.warn('Failed to update user selected branch:', error)
        }
      }

      // Step 5: Trigger global branch change event
      window.dispatchEvent(new CustomEvent('branchChanged', {
        detail: {
          fromBranchId,
          toBranchId: branchId,
          branch: targetBranch,
          userId: profile.uid,
          tenantId: tenant.id
        }
      }))

    } catch (error) {
      console.error('Branch switch failed:', error)
      setError(error instanceof Error ? error.message : 'Branch switch failed')
    } finally {
      setSwitchingInProgress(false)
    }
  }, [profile, tenant, branches, selectedBranch, switchingInProgress])

  // Check if user can access specific branch
  const canAccessBranch = useCallback((branchId: string): boolean => {
    if (!profile || !tenant) return false
    
    // For now, assume all branches are accessible if user has access to tenant
    // This can be enhanced with proper permission checking
    return branches.some(b => b.id === branchId)
  }, [profile, tenant, branches])

  // Get branch-specific data with caching
  const getBranchData = useCallback(async (
    collectionName: string,
    additionalFilters: any[] = []
  ): Promise<any[]> => {
    if (!selectedBranch || !tenant) {
      return []
    }

    const branchId = selectedBranch.id
    
    // Check cache first
    const cached = cacheManagerRef.current.get(branchId, collectionName)
    if (cached) {
      return cached
    }

    try {
      // Build query with branch filter
      const baseQuery = query(
        collection(db, `tenants/${tenant.id}/${collectionName}`),
        where('branchId', '==', branchId),
        ...additionalFilters
      )

      // Set up real-time listener and cache the data
      const unsubscribe = onSnapshot(baseQuery, (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        
        cacheManagerRef.current.set(branchId, collectionName, data)
      })

      // Store the subscription for cleanup
      cacheManagerRef.current.addSubscription(branchId, collectionName, unsubscribe)

      // Return empty array initially, real data will come through listener
      return []
      
    } catch (error) {
      console.error(`Failed to get ${collectionName} data:`, error)
      return []
    }
  }, [selectedBranch, tenant])

  // Clear branch cache
  const clearBranchCache = useCallback((): void => {
    cacheManagerRef.current.clearAll()
  }, [])

  // Get switch history
  const getSwitchHistory = useCallback((): BranchSwitchAuditLog[] => {
    return sessionManagerRef.current.getSwitchHistory()
  }, [])

  // Get cache statistics
  const getCacheStats = useCallback(() => {
    return cacheManagerRef.current.getStats()
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cacheManagerRef.current.clearAll()
      if (branchListenerRef.current) {
        branchListenerRef.current()
      }
    }
  }, [])

  return (
    <BranchContext.Provider value={{
      branches,
      selectedBranch,
      setSelectedBranch,
      refreshBranches,
      loading,
      // Enhanced functionality
      switchingInProgress,
      lastSwitchTime,
      error,
      switchBranch,
      canAccessBranch,
      getBranchData,
      clearBranchCache,
      getSwitchHistory,
      getCacheStats
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

// Hook for branch-specific data
export function useBranchData(collectionName: string, additionalFilters: any[] = []) {
  const { getBranchData, selectedBranch } = useBranch()
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!selectedBranch) {
      setData([])
      setLoading(false)
      return
    }

    let isMounted = true

    const loadData = async () => {
      setLoading(true)
      try {
        const result = await getBranchData(collectionName, additionalFilters)
        if (isMounted) {
          setData(result)
        }
      } catch (error) {
        console.error(`Failed to load ${collectionName}:`, error)
        if (isMounted) {
          setData([])
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadData()

    // Listen for branch changes
    const handleBranchChange = () => {
      loadData()
    }

    window.addEventListener('branchChanged', handleBranchChange)

    return () => {
      isMounted = false
      window.removeEventListener('branchChanged', handleBranchChange)
    }
  }, [selectedBranch, collectionName, getBranchData, additionalFilters])

  return { data, loading }
}
