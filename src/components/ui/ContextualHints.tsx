'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/lib/context/AuthContext'
import { Tooltip } from './Tooltip'
import { HelpCircle, X, Lightbulb } from 'lucide-react'

interface FirstTimeUserHint {
  id: string
  target: string // CSS selector
  title: string
  content: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  showOnlyOnce?: boolean
  delayMs?: number
}

// Predefined hints for first-time users
export const firstTimeHints: FirstTimeUserHint[] = [
  {
    id: 'inventory-add-first-item',
    target: '[data-tour="add-inventory-btn"]',
    title: 'Start Here! 👆',
    content: 'Add your first inventory item to begin tracking your stock levels.',
    position: 'bottom',
    showOnlyOnce: true,
    delayMs: 2000
  },
  {
    id: 'pos-first-sale',
    target: '[data-tour="checkout-btn"]',
    title: 'Process Your First Sale',
    content: 'Add items to the cart and tap here to process your first transaction!',
    position: 'top',
    showOnlyOnce: true
  },
  {
    id: 'search-inventory',
    target: '[data-tour="search-bar"]',
    title: 'Pro Tip 💡',
    content: 'Use search to quickly find items as your inventory grows!',
    position: 'bottom',
    delayMs: 5000
  }
]

interface ContextualHintsProps {
  page: 'inventory' | 'pos' | 'analytics'
  className?: string
}

export function ContextualHints({ page, className = '' }: ContextualHintsProps) {
  const { profile } = useAuth()
  const [activeHints, setActiveHints] = useState<FirstTimeUserHint[]>([])
  const [dismissedHints, setDismissedHints] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!profile) return

    // Check if user is new (created within last 7 days)
    const isNewUser = profile.createdAt && 
      (Date.now() - profile.createdAt.toMillis()) < (7 * 24 * 60 * 60 * 1000)

    if (isNewUser) {
      // Load dismissed hints from localStorage
      const dismissedArray = JSON.parse(localStorage.getItem('coretrack_dismissed_hints') || '[]') as string[]
      const dismissed = new Set(dismissedArray)
      setDismissedHints(dismissed)

      // Filter hints for current page and not dismissed
      const pageHints = firstTimeHints.filter(hint => {
        const isForThisPage = hint.target.includes(page) || 
          (page === 'inventory' && hint.id.includes('inventory')) ||
          (page === 'pos' && hint.id.includes('pos')) ||
          (page === 'analytics' && hint.id.includes('analytics'))
        
        return isForThisPage && !dismissed.has(hint.id)
      })

      setActiveHints(pageHints)
    }
  }, [profile, page])

  const dismissHint = (hintId: string) => {
    const newDismissed = new Set(dismissedHints)
    newDismissed.add(hintId)
    setDismissedHints(newDismissed)
    
    // Save to localStorage
    localStorage.setItem(
      'coretrack_dismissed_hints', 
      JSON.stringify(Array.from(newDismissed))
    )

    // Remove from active hints
    setActiveHints(prev => prev.filter(hint => hint.id !== hintId))
  }

  if (activeHints.length === 0) return null

  return (
    <div className={className}>
      {activeHints.map((hint) => (
        <HintTooltip
          key={hint.id}
          hint={hint}
          onDismiss={() => dismissHint(hint.id)}
        />
      ))}
    </div>
  )
}

interface HintTooltipProps {
  hint: FirstTimeUserHint
  onDismiss: () => void
}

function HintTooltip({ hint, onDismiss }: HintTooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      const element = document.querySelector(hint.target) as HTMLElement
      if (element) {
        setTargetElement(element)
        setIsVisible(true)
      }
    }, hint.delayMs || 1000)

    return () => clearTimeout(timer)
  }, [hint])

  useEffect(() => {
    if (isVisible && targetElement) {
      // Add a gentle pulse animation to the target element
      targetElement.classList.add('animate-pulse')
      
      return () => {
        targetElement.classList.remove('animate-pulse')
      }
    }
  }, [isVisible, targetElement])

  if (!isVisible || !targetElement) return null

  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      <HintBubble
        hint={hint}
        targetElement={targetElement}
        onDismiss={onDismiss}
      />
    </div>
  )
}

interface HintBubbleProps {
  hint: FirstTimeUserHint
  targetElement: HTMLElement
  onDismiss: () => void
}

function HintBubble({ hint, targetElement, onDismiss }: HintBubbleProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const updatePosition = () => {
      const rect = targetElement.getBoundingClientRect()
      const hintWidth = 280
      const hintHeight = 120
      const padding = 12

      let x = rect.left + rect.width / 2 - hintWidth / 2
      let y = rect.top

      switch (hint.position) {
        case 'top':
          y = rect.top - hintHeight - padding
          break
        case 'bottom':
          y = rect.bottom + padding
          break
        case 'left':
          x = rect.left - hintWidth - padding
          y = rect.top + rect.height / 2 - hintHeight / 2
          break
        case 'right':
          x = rect.right + padding
          y = rect.top + rect.height / 2 - hintHeight / 2
          break
      }

      // Keep within viewport
      x = Math.max(padding, Math.min(x, window.innerWidth - hintWidth - padding))
      y = Math.max(padding, Math.min(y, window.innerHeight - hintHeight - padding))

      setPosition({ x, y })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition)
    }
  }, [targetElement, hint.position])

  return (
    <div
      className="absolute pointer-events-auto"
      style={{ left: position.x, top: position.y }}
    >
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl shadow-lg max-w-xs animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-3 pb-2">
          <div className="flex items-center space-x-2">
            <Lightbulb className="w-4 h-4" />
            <span className="font-medium text-sm">{hint.title}</span>
          </div>
          <button
            onClick={onDismiss}
            className="text-white/70 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-3 pb-3">
          <p className="text-sm leading-relaxed text-white/90">
            {hint.content}
          </p>
        </div>

        {/* Arrow */}
        <div
          className={`absolute w-3 h-3 bg-primary-500 transform rotate-45 ${
            hint.position === 'top' ? 'bottom-[-6px] left-1/2 -translate-x-1/2' :
            hint.position === 'bottom' ? 'top-[-6px] left-1/2 -translate-x-1/2' :
            hint.position === 'left' ? 'right-[-6px] top-1/2 -translate-y-1/2' :
            'left-[-6px] top-1/2 -translate-y-1/2'
          }`}
        />
      </div>
    </div>
  )
}

export default ContextualHints
