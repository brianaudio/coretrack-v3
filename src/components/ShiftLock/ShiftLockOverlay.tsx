'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/context/AuthContext'
import { useToast } from '../ui/Toast'
import { 
  startShift, 
  getCurrentShift, 
  endShift,
  type ActiveShift 
} from '../../lib/firebase/shiftManagement'

interface ShiftLockOverlayProps {
  onShiftStarted: () => void
}

export default function ShiftLockOverlay({ onShiftStarted }: ShiftLockOverlayProps) {
  const { user, profile } = useAuth()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null)
  const [showStartModal, setShowStartModal] = useState(false)
  const [checkingShift, setCheckingShift] = useState(true)

  // Check for existing active shift on mount
  useEffect(() => {
    if (!user?.uid) return

    const checkActiveShift = async () => {
      try {
        setCheckingShift(true)
        const shift = await getCurrentShift(user.uid, user.uid)
        if (shift) {
          setActiveShift(shift)
          onShiftStarted() // Auto-unlock if shift is already active
        }
      } catch (error) {
        console.error('Error checking active shift:', error)
      } finally {
        setCheckingShift(false)
      }
    }

    checkActiveShift()
  }, [user?.uid, onShiftStarted])

  const handleStartShift = async () => {
    if (!user?.uid || !profile) return

    try {
      setLoading(true)
      const shiftData = {
        employeeId: user.uid,
        employeeName: profile.displayName || profile.email || 'Unknown User',
        employeeRole: profile.role || 'staff',
        location: 'Main Store', // You can make this dynamic
        notes: ''
      }

      const newShift = await startShift(user.uid, shiftData)
      setActiveShift(newShift)
      setShowStartModal(false)
      
      addToast(`Welcome ${profile.displayName || 'User'}! Your shift has begun.`, 'success', 4000)

      onShiftStarted()
    } catch (error) {
      console.error('Error starting shift:', error)
      addToast('Unable to start your shift. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleEndShift = async () => {
    if (!user?.uid || !activeShift) return

    if (!confirm('Are you sure you want to end your shift? This will log you out of the system.')) {
      return
    }

    try {
      setLoading(true)
      await endShift(user.uid, activeShift.id)
      setActiveShift(null)
      
      addToast('Your shift has been completed successfully.', 'success')

      // This will trigger the lock overlay again
      window.location.reload()
    } catch (error) {
      console.error('Error ending shift:', error)
      addToast('Unable to end your shift. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (checkingShift) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-surface-600">Checking shift status...</p>
        </div>
      </div>
    )
  }

  if (activeShift) {
    return null // Don't show overlay if shift is active
  }

  // Only show for staff and managers
  if (!profile || !['staff', 'manager'].includes(profile.role || '')) {
    return null
  }

  return (
    <>
      {/* Lock Overlay */}
      <div className="fixed inset-0 z-40 bg-white/95 backdrop-blur-lg">
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-md w-full">
            {/* Logo/Brand Section */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-surface-900 mb-2">CoreTrack</h1>
              <p className="text-surface-600">Business Inventory Management</p>
            </div>

            {/* Shift Lock Card */}
            <div className="bg-white rounded-3xl shadow-xl border border-surface-200 p-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-surface-900 mb-2">Start Your Shift</h2>
                <p className="text-surface-600 text-sm">
                  Welcome {profile?.displayName || 'User'}! Please start your shift to access the system.
                </p>
              </div>

              {/* User Info */}
              <div className="bg-surface-50 rounded-xl p-4 mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-600 font-medium text-sm">
                      {(profile?.displayName || profile?.email || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-surface-900">{profile?.displayName || profile?.email}</p>
                    <p className="text-sm text-surface-600 capitalize">{profile?.role || 'Staff'}</p>
                  </div>
                </div>
              </div>

              {/* Start Shift Button */}
              <button
                onClick={() => setShowStartModal(true)}
                disabled={loading}
                className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold py-4 px-6 rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Starting...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-1 0a4 4 0 01-8 0" />
                    </svg>
                    <span>Start Shift</span>
                  </>
                )}
              </button>

              {/* Security Notice */}
              <div className="mt-6 text-center">
                <p className="text-xs text-surface-500">
                  🔒 System locked for security. Starting a shift tracks your activity and ensures accountability.
                </p>
              </div>
            </div>

            {/* Additional Info */}
            <div className="mt-6 text-center">
              <p className="text-sm text-surface-600">
                Need help? Contact your manager or system administrator.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Start Shift Confirmation Modal */}
      {showStartModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-surface-900 mb-2">Confirm Shift Start</h3>
              <p className="text-surface-600 text-sm">
                Are you ready to begin your shift? This will be logged for tracking purposes.
              </p>
            </div>

            <div className="bg-surface-50 rounded-xl p-4 mb-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-surface-500">Employee</p>
                  <p className="font-medium">{profile?.displayName || profile?.email}</p>
                </div>
                <div>
                  <p className="text-surface-500">Role</p>
                  <p className="font-medium capitalize">{profile?.role || 'Staff'}</p>
                </div>
                <div>
                  <p className="text-surface-500">Start Time</p>
                  <p className="font-medium">{new Date().toLocaleTimeString()}</p>
                </div>
                <div>
                  <p className="text-surface-500">Location</p>
                  <p className="font-medium">Main Store</p>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowStartModal(false)}
                className="flex-1 bg-surface-100 text-surface-700 font-medium py-3 px-4 rounded-xl hover:bg-surface-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStartShift}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white font-medium py-3 px-4 rounded-xl hover:from-green-600 hover:to-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Starting...' : 'Confirm Start'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
