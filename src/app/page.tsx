'use client'

import React, { useState, useEffect } from 'react'
import Dashboard from '../components/Dashboard'
import AuthenticationSystem from '../components/AuthenticationSystem'
import { sessionManager } from '../lib/auth/sessionManager'
import { useAuth } from '../lib/context/AuthContext'

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const { profile } = useAuth()
  
  const handleLogout = () => {
    sessionManager.clearAllSessions()
    console.log('🚪 User logged out - session cleared')
    setIsAuthenticated(false)
  }

  const handleLoginSuccess = () => {
    setIsAuthenticated(true)
    console.log('🔥 Login Success')
  }
  
  return (
    <>
      {!isAuthenticated ? (
        <AuthenticationSystem onLoginSuccess={handleLoginSuccess} />
      ) : (
        <>
          <Dashboard onLogout={handleLogout} />
        </>
      )}
    </>
  )
}
