'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

export function useOnboarding() {
  const { user, profile } = useAuth()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Only show onboarding for authenticated users with a profile
    if (user && profile) {
      // Check if onboarding was already completed with standardized key
      const onboardingCompletedNew = localStorage.getItem('coretrack_onboarding_completed')
      const onboardingCompletedOld = localStorage.getItem('coretrack_onboarding_complete')
      
      // If either version exists, consider onboarding completed
      const isOnboardingCompleted = onboardingCompletedNew || onboardingCompletedOld
      
      if (isOnboardingCompleted) {
        // Standardize to the new key if old key exists
        if (onboardingCompletedOld && !onboardingCompletedNew) {
          localStorage.setItem('coretrack_onboarding_completed', 'true')
          localStorage.removeItem('coretrack_onboarding_complete') // Clean up old key
        }
        setShowOnboarding(false)
        setIsLoading(false)
        return
      }
      
      // Check if this is a new user (created in the last 3 days)
      // This prevents existing users from seeing onboarding every time
      let isNewUser = false
      
      if (profile.createdAt) {
        const creationTime = profile.createdAt.toMillis()
        const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000) // 3 days
        isNewUser = creationTime > threeDaysAgo
      } else if (user.metadata?.creationTime) {
        const creationTime = new Date(user.metadata.creationTime).getTime()
        const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000) // 3 days
        isNewUser = creationTime > threeDaysAgo
      }
      
      if (!isNewUser) {
        // Auto-mark old users as onboarded to prevent future prompts
        localStorage.setItem('coretrack_onboarding_completed', 'true')
        setShowOnboarding(false)
      } else {
        // Show onboarding for new users
        setShowOnboarding(true)
      }
      
      setIsLoading(false)
    } else if (user === null) {
      // User is not authenticated
      setIsLoading(false)
      setShowOnboarding(false)
    }
  }, [user, profile])

  const completeOnboarding = () => {
    localStorage.setItem('coretrack_onboarding_completed', 'true')
    // Also clean up old key if it exists
    localStorage.removeItem('coretrack_onboarding_complete')
    setShowOnboarding(false)
  }

  const resetOnboarding = () => {
    localStorage.removeItem('coretrack_onboarding_completed')
    localStorage.removeItem('coretrack_onboarding_complete') // Clean up old key too
    setShowOnboarding(true)
  }

  return {
    showOnboarding,
    completeOnboarding,
    resetOnboarding,
    isLoading
  }
}
