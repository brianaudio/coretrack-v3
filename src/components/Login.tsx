'use client'

import { useState } from 'react'
import { signIn, createDemoAccount, createProfessionalDemoAccount } from '../lib/firebase/auth'
import CoreTrackLogo from './CoreTrackLogo'

interface LoginProps {
  onLogin: () => void
}

export default function Login({ onLogin }: LoginProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showDemo, setShowDemo] = useState(false)

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

  const handleProfessionalDemo = async () => {
    setLoading(true)
    setError('')
    
    try {
      await createProfessionalDemoAccount()
      onLogin()
    } catch (err: any) {
      console.error('Professional demo login error:', err)
      setError('Demo login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDemoLogin = async () => {
    setLoading(true)
    setError('')
    
    try {
      await createDemoAccount()
      onLogin()
    } catch (err: any) {
      console.error('Demo login error:', err)
      setError('Demo login failed. Please try again.')
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

            {!showDemo ? (
              // Login Form
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

                {/* Demo Access */}
                <div className="pt-6">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-white text-slate-500 font-medium">or explore with demo</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowDemo(true)}
                    className="w-full mt-6 py-3 px-6 bg-slate-50 border border-slate-200 text-slate-700 rounded-2xl font-medium hover:bg-slate-100 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-all duration-200"
                  >
                    Try Demo Version
                  </button>
                </div>

                {/* Invitation Note */}
                <div className="text-center pt-4">
                  <p className="text-slate-500 text-sm font-medium">
                    Need an account? Contact your administrator for access.
                  </p>
                </div>
              </form>
            ) : (
              // Demo Options
              <div className="space-y-8">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-slate-800 mb-3">Try CoreTrack</h3>
                  <p className="text-slate-600 text-base font-medium">Experience our platform with sample data</p>
                </div>

                <div className="space-y-5">
                  <button 
                    onClick={handleProfessionalDemo}
                    disabled={loading}
                    className="w-full p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-semibold hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <div className="text-left">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-lg">Professional Demo</span>
                        <span className="text-xs bg-white/25 px-3 py-1 rounded-full font-semibold">₱199/month features</span>
                      </div>
                      <p className="text-sm text-blue-100">Full feature access with comprehensive restaurant data</p>
                    </div>
                  </button>
                  
                  <button 
                    onClick={handleDemoLogin}
                    disabled={loading}
                    className="w-full p-6 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl font-semibold hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    <div className="text-left">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-lg">Basic Demo</span>
                        <span className="text-xs bg-slate-100 px-3 py-1 rounded-full font-semibold text-slate-600">₱89/month features</span>
                      </div>
                      <p className="text-sm text-slate-500">Essential features with limited sample data</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowDemo(false)}
                    className="w-full py-3 text-slate-600 hover:text-slate-800 text-sm font-medium transition-colors duration-200 flex items-center justify-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to Login
                  </button>
                </div>
              </div>
            )}
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
