'use client'

import { useState, useEffect } from 'react'
import { useShift } from '../../lib/context/ShiftContext'
import { useAuth } from '../../lib/context/AuthContext'

interface ResetSchedule {
  enabled: boolean
  time: string // 24hr format "03:00"
  timezone: string
  lastReset?: Date
  nextReset?: Date
}

export default function HybridResetManager() {
  const { profile } = useAuth()
  const { resetDailyData, isShiftActive } = useShift()
  
  // Load schedule from localStorage with fallback defaults
  const loadSchedule = (): ResetSchedule => {
    if (typeof window === 'undefined') return { enabled: true, time: '03:00', timezone: 'Asia/Manila' }
    
    try {
      const saved = localStorage.getItem('resetSchedule')
      if (saved) {
        return { ...{ enabled: true, time: '03:00', timezone: 'Asia/Manila' }, ...JSON.parse(saved) }
      }
    } catch (error) {
      console.warn('Error loading reset schedule:', error)
    }
    return { enabled: true, time: '03:00', timezone: 'Asia/Manila' }
  }
  
  const [resetSchedule, setResetSchedule] = useState<ResetSchedule>(loadSchedule())
  const [showConfirmReset, setShowConfirmReset] = useState(false)
  const [nextResetCountdown, setNextResetCountdown] = useState('')
  const [lastResetCheck, setLastResetCheck] = useState<string | null>(null)
  
  // Save schedule to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('resetSchedule', JSON.stringify(resetSchedule))
    }
  }, [resetSchedule])
  
  // Check for missed resets on component mount
  useEffect(() => {
    checkMissedResets()
    registerServiceWorker()
  }, [])
  
  // Register service worker for background reset capability
  const registerServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/reset-worker.js')
        
        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data.type === 'PERFORM_RESET') {
            handleAutoReset()
          }
        })
        
        // Check if there's a pending reset flag
        const cache = await caches.open('reset-flags')
        const resetNeeded = await cache.match('/reset-needed')
        if (resetNeeded) {
          const timestamp = await resetNeeded.text()
          const resetTime = new Date(timestamp)
          const now = new Date()
          
          // If reset was needed and it's been more than 1 hour
          if (now.getTime() - resetTime.getTime() > 60 * 60 * 1000) {
            handleAutoReset()
            cache.delete('/reset-needed')
          }
        }
      } catch (error) {
        console.warn('Service Worker registration failed:', error)
      }
    }
  }
  
  // Send schedule to service worker when it changes
  useEffect(() => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SCHEDULE_RESET',
        data: { time: resetSchedule.time, enabled: resetSchedule.enabled }
      })
    }
  }, [resetSchedule.time, resetSchedule.enabled])
  
  // Calculate next reset time
  const calculateNextReset = () => {
    const now = new Date()
    const [hours, minutes] = resetSchedule.time.split(':').map(Number)
    
    const nextReset = new Date()
    nextReset.setHours(hours, minutes, 0, 0)
    
    // If the time has already passed today, set for tomorrow
    if (nextReset <= now) {
      nextReset.setDate(nextReset.getDate() + 1)
    }
    
    return nextReset
  }
  
  // Check if we missed any automatic resets
  const checkMissedResets = async () => {
    if (!resetSchedule.enabled || typeof window === 'undefined') return
    
    try {
      const lastDailyReset = localStorage.getItem('lastDailyReset')
      const now = new Date()
      
      if (!lastDailyReset) {
        return
      }
      
      const lastResetDate = new Date(lastDailyReset)
      const hoursSinceReset = Math.floor((now.getTime() - lastResetDate.getTime()) / (1000 * 60 * 60))
      
      // If more than 25 hours since last reset (allowing 1 hour buffer), perform catch-up reset
      if (hoursSinceReset > 25) {
        if (!isShiftActive) {
          await handleAutoReset()
        } else {
          // Will reset when shift ends
        }
      }
    } catch (error) {
      console.error('Error checking missed resets:', error)
    }
  }

  // Countdown timer update
  useEffect(() => {
    const updateCountdown = () => {
      if (!resetSchedule.enabled) return
      
      const nextReset = calculateNextReset()
      const now = new Date()
      const diff = nextReset.getTime() - now.getTime()
      
      if (diff > 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((diff % (1000 * 60)) / 1000)
        
        setNextResetCountdown(`${hours}h ${minutes}m ${seconds}s`)
      } else {
        setNextResetCountdown('Processing reset...')
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    
    return () => clearInterval(interval)
  }, [resetSchedule])

  // Automatic reset trigger
  useEffect(() => {
    if (!resetSchedule.enabled) return

    const checkAutoReset = () => {
      const now = new Date()
      const [hours, minutes] = resetSchedule.time.split(':').map(Number)
      
      // Check if it's exactly the reset time (within 1 minute window)
      if (now.getHours() === hours && now.getMinutes() === minutes) {
        handleAutoReset()
      }
    }

    const interval = setInterval(checkAutoReset, 60000) // Check every minute
    return () => clearInterval(interval)
  }, [resetSchedule])

  const handleAutoReset = async () => {
    if (isShiftActive) {
      // Don't auto-reset if shift is active, just notify
      return
    }

    try {
      await resetDailyData()
      localStorage.setItem('lastDailyReset', new Date().toISOString())
    } catch (error) {
      console.error('❌ Auto-reset failed:', error)
    }
  }

  const handleManualReset = async () => {
    try {
      await resetDailyData()
      localStorage.setItem('lastDailyReset', new Date().toISOString())
      setShowConfirmReset(false)
    } catch (error) {
      console.error('❌ Manual reset failed:', error)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-surface-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-surface-900">Daily Reset Schedule</h3>
          <p className="text-sm text-surface-600">Automatic data archiving and reset</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
          resetSchedule.enabled 
            ? 'bg-green-100 text-green-800 border border-green-200'
            : 'bg-gray-100 text-gray-800 border border-gray-200'
        }`}>
          {resetSchedule.enabled ? 'Enabled' : 'Disabled'}
        </div>
      </div>

      {/* Reset Schedule Configuration */}
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-surface-50 rounded-lg">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🕒</span>
              <div>
                <p className="font-medium text-surface-900">Automatic Reset</p>
                <p className="text-sm text-surface-600">Daily at {resetSchedule.time}</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-surface-600">Next reset in:</p>
            <p className="font-mono font-semibold text-primary-600">{nextResetCountdown}</p>
          </div>
        </div>

        {/* Manual Reset Option */}
        <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            <div>
              <p className="font-medium text-yellow-900">Manual Override</p>
              <p className="text-sm text-yellow-700">Reset data immediately</p>
            </div>
          </div>
          <button
            onClick={() => setShowConfirmReset(true)}
            disabled={isShiftActive}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isShiftActive
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-yellow-600 hover:bg-yellow-700 text-white'
            }`}
          >
            {isShiftActive ? 'Shift Active' : 'Reset Now'}
          </button>
        </div>

        {isShiftActive && (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-sm text-orange-800">
              ⚠️ Manual reset is disabled while a shift is active. End the current shift first.
            </p>
          </div>
        )}
      </div>

      {/* Schedule Settings */}
      <div className="mt-6 pt-4 border-t border-surface-200">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-surface-700">Reset Time</span>
          <input
            type="time"
            value={resetSchedule.time}
            onChange={(e) => setResetSchedule(prev => ({ ...prev, time: e.target.value }))}
            className="px-2 py-1 border border-surface-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm font-medium text-surface-700">Enable Auto-Reset</span>
          <button
            onClick={() => setResetSchedule(prev => ({ ...prev, enabled: !prev.enabled }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              resetSchedule.enabled ? 'bg-primary-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                resetSchedule.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmReset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Manual Reset</h3>
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ This will immediately archive all current data and reset counters. This action cannot be undone.
                </p>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <p>• All shift data will be archived</p>
                <p>• Daily counters will be reset</p>
                <p>• Reports will be generated</p>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowConfirmReset(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleManualReset}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}