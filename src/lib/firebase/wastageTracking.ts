import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  updateDoc, 
  doc, 
  deleteDoc,
  Timestamp
} from 'firebase/firestore'
import { db } from '../firebase'
import { uploadBytes, ref, getDownloadURL } from 'firebase/storage'
import { storage } from '../firebase'

export interface WastageEntry {
  id?: string
  tenantId: string
  branchId: string
  itemId: string
  itemName: string
  quantity: number
  unitCost: number
  totalCost: number
  reason: string
  category: 'expired' | 'damaged' | 'spillage' | 'theft' | 'other'
  shiftId?: string
  shiftName?: string
  reportedBy: string
  reportedByName: string
  timestamp: Timestamp
  photoUrl?: string
  notes?: string
  status: 'pending' | 'confirmed' | 'disputed'
  approvedBy?: string
  approvedAt?: Timestamp
}

export interface WastageThreshold {
  id?: string
  tenantId: string
  branchId: string
  itemId: string
  itemName: string
  dailyThreshold: number
  weeklyThreshold: number
  monthlyThreshold: number
  alertEnabled: boolean
  lastAlertSent?: Timestamp
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface WasteReport {
  id?: string
  tenantId: string
  branchId: string
  reportDate: Timestamp
  totalItems: number
  totalCost: number
  categorySummary: {
    expired: { items: number; cost: number }
    damaged: { items: number; cost: number }
    spillage: { items: number; cost: number }
    theft: { items: number; cost: number }
    other: { items: number; cost: number }
  }
  topWastedItems: Array<{
    itemId: string
    itemName: string
    quantity: number
    cost: number
  }>
  generatedAt: Timestamp
  generatedBy: string
}

// Add wastage entry
export async function addWastageEntry(entry: Omit<WastageEntry, 'id'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'wastageEntries'), {
      ...entry,
      timestamp: Timestamp.now(),
      status: 'pending'
    })
    console.log('✅ Wastage entry created:', docRef.id)
    return docRef.id
  } catch (error) {
    console.error('❌ Error creating wastage entry:', error)
    throw error
  }
}

// Upload wastage photo
export async function uploadWastagePhoto(file: File, wastageId: string): Promise<string> {
  try {
    const storageRef = ref(storage, `wastage-photos/${wastageId}/${file.name}`)
    const snapshot = await uploadBytes(storageRef, file)
    const downloadURL = await getDownloadURL(snapshot.ref)
    console.log('✅ Wastage photo uploaded:', downloadURL)
    return downloadURL
  } catch (error) {
    console.error('❌ Error uploading wastage photo:', error)
    throw error
  }
}

// Get wastage entries for a branch
export async function getWastageEntries(
  tenantId: string, 
  branchId: string, 
  startDate?: Date, 
  endDate?: Date
): Promise<WastageEntry[]> {
  try {
    console.log('🔍 Fetching wastage entries:', { tenantId, branchId, startDate, endDate })
    
    // Use a simpler query structure to avoid index requirements
    let q = query(
      collection(db, 'wastageEntries'),
      where('tenantId', '==', tenantId),
      where('branchId', '==', branchId)
    )

    console.log('📊 Executing wastage query...')
    const snapshot = await getDocs(q)
    let entries = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as WastageEntry))

    console.log(`✅ Retrieved ${entries.length} raw wastage entries`)

    // Filter by date range in memory if specified
    if (startDate && endDate) {
      entries = entries.filter(entry => {
        const entryDate = entry.timestamp.toDate()
        return entryDate >= startDate && entryDate <= endDate
      })
      console.log(`📅 Filtered to ${entries.length} entries within date range`)
    }

    // Sort by timestamp (newest first) in memory
    entries.sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis())

    console.log(`✅ Returning ${entries.length} sorted wastage entries`)
    return entries
  } catch (error) {
    console.error('❌ Error fetching wastage entries:', error)
    if (error instanceof Error && 'code' in error && error.code === 'failed-precondition') {
      console.log('🔥 This query requires a Firestore index. Please create it in Firebase Console.')
      console.log('📋 Required index: tenantId (asc), branchId (asc), timestamp (desc)')
      // Return empty array for now to prevent app crash
      return []
    }
    throw error
  }
}

// Get today's wastage entries
export async function getTodayWastageEntries(tenantId: string, branchId: string): Promise<WastageEntry[]> {
  const today = new Date()
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
  
  return getWastageEntries(tenantId, branchId, startOfToday, endOfToday)
}

// Update wastage threshold
export async function updateWastageThreshold(threshold: WastageThreshold): Promise<void> {
  try {
    if (threshold.id) {
      await updateDoc(doc(db, 'wastageThresholds', threshold.id), {
        ...threshold,
        updatedAt: Timestamp.now()
      })
    } else {
      await addDoc(collection(db, 'wastageThresholds'), {
        ...threshold,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })
    }
    console.log('✅ Wastage threshold updated')
  } catch (error) {
    console.error('❌ Error updating wastage threshold:', error)
    throw error
  }
}

// Get wastage thresholds for a branch
export async function getWastageThresholds(tenantId: string, branchId: string): Promise<WastageThreshold[]> {
  try {
    console.log('🔍 Fetching wastage thresholds:', { tenantId, branchId })
    
    const q = query(
      collection(db, 'wastageThresholds'),
      where('tenantId', '==', tenantId),
      where('branchId', '==', branchId)
    )

    const snapshot = await getDocs(q)
    const thresholds = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as WastageThreshold))

    console.log(`✅ Retrieved ${thresholds.length} wastage thresholds`)
    return thresholds
  } catch (error) {
    console.error('❌ Error fetching wastage thresholds:', error)
    if (error instanceof Error && 'code' in error && error.code === 'failed-precondition') {
      console.log('🔥 This query requires a Firestore index. Please create it in Firebase Console.')
      console.log('📋 Required index: tenantId (asc), branchId (asc)')
      // Return empty array for now to prevent app crash
      return []
    }
    throw error
  }
}

