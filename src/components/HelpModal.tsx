'use client'

import { useHelp } from '@/lib/context/HelpContext'

const helpContent: Record<string, { title: string; content: string[] }> = {
  'pos': {
    title: 'Point of Sale Help',
    content: [
      '🍕 Click menu items to add them to your cart',
      '🔍 Use search or category filters to find items',
      '🛒 Review items in the cart on the right',
      '💳 Click "Checkout & Pay" to process payment',
      '🕒 View recent orders with the "Recent Orders" button'
    ]
  },
  'inventory': {
    title: 'Inventory Center Help',
    content: [
      '📦 View all your inventory items here',
      '➕ Add new items with the "Add Item" button',
      '📊 Track stock levels and get low stock alerts',
      '💰 Monitor item costs and values',
      '🔄 Stock levels update automatically with sales'
    ]
  },
  'menu-builder': {
    title: 'Menu Builder Help',
    content: [
      '🍽️ Create menu items for your POS system',
      '📸 Add images and descriptions to items',
      '💰 Set prices and categories',
      '🔧 Link ingredients from inventory',
      '✅ Enable items to make them available in POS'
    ]
  },
  'purchase-orders': {
    title: 'Purchase Orders Help',
    content: [
      '📝 Create purchase orders for suppliers',
      '📋 Track order status from pending to delivered',
      '📦 Receive deliveries and update inventory',
      '💰 Monitor spending and supplier relationships',
      '📊 View purchase history and analytics'
    ]
  },
  'expenses': {
    title: 'Expenses Help',
    content: [
      '💰 Track business expenses and costs',
      '📊 Categorize expenses for better reporting',
      '📋 Upload receipts and documentation',
      '💳 Monitor cash flow and spending patterns',
      '📈 View expense analytics and trends'
    ]
  },
  'team-management': {
    title: 'Team Management Help',
    content: [
      '👥 Manage staff members and roles',
      '⏰ Track work hours and shifts',
      '🔐 Set permissions and access levels',
      '💼 Monitor employee performance',
      '📅 Schedule staff and manage availability'
    ]
  },
  'business-reports': {
    title: 'Business Reports Help',
    content: [
      '📊 View detailed sales and performance reports',
      '💹 Track revenue trends and patterns',
      '📈 Monitor key business metrics',
      '📋 Generate custom report periods',
      '💾 Export reports for external use'
    ]
  },
  'dashboard': {
    title: 'Dashboard Help',
    content: [
      '🏠 Overview of your business performance',
      '📊 Quick access to key metrics',
      '🔄 Real-time data updates',
      '📈 Visual charts and graphs',
      '⚡ Quick actions and shortcuts'
    ]
  },
  'settings': {
    title: 'Settings Help',
    content: [
      '⚙️ Configure business settings',
      '🏪 Manage locations and branches',
      '👤 Update profile information',
      '🔐 Security and privacy settings',
      '💳 Subscription and billing management'
    ]
  },
  'default': {
    title: 'CoreTrack Help',
    content: [
      '🏠 Use the sidebar to navigate between modules',
      '🔄 Data syncs automatically across all modules',
      '🏪 Select your branch from the branch selector',
      '❓ Look for help buttons in each module',
      '💡 Hover over buttons to see helpful tooltips'
    ]
  }
}

