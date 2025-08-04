'use client'

import React, { useState, useEffect } from 'react'
import { db } from '../lib/firebase'
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore'
import { sessionManager } from '../lib/auth/sessionManager'
import { securityManager } from '../lib/auth/securityManager'
import { useUser } from '../lib/rbac/UserContext'
import { UserRole } from '../lib/rbac/permissions'
import CoreTrackLogo from './CoreTrackLogo'
import LoadingScreen from './LoadingScreen'
import NotificationSystem, { useNotifications } from './NotificationSystem'
import { debugTrace, debugStep, debugValidation, debugError, debugSuccess, debugTimer } from '../lib/utils/debugHelper'

interface AuthenticationSystemProps {
  onLoginSuccess: () => void
}

interface LoginFormData {
  email: string
  password: string
}

const AuthenticationSystem: React.FC<AuthenticationSystemProps> = ({ onLoginSuccess }) => {
  const [formData, setFormData] = useState<LoginFormData>({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [securityWarnings, setSecurityWarnings] = useState<string[]>([])
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const { setCurrentRole, setCurrentUser } = useUser()
  const notifications = useNotifications()

  // Function to create a demo Firebase profile for compatibility
  const createDemoProfile = (email: string, role: UserRole) => {
    const tenantId = email.split('@')[0] || 'demo-tenant';
    return {
      uid: `demo-${Date.now()}`,
      email: email,
      role: role,
      tenantId: tenantId,
      displayName: `${role} User`,
      createdAt: new Date().toISOString()
    };
  };

  // Function to automatically start a shift for staff
  const startShiftForStaff = async (email: string, role: UserRole) => {
    if (role !== 'staff') return; // Only auto-start shifts for staff

    try {
      const tenantId = email.split('@')[0] || 'demo-tenant';
      const today = new Date().toISOString().split('T')[0];
      
      // Check if there's already an active shift today
      const shiftsRef = collection(db, `tenants/${tenantId}/shifts`);
      const q = query(
        shiftsRef,
        where('date', '==', today),
        where('status', '==', 'active')
      );
      
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        console.log('✅ Active shift already exists for today');
        return;
      }

      // Create a new shift
      const now = new Date();
      const shiftData = {
        date: today,
        shiftType: 'morning',
        startTime: now.toISOString(),
        endTime: null,
        status: 'active',
        staffOnDuty: [email],
        startedBy: email,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      };

      await addDoc(shiftsRef, shiftData);
      console.log('✅ Shift automatically started for staff member');
      
      notifications.showSuccess(
        'Shift Started',
        'Your shift has been automatically started',
        3000
      );
    } catch (error) {
      console.error('Error starting shift:', error);
      // Don't block login if shift creation fails
      notifications.showWarning(
        'Shift Notice',
        'Login successful, but shift could not be started automatically',
        3000
      );
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    
    // 🔍 DEBUGGING: Log input changes (be careful with sensitive data)
    console.log('📝 Form input changed:', {
      field: name,
      hasValue: !!value,
      valueLength: value.length,
      timestamp: new Date().toISOString()
    })
    
    setFormData(prev => ({ ...prev, [name]: value }))
    setError('') // Clear error on input change
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 🔍 Start debugging with timer
    const stopTimer = debugTimer('Authentication Process');
    
    debugTrace('handleSubmit', {
      hasEmail: !!formData.email,
      hasPassword: !!formData.password,
      passwordLength: formData.password?.length || 0
    }, { 
      component: 'AuthenticationSystem',
      sensitive: true 
    })
    
    setLoading(true)
    setIsAuthenticating(true)
    setError('')
    setSecurityWarnings([])

    try {
      // Show loading screen for better UX
      await new Promise(resolve => setTimeout(resolve, 500))

      debugStep('Validating form data', {
        emailProvided: !!formData.email,
        passwordProvided: !!formData.password
      }, { component: 'AuthenticationSystem' })

      // For production, this would integrate with Firebase Auth or another auth service
      // For now, we'll use a simple validation
      if (!formData.email || !formData.password) {
        debugValidation('Login form validation', false, {
          email: !!formData.email,
          password: !!formData.password
        }, { component: 'AuthenticationSystem' })
        throw new Error('Please enter both email and password.')
      }

      debugValidation('Form data validation', true, { 
        message: 'Form data validation passed' 
      }, { component: 'AuthenticationSystem' })

      // 🔍 Determine and log user role
      let userRole: UserRole = 'staff' // Default role
      
      if (formData.email.includes('owner') || formData.email.includes('admin')) {
        userRole = 'owner'
      } else if (formData.email.includes('manager')) {
        userRole = 'manager'
      }

      debugStep('User role determined', {
        detectedRole: userRole,
        logic: formData.email.includes('owner') ? 'owner keyword' : 
               formData.email.includes('manager') ? 'manager keyword' : 'default staff'
      }, { component: 'AuthenticationSystem', sensitive: true })

      debugStep('Starting security validation', {
        role: userRole
      }, { component: 'AuthenticationSystem', sensitive: true })

      // Validate credentials with security manager
      const result = await securityManager.validateCredentials(
        formData.email, 
        formData.password, 
        userRole
      )
      
      debugStep('Security validation completed', {
        success: result.success,
        hasWarnings: (result.securityWarnings?.length ?? 0) > 0,
        warningCount: result.securityWarnings?.length ?? 0
      }, { component: 'AuthenticationSystem', level: result.success ? 'success' : 'error' })
      
      if (!result.success) {
        debugError(result.message, {
          email: formData.email,
          role: userRole
        }, { component: 'AuthenticationSystem', sensitive: true })
        throw new Error(result.message)
      }

      // Show security warnings if any
      if (result.securityWarnings && result.securityWarnings.length > 0) {
        console.warn('⚠️ Security warnings detected:', result.securityWarnings)
        setSecurityWarnings(result.securityWarnings)
        notifications.showWarning(
          'Security Alert',
          `${result.securityWarnings.length} security warning(s) detected`,
          3000
        )
      }

      // 🔍 DEBUGGING STEP 6: Session creation
      console.log('🎫 Creating user session...', {
        email: formData.email,
        role: userRole,
        timestamp: new Date().toISOString()
      })

      // Create secure session
      const sessionId = sessionManager.createSession(
        `user-${userRole}-${Date.now()}`,
        formData.email,
        userRole
      )
      
      console.log('✅ Session created successfully:', {
        sessionId: sessionId.substring(0, 8) + '...', // Only show first 8 chars for security
        role: userRole,
        email: formData.email
      })

      // 🔍 DEBUGGING STEP 7: Update user context
      console.log('👤 Updating user context...', { role: userRole, email: formData.email })
      
      // Update user context
      setCurrentRole(userRole)
      setCurrentUser({
        uid: `user-${userRole}-${Date.now()}`,
        email: formData.email,
        role: userRole
      })

      // 🔍 DEBUGGING STEP 8: Auto-start shift for staff
      if (userRole === 'staff') {
        console.log('⏰ Starting shift for staff member...', formData.email)
      }
      await startShiftForStaff(formData.email, userRole);

      // Show success notification
      notifications.showSuccess(
        'Welcome to CoreTrack!',
        `Successfully signed in${userRole === 'staff' ? ' - Shift started' : ''}`,
        2000
      )

      console.log(`✅ Authentication completed successfully:`, {
        email: formData.email,
        role: userRole,
        timestamp: new Date().toISOString(),
        shiftStarted: userRole === 'staff'
      })
      
      // Brief delay to show success notification
      setTimeout(() => {
        setIsAuthenticating(false)
        onLoginSuccess()
      }, 1500)

    } catch (err: any) {
      // 🔍 DEBUGGING STEP 9: Comprehensive error logging
      console.error('❌ Authentication failed:', {
        error: err.message,
        errorType: err.name,
        stack: err.stack?.split('\n')[0], // First line of stack trace
        email: formData.email,
        timestamp: new Date().toISOString(),
        formData: {
          hasEmail: !!formData.email,
          hasPassword: !!formData.password,
          emailLength: formData.email?.length || 0,
          passwordLength: formData.password?.length || 0
        }
      })

      const errorMessage = err.message || 'Authentication failed. Please try again.'
      setError(errorMessage)
      
      notifications.showError(
        'Authentication Failed',
        errorMessage,
        4000
      )
      setIsAuthenticating(false)
    } finally {
      // 🔍 DEBUGGING STEP 10: Cleanup logging
      console.log('🧹 Authentication process cleanup:', {
        timestamp: new Date().toISOString(),
        finalLoadingState: false
      })
      setLoading(false)
    }
  }

  // Show loading screen during authentication
  if (isAuthenticating) {
    return <LoadingScreen message="Authenticating..." submessage="Securing your session" />
  }

  return (
    <>
      <NotificationSystem 
        notifications={notifications.notifications} 
        onRemove={notifications.removeNotification} 
      />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <CoreTrackLogo className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">CoreTrack</h1>
          <p className="text-gray-600">Business Management System</p>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 mx-auto mt-3 rounded-full"></div>
        </div>

        {/* Main Login Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Card Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-white">
            <h2 className="text-lg font-semibold">Sign In to Your Account</h2>
            <p className="text-blue-100 text-sm">Enter your credentials to access CoreTrack</p>
          </div>

          {/* Card Body */}
          <div className="p-6">
            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm text-red-700 font-medium">{error}</span>
                </div>
              </div>
            )}

            {/* Security Warnings */}
            {securityWarnings.length > 0 && (
              <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-orange-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-orange-800 mb-1">Security Alerts:</p>
                    {securityWarnings.map((warning, index) => (
                      <p key={index} className="text-sm text-orange-700">• {warning}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter your email address"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter your password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Authenticating...
                  </div>
                ) : (
                  'Sign In to CoreTrack'
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            Secure authentication powered by CoreTrack
          </p>
          <p className="text-xs text-gray-400 mt-2">
            © 2025 CoreTrack. Professional Business Management System.
          </p>
        </div>
        </div>
      </div>
    </>
  )
}

export default AuthenticationSystem
