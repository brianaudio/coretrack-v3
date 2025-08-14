'use client'

import { FC } from 'react'

interface QuickAction {
  id: string
  label: string
  icon: string
  question: string
  category: 'inventory' | 'pos' | 'team' | 'general'
}

interface QuickActionsProps {
  onActionClick: (question: string) => void
  userRole?: string
}

const QuickActions: FC<QuickActionsProps> = ({ onActionClick, userRole = 'staff' }) => {
  
  // Role-based quick actions
  const getQuickActions = (): QuickAction[] => {
    const baseActions: QuickAction[] = [
      {
        id: 'inventory-add',
        label: 'Add Inventory',
        icon: '📦',
        question: 'How do I add new items to my inventory?',
        category: 'inventory'
      },
      {
        id: 'pos-order',
        label: 'Process Order',
        icon: '🛒',
        question: 'How do I process a customer order in POS?',
        category: 'pos'
      },
      {
        id: 'payment-methods',
        label: 'Payment Options',
        icon: '💳',
        question: 'What payment methods can I accept?',
        category: 'pos'
      },
      {
        id: 'low-stock',
        label: 'Low Stock Alert',
        icon: '⚠️',
        question: 'How do I check which items are running low?',
        category: 'inventory'
      }
    ]

    // Add role-specific actions
    if (userRole === 'owner' || userRole === 'manager') {
      baseActions.push(
        {
          id: 'team-add',
          label: 'Add Team Member',
          icon: '👥',
          question: 'How do I add a new team member?',
          category: 'team'
        },
        {
          id: 'reports',
          label: 'View Reports',
          icon: '📊',
          question: 'How can I view sales and inventory reports?',
          category: 'general'
        }
      )
    }

    return baseActions
  }

  const quickActions = getQuickActions()

  const getCategoryColor = (category: string) => {
    const colors = {
      inventory: 'from-blue-500 to-blue-600',
      pos: 'from-green-500 to-green-600',
      team: 'from-purple-500 to-purple-600',
      general: 'from-orange-500 to-orange-600'
    }
    return colors[category as keyof typeof colors] || colors.general
  }

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Actions:</h4>
      <div className="grid grid-cols-2 gap-2">
        {quickActions.map((action) => (
          <button
            key={action.id}
            onClick={() => onActionClick(action.question)}
            className={`p-3 rounded-xl text-left text-white bg-gradient-to-br ${getCategoryColor(action.category)} hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200 group`}
          >
            <div className="flex items-center space-x-2">
              <span className="text-lg group-hover:scale-110 transition-transform duration-200">
                {action.icon}
              </span>
              <span className="text-xs font-medium leading-tight">
                {action.label}
              </span>
            </div>
          </button>
        ))}
      </div>
      
      {/* Help text */}
      <div className="mt-3 text-xs text-gray-500 text-center">
        Click a quick action or type your question below
      </div>
    </div>
  )
}

export default QuickActions