export default function HelpModal() {
  const { isHelpVisible, currentModule, hideHelp } = useHelp()
  
  if (!isHelpVisible) {
    return null
  }

  const helpContent = {
    dashboard: {
      title: '📊 Dashboard Help',
      sections: [
        {
          title: 'Overview',
          content: 'The Dashboard provides a comprehensive view of your business performance with real-time analytics and key metrics.'
        },
        {
          title: 'Key Features',
          items: [
            'Real-time sales tracking and revenue charts',
            'Inventory alerts for low stock items', 
            'Recent orders and transaction history',
            'Performance metrics and growth indicators',
            'Quick access to all major functions'
          ]
        },
        {
          title: 'Quick Actions',
          items: [
            'Click on cards to navigate to specific modules',
            'Use the search bar to find items quickly',
            'Check notifications for important alerts',
            'View recent activity in the timeline'
          ]
        }
      ]
    },
    pos: {
      title: '🛒 Point of Sale Help',
      sections: [
        {
          title: 'Overview',
          content: 'The POS system allows you to process orders, manage payments, and track sales in real-time.'
        },
        {
          title: 'Taking Orders',
          items: [
            'Browse menu items by category or search',
            'Click items to add them to the cart',
            'Adjust quantities using the +/- buttons',
            'Apply discounts before checkout'
          ]
        },
        {
          title: 'Processing Payments',
          items: [
            'Choose payment method (Cash, Card, GCash, Maya)',
            'For cash payments, enter amount received',
            'System automatically calculates change',
            'Print or download receipts after payment'
          ]
        },
        {
          title: 'Order Management',
          items: [
            'View recent orders in the order history',
            'Void orders if needed (with proper authorization)',
            'Print receipts for completed orders',
            'Track order status and fulfillment'
          ]
        }
      ]
    },
    inventory: {
      title: '📦 Inventory Management Help',
      sections: [
        {
          title: 'Overview',
          content: 'Inventory Management helps you track stock levels, manage suppliers, and automate reordering processes.'
        },
        {
          title: 'Stock Management',
          items: [
            'View current stock levels for all items',
            'Set minimum stock thresholds for alerts',
            'Track item costs and pricing',
            'Monitor stock movements and usage'
          ]
        },
        {
          title: 'Adding Inventory',
          items: [
            'Click "Add Item" to create new inventory items',
            'Set item details: name, category, unit, cost',
            'Define supplier information and reorder points',
            'Upload item images for easy identification'
          ]
        },
        {
          title: 'Stock Adjustments',
          items: [
            'Record stock in/out movements',
            'Handle waste, damages, and corrections',
            'Track reasons for adjustments',
            'Maintain audit trail for all changes'
          ]
        }
      ]
    },
    analytics: {
      title: '📈 Analytics Help',
      sections: [
        {
          title: 'Overview',
          content: 'Analytics provides detailed insights into your business performance with customizable reports and visualizations.'
        },
        {
          title: 'Sales Analytics',
          items: [
            'Track daily, weekly, and monthly sales trends',
            'Analyze top-selling products and categories',
            'Monitor average order values and transaction counts',
            'Compare performance across different time periods'
          ]
        },
        {
          title: 'Financial Reports',
          items: [
            'View profit and loss statements',
            'Track expenses and cost analysis',
            'Monitor cash flow and payment methods',
            'Generate tax and accounting reports'
          ]
        }
      ]
    },
    expenses: {
      title: '💰 Expense Management Help',
      sections: [
        {
          title: 'Overview',
          content: 'Expense Management helps you track business costs, categorize spending, and monitor budget performance.'
        },
        {
          title: 'Recording Expenses',
          items: [
            'Click "Add Expense" to record new expenses',
            'Categorize expenses (Supplies, Utilities, Marketing, etc.)',
            'Attach receipts and documentation',
            'Set recurring expenses for automatic tracking'
          ]
        },
        {
          title: 'Budget Management',
          items: [
            'Set monthly and annual budgets by category',
            'Track spending against budget limits',
            'Receive alerts when approaching budget limits',
            'Analyze spending patterns and trends'
          ]
        }
      ]
    },
    'menu-builder': {
      title: '🍽️ Menu Builder Help',
      sections: [
        {
          title: 'Overview',
          content: 'Menu Builder allows you to create and manage your menu items, recipes, and ingredient tracking.'
        },
        {
          title: 'Creating Menu Items',
          items: [
            'Add new menu items with names, descriptions, and prices',
            'Upload appetizing photos for each item',
            'Categorize items (Appetizers, Main Course, Desserts)',
            'Set availability and special dietary information'
          ]
        },
        {
          title: 'Recipe Management',
          items: [
            'Define ingredients and quantities for each recipe',
            'Link menu items to inventory for cost tracking',
            'Calculate food costs and profit margins',
            'Track ingredient usage and waste'
          ]
        }
      ]
    },
    'purchase-orders': {
      title: '📋 Purchase Orders Help',
      sections: [
        {
          title: 'Overview',
          content: 'Purchase Orders help you manage supplier relationships, track orders, and maintain optimal inventory levels.'
        },
        {
          title: 'Creating Purchase Orders',
          items: [
            'Select suppliers and add items to order',
            'Set quantities based on reorder points',
            'Review costs and delivery terms',
            'Submit orders directly to suppliers'
          ]
        },
        {
          title: 'Order Tracking',
          items: [
            'Monitor order status from pending to delivered',
            'Record partial deliveries and adjustments',
            'Update inventory upon receipt',
            'Handle returns and quality issues'
          ]
        }
      ]
    }
  }

  const content = helpContent[currentModule as keyof typeof helpContent] || {
    title: '❓ Help',
    sections: [
      {
        title: 'Module Not Found',
        content: `Help content for "${currentModule}" is not available yet. Please contact support for assistance.`
      }
    ]
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{content.title}</h2>
              <p className="text-gray-500">Get help with this module</p>
            </div>
          </div>
          <button
            onClick={hideHelp}
            className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {content.sections.map((section, index) => (
              <div key={index} className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
                
                {section.content && (
                  <p className="text-gray-600 leading-relaxed">{section.content}</p>
                )}
                
                {section.items && (
                  <ul className="space-y-2">
                    {section.items.map((item, itemIndex) => (
                      <li key={itemIndex} className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-gray-600">{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Need more help? Contact our support team.
            </div>
            <button
              onClick={hideHelp}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
