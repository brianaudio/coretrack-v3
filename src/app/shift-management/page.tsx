'use client'

import React, { useState } from 'react'
import { useAuth } from '../../lib/context/AuthContext'
import { useBranch } from '../../lib/context/BranchContext'
import { useShift } from '../../lib/context/ShiftContext'
import ShiftDashboard from '../../components/ShiftManagement/ShiftDashboard'
import ShiftControlPanel from '../../components/ShiftManagement/ShiftControlPanel'

export default function ShiftManagementPage() {
  const { profile } = useAuth()
  const { selectedBranch } = useBranch()
  const { currentShift } = useShift()
  const [activeTab, setActiveTab] = useState<'dashboard' | 'control' | 'analytics' | 'settings'>('dashboard')

  if (!profile || !selectedBranch) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-surface-50 to-surface-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-primary-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-surface-900 mb-2">Loading Shift Management</h3>
          <p className="text-surface-600">Please wait while we prepare your workspace...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-50 to-surface-100">
      {/* Professional Header */}
      <div className="bg-white border-b border-surface-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo and Title */}
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg p-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-surface-900">Shift Management</h1>
                <p className="text-sm text-surface-600">{selectedBranch.name}</p>
              </div>
            </div>

            {/* Current Shift Status */}
            <div className="flex items-center space-x-4">
              {currentShift ? (
                <div className="flex items-center space-x-3 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-green-700 font-medium text-sm">Shift Active</span>
                  </div>
                  <div className="text-green-600 text-sm">
                    {currentShift.name || 'Current Shift'}
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-2 bg-surface-100 border border-surface-300 rounded-lg px-4 py-2">
                  <div className="w-2 h-2 bg-surface-400 rounded-full"></div>
                  <span className="text-surface-600 font-medium text-sm">No Active Shift</span>
                </div>
              )}

              {/* User Profile */}
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white font-semibold">
                  {profile.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-surface-900">{profile.email?.split('@')[0] || 'User'}</p>
                  <p className="text-xs text-surface-500 capitalize">{profile.role}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Professional Tab Navigation */}
          <div className="flex space-x-1 mt-4">
            {[
              { id: 'dashboard', name: 'Dashboard', icon: '📊', description: 'Overview & Stats' },
              { id: 'control', name: 'Control Panel', icon: '🎛️', description: 'Create Shifts' },
              { id: 'analytics', name: 'Analytics', icon: '📈', description: 'Performance' },
              { id: 'settings', name: 'Settings', icon: '⚙️', description: 'Configuration' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`group relative flex items-center space-x-2 px-6 py-3 rounded-t-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-white text-primary-600 border-t-2 border-primary-500 shadow-sm'
                    : 'text-surface-600 hover:text-surface-900 hover:bg-surface-100 border-t-2 border-transparent'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <div className="text-left">
                  <div className="font-semibold">{tab.name}</div>
                  <div className={`text-xs ${
                    activeTab === tab.id ? 'text-primary-500' : 'text-surface-500 group-hover:text-surface-600'
                  }`}>
                    {tab.description}
                  </div>
                </div>
                {/* Active Tab Indicator */}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 rounded-full"></div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && <ShiftDashboard />}
        {activeTab === 'control' && <ShiftControlPanel />}
        {activeTab === 'analytics' && (
          <div className="text-center py-16">
            <div className="bg-white rounded-xl shadow-lg border border-surface-200 p-12">
              <div className="bg-gradient-to-br from-primary-100 to-primary-200 rounded-full p-6 w-24 h-24 mx-auto mb-6">
                <svg className="w-12 h-12 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-surface-900 mb-3">Analytics Coming Soon</h3>
              <p className="text-surface-600 mb-6 max-w-md mx-auto">
                Advanced shift analytics, performance metrics, and detailed reporting will be available in the next update.
              </p>
              <div className="flex items-center justify-center space-x-4">
                <div className="bg-surface-100 rounded-lg px-4 py-2">
                  <span className="text-sm font-medium text-surface-700">📊 Performance Metrics</span>
                </div>
                <div className="bg-surface-100 rounded-lg px-4 py-2">
                  <span className="text-sm font-medium text-surface-700">📈 Trend Analysis</span>
                </div>
                <div className="bg-surface-100 rounded-lg px-4 py-2">
                  <span className="text-sm font-medium text-surface-700">📋 Custom Reports</span>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'settings' && (
          <div className="text-center py-16">
            <div className="bg-white rounded-xl shadow-lg border border-surface-200 p-12">
              <div className="bg-gradient-to-br from-surface-100 to-surface-200 rounded-full p-6 w-24 h-24 mx-auto mb-6">
                <svg className="w-12 h-12 text-surface-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-surface-900 mb-3">Settings Panel Coming Soon</h3>
              <p className="text-surface-600 mb-6 max-w-md mx-auto">
                Shift management settings, configurations, and preferences will be available in the next update.
              </p>
              <div className="flex items-center justify-center space-x-4">
                <div className="bg-surface-100 rounded-lg px-4 py-2">
                  <span className="text-sm font-medium text-surface-700">⚙️ Shift Rules</span>
                </div>
                <div className="bg-surface-100 rounded-lg px-4 py-2">
                  <span className="text-sm font-medium text-surface-700">👥 Staff Roles</span>
                </div>
                <div className="bg-surface-100 rounded-lg px-4 py-2">
                  <span className="text-sm font-medium text-surface-700">🔔 Notifications</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions Sidebar */}
      <div className="fixed bottom-8 right-8 space-y-3">
        {(profile.role === 'manager' || profile.role === 'owner') && (
          <>
            {!currentShift && (
              <button
                onClick={() => setActiveTab('control')}
                className="group bg-gradient-to-r from-primary-500 to-primary-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                title="Create New Shift"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
            )}
            
            <button
              onClick={() => setActiveTab('dashboard')}
              className="group bg-white text-surface-600 p-4 rounded-full shadow-lg hover:shadow-xl hover:text-primary-600 border border-surface-200 transform hover:scale-105 transition-all duration-200"
              title="View Dashboard"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  )
}
