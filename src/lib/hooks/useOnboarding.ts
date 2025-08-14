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
      // Check if onboarding was already completed
      const onboardingComplete = localStorage.getItem('coretrack_onboarding_complete')
      
      // Also check if this is a new user (created in the last 24 hours)
      const isNewUser = profile.createdAt && 
        new Date().getTime() - profile.createdAt.toMillis() < 24 * 60 * 60 * 1000

      // Show onboarding if:
      // 1. Not completed AND (new user OR no completion record)
      const shouldShowOnboarding = !onboardingComplete && (isNewUser || !onboardingComplete)
      
      setShowOnboarding(shouldShowOnboarding)
      setIsLoading(false)
    } else if (user === null) {
      // User is not authenticated
      setIsLoading(false)
      setShowOnboarding(false)
    }
  }, [user, profile])

  const completeOnboarding = () => {
    localStorage.setItem('coretrack_onboarding_complete', 'true')
    setShowOnboarding(false)
  }

  const resetOnboarding = () => {
    localStorage.removeItem('coretrack_onboarding_complete')
    setShowOnboarding(true)
  }

  return {
    showOnboarding,
    completeOnboarding,
    resetOnboarding,
    isLoading
  }
}
