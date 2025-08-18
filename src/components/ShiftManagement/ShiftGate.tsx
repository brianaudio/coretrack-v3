'use client'

import { useState } from 'react'
import { useAuth } from '../../lib/context/AuthContext'
import { useShift } from '../../lib/context/ShiftContext'

interface ShiftGateProps {
  children: React.ReactNode
}

export default function ShiftGate({ children }: ShiftGateProps) {
  const { profile, user } = useAuth()
  const { isShiftActive, currentShift, startNewShift, endCurrentShift, loading } = useShift()
  const [isStarting, setIsStarting] = useState(false)

  // Debug logging
  console.log('🔍 ShiftGate Debug:', {
    isShiftActive,
    currentShift: currentShift ? {
      id: currentShift.id,
      status: currentShift.status,
      name: currentShift.name,
      startTime: currentShift.startTime,
      endTime: currentShift.endTime
    } : null,
    loading,
    calculatedActive: currentShift?.status === 'active',
    hasCurrentShift: !!currentShift
  })

  const handleClearShifts = async () => {
    if (confirm('DEBUG: Force end current shift? This will clear any active shifts.')) {
      try {
        await endCurrentShift('Debug: Force ended via ShiftGate')
        console.log('🔧 Debug: Shift force-ended')
      } catch (error) {
        console.error('🔧 Debug: Failed to end shift:', error)
      }
    }
  }

  const handleStartShift = async () => {
    setIsStarting(true)
    try {
      const shiftName = prompt('Enter shift name (optional):') || `Shift ${new Date().toLocaleTimeString()}`
      const cashFloat = prompt('Enter starting cash amount (optional):')
      const parsedCashFloat = cashFloat ? parseFloat(cashFloat) : undefined
      
      await startNewShift(shiftName, parsedCashFloat)
      console.log('✅ New shift started successfully')
    } catch (error) {
      console.error('❌ Failed to start shift:', error)
      alert('Failed to start shift. Please try again.')
    } finally {
      setIsStarting(false)
    }
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading shift status...</p>
        </div>
      </div>
    )
  }

  // If shift is active, show the app
  if (isShiftActive) {
    console.log('🚪 ShiftGate: Allowing app access - shift is active')
    return <>{children}</>
  }

  // If no shift is active, show the shift gate
  console.log('🔒 ShiftGate: Blocking app access - no active shift')
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {/* Lock Icon */}
        <div className="mb-6">
          <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </div>

        {/* Title & Description */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Start Your Shift</h1>
        <p className="text-gray-600 mb-8">
          Welcome back, <span className="font-medium">{profile?.displayName || user?.email?.split('@')[0] || 'User'}</span>! 
          <br />
          You need to start a shift to access CoreTrack.
        </p>

        {/* Current Status */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-red-700 font-medium">No Active Shift</span>
          </div>
          <p className="text-red-600 text-sm mt-1">All features are locked until you start a shift</p>
        </div>

        {/* Start Shift Button */}
        <button
          onClick={handleStartShift}
          disabled={isStarting}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-colors duration-200 flex items-center justify-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>{isStarting ? 'Starting Shift...' : 'START SHIFT'}</span>
        </button>

        {/* Info */}
        <div className="mt-6 text-xs text-gray-500">
          <p>A shift tracks your work session and enables all CoreTrack features</p>
        </div>

        {/* Debug Section - Show if there's any shift data */}
        {currentShift && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-700 font-medium mb-2">DEBUG: Existing Shift Found</p>
            <p className="text-xs text-yellow-600">
              ID: {currentShift.id} | Status: {currentShift.status} | Name: {currentShift.name || 'Unnamed'}
            </p>
            <button
              onClick={handleClearShifts}
              className="mt-2 px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs rounded"
            >
              Force End This Shift
            </button>
          </div>
        )}

        {/* Footer - User Info */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
            <div className={`w-2 h-2 rounded-full ${
              profile?.role === 'owner' ? 'bg-purple-500' :
              profile?.role === 'manager' ? 'bg-green-500' : 'bg-blue-500'
            }`}></div>
            <span className="capitalize">{profile?.role || 'staff'}</span>
            <span>•</span>
            <span>{user?.email}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
