// Authentication hook for CoreTrack
// Provides user context and role-based access control

import { useState, useEffect, useContext } from 'react'

interface User {
  id: string
  email: string
  name: string
  role: 'owner' | 'manager' | 'staff'
  businessType?: string
  tenantId: string
  avatar?: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  updateUserProfile: (updates: Partial<User>) => Promise<void>
}

// Mock authentication for development
// In production, this would connect to your actual auth service
const mockUser: User = {
  id: 'user-123',
  email: 'demo@coretrack.ph',
  name: 'Demo User',
  role: 'owner',
  businessType: 'restaurant',
  tenantId: 'tenant-123',
  avatar: undefined
}

export const useAuth = (): AuthContextType => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate auth check
    const checkAuth = async () => {
      try {
        // In production, check for valid token/session
        const token = localStorage.getItem('coretrack_token')
        
        if (token) {
          // Simulate API call to verify token
          await new Promise(resolve => setTimeout(resolve, 500))
          setUser(mockUser)
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    
    try {
      // Simulate login API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // In production, verify credentials with your backend
      if (email && password) {
        const token = 'mock-jwt-token'
        localStorage.setItem('coretrack_token', token)
        setUser(mockUser)
      } else {
        throw new Error('Invalid credentials')
      }
    } catch (error) {
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('coretrack_token')
    setUser(null)
  }

  const updateUserProfile = async (updates: Partial<User>) => {
    if (!user) return

    try {
      // In production, call your API to update user profile
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setUser({ ...user, ...updates })
    } catch (error) {
      console.error('Profile update failed:', error)
      throw error
    }
  }

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    updateUserProfile
  }
}

// Hook for getting current user context for AI chat
export const useUserContext = () => {
  const { user } = useAuth()
  
  return {
    userRole: user?.role || 'staff',
    businessType: user?.businessType || 'general',
    tenantId: user?.tenantId || '',
    userName: user?.name || 'User'
  }
}
