import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  Timestamp,
  addDoc
} from 'firebase/firestore'
import { db } from '../firebase'
import { Branch } from '../context/BranchContext'

/**
 * Create a default branch for a new tenant
 */
export async function createDefaultBranch(tenantId: string, branchName?: string): Promise<Branch> {
  const defaultBranch: Omit<Branch, 'id'> = {
    name: branchName || 'Main Branch',
    address: 'Please update your address',
    phone: 'Please update your phone',
    manager: 'Please assign a manager',
    status: 'active',
    isMain: true,
    icon: '🏢',
    stats: {
      totalRevenue: 0,
      totalOrders: 0,
      inventoryValue: 0,
      lowStockItems: 0
    }
  }

  try {
    // Create branch document in Firestore
    const branchRef = collection(db, `tenants/${tenantId}/branches`)
    const docRef = await addDoc(branchRef, {
      ...defaultBranch,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    })

    return {
      id: docRef.id,
      ...defaultBranch
    }
  } catch (error) {
    console.error('Error creating default branch:', error)
    throw new Error('Failed to create default branch')
  }
}

/**
 * Get all branches for a tenant
 */
export async function getBranches(tenantId: string): Promise<Branch[]> {
  try {
    const branchesRef = collection(db, `tenants/${tenantId}/branches`)
    const snapshot = await getDocs(branchesRef)
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Branch[]
  } catch (error) {
    console.error('Error fetching branches:', error)
    return []
  }
}

/**
 * Check if tenant has any branches
 */
export async function hasBranches(tenantId: string): Promise<boolean> {
  try {
    const branchesRef = collection(db, `tenants/${tenantId}/branches`)
    const snapshot = await getDocs(branchesRef)
    return !snapshot.empty
  } catch (error) {
    console.error('Error checking branches:', error)
    return false
  }
}

/**
 * Initialize branches for a new tenant (called during onboarding)
 */
export async function initializeBranchesForTenant(tenantId: string, businessName?: string): Promise<Branch> {
  console.log('🏢 Initializing branches for new tenant:', tenantId)
  
  // Check if branches already exist
  const existingBranches = await getBranches(tenantId)
  if (existingBranches.length > 0) {
    console.log('✅ Branches already exist for tenant')
    return existingBranches[0] // Return the first branch
  }

  // Create default main branch
  const branchName = businessName ? `${businessName} - Main Branch` : 'Main Branch'
  const defaultBranch = await createDefaultBranch(tenantId, branchName)
  
  console.log('✅ Default branch created:', defaultBranch.name)
  return defaultBranch
}
