'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '../../lib/context/AuthContext'
import { useUser } from '../../lib/rbac/UserContext'
import { collection, addDoc, query, where, getDocs, updateDoc, doc, Timestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'

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

interface ShiftLockScreenProps {
  children: React.ReactNode
}

export default function ShiftLockScreen({ children }: ShiftLockScreenProps) {
  const { user, profile } = useAuth()
  const { currentUser, currentRole } = useUser()
  const [activeShift, setActiveShift] = useState<ShiftData | null>(null)
  const [loading, setLoading] = useState(true)
  const [slideProgress, setSlideProgress] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  
  // Simple console log function instead of toast for now
  const showMessage = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    console.log(`${type.toUpperCase()}: ${message}`)
  }
  const [showStartShiftModal, setShowStartShiftModal] = useState(false)
  const [shiftForm, setShiftForm] = useState({
    shiftType: 'morning' as const,
    startTime: '06:00',
    endTime: '14:00',
    staffOnDuty: ['']
  })

  const shiftTimes = {
    morning: { start: '06:00', end: '14:00' },
    afternoon: { start: '14:00', end: '22:00' },
    evening: { start: '22:00', end: '06:00' },
    overnight: { start: '22:00', end: '06:00' }
  }

  // Check for active shift on component mount
  useEffect(() => {
    checkActiveShift()
  }, [profile?.tenantId, currentUser?.email])

  // Mouse event listeners for slide to unlock
  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        handleSlideMove(e.clientX)
      }
      
      const handleGlobalMouseUp = () => {
        handleSlideEnd()
      }
      
      document.addEventListener('mousemove', handleGlobalMouseMove)
      document.addEventListener('mouseup', handleGlobalMouseUp)
      
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove)
        document.removeEventListener('mouseup', handleGlobalMouseUp)
      }
    }
  }, [isDragging, startX, slideProgress])

  const checkActiveShift = async () => {
    // Use a fallback tenantId for demo purposes
    const tenantId = profile?.tenantId || currentUser?.email?.split('@')[0] || 'demo-tenant'
    
    if (!tenantId) return

    try {
      setLoading(true)
      const shiftsRef = collection(db, `tenants/${tenantId}/shifts`)
      const today = new Date().toISOString().split('T')[0]
      
      const q = query(
        shiftsRef,
        where('date', '==', today),
        where('status', '==', 'active')
      )
      
      const snapshot = await getDocs(q)
      
      if (!snapshot.empty) {
        const shiftDoc = snapshot.docs[0]
        setActiveShift({ id: shiftDoc.id, ...shiftDoc.data() } as ShiftData)
      }
    } catch (error) {
      console.error('Error checking active shift:', error)
      showMessage('Failed to check shift status', 'error')
    } finally {
      setLoading(false)
    }
  }

  const startShift = async () => {
    // Use fallback values for demo auth system
    const tenantId = profile?.tenantId || currentUser?.email?.split('@')[0] || 'demo-tenant'
    const userId = user?.uid || currentUser?.uid || 'demo-user'
    
    if (!tenantId || !userId) return

    try {
      const validStaff = shiftForm.staffOnDuty.filter(name => name.trim() !== '')
      if (validStaff.length === 0) {
        showMessage('Please add at least one staff member', 'warning')
        return
      }

      const newShift: Omit<ShiftData, 'id'> = {
        date: new Date().toISOString().split('T')[0],
        shiftType: shiftForm.shiftType,
        startTime: shiftForm.startTime,
        endTime: shiftForm.endTime,
        staffOnDuty: validStaff,
        managerId: userId,
        status: 'active',
        createdAt: Timestamp.now()
      }

      const shiftsRef = collection(db, `tenants/${tenantId}/shifts`)
      const docRef = await addDoc(shiftsRef, newShift)
      
      setActiveShift({ ...newShift, id: docRef.id })
      setShowStartShiftModal(false)
      showMessage('Shift started successfully! System is now unlocked.', 'success')
    } catch (error) {
      console.error('Error starting shift:', error)
      showMessage('Failed to start shift', 'error')
    }
  }

  const endShift = async () => {
    const tenantId = profile?.tenantId || currentUser?.email?.split('@')[0] || 'demo-tenant'
    
    if (!tenantId || !activeShift) return

    try {
      const shiftRef = doc(db, `tenants/${tenantId}/shifts`, activeShift.id)
      await updateDoc(shiftRef, {
        status: 'completed',
        completedAt: Timestamp.now()
      })

      setActiveShift(null)
      showMessage('Shift ended successfully', 'success')
    } catch (error) {
      console.error('Error ending shift:', error)
      showMessage('Failed to end shift', 'error')
    }
  }

  const handleShiftTypeChange = (type: typeof shiftForm.shiftType) => {
    setShiftForm(prev => ({
      ...prev,
      shiftType: type,
      startTime: shiftTimes[type].start,
      endTime: shiftTimes[type].end
    }))
  }

  // Slide to unlock handlers
  const handleSlideStart = (clientX: number) => {
    setIsDragging(true)
    setStartX(clientX)
  }

  const handleSlideMove = (clientX: number) => {
    if (!isDragging) return
    
    const deltaX = clientX - startX
    const maxSlide = 280 // Adjust based on container width
    const progress = Math.max(0, Math.min(deltaX / maxSlide, 1))
    setSlideProgress(progress)
  }

  const handleSlideEnd = () => {
    if (slideProgress > 0.8) {
      // Slide was completed - trigger shift start
      setShowStartShiftModal(true)
      setSlideProgress(0)
    } else {
      // Slide back to start
      setSlideProgress(0)
    }
    setIsDragging(false)
  }

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    handleSlideStart(e.touches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    handleSlideMove(e.touches[0].clientX)
  }

  const handleTouchEnd = () => {
    handleSlideEnd()
  }

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    handleSlideStart(e.clientX)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    handleSlideMove(e.clientX)
  }

  const handleMouseUp = () => {
    handleSlideEnd()
  }

  const addStaffMember = () => {
    setShiftForm(prev => ({
      ...prev,
      staffOnDuty: [...prev.staffOnDuty, '']
    }))
  }

  const updateStaffMember = (index: number, name: string) => {
    setShiftForm(prev => ({
      ...prev,
      staffOnDuty: prev.staffOnDuty.map((staff, i) => i === index ? name : staff)
    }))
  }

  const removeStaffMember = (index: number) => {
    setShiftForm(prev => ({
      ...prev,
      staffOnDuty: prev.staffOnDuty.filter((_, i) => i !== index)
    }))
  }

  // Show loading state - but don't block on profile if we have currentUser from demo auth
  if (loading || (!profile && !currentUser)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="flex items-center space-x-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-lg font-medium text-gray-700">
            {loading ? 'Checking shift status...' : 'Loading profile...'}
          </span>
        </div>
      </div>
    )
  }

  // Only show lock screen for staff and managers
  // Use currentUser from UserContext (demo auth) if available, otherwise fall back to Firebase auth
  const effectiveRole = currentUser?.role || profile?.role
  const userEmail = currentUser?.email || user?.email || profile?.email
  
  // Check if user is staff or manager by role or email pattern
  const isStaffByRole = effectiveRole === 'staff' || effectiveRole === 'manager'
  const isStaffByEmail = userEmail?.includes('staff@') || userEmail?.includes('manager@')
  const requiresShift = isStaffByRole || isStaffByEmail
  
  // Always log this debug info, even during loading
  console.log('🔒 ShiftLockScreen Debug (Early):', {
    loading,
    firebaseUser: user?.email,
    firebaseProfile: profile,
    currentUser: currentUser,
    effectiveRole,
    userEmail,
    isStaffByRole,
    isStaffByEmail,
    requiresShift,
    activeShift: activeShift?.id || 'none'
  })

  // Show loading state - but don't block on profile if we have currentUser from demo auth
  if (loading || (!profile && !currentUser)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="flex items-center space-x-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-lg font-medium text-gray-700">
            {loading ? 'Checking shift status...' : 'Loading profile...'}
          </span>
        </div>
      </div>
    )
  }

  console.log('🔒 ShiftLockScreen Debug (After Loading):', {
    firebaseUser: user?.email,
    firebaseRole: profile?.role,
    currentUser: currentUser?.email,
    currentRole: currentRole,
    effectiveRole,
    userEmail,
    isStaffByRole,
    isStaffByEmail,
    requiresShift,
    activeShift: activeShift?.id || 'none',
    loading,
    profileFull: profile
  })

  // If user doesn't require shift management or already has active shift, show main app
  if (!requiresShift || activeShift) {
    return (
      <div>
        {/* Shift Status Bar for active shifts */}
        {activeShift && (
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 shadow-sm">
            <div className="flex items-center justify-between max-w-7xl mx-auto">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-200 rounded-full animate-pulse"></div>
                  <span className="font-semibold">Active Shift</span>
                </div>
                <div className="text-green-100">
                  {activeShift.shiftType.charAt(0).toUpperCase() + activeShift.shiftType.slice(1)} • 
                  {activeShift.startTime} - {activeShift.endTime} • 
                  Staff: {activeShift.staffOnDuty.join(', ')}
                </div>
              </div>
              {(profile?.role === 'manager' || profile?.role === 'owner') && (
                <button
                  onClick={endShift}
                  className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  End Shift
                </button>
              )}
            </div>
          </div>
        )}
        {children}
      </div>
    )
  }

  // Show shift lock screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
      </div>

      <div className="relative min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Logo and Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">System Locked</h1>
            <p className="text-lg text-gray-600 mb-1">Start your shift to access CoreTrack</p>
            <p className="text-sm text-gray-500">Enterprise shift management & accountability</p>
          </div>

          {/* Lock Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-50 to-gray-50 px-6 py-4 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Shift Required</h3>
                  <p className="text-sm text-gray-600">No active shift detected</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="space-y-4 mb-6">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                    <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Staff Accountability</p>
                    <p className="text-sm text-gray-600">Track who&apos;s responsible for today&apos;s operations</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                    <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Inventory Security</p>
                    <p className="text-sm text-gray-600">Monitor and prevent theft through shift tracking</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center mt-0.5">
                    <svg className="w-3 h-3 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Operational Excellence</p>
                    <p className="text-sm text-gray-600">Ensure proper handover and documentation</p>
                  </div>
                </div>
              </div>

              {/* Current User Info */}
              <div className="bg-slate-50 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">
                      {profile?.displayName?.charAt(0) || profile?.email?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{profile?.displayName || 'User'}</p>
                    <p className="text-sm text-gray-600 capitalize">
                      {profile?.role} • {profile?.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Slide to Unlock */}
              <div className="relative">
                <div className="bg-gradient-to-r from-slate-100 to-gray-100 rounded-2xl p-1 shadow-inner border border-gray-200">
                  <div 
                    className="relative h-16 rounded-xl overflow-hidden cursor-pointer select-none"
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  >
                    {/* Track */}
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl"></div>
                    
                    {/* Progress Fill */}
                    <div 
                      className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl transition-all duration-200 ease-out"
                      style={{ 
                        transform: `scaleX(${slideProgress})`,
                        transformOrigin: 'left',
                        opacity: slideProgress * 0.8 + 0.2
                      }}
                    ></div>
                    
                    {/* Slider Button */}
                    <div 
                      className="absolute top-1 left-1 w-14 h-14 bg-white rounded-xl shadow-lg border border-gray-200 flex items-center justify-center transition-all duration-200 ease-out z-10"
                      style={{ 
                        transform: `translateX(${slideProgress * 220}px)`,
                        boxShadow: `0 4px 20px rgba(0, 0, 0, ${0.1 + slideProgress * 0.2})`
                      }}
                    >
                      <svg 
                        className={`w-6 h-6 transition-colors duration-200 ${
                          slideProgress > 0.5 ? 'text-white' : 'text-blue-600'
                        }`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
                        />
                      </svg>
                    </div>
                    
                    {/* Text */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span 
                        className={`font-semibold text-sm transition-colors duration-200 ${
                          slideProgress > 0.5 ? 'text-white' : 'text-gray-600'
                        }`}
                      >
                        {slideProgress > 0.8 ? 'Release to Start Shift' : 'Slide to Start Shift'}
                      </span>
                    </div>
                    
                    {/* Shimmer Effect */}
                    <div 
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 rounded-xl"
                      style={{
                        transform: `translateX(${-100 + slideProgress * 200}%)`,
                        transition: isDragging ? 'none' : 'transform 0.5s ease-out'
                      }}
                    ></div>
                  </div>
                </div>
                
                {/* Helper Text */}
                <div className="mt-3 text-center">
                  <p className="text-xs text-gray-500">
                    Slide to unlock and access your shift management
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-8">
            <p className="text-sm text-gray-500">
              Secure operations powered by CoreTrack Enterprise
            </p>
            <p className="text-xs text-gray-400 mt-2">
              © 2025 CoreTrack. Professional Business Management System.
            </p>
          </div>
        </div>
      </div>

      {/* Start Shift Modal */}
      {showStartShiftModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Start New Shift</h3>
                  <p className="text-sm text-gray-600">Configure your shift to unlock the system</p>
                </div>
                <button
                  onClick={() => setShowStartShiftModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Shift Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Shift Type</label>
                <div className="grid grid-cols-2 gap-3">
                  {Object.keys(shiftTimes).map((type) => (
                    <button
                      key={type}
                      onClick={() => handleShiftTypeChange(type as typeof shiftForm.shiftType)}
                      className={`p-3 text-sm font-medium rounded-xl border transition-all ${
                        shiftForm.shiftType === type
                          ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Start Time</label>
                  <input
                    type="time"
                    value={shiftForm.startTime}
                    onChange={(e) => setShiftForm(prev => ({ ...prev, startTime: e.target.value }))}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">End Time</label>
                  <input
                    type="time"
                    value={shiftForm.endTime}
                    onChange={(e) => setShiftForm(prev => ({ ...prev, endTime: e.target.value }))}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Staff on Duty */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-semibold text-gray-700">Staff on Duty</label>
                  <button
                    onClick={addStaffMember}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    + Add Staff
                  </button>
                </div>
                <div className="space-y-3">
                  {shiftForm.staffOnDuty.map((member, index) => (
                    <div key={index} className="flex gap-3">
                      <input
                        type="text"
                        value={member}
                        onChange={(e) => updateStaffMember(index, e.target.value)}
                        placeholder="Enter staff member name"
                        className="flex-1 px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      {shiftForm.staffOnDuty.length > 1 && (
                        <button
                          onClick={() => removeStaffMember(index)}
                          className="w-10 h-10 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowStartShiftModal(false)}
                  className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={startShift}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium transition-all shadow-lg"
                >
                  Start Shift
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
