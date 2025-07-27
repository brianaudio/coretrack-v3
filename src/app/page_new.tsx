'use client'

import React, { useState } from 'react'
import Dashboard from '../components/Dashboard'
import AuthenticationSystem from '../components/AuthenticationSystem'
import { UserProvider } from '../lib/rbac/UserContext'
import { sessionManager } from '../lib/auth/sessionManager'

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  
  const handleLogout = () => {
    sessionManager.clearAllSessions()
    console.log('🚪 User logged out - session cleared')
    setIsAuthenticated(false)
  }
  
  return (
    <UserProvider>
      {!isAuthenticated ? (
        <AuthenticationSystem onLoginSuccess={() => setIsAuthenticated(true)} />
      ) : (
        <div className="min-h-screen bg-surface-50">
          {/* Professional Header Banner */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 shadow-lg">
            <div className="flex items-center justify-between max-w-7xl mx-auto">
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                  </svg>
                </div>
                <div>
                  <h1 className="font-bold text-lg">CoreTrack Professional</h1>
                  <p className="text-blue-100 text-sm">Enterprise Restaurant Management System</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg transition-all text-sm font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
          <Dashboard onLogout={handleLogout} />
        </div>
      )}
    </UserProvider>
  )
}
