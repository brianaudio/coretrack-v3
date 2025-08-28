import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  writeBatch,
  getDoc
} from 'firebase/firestore'
import { db } from '../firebase'
import { waitForOfflinePersistence, isOfflinePersistenceEnabled } from '../firebase'
import type { ShiftData, CreateShiftData } from '../types/shift'

// Shift CRUD Operations
export async function createShift(shiftData: CreateShiftData): Promise<string> {
  try {
    // Wait for Firebase offline persistence to be ready (with timeout for offline scenarios)
    await waitForOfflinePersistence(2000)
    
    console.log('🔄 Creating shift:', { 
      locationId: shiftData.locationId, 
      status: shiftData.status,
      offline: !navigator.onLine 
    });
    
    const shiftsRef = collection(db, 'tenants', shiftData.tenantId, 'shifts')
    const docRef = await addDoc(shiftsRef, {
      ...shiftData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    })
    
    console.log('✅ Shift created successfully:', docRef.id);
    return docRef.id
  } catch (error) {
    console.error('❌ Error creating shift:', error)
    
    // Check if this is a network-related error when offline
    if (!navigator.onLine && error instanceof Error) {
      if (error.message.includes('Failed to get document') || 
          error.message.includes('offline') ||
          error.message.includes('network')) {
        console.log('📱 Offline mode detected - shift will be created when network is restored');
        // Still throw the error but with better context
        throw new Error('Shift will be created when you come back online. Your data is safely queued.');
      }
    }
    
    if (!isOfflinePersistenceEnabled()) {
      console.warn('⚠️ Firebase offline persistence not enabled - shift may not sync properly')
    }
    throw error
  }
}

export async function updateShift(tenantId: string, shiftId: string, updates: Partial<ShiftData>): Promise<void> {
  try {
    await waitForOfflinePersistence(2000)
    const shiftRef = doc(db, 'tenants', tenantId, 'shifts', shiftId)
    await updateDoc(shiftRef, {
      ...updates,
      updatedAt: Timestamp.now()
    })
  } catch (error) {
    console.error('Error updating shift:', error)
    throw error
  }
}

export async function getActiveShift(tenantId: string, locationId: string): Promise<ShiftData | null> {
  try {
    await waitForOfflinePersistence(2000)
    const shiftsRef = collection(db, 'tenants', tenantId, 'shifts')
    
    // Temporary workaround: Use simpler query while composite index is building
    // This query only uses locationId to avoid the composite index requirement
    const q = query(
      shiftsRef,
      where('locationId', '==', locationId)
    )
    
    const snapshot = await getDocs(q)
    
    if (snapshot.empty) {
      return null
    }
    
    // Client-side filtering and sorting to find the most recent active shift
    const activeShifts = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as ShiftData))
      .filter(shift => shift.status === 'active')
      .sort((a, b) => {
        // Sort by createdAt timestamp (most recent first)
        const aTime = a.createdAt?.seconds || 0
        const bTime = b.createdAt?.seconds || 0
        return bTime - aTime
      })
    
    return activeShifts.length > 0 ? activeShifts[0] : null
  } catch (error) {
    console.error('Error getting active shift:', error)
    throw error
  }
}

