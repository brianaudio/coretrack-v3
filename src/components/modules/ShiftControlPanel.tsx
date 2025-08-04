'use client'

import { useState, useEffect } from 'react'
import { useShift } from '../../lib/context/ShiftContext'
import { useAuth } from '../../lib/context/AuthContext'
import { useBranch } from '../../lib/context/BranchContext'
import { Timestamp } from 'firebase/firestore'

// Enhanced shift presets
const SHIFT_PRESETS = [
  { id: 'morning', name: 'Morning Shift', time: '6:00 AM - 2:00 PM', icon: '🌅' },
  { id: 'afternoon', name: 'Afternoon Shift', time: '2:00 PM - 10:00 PM', icon: '☀️' },
  { id: 'evening', name: 'Evening Shift', time: '6:00 PM - 2:00 AM', icon: '🌆' },
  { id: 'night', name: 'Night Shift', time: '10:00 PM - 6:00 AM', icon: '🌙' },
  { id: 'weekend', name: 'Weekend Shift', time: 'Flexible Hours', icon: '🎉' },
  { id: 'custom', name: 'Custom Shift', time: 'Custom Hours', icon: '⚙️' }
]

export default function ShiftControlPanel() {
  const { profile } = useAuth()
  const {
    currentShift,
    loading,
    error,
    startNewShift,
    isShiftActive
  } = useShift()

  const [showStartModal, setShowStartModal] = useState(false)

  // Enhanced form states
  const [selectedPreset, setSelectedPreset] = useState('')
  const [customShiftName, setCustomShiftName] = useState('')
  const [cashFloat, setCashFloat] = useState('')
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)

  const handleStartShift = async () => {
    try {
      // Determine the shift name based on selection
      let finalShiftName = ''
      if (selectedPreset && selectedPreset !== 'custom') {
        const preset = SHIFT_PRESETS.find(p => p.id === selectedPreset)
        finalShiftName = preset?.name || ''
      } else if (selectedPreset === 'custom' || customShiftName) {
        finalShiftName = customShiftName
      }

      // Generate automatic name if none provided
      if (!finalShiftName) {
        const now = new Date()
        const hour = now.getHours()
        if (hour >= 6 && hour < 14) finalShiftName = 'Morning Shift'
        else if (hour >= 14 && hour < 22) finalShiftName = 'Evening Shift'
        else finalShiftName = 'Night Shift'
      }

      await startNewShift(
        finalShiftName,
        cashFloat ? parseFloat(cashFloat) : undefined
      )
      
      // Reset form
      setShowStartModal(false)
      setSelectedPreset('')
      setCustomShiftName('')
      setCashFloat('')
      setShowAdvancedOptions(false)
    } catch (error) {
      console.error('Failed to start shift:', error)
    }
  }
  const formatDuration = (startTime: any) => {
    if (!startTime) return 'Unknown'
    
    const start = startTime.toDate()
    const now = new Date()
    const diff = now.getTime() - start.getTime()
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    return `${hours}h ${minutes}m`
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-surface-200 p-6">
        <div className="animate-pulse flex space-x-4">
          <div className="rounded-full bg-surface-200 h-12 w-12"></div>
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 bg-surface-200 rounded w-3/4"></div>
            <div className="h-4 bg-surface-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Current Shift Status */}
      <div className="bg-white rounded-xl shadow-sm border border-surface-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-surface-900">Shift Status</h3>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            isShiftActive 
              ? 'bg-green-100 text-green-800 border border-green-200'
              : 'bg-gray-100 text-gray-800 border border-gray-200'
          }`}>
            {isShiftActive ? 'Active' : 'No Active Shift'}
          </div>
        </div>

        {currentShift ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-surface-500">Shift Name</p>
                <p className="text-lg font-semibold text-surface-900">{currentShift.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-surface-500">Duration</p>
                <p className="text-lg font-semibold text-surface-900">
                  {formatDuration(currentShift.startTime)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-surface-500">Started At</p>
                <p className="text-lg font-semibold text-surface-900">
                  {currentShift.startTime.toDate().toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  })}
                </p>
              </div>
            </div>

            {currentShift.metadata?.cashFloat && (
              <div>
                <p className="text-sm font-medium text-surface-500">Starting Cash Float</p>
                <p className="text-lg font-semibold text-surface-900">
                  ₱{currentShift.metadata.cashFloat.toLocaleString()}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-surface-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-surface-500 mb-4">No active shift running</p>
            <p className="text-sm text-surface-400">Start a new shift to begin tracking sales and expenses</p>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-4">
        {!isShiftActive ? (
          <button
            onClick={() => setShowStartModal(true)}
            className="flex-1 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Start New Shift
          </button>
        ) : (
          <div className="flex-1 bg-green-50 border border-green-200 text-green-800 px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Shift Active - Use header to end shift
          </div>
        )}
      </div>

      {/* Enhanced Start Shift Modal */}
      {showStartModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Start New Shift</h3>
              <button
                onClick={() => setShowStartModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Shift Template Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Choose Shift Template
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {SHIFT_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => setSelectedPreset(preset.id)}
                      className={`p-3 rounded-lg border-2 transition-all text-left ${
                        selectedPreset === preset.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{preset.icon}</span>
                        <span className="font-medium text-sm">{preset.name}</span>
                      </div>
                      <p className="text-xs text-gray-500">{preset.time}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Name Input (shown when custom is selected or no preset) */}
              {(selectedPreset === 'custom' || !selectedPreset) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {selectedPreset === 'custom' ? 'Custom Shift Name' : 'Shift Name (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={customShiftName}
                    onChange={(e) => setCustomShiftName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder={selectedPreset === 'custom' ? 'Enter custom shift name' : 'Auto-generated based on time'}
                  />
                </div>
              )}

              {/* Advanced Options Toggle */}
              <div>
                <button
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
                >
                  <svg 
                    className={`w-4 h-4 transition-transform ${showAdvancedOptions ? 'rotate-90' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Advanced Options
                </button>
              </div>

              {/* Advanced Options */}
              {showAdvancedOptions && (
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Starting Cash Float
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={cashFloat}
                      onChange={(e) => setCashFloat(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="0.00"
                    />
                    <p className="text-xs text-gray-500 mt-1">Initial cash amount in register</p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowStartModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleStartShift}
                disabled={loading}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300"
              >
                {loading ? 'Starting...' : 'Start Shift'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
