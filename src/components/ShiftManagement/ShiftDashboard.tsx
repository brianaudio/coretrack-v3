'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '../../lib/context/AuthContext'
import { useBranch } from '../../lib/context/BranchContext'
import { useToast } from '../ui/Toast'
import { collection, query, where, getDocs, orderBy, limit, updateDoc, doc, Timestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { getBranchLocationId } from '../../lib/utils/branchUtils'

interface ShiftData {
  id: string
  date: string
  shiftType: 'morning' | 'afternoon' | 'evening' | 'overnight'
  startTime: string
  endTime: string
  staffOnDuty: string[]
  managerId: string
  status: 'active' | 'completed'
  createdAt: Timestamp
  completedAt?: Timestamp
}

interface ShiftStats {
  totalShifts: number
  activeShifts: number
  completedShifts: number
  staffCount: number
}

export default function ShiftDashboard() {
  const { profile } = useAuth()
  const { selectedBranch } = useBranch()
  const { addToast } = useToast()
  
  const [shifts, setShifts] = useState<ShiftData[]>([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({
    totalShifts: 0,
    activeShifts: 0,
    completedShifts: 0,
    staffCount: 0
  })
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today')

  useEffect(() => {
    if (profile?.tenantId && selectedBranch) {
      loadShifts()
    }
  }, [profile?.tenantId, selectedBranch, selectedPeriod])

  const loadShifts = async () => {
    if (!profile?.tenantId || !selectedBranch) return

    try {
      setLoading(true)
      
      const locationId = getBranchLocationId(selectedBranch.id)
      const shiftsRef = collection(db, `tenants/${profile.tenantId}/shifts`)
      let q

      const now = new Date()
      let startDate = new Date()

      switch (selectedPeriod) {
        case 'today':
          startDate.setHours(0, 0, 0, 0)
          break
        case 'week':
          startDate.setDate(now.getDate() - 7)
          break
        case 'month':
          startDate.setDate(now.getDate() - 30)
          break
      }

      q = query(
        shiftsRef,
        where('locationId', '==', locationId), // SECURITY: Filter by branch
        where('createdAt', '>=', Timestamp.fromDate(startDate)),
        orderBy('createdAt', 'desc'),
        limit(50)
      )

      const snapshot = await getDocs(q)
      const shiftsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ShiftData[]

      setShifts(shiftsData)
      
      // Calculate stats
      const activeShifts = shiftsData.filter(s => s.status === 'active').length
      const completedShifts = shiftsData.filter(s => s.status === 'completed').length
      const allStaff = new Set<string>()
      shiftsData.forEach(shift => {
        shift.staffOnDuty.forEach(staff => allStaff.add(staff))
      })

      setStats({
        totalShifts: shiftsData.length,
        activeShifts,
        completedShifts,
        staffCount: allStaff.size
      })
    } catch (error) {
      console.error('Error loading shifts:', error)
      addToast('Failed to load shift data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const endShift = async (shiftId: string) => {
    if (!profile?.tenantId) return

    try {
      const shiftRef = doc(db, `tenants/${profile.tenantId}/shifts`, shiftId)
      await updateDoc(shiftRef, {
        status: 'completed',
        completedAt: Timestamp.now()
      })

      addToast('Shift ended successfully', 'success')
      loadShifts() // Reload data
    } catch (error) {
      console.error('Error ending shift:', error)
      addToast('Failed to end shift', 'error')
    }
  }

  const getShiftStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'completed':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  const getShiftTypeColor = (type: string) => {
    switch (type) {
      case 'morning':
        return 'bg-blue-100 text-blue-800'
      case 'afternoon':
        return 'bg-orange-100 text-orange-800'
      case 'evening':
        return 'bg-purple-100 text-purple-800'
      case 'overnight':
        return 'bg-indigo-100 text-indigo-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (timestamp: Timestamp) => {
    return timestamp.toDate().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (timestamp: Timestamp) => {
    return timestamp.toDate().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="h-8 bg-surface-200 rounded-lg w-48"></div>
            <div className="h-4 bg-surface-200 rounded w-64 mt-2"></div>
          </div>
          <div className="h-10 bg-surface-200 rounded-lg w-48"></div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-surface-200 rounded-xl"></div>
          ))}
        </div>

        {/* Table Skeleton */}
        <div className="bg-white rounded-xl shadow-lg border border-surface-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-surface-200">
            <div className="h-6 bg-surface-200 rounded w-32"></div>
          </div>
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-4 bg-surface-200 rounded w-24"></div>
                <div className="h-4 bg-surface-200 rounded w-20"></div>
                <div className="h-4 bg-surface-200 rounded w-32"></div>
                <div className="h-4 bg-surface-200 rounded w-28"></div>
                <div className="h-4 bg-surface-200 rounded w-16"></div>
                <div className="h-4 bg-surface-200 rounded w-20"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Shift Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor and manage staff shifts across your operation</p>
        </div>
        
        {/* Period Selector */}
        <div className="flex items-center bg-surface-100 rounded-lg p-1 border border-surface-200">
          {(['today', 'week', 'month'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                selectedPeriod === period
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'text-surface-600 hover:text-surface-900 hover:bg-surface-200'
              }`}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Enhanced Stats Cards with Gradients */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Total Shifts Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-100 text-sm font-medium">Total Shifts</p>
              <p className="text-3xl font-bold mt-1">{stats.totalShifts}</p>
              <p className="text-primary-200 text-xs mt-1">
                {selectedPeriod === 'today' ? 'Today' : selectedPeriod === 'week' ? 'This Week' : 'This Month'}
              </p>
            </div>
            <div className="bg-white/20 rounded-full p-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          {/* Decorative Element */}
          <div className="absolute -top-4 -right-4 opacity-10">
            <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {/* Active Shifts Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Active Shifts</p>
              <p className="text-3xl font-bold mt-1">{stats.activeShifts}</p>
              <p className="text-green-200 text-xs mt-1">
                Currently running
              </p>
            </div>
            <div className="bg-white/20 rounded-full p-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="absolute -top-4 -right-4 opacity-10">
            <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {/* Completed Shifts Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-surface-600 to-surface-700 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-surface-200 text-sm font-medium">Completed</p>
              <p className="text-3xl font-bold mt-1">{stats.completedShifts}</p>
              <p className="text-surface-300 text-xs mt-1">
                Finished shifts
              </p>
            </div>
            <div className="bg-white/20 rounded-full p-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <div className="absolute -top-4 -right-4 opacity-10">
            <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        {/* Staff Members Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Team Members</p>
              <p className="text-3xl font-bold mt-1">{stats.staffCount}</p>
              <p className="text-purple-200 text-xs mt-1">
                Active staff
              </p>
            </div>
            <div className="bg-white/20 rounded-full p-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
          </div>
          <div className="absolute -top-4 -right-4 opacity-10">
            <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Professional Shifts Table */}
      <div className="bg-white rounded-xl shadow-lg border border-surface-200 overflow-hidden">
        {/* Table Header */}
        <div className="bg-gradient-to-r from-surface-50 to-surface-100 px-6 py-4 border-b border-surface-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-surface-900">Recent Shifts</h3>
              <p className="text-sm text-surface-600 mt-1">Track and manage shift operations</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="bg-white rounded-lg px-3 py-1.5 border border-surface-300">
                <span className="text-sm font-medium text-surface-700">
                  {shifts.length} shift{shifts.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-surface-200">
            <thead className="bg-surface-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-surface-600 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-surface-600 uppercase tracking-wider">
                  Shift Type
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-surface-600 uppercase tracking-wider">
                  Staff on Duty
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-surface-600 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-surface-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-surface-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-surface-100">
              {shifts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <div className="bg-surface-100 rounded-full p-4 mb-4">
                        <svg className="w-8 h-8 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h4 className="text-surface-900 font-medium mb-1">No shifts found</h4>
                      <p className="text-surface-500 text-sm">No shifts were found for the selected period</p>
                    </div>
                  </td>
                </tr>
              ) : (
                shifts.map((shift) => (
                  <tr key={shift.id} className="hover:bg-surface-50 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-semibold text-surface-900">
                          {formatDate(shift.createdAt)}
                        </div>
                        <div className="text-sm text-surface-500">
                          Started at {formatTime(shift.createdAt)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getShiftTypeColor(shift.shiftType)}`}>
                        {shift.shiftType.charAt(0).toUpperCase() + shift.shiftType.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <div className="flex -space-x-1">
                          {shift.staffOnDuty.slice(0, 3).map((staff, index) => (
                            <div
                              key={index}
                              className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center text-xs font-medium text-white border border-white"
                              title={staff}
                            >
                              {staff.charAt(0).toUpperCase()}
                            </div>
                          ))}
                          {shift.staffOnDuty.length > 3 && (
                            <div className="w-6 h-6 bg-surface-400 rounded-full flex items-center justify-center text-xs font-medium text-white border border-white">
                              +{shift.staffOnDuty.length - 3}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-surface-900">
                            {shift.staffOnDuty.length} member{shift.staffOnDuty.length !== 1 ? 's' : ''}
                          </div>
                          {shift.staffOnDuty.length <= 3 && (
                            <div className="text-xs text-surface-500">
                              {shift.staffOnDuty.join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-surface-900">{shift.startTime} - {shift.endTime}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${getShiftStatusColor(shift.status)}`}>
                        <div className={`w-1.5 h-1.5 rounded-full mr-2 ${
                          shift.status === 'active' ? 'bg-green-500' : 'bg-surface-400'
                        }`}></div>
                        {shift.status.charAt(0).toUpperCase() + shift.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {shift.status === 'active' && (profile?.role === 'manager' || profile?.role === 'owner') && (
                        <button
                          onClick={() => endShift(shift.id)}
                          className="inline-flex items-center px-3 py-1.5 bg-red-50 text-red-700 text-sm font-medium rounded-lg hover:bg-red-100 transition-colors duration-200"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          End Shift
                        </button>
                      )}
                      {shift.status === 'completed' && (
                        <span className="inline-flex items-center px-3 py-1.5 bg-surface-100 text-surface-600 text-sm font-medium rounded-lg">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Completed
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
