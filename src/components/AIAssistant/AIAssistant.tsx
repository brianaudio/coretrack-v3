// AI Assistant Integration Component
// Main component that orchestrates the entire AI chat system

'use client'

import React, { useState, useEffect } from 'react'
import FloatingChatButton from './FloatingChatButton'
import ChatPanel from './ChatPanel'
import { useAuth } from '@/lib/context/AuthContext'
import { useSubscription } from '@/lib/context/SubscriptionContext'

interface AIAssistantProps {
  className?: string
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [hasNewMessage, setHasNewMessage] = useState(false)
  const { user, profile, loading } = useAuth()
  const { subscription, loading: subscriptionLoading } = useSubscription()

  // Debug logging
  console.log('✦ AI Assistant Loading:', { user: !!user, profile: !!profile, loading })

  // Derive user context from your existing auth
  const userContext = {
    userRole: profile?.role || 'staff',
    businessType: 'general', // Could be derived from tenant info
    tenantId: profile?.tenantId || '',
    userName: profile?.displayName || user?.displayName || 'User',
    subscriptionPlan: subscription?.planId || 'enterprise' // Temporarily default to enterprise for testing
  }

  // Handle new message notifications
  const handleNewMessage = () => {
    if (!isOpen) {
      setHasNewMessage(true)
    }
  }

  // Clear new message indicator when opening chat
  const handleToggleChat = () => {
    setIsOpen(!isOpen)
    if (!isOpen && hasNewMessage) {
      setHasNewMessage(false)
    }
  }

  // Auto-welcome message for new sessions
  useEffect(() => {
    if (user && !loading) {
      const hasSeenWelcome = localStorage.getItem('coretrack_ai_welcome')
      if (!hasSeenWelcome) {
        setTimeout(() => {
          setHasNewMessage(true)
        }, 2000) // Show after 2 seconds
        localStorage.setItem('coretrack_ai_welcome', 'true')
      }
    }
  }, [user, loading])

  // Always show for testing - remove this later
  console.log('✦ AI Assistant Debug:', { user: !!user, profile: !!profile, loading })
  
  // For now, let's show the button even without authentication for testing
  if (loading || subscriptionLoading) {
    console.log('✦ AI Assistant waiting for auth and subscription...')
    return null
  }

  console.log('✦ AI Assistant RENDERING!')

  return (
    <div className={`fixed z-50 ${className}`} style={{ zIndex: 99999 }}>
      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 md:bottom-24 md:right-6">
          <ChatPanel 
            isOpen={true}
            onClose={() => setIsOpen(false)}
            userContext={userContext}
            onNewMessage={handleNewMessage}
          />
        </div>
      )}

      {/* Floating Chat Button */}
      <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6" style={{ zIndex: 99999 }}>
        <FloatingChatButton
          isOpen={isOpen}
          hasNewMessage={hasNewMessage}
          onClick={handleToggleChat}
          userName={userContext.userName}
        />
      </div>

      {/* Mobile overlay when chat is open */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 md:hidden z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}

export default AIAssistant
