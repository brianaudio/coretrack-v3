'use client'

import LandingPage from '../components/LandingPage'
import { useState } from 'react'

export default function HomePage() {
  const [showApp, setShowApp] = useState(false)

  const handleGetStarted = () => {
    // Redirect to login or dashboard
    window.location.href = '/login' // or wherever your main app is
  }

  const handleSignIn = () => {
    // Redirect to login
    window.location.href = '/login'
  }

  return (
    <LandingPage 
      onGetStarted={handleGetStarted}
      onSignIn={handleSignIn}
    />
  )
}
