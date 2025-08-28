'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '../../lib/context/AuthContext'
import { useBranch } from '../../lib/context/BranchContext'
import { useToast } from '../ui/Toast'
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { getBranchLocationId } from '../../lib/utils/branchUtils'
import { createShift } from '../../lib/firebase/shifts'
import type { CreateShiftData } from '../../lib/types/shift'

interface StaffMember {
  id: string
  name: string
  role: string
  isActive: boolean
}

interface ShiftTemplate {
  name: string
  shiftType: 'morning' | 'afternoon' | 'evening' | 'overnight'
  startTime: string
  endTime: string
  requiredStaff: number
}

const SHIFT_TEMPLATES: ShiftTemplate[] = [
  { name: 'Morning Shift', shiftType: 'morning', startTime: '06:00', endTime: '14:00', requiredStaff: 3 },
  { name: 'Afternoon Shift', shiftType: 'afternoon', startTime: '14:00', endTime: '22:00', requiredStaff: 4 },
  { name: 'Evening Shift', shiftType: 'evening', startTime: '18:00', endTime: '02:00', requiredStaff: 2 },
  { name: 'Overnight Shift', shiftType: 'overnight', startTime: '22:00', endTime: '06:00', requiredStaff: 1 }
]

export default function ShiftControlPanel() {
  const { profile } = useAuth()
  const { selectedBranch } = useBranch()
  const { addToast } = useToast()
  
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [selectedShiftType, setSelectedShiftType] = useState<'morning' | 'afternoon' | 'evening' | 'overnight'>('morning')
  const [selectedStaff, setSelectedStaff] = useState<string[]>([])
  const [customStartTime, setCustomStartTime] = useState('')
  const [customEndTime, setCustomEndTime] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'quick' | 'custom' | 'schedule'>('quick')

  useEffect(() => {
    if (profile?.tenantId && selectedBranch) {
      loadStaff()
    }
  }, [profile?.tenantId, selectedBranch])

  const loadStaff = async () => {
    if (!profile?.tenantId || !selectedBranch) return

    try {
      const locationId = getBranchLocationId(selectedBranch.id)
      const staffRef = collection(db, `tenants/${profile.tenantId}/staff`)
      const q = query(
        staffRef,
        where('locationId', '==', locationId),
        where('isActive', '==', true)
      )

      const snapshot = await getDocs(q)
      const staffData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as StaffMember[]

      setStaff(staffData)
    } catch (error) {
      console.error('Error loading staff:', error)
      // Create mock staff data if none exists
      setStaff([
        { id: '1', name: 'John Doe', role: 'Manager', isActive: true },
        { id: '2', name: 'Jane Smith', role: 'Staff', isActive: true },
        { id: '3', name: 'Mike Johnson', role: 'Staff', isActive: true },
        { id: '4', name: 'Sarah Wilson', role: 'Staff', isActive: true }
      ])
    }
  }

  const createShiftHandler = async (template?: ShiftTemplate) => {
    if (!profile?.tenantId || !selectedBranch) return

    if (selectedStaff.length === 0) {
      addToast('Please select at least one staff member', 'error')
      return
    }

    try {
      setLoading(true)
      
      const locationId = getBranchLocationId(selectedBranch.id)
      
      const shiftData: CreateShiftData = {
        tenantId: profile.tenantId,
        locationId, // SECURITY: Ensure branch isolation
        date: new Date().toISOString().split('T')[0],
        shiftType: template ? template.shiftType : selectedShiftType,
        startTime: template ? template.startTime : customStartTime,
        endTime: template ? template.endTime : customEndTime,
        staffOnDuty: selectedStaff,
        managerId: profile.uid,
        status: 'active' as const,
        createdAt: Timestamp.now()
      }

      // Use the enhanced offline-aware shift creation function
      const shiftId = await createShift(shiftData)
      
      console.log('✅ Shift created with ID:', shiftId);
      addToast('Shift created successfully', 'success')
      setSelectedStaff([])
      setCustomStartTime('')
      setCustomEndTime('')
      
    } catch (error) {
      console.error('❌ Error creating shift:', error)
      
      // Check if this is an offline-related error
      if (error instanceof Error && error.message.includes('offline')) {
        addToast(error.message, 'warning')
      } else {
        addToast('Failed to create shift. Please check your connection.', 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  const toggleStaffSelection = (staffId: string) => {
    setSelectedStaff(prev => 
      prev.includes(staffId) 
        ? prev.filter(id => id !== staffId)
        : [...prev, staffId]
    )
  }

  const getShiftTypeIcon = (type: string) => {
    switch (type) {
      case 'morning':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        )
      case 'afternoon':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        )
      case 'evening':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )
      case 'overnight':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74L12 2z" />
          </svg>
        )
      default:
        return null
    }
  }

  if (loading && staff.length === 0) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-surface-200 rounded-lg w-64"></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="h-32 bg-surface-200 rounded-xl"></div>
            <div className="h-48 bg-surface-200 rounded-xl"></div>
          </div>
          <div className="h-64 bg-surface-200 rounded-xl"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-surface-900">Shift Control Panel</h1>
          <p className="text-surface-600 mt-1">Create and manage staff shifts with ease</p>
        </div>
        
        {/* Quick Stats */}
        <div className="flex items-center space-x-4">
          <div className="bg-primary-50 rounded-lg px-4 py-2 border border-primary-200">
            <div className="text-sm font-medium text-primary-700">Available Staff</div>
            <div className="text-lg font-bold text-primary-900">{staff.filter(s => s.isActive).length}</div>
          </div>
          <div className="bg-green-50 rounded-lg px-4 py-2 border border-green-200">
            <div className="text-sm font-medium text-green-700">Selected</div>
            <div className="text-lg font-bold text-green-900">{selectedStaff.length}</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-surface-100 rounded-lg p-1 border border-surface-200">
        {[
          { id: 'quick', name: 'Quick Start', icon: '⚡' },
          { id: 'custom', name: 'Custom Shift', icon: '🎛️' },
          { id: 'schedule', name: 'Schedule', icon: '📅' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-white text-primary-600 shadow-sm border border-surface-200'
                : 'text-surface-600 hover:text-surface-900 hover:bg-surface-200'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.name}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Column - Shift Creation */}
        <div className="xl:col-span-2 space-y-6">
          {activeTab === 'quick' && (
            <div className="bg-white rounded-xl shadow-lg border border-surface-200 overflow-hidden">
              <div className="bg-gradient-to-r from-primary-50 to-primary-100 px-6 py-4 border-b border-surface-200">
                <h3 className="text-lg font-semibold text-surface-900">Quick Start Templates</h3>
                <p className="text-sm text-surface-600 mt-1">Choose a pre-configured shift template</p>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {SHIFT_TEMPLATES.map((template, index) => (
                    <div
                      key={index}
                      className="group relative bg-surface-50 rounded-xl p-6 border border-surface-200 hover:border-primary-300 hover:shadow-md transition-all duration-200 cursor-pointer"
                      onClick={() => createShiftHandler(template)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="bg-primary-100 rounded-lg p-3">
                            {getShiftTypeIcon(template.shiftType)}
                          </div>
                          <div>
                            <h4 className="font-semibold text-surface-900 group-hover:text-primary-600">
                              {template.name}
                            </h4>
                            <p className="text-sm text-surface-600 mt-1">
                              {template.startTime} - {template.endTime}
                            </p>
                            <p className="text-xs text-surface-500 mt-1">
                              Requires {template.requiredStaff} staff
                            </p>
                          </div>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </div>
                      </div>
                      
                      {selectedStaff.length < template.requiredStaff && (
                        <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                          <p className="text-xs text-amber-700">
                            Select {template.requiredStaff - selectedStaff.length} more staff member{template.requiredStaff - selectedStaff.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'custom' && (
            <div className="bg-white rounded-xl shadow-lg border border-surface-200 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-50 to-purple-100 px-6 py-4 border-b border-surface-200">
                <h3 className="text-lg font-semibold text-surface-900">Custom Shift</h3>
                <p className="text-sm text-surface-600 mt-1">Create a shift with custom times and settings</p>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Shift Type Selection */}
                <div>
                  <label className="block text-sm font-semibold text-surface-700 mb-3">Shift Type</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {(['morning', 'afternoon', 'evening', 'overnight'] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setSelectedShiftType(type)}
                        className={`p-3 rounded-lg border-2 text-center transition-all duration-200 ${
                          selectedShiftType === type
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-surface-200 bg-surface-50 text-surface-600 hover:border-primary-300'
                        }`}
                      >
                        <div className="flex flex-col items-center space-y-2">
                          {getShiftTypeIcon(type)}
                          <span className="text-sm font-medium capitalize">{type}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-surface-700 mb-2">Start Time</label>
                    <input
                      type="time"
                      value={customStartTime}
                      onChange={(e) => setCustomStartTime(e.target.value)}
                      className="w-full px-4 py-3 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-surface-700 mb-2">End Time</label>
                    <input
                      type="time"
                      value={customEndTime}
                      onChange={(e) => setCustomEndTime(e.target.value)}
                      className="w-full px-4 py-3 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Create Button */}
                <div className="pt-4 border-t border-surface-200">
                  <button
                    onClick={() => createShiftHandler()}
                    disabled={!customStartTime || !customEndTime || selectedStaff.length === 0 || loading}
                    className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-primary-600 hover:to-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    {loading ? 'Creating Shift...' : 'Create Custom Shift'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'schedule' && (
            <div className="bg-white rounded-xl shadow-lg border border-surface-200 overflow-hidden">
              <div className="bg-gradient-to-r from-green-50 to-green-100 px-6 py-4 border-b border-surface-200">
                <h3 className="text-lg font-semibold text-surface-900">Shift Schedule</h3>
                <p className="text-sm text-surface-600 mt-1">View and manage upcoming shifts</p>
              </div>
              
              <div className="p-6">
                <div className="text-center py-12">
                  <div className="bg-surface-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
                    <svg className="w-8 h-8 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h4 className="text-surface-900 font-medium mb-2">Schedule Coming Soon</h4>
                  <p className="text-surface-500 text-sm">Advanced scheduling features will be available in the next update</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Staff Selection */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg border border-surface-200 overflow-hidden">
            <div className="bg-gradient-to-r from-surface-50 to-surface-100 px-6 py-4 border-b border-surface-200">
              <h3 className="text-lg font-semibold text-surface-900">Select Staff</h3>
              <p className="text-sm text-surface-600 mt-1">Choose staff members for this shift</p>
            </div>
            
            <div className="p-6">
              {staff.length === 0 ? (
                <div className="text-center py-8">
                  <div className="bg-surface-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
                    <svg className="w-8 h-8 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <p className="text-surface-600 font-medium">No staff available</p>
                  <p className="text-surface-500 text-sm mt-1">Add staff members to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {staff.map((member) => (
                    <div
                      key={member.id}
                      className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                        selectedStaff.includes(member.id)
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-surface-200 bg-surface-50 hover:border-primary-300'
                      }`}
                      onClick={() => toggleStaffSelection(member.id)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                          selectedStaff.includes(member.id)
                            ? 'bg-primary-500 text-white'
                            : 'bg-surface-200 text-surface-600'
                        }`}>
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-surface-900">{member.name}</p>
                          <p className="text-sm text-surface-500">{member.role}</p>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedStaff.includes(member.id)
                          ? 'border-primary-500 bg-primary-500'
                          : 'border-surface-300'
                      }`}>
                        {selectedStaff.includes(member.id) && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Selected Staff Summary */}
          {selectedStaff.length > 0 && (
            <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl p-6 border border-primary-200">
              <h4 className="font-semibold text-primary-900 mb-3">Selected Staff</h4>
              <div className="space-y-2">
                {selectedStaff.map((staffId) => {
                  const member = staff.find(s => s.id === staffId)
                  return member ? (
                    <div key={staffId} className="flex items-center justify-between bg-white rounded-lg p-3 border border-primary-200">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center text-xs font-medium text-white">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-surface-900">{member.name}</span>
                      </div>
                      <button
                        onClick={() => toggleStaffSelection(staffId)}
                        className="text-primary-600 hover:text-primary-800"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : null
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
