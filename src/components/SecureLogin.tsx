'use client'

import React, { useState } from 'react'
import { roleBasedSignIn, secureSignOut, mockAuthentication } from '../lib/auth/roleBasedAuth'
import { sessionManager } from '../lib/auth/sessionManager'
import { securityManager } from '../lib/auth/securityManager'
import { useUser } from '../lib/rbac/UserContext'
import { UserRole } from '../lib/rbac/permissions'
import CoreTrackLogo from './CoreTrackLogo'

interface SecureLoginProps {
  onLoginSuccess: () => void
}

const SecureLogin: React.FC<SecureLoginProps> = ({ onLoginSuccess }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)
  const [showMockLogin, setShowMockLogin] = useState(true) // Dev mode
  const [showCredentialForm, setShowCredentialForm] = useState(false)
  const [attemptedRole, setAttemptedRole] = useState<UserRole | null>(null)
  const [securityWarnings, setSecurityWarnings] = useState<string[]>([])
  const { setCurrentRole, setCurrentUser } = useUser()

  const handleRealLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const form = e.currentTarget
    const formData = new FormData(form)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    try {
      const result = await roleBasedSignIn({ email, password })
      
      // Update user context
      setCurrentRole(result.user.role)
      setCurrentUser({
        uid: result.user.uid,
        email: result.user.email,
        role: result.user.role
      })

      onLoginSuccess()
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleRoleSelection = (role: UserRole) => {
    setAttemptedRole(role)
    setShowCredentialForm(true)
    setError('')
  }

  const handleCredentialSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!attemptedRole) return

    setLoading(true)
    setError('')
    setSecurityWarnings([])

    const form = e.currentTarget
    const formData = new FormData(form)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    try {
      // Use security manager for validation
      const result = await securityManager.validateCredentials(email, password, attemptedRole)
      
      if (!result.success) {
        throw new Error(result.message)
      }

      // Show security warnings if any
      if (result.securityWarnings && result.securityWarnings.length > 0) {
        setSecurityWarnings(result.securityWarnings)
      }

      // Simulate authentication delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Create secure session
      const sessionId = sessionManager.createSession(
        `secure-${attemptedRole}-user`,
        email,
        attemptedRole
      )
      
      // Update user context
      setCurrentRole(attemptedRole)
      setCurrentUser({
        uid: `secure-${attemptedRole}-user`,
        email: email,
        role: attemptedRole
      })

      console.log(`🔐 Secure authentication successful: ${email} (${attemptedRole})`)
      onLoginSuccess()
    } catch (err: any) {
      setError(err.message || 'Authentication failed')
      // Don't reset form on error - let user try again
    } finally {
      setLoading(false)
    }
  }

  const roleInfo = {
    owner: {
      title: 'Business Owner',
      description: 'Full access to all features and settings',
      color: 'bg-purple-100 border-purple-300 text-purple-800',
      icon: '👑'
    },
    manager: {
      title: 'Manager',
      description: 'Access to all operational features',
      color: 'bg-green-100 border-green-300 text-green-800',
      icon: '👔'
    },
    staff: {
      title: 'Staff Member',
      description: 'Access to POS, Inventory, and Purchase Orders',
      color: 'bg-blue-100 border-blue-300 text-blue-800',
      icon: '👨‍💼'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <CoreTrackLogo className="w-16 h-16" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">CoreTrack</h1>
          <p className="text-gray-600">Restaurant Management System</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          {/* Dev Mode Toggle */}
          <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={showMockLogin}
                onChange={(e) => setShowMockLogin(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium text-yellow-800">
                🔧 Development Mode (Mock Login)
              </span>
            </label>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {showMockLogin ? (
            /* Secure Role-Based Login */
            !showCredentialForm ? (
              /* Role Selection */
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-center text-gray-900 mb-4">
                  Select Your Role
                </h2>
                <p className="text-sm text-gray-600 text-center mb-4">
                  🔒 Choose your role and enter your credentials to continue
                </p>
                
                {(Object.keys(roleInfo) as UserRole[]).map((role) => (
                  <button
                    key={role}
                    onClick={() => handleRoleSelection(role)}
                    disabled={loading}
                    className={`
                      w-full p-4 rounded-lg border-2 text-left transition-all
                      ${roleInfo[role].color}
                      hover:shadow-md hover:scale-[1.02]
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{roleInfo[role].icon}</span>
                      <div className="flex-1">
                        <h3 className="font-semibold">{roleInfo[role].title}</h3>
                        <p className="text-sm opacity-80">{roleInfo[role].description}</p>
                        <p className="text-xs mt-1 opacity-60">
                          Click to authenticate as {role}
                        </p>
                      </div>
                      <div className="text-xl">🔒</div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              /* Credential Form */
              <form onSubmit={handleCredentialSubmit} className="space-y-4">
                <div className="text-center mb-4">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCredentialForm(false)
                        setAttemptedRole(null)
                        setError('')
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ← Back
                    </button>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Authenticate as {attemptedRole ? attemptedRole.charAt(0).toUpperCase() + attemptedRole.slice(1) : 'User'}
                    </h2>
                  </div>
                  {attemptedRole && (
                    <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${roleInfo[attemptedRole].color}`}>
                      <span>{roleInfo[attemptedRole].icon}</span>
                      <span>{roleInfo[attemptedRole].title}</span>
                    </div>
                  )}
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={attemptedRole && mockAuthentication[attemptedRole] ? mockAuthentication[attemptedRole].email : 'Enter your email'}
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Authenticating...' : `Sign In as ${attemptedRole ? attemptedRole.charAt(0).toUpperCase() + attemptedRole.slice(1) : 'User'}`}
                </button>

                {/* Security Warnings */}
                {securityWarnings.length > 0 && (
                  <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg">
                    <p className="text-sm font-medium text-orange-800 mb-1">⚠️ Security Alerts:</p>
                    {securityWarnings.map((warning, index) => (
                      <p key={index} className="text-sm text-orange-700">• {warning}</p>
                    ))}
                  </div>
                )}

                {/* Dev Mode: Show credentials hint */}
                {attemptedRole && (
                  <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                    <p className="text-xs text-yellow-800 font-medium">🔧 Dev Mode Credentials:</p>
                    <p className="text-xs text-yellow-700 font-mono">
                      Email: {attemptedRole && mockAuthentication[attemptedRole] ? mockAuthentication[attemptedRole].email : 'N/A'}<br/>
                      Password: {attemptedRole && mockAuthentication[attemptedRole] ? mockAuthentication[attemptedRole].password : 'N/A'}
                    </p>
                  </div>
                )}
              </form>
            )
          ) : (
            /* Real Login Form */
            <form onSubmit={handleRealLogin} className="space-y-4">
              <h2 className="text-lg font-semibold text-center text-gray-900 mb-4">
                Sign In to CoreTrack
              </h2>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="mt-4 flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-sm text-gray-600">Authenticating...</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            Secure authentication powered by CoreTrack
          </p>
        </div>
      </div>
    </div>
  )
}

export default SecureLogin
