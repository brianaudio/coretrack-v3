'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../lib/context/AuthContext'
import { useUser } from '../lib/rbac/UserContext'
import LandingPage from '../components/LandingPage'
import EnhancedSignup from '../components/EnhancedSignup'
import OnboardingFlow from '../components/modules/onboarding/OnboardingFlow'
import Login from '../components/Login'
import Dashboard from '../components/Dashboard'
import { sessionManager } from '../lib/auth/sessionManager'

type AppMode = 'landing' | 'signup' | 'login' | 'onboarding' | 'dashboard'

export default function Home() {
  const { user, loading } = useAuth()
  const { setCurrentRole, setCurrentUser } = useUser()
  const [mode, setMode] = useState<AppMode>('landing')
  const [userProfile, setUserProfile] = useState<any>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [hasInitialized, setHasInitialized] = useState(false)

  useEffect(() => {
    // Wait for auth to initialize
    if (loading) {
      return
    }

    // Mark as initialized after auth loads
    if (!hasInitialized) {
      setHasInitialized(true)
    }

    // Only auto-redirect if user exists AND we're in a non-user mode AND this is not initial load
    if (user && hasInitialized) {
      setIsAuthenticated(true)
      
      // Set user role in UserContext (assume owner for existing users)
      setCurrentRole('owner')
      setCurrentUser({
        uid: user.uid,
        email: user.email || '',
        role: 'owner'
      })
      
      // Check if user has completed onboarding
      const onboardingCompleted = localStorage.getItem('coretrack_onboarding_completed')
      if (!onboardingCompleted) {
        setMode('onboarding')
      } else {
        setMode('dashboard')
      }
    } else if (!user) {
      setIsAuthenticated(false)
      // Clear user role when no user
      setCurrentRole(null)
      setCurrentUser(null)
      // Only reset to landing if we're not already in auth-related modes
      if (mode !== 'landing' && mode !== 'signup' && mode !== 'login') {
        setMode('landing')
      }
    }
  }, [user, loading, hasInitialized, mode])

  const handleSignupSuccess = (profile: any) => {
    setUserProfile(profile)
    setIsAuthenticated(true)
    setMode('onboarding')
  }

  const handleLoginSuccess = () => {
    setIsAuthenticated(true)
    const onboardingCompleted = localStorage.getItem('coretrack_onboarding_completed')
    if (!onboardingCompleted) {
      setMode('onboarding')
    } else {
      setMode('dashboard')
    }
  }

  const handleOnboardingComplete = () => {
    setMode('dashboard')
  }

  const handleLogout = () => {
    sessionManager.clearAllSessions()
    setIsAuthenticated(false)
    setMode('landing')
    setCurrentRole(null)
    setCurrentUser(null)
    localStorage.removeItem('coretrack_onboarding_completed')
    
    // Also sign out from Firebase to clear any persistent state
    import('../lib/firebase/auth').then(({ signOut }) => {
      signOut().catch(console.error)
    })
  }

  const renderContent = () => {
    switch (mode) {
      case 'landing':
        return (
          <LandingPage
            onGetStarted={() => setMode('signup')}
            onSignIn={() => setMode('login')}
          />
        )
      
      case 'signup':
        return (
          <EnhancedSignup
            onLogin={() => {
              setIsAuthenticated(true)
              setMode('onboarding')
            }}
            onBackToLanding={() => setMode('landing')}
          />
        )
      
      case 'login':
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="max-w-md w-full">
              <div className="bg-white rounded-lg shadow-lg p-8">
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Welcome Back to CoreTrack
                  </h1>
                  <p className="text-gray-600">
                    Sign in to your business management dashboard
                  </p>
                </div>
                <Login onLogin={handleLoginSuccess} />
                <div className="mt-6 text-center">
                  <button
                    onClick={() => setMode('landing')}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    ← Back to Home
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      
      case 'onboarding':
        return (
          <OnboardingFlow
            userProfile={userProfile || user}
            onComplete={handleOnboardingComplete}
          />
        )
      
      case 'dashboard':
        return (
          <Dashboard onLogout={handleLogout} />
        )
      
      default:
        return <div>Loading...</div>
    }
  }

  // Always show content directly, no loading screen
  return (
    <div>
      {renderContent()}
    </div>
  )
}
