'use client'

import React, { useState, useEffect } from 'react'
import Dashboard from '../components/Dashboard'
import Login from '../components/Login'
import { useAuth } from '../lib/context/AuthContext'

export default function Home() {
  const { user, loading } = useAuth()

  console.log('🏠 Home: Auth state:', { 
    userExists: !!user, 
    loading,
    userEmail: user?.email 
  });

  // Temporary: Show login screen instead of loading indefinitely
  if (loading) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600">Loading CoreTrack...</p>
          <p className="text-sm text-gray-500">Initializing authentication...</p>
          {/* Fallback button in case of infinite loading */}
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Refresh App
          </button>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Login onLogin={() => {}} />
  }

  return <Dashboard />
}
