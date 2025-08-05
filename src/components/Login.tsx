'use client'

import { useState } from 'react'
import { signIn, signUp, createDemoAccount, createProfessionalDemoAccount } from '../lib/firebase/auth'
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
    console.log('🔧 Login form submitted!')
    setLoading(true)
    setError('')

    const form = e.currentTarget
    const formData = new FormData(form)
    const email = (formData.get('email') as string)?.toLowerCase().trim()
    const password = formData.get('password') as string

    console.log('🔧 Form data:', { email, password: password ? '***' : 'empty' })

    // Input validation
    if (!email || !password) {
      console.log('🔧 Validation failed: missing email or password')
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
        console.log('🔧 Signup flow')
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
        console.log('🔧 Sign in flow')
        await signIn(email, password)
      }
      
      console.log('🔧 Authentication successful, calling onLogin()')
      onLogin()
    } catch (err: any) {
      console.error('Authentication error:', err);
      
      // Handle Firebase auth errors with user-friendly messages
      if (err.message && err.message.includes('Invalid email or password')) {
        setError('Invalid email or password. Please check your credentials.');
      } else if (err.code === 'auth/invalid-credential') {
        setError('Invalid email or password. Please check your credentials.');
      } else if (err.code === 'auth/user-not-found') {
        setError('No account found with this email address.');
      } else if (err.code === 'auth/wrong-password') {
        setError('Incorrect password.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed login attempts. Please try again later.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Please choose a stronger password.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address format.');
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Authentication failed. Please try again.');
      }
    } finally {
      setLoading(false)
    }
  }

  const handleProfessionalDemo = async () => {
    console.log('🔧 Professional Demo login clicked!')
    setLoading(true)
    setError('')
    
    try {
      console.log('🔧 Creating Professional demo account...')
      await createProfessionalDemoAccount()
      console.log('🔧 Professional demo account created, calling onLogin()')
      onLogin()
    } catch (err: any) {
      console.error('Professional demo login error:', err)
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError('Creating Professional demo account...')
      } else {
        setError('Professional demo login failed. Please try creating a manual account.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDemoLogin = async () => {
    console.log('🔧 Demo login clicked!')
    setLoading(true)
    setError('')
    
    try {
      console.log('🔧 Creating demo account...')
      await createDemoAccount()
      console.log('🔧 Demo account created, calling onLogin()')
      onLogin()
    } catch (err: any) {
      console.error('Demo login error:', err)
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError('Creating demo account...')
        // The createDemoAccount function will handle creating the account
      } else {
        setError('Demo login failed. Please try creating a manual account.')
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
          <div className="text-center text-sm text-gray-600 mb-3">
            Try CoreTrack with sample data:
          </div>
          
          <button 
            onClick={handleProfessionalDemo}
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg font-semibold hover:from-primary-700 hover:to-primary-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {loading ? 'Please wait...' : '🚀 Try Professional Demo (₱179/month features)'}
          </button>
          
          <button 
            onClick={handleDemoLogin}
            disabled={loading}
            className="btn-secondary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Please wait...' : '📊 Try Basic Demo (₱69/month features)'}
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
