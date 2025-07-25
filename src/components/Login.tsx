'use client'

import { useState } from 'react'
import { signIn, signUp, demoLogin } from '../lib/firebase/auth'
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
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    try {
      if (isSignUp) {
        const displayName = formData.get('displayName') as string
        const businessName = formData.get('businessName') as string
        const businessType = formData.get('businessType') as 'restaurant' | 'cafe' | 'food_truck' | 'other'
        
        await signUp(email, password, displayName, businessName, businessType)
      } else {
        await signIn(email, password)
      }
      
      onLogin()
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleDemoLogin = async () => {
    setLoading(true)
    setError('')
    
    try {
      await demoLogin()
      onLogin()
    } catch (err: any) {
      setError(err.message || 'Demo login failed')
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
