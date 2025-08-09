'use client'

import { useAuth } from '../../lib/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Login from '../../components/Login'

export default function LoginPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Wait for auth to finish loading before making decisions
    if (loading) {
      return
    }

    // If user is already authenticated, redirect to home
    if (user) {
      router.push('/')
      return
    }
  }, [user, router, loading])

  const handleLogin = () => {
    // This will be called when login is successful
    // The useEffect above will handle the redirect
    router.push('/')
  }

  // Show loading while auth is initializing
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50 flex items-center justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-lg">
          <div className="bg-white py-10 px-6 shadow-2xl rounded-3xl border border-gray-100/80 backdrop-blur-sm sm:px-12 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600 font-medium">Loading CoreTrack...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Don't render the login form if user is already authenticated
  if (user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-10 px-6 shadow-2xl rounded-3xl border border-gray-100/80 backdrop-blur-sm sm:px-12">
          <Login onLogin={handleLogin} />
        </div>
      </div>
    </div>
  )
}
