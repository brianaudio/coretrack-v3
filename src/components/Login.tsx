'use client'

import { useState } from 'react'
import { signIn, signUp } from '../lib/firebase/auth'
import CoreTrackLogo from './CoreTrackLogo'

interface LoginProps {
  onLogin: () => void
}

export default function Login({ onLogin }: LoginProps) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const form = e.currentTarget
    const formData = new FormData(form)
    const email = (formData.get('email') as string)?.toLowerCase().trim()
    const password = formData.get('password') as string

    // Input validation
    if (!email || !password) {
      setError('Email and password are required')
      setLoading(false)
      return
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address')
      setLoading(false)
      return
    }

    // Password strength validation for signup
    if (isSignUp) {
      if (password.length < 8) {
        setError('Password must be at least 8 characters long')
        setLoading(false)
        return
      }
      
      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
        setError('Password must contain at least one uppercase letter, one lowercase letter, and one number')
        setLoading(false)
        return
      }
    }

    try {
      if (isSignUp) {
        const displayName = (formData.get('displayName') as string)?.trim()
        const businessName = (formData.get('businessName') as string)?.trim()
        const businessType = formData.get('businessType') as 'restaurant' | 'cafe' | 'food_truck' | 'other'
        
        // Additional validation for signup
        if (!displayName || !businessName) {
          setError('All fields are required for signup')
          setLoading(false)
          return
        }
        
        await signUp(email, password, displayName, businessName, businessType)
      } else {
        await signIn(email, password)
      }
      
      onLogin()
    } catch (err: any) {
      // Don't expose internal error details
      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email address')
      } else if (err.code === 'auth/wrong-password') {
        setError('Incorrect password')
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed login attempts. Please try again later.')
      } else if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists')
      } else {
        setError('Login failed. Please check your credentials and try again.')
        console.error('Login error:', err) // Log for debugging, don't expose to user
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDemoLogin = async () => {
    setLoading(true)
    setError('')
    
    try {
      // Demo credentials should be environment variables in production
      const demoEmail = process.env.NEXT_PUBLIC_DEMO_EMAIL || 'demo@coretrack.dev'
      const demoPassword = process.env.NEXT_PUBLIC_DEMO_PASSWORD || 'demo123'
      
      await signIn(demoEmail, demoPassword)
      onLogin()
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        setError('Demo account not available')
      } else {
        setError('Demo login failed. Please try manual login.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="card max-w-md w-full p-8 space-y-6">
        <div className="text-center space-y-4">
          <CoreTrackLogo size="xl" showShadow={true} className="mx-auto" />
          <div>
            <h1 className="text-3xl font-bold text-surface-900">CoreTrack</h1>
            <p className="text-surface-600 mt-2">Business Inventory Management</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">
                  Your Name
                </label>
                <input 
                  type="text" 
                  name="displayName"
                  required
                  className="input-field" 
                  placeholder="Enter your full name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">
                  Business Name
                </label>
                <input 
                  type="text" 
                  name="businessName"
                  required
                  className="input-field" 
                  placeholder="Enter your business name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">
                  Business Type
                </label>
                <select name="businessType" required className="input-field">
                  <option value="restaurant">Restaurant</option>
                  <option value="cafe">Cafe</option>
                  <option value="food_truck">Food Truck</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </>
          )}
          
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-2">
              Email
            </label>
            <input 
              type="email" 
              name="email"
              required
              className="input-field" 
              placeholder="Enter your email"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-2">
              Password
            </label>
            <input 
              type="password" 
              name="password"
              required
              minLength={6}
              className="input-field" 
              placeholder="Enter your password"
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <div className="space-y-3">
          <button 
            onClick={handleDemoLogin}
            disabled={loading}
            className="btn-secondary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Please wait...' : 'Try Demo Account'}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