// Check if wastage exceeds thresholds
export async function checkWastageThresholds(tenantId: string, branchId: string, itemId: string): Promise<{
  exceeded: boolean
  thresholdType?: 'daily' | 'weekly' | 'monthly'
  currentWastage: number
  threshold: number
}> {
  try {
    // Get threshold for this item
    const thresholds = await getWastageThresholds(tenantId, branchId)
    const itemThreshold = thresholds.find(t => t.itemId === itemId)
    
    if (!itemThreshold || !itemThreshold.alertEnabled) {
      return { exceeded: false, currentWastage: 0, threshold: 0 }
    }

    // Calculate current wastage for different periods
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()))
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

    // Check daily threshold
    const dailyEntries = await getWastageEntries(tenantId, branchId, startOfDay, new Date())
    const dailyWastage = dailyEntries
      .filter(e => e.itemId === itemId)
      .reduce((sum, e) => sum + e.quantity, 0)

    if (dailyWastage >= itemThreshold.dailyThreshold) {
      return {
        exceeded: true,
        thresholdType: 'daily',
        currentWastage: dailyWastage,
        threshold: itemThreshold.dailyThreshold
      }
    }

    // Check weekly threshold
    const weeklyEntries = await getWastageEntries(tenantId, branchId, startOfWeek, new Date())
    const weeklyWastage = weeklyEntries
      .filter(e => e.itemId === itemId)
      .reduce((sum, e) => sum + e.quantity, 0)

    if (weeklyWastage >= itemThreshold.weeklyThreshold) {
      return {
        exceeded: true,
        thresholdType: 'weekly',
        currentWastage: weeklyWastage,
        threshold: itemThreshold.weeklyThreshold
      }
    }

    // Check monthly threshold
    const monthlyEntries = await getWastageEntries(tenantId, branchId, startOfMonth, new Date())
    const monthlyWastage = monthlyEntries
      .filter(e => e.itemId === itemId)
      .reduce((sum, e) => sum + e.quantity, 0)

    if (monthlyWastage >= itemThreshold.monthlyThreshold) {
      return {
        exceeded: true,
        thresholdType: 'monthly',
        currentWastage: monthlyWastage,
        threshold: itemThreshold.monthlyThreshold
      }
    }

    return { exceeded: false, currentWastage: dailyWastage, threshold: itemThreshold.dailyThreshold }
  } catch (error) {
    console.error('❌ Error checking wastage thresholds:', error)
    return { exceeded: false, currentWastage: 0, threshold: 0 }
  }
}

// Generate daily wastage report
export async function generateDailyWastageReport(
  tenantId: string, 
  branchId: string, 
  reportDate: Date = new Date()
): Promise<WasteReport> {
  try {
    const startOfDay = new Date(reportDate.getFullYear(), reportDate.getMonth(), reportDate.getDate())
    const endOfDay = new Date(reportDate.getFullYear(), reportDate.getMonth(), reportDate.getDate() + 1)

    const entries = await getWastageEntries(tenantId, branchId, startOfDay, endOfDay)

    // Calculate summary statistics
    const totalItems = entries.reduce((sum, e) => sum + e.quantity, 0)
    const totalCost = entries.reduce((sum, e) => sum + e.totalCost, 0)

    // Category summary
    const categorySummary = {
      expired: { items: 0, cost: 0 },
      damaged: { items: 0, cost: 0 },
      spillage: { items: 0, cost: 0 },
      theft: { items: 0, cost: 0 },
      other: { items: 0, cost: 0 }
    }

    entries.forEach(entry => {
      categorySummary[entry.category].items += entry.quantity
      categorySummary[entry.category].cost += entry.totalCost
    })

    // Top wasted items
    const itemSummary: { [key: string]: { name: string; quantity: number; cost: number } } = {}
    entries.forEach(entry => {
      if (!itemSummary[entry.itemId]) {
        itemSummary[entry.itemId] = { name: entry.itemName, quantity: 0, cost: 0 }
      }
      itemSummary[entry.itemId].quantity += entry.quantity
      itemSummary[entry.itemId].cost += entry.totalCost
    })

    const topWastedItems = Object.entries(itemSummary)
      .map(([itemId, data]) => ({ itemId, itemName: data.name, quantity: data.quantity, cost: data.cost }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10)

    const report: WasteReport = {
      tenantId,
      branchId,
      reportDate: Timestamp.fromDate(reportDate),
      totalItems,
      totalCost,
      categorySummary,
      topWastedItems,
      generatedAt: Timestamp.now(),
      generatedBy: 'system'
    }

    // Save report to database
    const docRef = await addDoc(collection(db, 'wasteReports'), report)
    report.id = docRef.id

    console.log('✅ Daily wastage report generated:', report.id)
    return report
  } catch (error) {
    console.error('❌ Error generating daily wastage report:', error)
    throw error
  }
}

// Approve wastage entry
export async function approveWastageEntry(entryId: string, approvedBy: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'wastageEntries', entryId), {
      status: 'confirmed',
      approvedBy,
      approvedAt: Timestamp.now()
    })
    console.log('✅ Wastage entry approved:', entryId)
  } catch (error) {
    console.error('❌ Error approving wastage entry:', error)
    throw error
  }
}

// Delete wastage entry
export async function deleteWastageEntry(entryId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'wastageEntries', entryId))
    console.log('✅ Wastage entry deleted:', entryId)
  } catch (error) {
    console.error('❌ Error deleting wastage entry:', error)
    throw error
  }
}
