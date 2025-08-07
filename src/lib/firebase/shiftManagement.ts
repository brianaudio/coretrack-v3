import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  getDoc 
} from 'firebase/firestore'
import { db } from '../firebase'

export interface Shift {
  id: string
  employeeId: string
  employeeName: string
  employeeRole: string
  startTime: Timestamp
  endTime?: Timestamp
  location: string
  notes?: string
  isActive: boolean
  createdAt: Timestamp
  tenantId: string
}

export interface ActiveShift extends Omit<Shift, 'id'> {
  id: string
}

export interface CreateShift {
  employeeId: string
  employeeName: string
  employeeRole: string
  location: string
  notes?: string
}

// Start a new shift
export async function startShift(tenantId: string, shiftData: CreateShift): Promise<ActiveShift> {
  // First, end any existing active shifts for this employee
  await endActiveShifts(tenantId, shiftData.employeeId)

  const now = Timestamp.now()
  
  const shift = {
    ...shiftData,
    startTime: now,
    isActive: true,
    createdAt: now,
    tenantId
  }

  const docRef = await addDoc(collection(db, 'shifts'), shift)
  
  return {
    id: docRef.id,
    ...shift
  }
}

// End a shift
export async function endShift(tenantId: string, shiftId: string): Promise<void> {
  const shiftRef = doc(db, 'shifts', shiftId)
  await updateDoc(shiftRef, {
    endTime: Timestamp.now(),
    isActive: false
  })
}

// End all active shifts for an employee
export async function endActiveShifts(tenantId: string, employeeId: string): Promise<void> {
  const shiftsQuery = query(
    collection(db, 'shifts'),
    where('tenantId', '==', tenantId),
    where('employeeId', '==', employeeId),
    where('isActive', '==', true)
  )

  const snapshot = await getDocs(shiftsQuery)
  
  const promises = snapshot.docs.map(doc => 
    updateDoc(doc.ref, {
      endTime: Timestamp.now(),
      isActive: false
    })
  )

  await Promise.all(promises)
}

// End active shifts for an employee at a specific location (branch-specific)
export async function endActiveShiftsAtLocation(tenantId: string, employeeId: string, locationId: string): Promise<void> {
  const shiftsQuery = query(
    collection(db, 'shifts'),
    where('tenantId', '==', tenantId),
    where('employeeId', '==', employeeId),
    where('locationId', '==', locationId), // Filter by specific branch location
    where('isActive', '==', true)
  )

  const snapshot = await getDocs(shiftsQuery)
  
  const promises = snapshot.docs.map(doc => 
    updateDoc(doc.ref, {
      endTime: Timestamp.now(),
      isActive: false
    })
  )

  await Promise.all(promises)
}

// Get current active shift for an employee
export async function getCurrentShift(tenantId: string, employeeId?: string): Promise<ActiveShift | null> {
  const shiftsQuery = query(
    collection(db, 'shifts'),
    where('tenantId', '==', tenantId),
    ...(employeeId ? [where('employeeId', '==', employeeId)] : []),
    where('isActive', '==', true),
    orderBy('startTime', 'desc'),
    limit(1)
  )

  const snapshot = await getDocs(shiftsQuery)
  
  if (snapshot.empty) return null

  const doc = snapshot.docs[0]
  return {
    id: doc.id,
    ...doc.data()
  } as ActiveShift
}

// Get all active shifts (for managers)
export async function getActiveShifts(tenantId: string): Promise<ActiveShift[]> {
  const shiftsQuery = query(
    collection(db, 'shifts'),
    where('tenantId', '==', tenantId),
    where('isActive', '==', true),
    orderBy('startTime', 'desc')
  )

  const snapshot = await getDocs(shiftsQuery)
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as ActiveShift[]
}

// Get shift history
export async function getShiftHistory(tenantId: string, employeeId?: string, limit_count: number = 50): Promise<Shift[]> {
  const shiftsQuery = query(
    collection(db, 'shifts'),
    where('tenantId', '==', tenantId),
    ...(employeeId ? [where('employeeId', '==', employeeId)] : []),
    orderBy('startTime', 'desc'),
    limit(limit_count)
  )

  const snapshot = await getDocs(shiftsQuery)
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Shift[]
}

// Get shifts for a specific date range
export async function getShiftsByDateRange(
  tenantId: string, 
  startDate: Date, 
  endDate: Date,
  employeeId?: string
): Promise<Shift[]> {
  const startTimestamp = Timestamp.fromDate(startDate)
  const endTimestamp = Timestamp.fromDate(endDate)

  const shiftsQuery = query(
    collection(db, 'shifts'),
    where('tenantId', '==', tenantId),
    ...(employeeId ? [where('employeeId', '==', employeeId)] : []),
    where('startTime', '>=', startTimestamp),
    where('startTime', '<=', endTimestamp),
    orderBy('startTime', 'desc')
  )

  const snapshot = await getDocs(shiftsQuery)
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Shift[]
}

// Calculate shift duration in minutes
export function calculateShiftDuration(shift: Shift): number {
  const start = shift.startTime.toDate()
  const end = shift.endTime ? shift.endTime.toDate() : new Date()
  
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60))
}

// Get shift statistics
export async function getShiftStatistics(tenantId: string, employeeId?: string) {
  const shifts = await getShiftHistory(tenantId, employeeId, 100)
  
  const totalShifts = shifts.length
  const activeShifts = shifts.filter(s => s.isActive).length
  const completedShifts = shifts.filter(s => !s.isActive).length
  
  const totalMinutes = shifts
    .filter(s => !s.isActive)
    .reduce((sum, shift) => sum + calculateShiftDuration(shift), 0)
  
  const averageShiftDuration = completedShifts > 0 ? totalMinutes / completedShifts : 0
  
  return {
    totalShifts,
    activeShifts,
    completedShifts,
    totalHours: Math.floor(totalMinutes / 60),
    averageShiftDuration: Math.floor(averageShiftDuration),
    totalMinutes
  }
}
