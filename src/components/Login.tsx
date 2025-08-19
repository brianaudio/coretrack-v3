'use client'

import { useState } from 'react'
import { signIn } from '../lib/firebase/auth'
import CoreTrackLogo from './CoreTrackLogo'

interface LoginProps {
  onLogin: () => void
}

export default function Login({ onLogin }: LoginProps) {
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

    try {
      await signIn(email, password)
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 relative overflow-hidden">
      {/* Subtle Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 -left-4 w-64 h-64 bg-blue-600/20 rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>
        <div className="absolute top-1/3 -right-4 w-80 h-80 bg-indigo-600/20 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
        <div className="absolute bottom-1/4 left-1/4 w-72 h-72 bg-blue-500/10 rounded-full mix-blend-multiply filter blur-3xl opacity-40"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          {/* Logo and Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl mb-6 shadow-2xl ring-4 ring-blue-500/20">
              <CoreTrackLogo size="lg" showShadow={false} className="text-white" />
            </div>
            <h1 className="text-5xl font-bold text-white mb-3 tracking-tight">
              CoreTrack
            </h1>
            <p className="text-slate-300 text-xl font-light">
              Enterprise Inventory Management
            </p>
          </div>

          {/* Main Login Card */}
          <div className="bg-white/95 backdrop-blur-xl border border-white/30 rounded-3xl p-10 shadow-2xl ring-1 ring-black/5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl text-sm mb-8 shadow-sm">
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                  </svg>
                  {error}
                </div>
              </div>
            )}

            {/* Production Login Form */}
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    Email Address
                  </label>
                  <input 
                    type="email" 
                    name="email"
                    required
                    className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:border-slate-300" 
                    placeholder="Enter your email address"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    Password
                  </label>
                  <input 
                    type="password" 
                    name="password"
                    required
                    minLength={6}
                    className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:border-slate-300" 
                    placeholder="Enter your password"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-semibold hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3"></div>
                    Signing in...
                  </div>
                ) : (
                  'Sign In to CoreTrack'
                )}
              </button>

              {/* Account Information */}
              <div className="text-center pt-4">
                <p className="text-slate-500 text-sm font-medium">
                  Need an account? Contact your administrator for access.
                </p>
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="text-center mt-10">
            <p className="text-slate-400 text-sm font-medium">
              © 2025 CoreTrack. Built for Filipino businesses.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
