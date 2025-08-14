'use client'

import React, { useState } from 'react'
import { HelpCircle, BookOpen, Play, X, ChevronRight } from 'lucide-react'
import { Tooltip } from './Tooltip'
import { HelpSystem } from './HelpSystem'

interface HelpMenuProps {
  tourId?: 'inventory' | 'pos' | 'analytics'
  helpLinks?: Array<{
    title: string
    description: string
    action: () => void
    icon?: React.ReactNode
  }>
  className?: string
}

export function HelpMenu({ tourId, helpLinks = [], className = '' }: HelpMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  const defaultHelpLinks = [
    {
      title: 'Getting Started Guide',
      description: 'Learn the basics of CoreTrack',
      action: () => {
        // Could open a help modal or external guide
        window.open('/help/getting-started', '_blank')
      },
      icon: <BookOpen className="w-4 h-4" />
    },
    {
      title: 'Contact Support',
      description: 'Get help from our team',
      action: () => {
        // Could open chat widget or contact form
        window.open('mailto:support@coretrack.app', '_blank')
      },
      icon: <HelpCircle className="w-4 h-4" />
    }
  ]

  const allLinks = [...helpLinks, ...defaultHelpLinks]

  return (
    <div className={`relative ${className}`}>
      {/* Help trigger button */}
      <Tooltip content="Get help and learn features" position="bottom">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-center w-10 h-10 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Help menu"
        >
          <HelpCircle className="w-5 h-5" />
        </button>
      </Tooltip>

      {/* Help dropdown menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-30" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div className="absolute right-0 top-12 z-40 w-80 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-medium text-gray-900">Help & Support</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-2">
              {/* Guided tour option */}
              {tourId && (
                <div className="p-2 mb-2">
                  <HelpSystem 
                    tourId={tourId} 
                    className="w-full"
                  />
                </div>
              )}

              {/* Help links */}
              <div className="space-y-1">
                {allLinks.map((link, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      link.action()
                      setIsOpen(false)
                    }}
                    className="w-full flex items-center space-x-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors group"
                  >
                    {link.icon && (
                      <div className="flex-shrink-0 text-gray-400 group-hover:text-primary-600">
                        {link.icon}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 text-sm">
                        {link.title}
                      </div>
                      <div className="text-gray-500 text-xs">
                        {link.description}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-400" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// Quick help button for floating help
export function FloatingHelpButton({ tourId }: { tourId: 'inventory' | 'pos' | 'analytics' }) {
  return (
    <div className="fixed bottom-6 right-6 z-30">
      <Tooltip content="Need help? Take a tour!" position="left">
        <div className="bg-primary-600 text-white rounded-full shadow-lg">
          <HelpSystem tourId={tourId} />
        </div>
      </Tooltip>
    </div>
  )
}

export default HelpMenu
