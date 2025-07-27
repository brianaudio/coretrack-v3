'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/context/AuthContext'
import { 
  getCurrentShift, 
  endShift,
  type ActiveShift 
} from '../../lib/firebase/shiftManagement'
import { useToast } from '../ui/Toast'

export default function ShiftStatusBar() {
  const { user, profile } = useAuth()
  const { addToast } = useToast()
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null)
  const [loading, setLoading] = useState(false)
  const [shiftDuration, setShiftDuration] = useState('')

  useEffect(() => {
    if (!user?.uid) return

    const checkActiveShift = async () => {
      try {
        const shift = await getCurrentShift(user.uid)
        setActiveShift(shift)
      } catch (error) {
        console.error('Error checking active shift:', error)
      }
    }

    checkActiveShift()

    // Set up interval to check shift status
    const interval = setInterval(checkActiveShift, 30000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [user?.uid])

  // Update shift duration every minute
  useEffect(() => {
    if (!activeShift) return

    const updateDuration = () => {
      const now = new Date()
      const start = activeShift.startTime.toDate()
      const diff = now.getTime() - start.getTime()
      
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      
      setShiftDuration(`${hours}h ${minutes}m`)
    }

    updateDuration()
    const interval = setInterval(updateDuration, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [activeShift])

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

      // Reload to trigger shift lock
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (error) {
      console.error('Error ending shift:', error)
      addToast('Unable to end your shift. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!activeShift || !profile) return null

  // Only show for staff and managers
  if (!['staff', 'manager'].includes(profile.role || '')) {
    return null
  }

  return (
    <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Shift Active</span>
          </div>
          <div className="hidden sm:flex items-center space-x-4 text-sm">
            <span>👤 {activeShift.employeeName}</span>
            <span>⏱️ {shiftDuration}</span>
            <span>📍 {activeShift.location || 'Main Store'}</span>
            <span>🕐 Started {activeShift.startTime.toDate().toLocaleTimeString()}</span>
          </div>
        </div>
        
        <button
          onClick={handleEndShift}
          disabled={loading}
          className="bg-white/20 hover:bg-white/30 text-white text-sm font-medium px-3 py-1 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Ending...' : 'End Shift'}
        </button>
      </div>
    </div>
  )
}
