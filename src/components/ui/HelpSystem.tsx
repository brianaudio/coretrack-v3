'use client'

import React, { useEffect } from 'react'
import { GuidedTour, useTour, TourStep } from '../ui/GuidedTour'
import { Tooltip } from '../ui/Tooltip'
import { HelpCircle, Play } from 'lucide-react'

// Inventory Center tour steps
export const inventoryTourSteps: TourStep[] = [
  {
    target: '[data-tour="add-inventory-btn"]',
    title: 'Add New Items',
    content: 'Tap here to add new inventory items. You can add products, ingredients, and supplies to track your stock levels.',
    position: 'bottom'
  },
  {
    target: '[data-tour="search-bar"]',
    title: 'Search Your Inventory',
    content: 'Use the search bar to quickly find items by name, category, or SKU. Perfect for large inventories!',
    position: 'bottom'
  },
  {
    target: '[data-tour="category-filter"]',
    title: 'Filter by Category',
    content: 'Filter items by category to organize your view. Categories help you manage different types of products.',
    position: 'bottom'
  },
  {
    target: '[data-tour="low-stock-toggle"]',
    title: 'Monitor Low Stock',
    content: 'Toggle this to see only items that are running low. Stay ahead of stockouts!',
    position: 'left'
  },
  {
    target: '[data-tour="inventory-table"]',
    title: 'Your Inventory Overview',
    content: 'Here you can see all your items with stock levels, values, and actions. Tap any item to edit or update stock.',
    position: 'top'
  }
]

// POS tour steps
export const posTourSteps: TourStep[] = [
  {
    target: '[data-tour="menu-items"]',
    title: 'Your Menu Items',
    content: 'These are your products available for sale. Tap any item to add it to the current order.',
    position: 'right'
  },
  {
    target: '[data-tour="order-summary"]',
    title: 'Current Order',
    content: 'Review the current order here. You can modify quantities or remove items before checkout.',
    position: 'left'
  },
  {
    target: '[data-tour="checkout-btn"]',
    title: 'Process Payment',
    content: 'When ready, tap here to proceed to payment. You can accept cash, card, or other payment methods.',
    position: 'top'
  }
]

interface HelpSystemProps {
  tourId: 'inventory' | 'pos' | 'analytics'
  autoStart?: boolean
  className?: string
}

export function HelpSystem({ tourId, autoStart = false, className = '' }: HelpSystemProps) {
  const { isActive, startTour, completeTour, skipTour, shouldShowTour } = useTour(tourId)

  // Get tour steps based on tourId
  const getTourSteps = (): TourStep[] => {
    switch (tourId) {
      case 'inventory':
        return inventoryTourSteps
      case 'pos':
        return posTourSteps
      case 'analytics':
        return []
      default:
        return []
    }
  }

  // Auto-start tour for new users (if enabled and they haven't seen it)
  useEffect(() => {
    if (autoStart && shouldShowTour()) {
      // Add a small delay to ensure elements are rendered
      const timer = setTimeout(() => {
        startTour()
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [autoStart, shouldShowTour, startTour])

  const steps = getTourSteps()

  return (
    <>
      {/* Help trigger button */}
      <div className={`${className}`}>
        <Tooltip
          content="Take a guided tour of this feature"
          position="left"
          trigger="touch"
        >
          <button
            onClick={startTour}
            className="flex items-center space-x-2 px-3 py-2 text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
          >
            <Play className="w-4 h-4" />
            <span>Take Tour</span>
          </button>
        </Tooltip>
      </div>

      {/* Guided tour */}
      <GuidedTour
        steps={steps}
        isActive={isActive}
        onComplete={completeTour}
        onSkip={skipTour}
        tourId={tourId}
      />
    </>
  )
}

// Individual tooltip components for specific UI elements
export function InventoryTooltips() {
  return (
    <>
      {/* These would be used in the actual inventory component */}
    </>
  )
}

// Hook to easily add help tooltips to any component
export function useHelpTooltips() {
  const addTooltip = (content: string, position: 'top' | 'bottom' | 'left' | 'right' = 'top') => ({
    'data-tooltip': content,
    'data-tooltip-position': position
  })

  return { addTooltip }
}

export default HelpSystem
