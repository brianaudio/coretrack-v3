'use client'

import { useShift } from '../lib/context/ShiftContext'
import { useAuth } from '../lib/context/AuthContext'
import { useBranch } from '../lib/context/BranchContext'
import { useState } from 'react'

// Enhanced shift presets
const SHIFT_PRESETS = [
  { id: 'morning', name: 'Morning Shift', time: '6:00 AM - 2:00 PM', icon: '🌅' },
  { id: 'afternoon', name: 'Afternoon Shift', time: '2:00 PM - 10:00 PM', icon: '☀️' },
  { id: 'evening', name: 'Evening Shift', time: '6:00 PM - 2:00 AM', icon: '🌆' },
  { id: 'night', name: 'Night Shift', time: '10:00 PM - 6:00 AM', icon: '🌙' },
  { id: 'weekend', name: 'Weekend Shift', time: 'Flexible Hours', icon: '🎉' },
  { id: 'custom', name: 'Custom Shift', time: 'Custom Hours', icon: '⚙️' }
]

export default function ShiftRequiredModal() {
  const { profile } = useAuth()
  const { startNewShift, loading } = useShift()
  const { selectedBranch, branches } = useBranch()
  
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [customShiftName, setCustomShiftName] = useState('')
  const [customCashFloat, setCustomCashFloat] = useState('')
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)
  
  // Check if we're still loading branches
  const isInitializing = !branches || branches.length === 0

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
        customCashFloat ? parseFloat(customCashFloat) : undefined
      )
    } catch (error) {
      console.error('Failed to start shift:', error)
    }
  }

  const handleQuickStart = async () => {
    try {
      // Check if we have the required context
      if (!profile?.tenantId) {
        throw new Error('No tenant profile available')
      }
      
      // For now, if no branch is selected, we'll skip the shift requirement
      // This is a temporary fix while we implement proper branch setup
      if (!selectedBranch) {
        console.warn('No branch selected - skipping shift requirement')
        // Mark onboarding as completed and continue
        localStorage.setItem('coretrack_onboarding_completed', 'true')
        window.location.reload() // Refresh to update the application state
        return
      }

      const now = new Date()
      const hour = now.getHours()
      let shiftName = ''
      
      if (hour >= 6 && hour < 14) shiftName = 'Morning Shift'
      else if (hour >= 14 && hour < 22) shiftName = 'Evening Shift'
      else shiftName = 'Night Shift'

      await startNewShift(shiftName)
    } catch (error) {
      console.error('Failed to start quick shift:', error)
      
      // If shift fails, provide fallback option
      if (error instanceof Error && error.message.includes('No tenant or branch selected')) {
        // For now, bypass the shift requirement
        console.warn('Bypassing shift requirement due to setup issue')
        localStorage.setItem('coretrack_onboarding_completed', 'true')
        window.location.reload()
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center z-50">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="relative bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Start Your Shift</h2>
          <p className="text-gray-600">
            Welcome, {profile?.displayName}! You must start a shift to access the application.
          </p>
        </div>

        {/* Quick Start Option */}
        <div className="mb-6">
          {isInitializing ? (
            <div className="w-full bg-gray-100 px-6 py-4 rounded-xl flex items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <span className="text-gray-600">Setting up your workspace...</span>
            </div>
          ) : (
            <button
              onClick={handleQuickStart}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-4 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {loading ? 'Starting Shift...' : 'Quick Start (Auto-Named)'}
            </button>
          )}
          <p className="text-xs text-gray-500 text-center mt-2">
            {isInitializing ? 'Please wait while we prepare your workspace' : 'Automatically names your shift based on current time'}
          </p>
        </div>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">or customize your shift</span>
          </div>
        </div>

        {/* Custom Shift Options */}
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
                      ? 'border-blue-500 bg-blue-50'
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

          {/* Custom Name Input */}
          {(selectedPreset === 'custom' || selectedPreset) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {selectedPreset === 'custom' ? 'Custom Shift Name' : 'Shift Name (Optional)'}
              </label>
              <input
                type="text"
                value={customShiftName}
                onChange={(e) => setCustomShiftName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={selectedPreset === 'custom' ? 'Enter custom shift name' : 'Leave empty for template name'}
              />
            </div>
          )}

          {/* Advanced Options Toggle */}
          {selectedPreset && (
            <div>
              <button
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
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

              {/* Advanced Options */}
              {showAdvancedOptions && (
                <div className="mt-4 space-y-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Starting Cash Float
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={customCashFloat}
                      onChange={(e) => setCustomCashFloat(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                    <p className="text-xs text-gray-500 mt-1">Initial cash amount in register</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Start Custom Shift Button */}
          {selectedPreset && (
            <button
              onClick={handleStartShift}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              {loading ? 'Starting Shift...' : 'Start Custom Shift'}
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            🔒 Application access requires an active shift for proper business tracking
          </p>
        </div>
      </div>
    </div>
  )
}
