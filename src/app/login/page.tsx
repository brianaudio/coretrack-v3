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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  // Don't render the login form if user is already authenticated
  if (user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <Login onLogin={handleLogin} />
        </div>
      </div>
    </div>
  )
}
