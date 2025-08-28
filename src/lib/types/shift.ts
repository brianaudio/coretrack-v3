import { Timestamp } from 'firebase/firestore'

export interface ShiftData {
  id: string
  tenantId: string
  locationId: string
  date?: string
  shiftType?: 'morning' | 'afternoon' | 'evening' | 'overnight'
  startTime: Timestamp
  endTime: Timestamp | null
  staffOnDuty?: string[]
  managerId?: string
  status: 'active' | 'completed' | 'cancelled'
  createdAt: Timestamp
  updatedAt?: Timestamp
  completedAt?: Timestamp
  notes?: string
  // Financial summary fields (added during shift completion)
  name?: string
  totalSales?: number
  totalExpenses?: number
  totalOrders?: number
  createdBy?: string
  // Metadata for additional shift information
  metadata?: {
    cashFloat?: number
    notes?: string
    endingCash?: number
    endedBy?: string
    [key: string]: any
  }
}

export type CreateShiftData = Omit<ShiftData, 'id' | 'updatedAt' | 'completedAt' | 'totalSales' | 'totalExpenses' | 'totalOrders' | 'name' | 'createdBy' | 'startTime' | 'endTime'> & {
  startTime: string  // Time input string (e.g., "09:00")
  endTime: string    // Time input string (e.g., "17:00")
}

export interface ShiftTemplate {
  name: string
  shiftType: 'morning' | 'afternoon' | 'evening' | 'overnight'
  startTime: string
  endTime: string
  requiredStaff: number
}

export interface StaffMember {
  id: string
  name: string
  role: string
  isActive: boolean
}
