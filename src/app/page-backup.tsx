'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../lib/context/AuthContext'
import { useUser } from '../lib/rbac/UserContext'
import LandingPage from '../components/LandingPage'
import EnhancedSignup from '../components/EnhancedSignup'
import CheckoutFlow from '../components/CheckoutFlow'
import OnboardingFlow from '../components/modules/onboarding/OnboardingFlow'
import Login from '../components/Login'
import Dashboard from '../components/Dashboard'
import { sessionManager } from '../lib/auth/sessionManager'

type AppMode = 'landing' | 'checkout' | 'signup' | 'payment' | 'login' | 'onboarding' | 'dashboard'

export default function Home() {
  const { user, loading: authLoading } = useAuth()
  const { setCurrentRole, setCurrentUser, loading: userLoading, setLoading: setUserLoading } = useUser()
  const [mode, setMode] = useState<AppMode>('landing')
  const [selectedTier, setSelectedTier] = useState<string>('starter') // Track selected tier in state
  const [userProfile, setUserProfile] = useState<any>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [hasInitialized, setHasInitialized] = useState(false)

  // Coordinate loading states between AuthContext and UserContext
  const isLoading = authLoading || userLoading

  // Initialize auth state tracking
  useEffect(() => {
    // Wait for auth to initialize
    if (authLoading) {
      return
    }

    // Mark as initialized after auth loads
    if (!hasInitialized) {
      setHasInitialized(true)
      return // Exit early to prevent race conditions
    }

    // Handle authenticated user state
    if (user && hasInitialized) {
      setIsAuthenticated(true)
      
      // Set user role in UserContext (assume owner for existing users)
      setCurrentRole('owner')
      setCurrentUser({
        uid: user.uid,
        email: user.email || '',
        role: 'owner'
      })
      
      // Mark UserContext as loaded
      setUserLoading(false)
      
      // Only change mode if we're not already in a user-specific mode
      if (mode === 'landing' || mode === 'login' || mode === 'signup' || mode === 'checkout') {
        // Check onboarding status synchronously to avoid race conditions
        const onboardingCompleted = localStorage.getItem('coretrack_onboarding_completed')
        if (!onboardingCompleted) {
          setMode('onboarding')
        } else {
          setMode('dashboard')
        }
      }
    } else if (!user && hasInitialized) {
      // Handle unauthenticated user state
      setIsAuthenticated(false)
      setCurrentRole(null)
      setCurrentUser(null)
      
      // Mark UserContext as loaded (no user)
      setUserLoading(false)
      
      // Only reset to landing if we're in a protected mode
      if (mode === 'dashboard' || mode === 'onboarding') {
        setMode('landing')
      }
    }
  }, [user, authLoading, hasInitialized, setCurrentRole, setCurrentUser, setUserLoading]) // Removed 'mode' from dependencies to prevent loops

  const handleSignupSuccess = (profile: any) => {
    setUserProfile(profile)
    setIsAuthenticated(true)
    // Don't set mode here - let the useEffect handle it based on auth state
  }

  const handleLoginSuccess = () => {
    setIsAuthenticated(true)
    // Don't set mode here - let the useEffect handle it based on auth state
  }

  const handleOnboardingComplete = () => {
    setMode('dashboard')
  }

  const handleLogout = async () => {
    // Use enhanced logout that ends shifts automatically
    const { handleLogoutWithShiftEnd } = await import('../lib/utils/logoutUtils')
    
    sessionManager.clearAllSessions()
    setIsAuthenticated(false)
    setMode('landing')
    setCurrentRole(null)
    setCurrentUser(null)
    
    try {
      // This will handle both shift ending and Firebase signout
      await handleLogoutWithShiftEnd()
      console.log('✅ Enhanced logout completed successfully')
    } catch (error) {
      console.error('❌ Enhanced logout failed:', error)
      // Fallback: still clear local state even if Firebase logout fails
    }
  }

  // Show unified loading state while authentication initializes
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading CoreTrack</h2>
          <p className="text-gray-600">Initializing your business management system...</p>
        </div>
      </div>
    )
  }

  const renderContent = () => {
    // Remove excessive debug logging to prevent console spam
    switch (mode) {
      case 'landing':
        return (
          <LandingPage
            onGetStarted={(selectedTierFromButton?: string) => {
              if (selectedTierFromButton) {
                // Customer clicked a specific plan - store tier and go to checkout
                setSelectedTier(selectedTierFromButton)
                setMode('checkout')
              } else {
                // Generic "Get Started" - go to signup
                setMode('signup')
              }
            }}
            onSignIn={() => {
              console.log('🔄 onSignIn called - switching to login mode')
              console.log('📍 Current mode:', mode)
              setMode('login')
              console.log('✅ Mode should now be: login')
            }}
          />
        )
      
      case 'checkout':
        return (
          <CheckoutFlow
            selectedTier={selectedTier}
            onCompleteSignup={handleLoginSuccess}
            onBackToLanding={() => setMode('landing')}
          />
        )
      
      case 'signup':
        return (
          <EnhancedSignup
            onLogin={handleLoginSuccess}
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