export async function getShiftHistory(
  tenantId: string, 
  locationId: string, 
  limitCount: number = 20
): Promise<ShiftData[]> {
  try {
    await waitForOfflinePersistence(2000)
    const shiftsRef = collection(db, 'tenants', tenantId, 'shifts')
    const q = query(
      shiftsRef,
      where('locationId', '==', locationId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    )
    
    const snapshot = await getDocs(q)
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ShiftData[]
  } catch (error) {
    console.error('Error getting shift history:', error)
    throw error
  }
}

// Archive Operations
export async function archiveShiftData(
  tenantId: string, 
  locationId: string, 
  shiftId: string,
  archiveDate?: string
): Promise<void> {
  try {
    await waitForOfflinePersistence()
    const batch = writeBatch(db)
    const dateStr = archiveDate || new Date().toISOString().split('T')[0] // YYYY-MM-DD
    
    // Archive collections to move
    const collectionsToArchive = [
      'pos_orders',
      'pos_items', 
      'expenses',
      'inventory_transactions'
    ]
    
    console.log(`Starting archive process for shift ${shiftId} on ${dateStr}`)
    
    for (const collectionName of collectionsToArchive) {
      // Get current data
      const currentRef = collection(db, 'tenants', tenantId, 'locations', locationId, collectionName)
      const snapshot = await getDocs(currentRef)
      
      if (!snapshot.empty) {
        // Create archive collection path
        const archiveRef = collection(
          db, 
          'tenants', 
          tenantId, 
          'archives', 
          dateStr, 
          'locations', 
          locationId, 
          collectionName
        )
        
        // Copy documents to archive
        snapshot.docs.forEach(docSnapshot => {
          const archiveDocRef = doc(archiveRef, docSnapshot.id)
          batch.set(archiveDocRef, {
            ...docSnapshot.data(),
            archivedAt: Timestamp.now(),
            shiftId: shiftId,
            originalCollection: collectionName
          })
        })
        
        // Delete original documents (optional - for reset)
        // Uncomment if you want to clear current data after archiving
        // snapshot.docs.forEach(docSnapshot => {
        //   batch.delete(docSnapshot.ref)
        // })
      }
    }
    
    // Create archive metadata
    const archiveMetaRef = doc(db, 'tenants', tenantId, 'archives', dateStr, 'metadata', locationId)
    batch.set(archiveMetaRef, {
      shiftId,
      locationId,
      archiveDate: dateStr,
      archivedAt: Timestamp.now(),
      collectionsArchived: collectionsToArchive,
      status: 'completed',
      archivedBy: 'system' // TODO: Get from auth context
    })
    
    // Commit the batch
    await batch.commit()
    
    console.log(`Archive completed for shift ${shiftId}`)
  } catch (error) {
    console.error('Error archiving shift data:', error)
    throw error
  }
}

// Daily Reset Operations
export async function performDailyReset(tenantId: string, locationId: string): Promise<void> {
  try {
    await waitForOfflinePersistence()
    const batch = writeBatch(db)
    const today = new Date().toISOString().split('T')[0]
    
    // Collections to reset (clear current data)
    const collectionsToReset = [
      'pos_orders',
      'expenses',
      'inventory_transactions'
    ]
    
    console.log(`Performing daily reset for location ${locationId}`)
    
    for (const collectionName of collectionsToReset) {
      const collectionRef = collection(db, 'tenants', tenantId, 'locations', locationId, collectionName)
      const snapshot = await getDocs(collectionRef)
      
      // Delete all documents in collection
      snapshot.docs.forEach(docSnapshot => {
        batch.delete(docSnapshot.ref)
      })
    }
    
    // Create reset log
    const resetLogRef = collection(db, 'tenants', tenantId, 'reset_logs')
    batch.set(doc(resetLogRef), {
      locationId,
      resetDate: today,
      resetAt: Timestamp.now(),
      collectionsReset: collectionsToReset,
      status: 'completed',
      resetBy: 'system'
    })
    
    await batch.commit()
    
    console.log(`Daily reset completed for location ${locationId}`)
  } catch (error) {
    console.error('Error performing daily reset:', error)
    throw error
  }
}

// Shift Summary Calculations
export async function calculateShiftSummary(
  tenantId: string, 
  locationId: string, 
  startTime: Timestamp,
  endTime?: Timestamp
): Promise<{
  totalSales: number
  totalExpenses: number
  totalOrders: number
  netProfit: number
  ordersByStatus: Record<string, number>
}> {
  try {
    await waitForOfflinePersistence()
    const endTimeFilter = endTime || Timestamp.now()
    
    // Get POS orders for the shift period
    const ordersRef = collection(db, 'tenants', tenantId, 'locations', locationId, 'pos_orders')
    const ordersQuery = query(
      ordersRef,
      where('createdAt', '>=', startTime),
      where('createdAt', '<=', endTimeFilter)
    )
    const ordersSnapshot = await getDocs(ordersQuery)
    
    // Calculate order metrics
    let totalSales = 0
    let totalOrders = 0
    const ordersByStatus: Record<string, number> = {}
    
    ordersSnapshot.docs.forEach(doc => {
      const order = doc.data()
      totalOrders++
      
      if (order.status === 'completed') {
        totalSales += order.total || 0
      }
      
      ordersByStatus[order.status] = (ordersByStatus[order.status] || 0) + 1
    })
    
    // Get expenses for the shift period - filter by date field, not createdAt
    const expensesRef = collection(db, 'tenants', tenantId, 'locations', locationId, 'expenses')
    const expensesQuery = query(
      expensesRef,
      where('date', '>=', startTime),
      where('date', '<=', endTimeFilter)
    )
    const expensesSnapshot = await getDocs(expensesQuery)
    
    const totalExpenses = expensesSnapshot.docs.reduce((sum, doc) => {
      return sum + (doc.data().amount || 0)
    }, 0)
    
    // Calculate net profit (simplified)
    const netProfit = totalSales - totalExpenses
    
    return {
      totalSales,
      totalExpenses,
      totalOrders,
      netProfit,
      ordersByStatus
    }
  } catch (error) {
    console.error('Error calculating shift summary:', error)
    throw error
  }
}

// Archive Retrieval
export async function getArchivedData(
  tenantId: string,
  locationId: string,
  archiveDate: string,
  collectionName: string
): Promise<any[]> {
  try {
    await waitForOfflinePersistence()
    const archiveRef = collection(
      db,
      'tenants',
      tenantId,
      'archives',
      archiveDate,
      'locations',
      locationId,
      collectionName
    )
    
    const snapshot = await getDocs(archiveRef)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error getting archived data:', error)
    throw error
  }
}

// Get available archive dates
export async function getAvailableArchiveDates(
  tenantId: string,
  locationId: string
): Promise<string[]> {
  try {
    await waitForOfflinePersistence()
    const archivesRef = collection(db, 'tenants', tenantId, 'archives')
    const snapshot = await getDocs(archivesRef)
    
    // Filter archives that have data for this location
    const dates: string[] = []
    for (const docSnapshot of snapshot.docs) {
      const metadataRef = doc(db, 'tenants', tenantId, 'archives', docSnapshot.id, 'metadata', locationId)
      const metadataDoc = await getDoc(metadataRef)
      
      if (metadataDoc.exists()) {
        dates.push(docSnapshot.id)
      }
    }
    
    return dates.sort((a, b) => b.localeCompare(a)) // Most recent first
  } catch (error) {
    console.error('Error getting archive dates:', error)
    throw error
  }
}
