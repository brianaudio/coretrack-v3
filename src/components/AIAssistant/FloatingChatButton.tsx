'use client'

import React, { useState } from 'react'
import ChatPanel from './ChatPanel'

interface FloatingChatButtonProps {
  className?: string
  isOpen?: boolean
  hasNewMessage?: boolean
  onClick?: () => void
  userName?: string
}

export default function FloatingChatButton({ 
  className = '', 
  isOpen: externalIsOpen,
  hasNewMessage: externalHasNewMessage,
  onClick,
  userName = 'User'
}: FloatingChatButtonProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const [internalHasNewMessage, setInternalHasNewMessage] = useState(false)

  // Use external state if provided, otherwise use internal state
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen
  const hasNewMessage = externalHasNewMessage !== undefined ? externalHasNewMessage : internalHasNewMessage

  const toggleChat = () => {
    if (onClick) {
      onClick()
    } else {
      setInternalIsOpen(!internalIsOpen)
      if (!internalIsOpen && internalHasNewMessage) {
        setInternalHasNewMessage(false)
      }
    }
  }

  return (
    <>
      {/* Floating Chat Button - iPad Optimized */}
      <div className={`relative ${className}`} style={{ zIndex: 9999 }}>
        <button
          onClick={toggleChat}
          className="group relative w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center border-2 border-white"
          aria-label="Open CoreTrack AI Assistant"
          style={{ zIndex: 9999, position: 'relative' }}
        >
          {/* Debug indicator */}
          <div className="absolute -top-1 -left-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          {/* AI Assistant Icon */}
          <div className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
            {isOpen ? (
              // Close Icon (X)
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="w-6 h-6">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            ) : (
              // CoreTrack Logo
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="w-6 h-6">
                {/* Core/Center circle representing the "Core" */}
                <circle cx="12" cy="12" r="3" fill="currentColor"/>
                
                {/* Tracking lines/paths radiating outward */}
                <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                  <path d="M12 1v6M12 17v6"/>
                  <path d="M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24"/>
                  <path d="M1 12h6M17 12h6"/>
                  <path d="M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24"/>
                </g>
                
                {/* Small dots at the end of tracking lines */}
                <g fill="currentColor">
                  <circle cx="12" cy="3" r="1"/>
                  <circle cx="12" cy="21" r="1"/>
                  <circle cx="21" cy="12" r="1"/>
                  <circle cx="3" cy="12" r="1"/>
                </g>
              </svg>
            )}
          </div>

          {/* New Message Indicator */}
          {hasNewMessage && !isOpen && (
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full animate-pulse flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
          )}

          {/* Pulse Animation when has new message */}
          {hasNewMessage && !isOpen && (
            <div className="absolute inset-0 w-16 h-16 bg-primary-400 rounded-full animate-ping opacity-30"></div>
          )}
        </button>

        {/* Tooltip */}
        <div className="absolute bottom-20 right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
          {isOpen ? 'Close AI Assistant' : `Hi ${userName}! Need help? ✦`}
          <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      </div>

      {/* Chat Panel - Only render if using internal state */}
      {isOpen && onClick === undefined && (
        <div className="fixed bottom-20 right-4 md:bottom-24 md:right-6 z-40">
          <ChatPanel 
            isOpen={true}
            onClose={() => setInternalIsOpen(false)} 
            onNewMessage={() => setInternalHasNewMessage(true)}
          />
        </div>
      )}
    </>
  )
}
