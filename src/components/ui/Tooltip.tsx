'use client'

import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { HelpCircle } from 'lucide-react'

interface TooltipProps {
  content: string
  children: React.ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  trigger?: 'hover' | 'click' | 'touch'
  maxWidth?: string
  className?: string
  showIcon?: boolean
}

export function Tooltip({ 
  content, 
  children, 
  position = 'top', 
  trigger = 'touch', // Default to touch for mobile
  maxWidth = '250px',
  className = '',
  showIcon = false
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const calculatePosition = () => {
    if (!triggerRef.current) return

    const rect = triggerRef.current.getBoundingClientRect()
    const tooltipHeight = 60 // Approximate tooltip height
    const tooltipWidth = 250 // Max width
    const padding = 10

    let x = 0
    let y = 0

    switch (position) {
      case 'top':
        x = rect.left + rect.width / 2 - tooltipWidth / 2
        y = rect.top - tooltipHeight - padding
        break
      case 'bottom':
        x = rect.left + rect.width / 2 - tooltipWidth / 2
        y = rect.bottom + padding
        break
      case 'left':
        x = rect.left - tooltipWidth - padding
        y = rect.top + rect.height / 2 - tooltipHeight / 2
        break
      case 'right':
        x = rect.right + padding
        y = rect.top + rect.height / 2 - tooltipHeight / 2
        break
    }

    // Keep tooltip within viewport
    x = Math.max(padding, Math.min(x, window.innerWidth - tooltipWidth - padding))
    y = Math.max(padding, Math.min(y, window.innerHeight - tooltipHeight - padding))

    setTooltipPosition({ x, y })
  }

  const showTooltip = () => {
    calculatePosition()
    setIsVisible(true)
  }

  const hideTooltip = () => {
    setIsVisible(false)
  }

  useEffect(() => {
    if (isVisible) {
      const handleClickOutside = (event: Event) => {
        const target = event.target as Node
        if (tooltipRef.current && !tooltipRef.current.contains(target) &&
            triggerRef.current && !triggerRef.current.contains(target)) {
          hideTooltip()
        }
      }

      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
        document.removeEventListener('touchstart', handleClickOutside)
      }
    }
  }, [isVisible])

  const handleInteraction = () => {
    if (trigger === 'click' || trigger === 'touch') {
      if (isVisible) {
        hideTooltip()
      } else {
        showTooltip()
      }
    }
  }

  const handleMouseEnter = () => {
    if (trigger === 'hover') {
      showTooltip()
    }
  }

  const handleMouseLeave = () => {
    if (trigger === 'hover') {
      hideTooltip()
    }
  }

  const tooltipElement = isVisible ? createPortal(
    <div
      ref={tooltipRef}
      className="fixed z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg pointer-events-none"
      style={{
        left: tooltipPosition.x,
        top: tooltipPosition.y,
        maxWidth
      }}
    >
      <div className="relative">
        {content}
        <div
          className={`absolute w-2 h-2 bg-gray-900 transform rotate-45 ${
            position === 'top' ? 'bottom-[-4px] left-1/2 -translate-x-1/2' :
            position === 'bottom' ? 'top-[-4px] left-1/2 -translate-x-1/2' :
            position === 'left' ? 'right-[-4px] top-1/2 -translate-y-1/2' :
            'left-[-4px] top-1/2 -translate-y-1/2'
          }`}
        />
      </div>
    </div>,
    document.body
  ) : null

  return (
    <>
      <div
        ref={triggerRef}
        className={`relative inline-flex items-center ${className}`}
        onClick={handleInteraction}
        onTouchStart={handleInteraction}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
        {showIcon && (
          <HelpCircle className="w-4 h-4 text-gray-400 ml-1 cursor-pointer" />
        )}
      </div>
      {tooltipElement}
    </>
  )
}

export default Tooltip
