'use client'

import { useState } from 'react'
import { ModuleType } from './Dashboard'
import CoreTrackLogo from './CoreTrackLogo'
import { ModulePermission, UserRole } from '../lib/rbac/permissions'
import { hasModuleAccess } from '../lib/rbac/subscriptionPermissions'
import { useSubscription } from '../lib/context/SubscriptionContext'
import { useBusinessSettings } from '../lib/context/BusinessSettingsContext'

interface AccordionSidebarProps {
  activeModule: ModuleType
  onModuleChange: (module: ModuleType) => void
  isOpen: boolean
  onToggle: () => void
  allowedModules: (keyof import('../lib/rbac/subscriptionPermissions').ModuleFeatureMap)[]
  currentRole: UserRole
}

// Group menu items for accordion structure
const menuGroups = [
  {
    id: 'operations',
    label: 'Operations',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
      </svg>
    ),
    items: [
      {
        id: 'pos' as ModuleType,
        label: 'Point of Sale',
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M7 18C5.9 18 5 18.9 5 20S5.9 22 7 22 9 21.1 9 20 8.1 18 7 18ZM1 2V4H3L6.6 11.59L5.25 14.04C5.09 14.32 5 14.65 5 15C5 16.1 5.9 17 7 17H19V15H7.42C7.28 15 7.17 14.89 7.17 14.75L7.2 14.63L8.1 13H15.55C16.3 13 16.96 12.59 17.3 11.97L20.88 5H5.21L4.27 3H1ZM17 18C15.9 18 15 18.9 15 20S15.9 22 17 22 19 21.1 19 20 18.1 18 17 18Z"/>
          </svg>
        )
      },
      {
        id: 'inventory' as ModuleType,
        label: 'Inventory Center',
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M4 6H2V20C2 21.1 2.9 22 4 22H18V20H4V6ZM20 2H8C6.9 2 6 2.9 6 4V16C6 17.1 6.9 18 8 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H8V4H20V16Z"/>
          </svg>
        )
      },
      {
        id: 'purchase-orders' as ModuleType,
        label: 'Purchase Orders',
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 7h-3V6a4 4 0 0 0-8 0v1H5a1 1 0 0 0-1 1v11a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V8a1 1 0 0 0-1-1zM10 6a2 2 0 0 1 4 0v1h-4V6zm8 13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V9h2v1a1 1 0 0 0 2 0V9h4v1a1 1 0 0 0 2 0V9h2v10z"/>
          </svg>
        )
      },
      {
        id: 'menu-builder' as ModuleType,
        label: 'Product Builder',
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19Z"/>
          </svg>
        )
      }
    ]
  },
  {
    id: 'analytics',
    label: 'Analytics & Intelligence',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M3 13H11V3H3V13ZM3 21H11V15H3V21ZM13 21H21V11H13V21ZM13 3V9H21V3H13Z"/>
      </svg>
    ),
    items: [
      {
        id: 'dashboard' as ModuleType,
        label: 'Dashboard',
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 13H11V3H3V13ZM3 21H11V15H3V21ZM13 21H21V11H13V21ZM13 3V9H21V3H13Z"/>
          </svg>
        )
      },
      {
        id: 'capital-intelligence' as ModuleType,
        label: 'Capital Intelligence',
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-3.84 3.11-4.25V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 4.15-3.12 4.16z"/>
          </svg>
        )
      },
      {
        id: 'business-reports' as ModuleType,
        label: 'Business Reports',
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20Z"/>
          </svg>
        )
      }
    ]
  },
  {
    id: 'management',
    label: 'Management',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V19C3 20.1 3.9 21 5 21H11V19H5V3H13V9H21Z"/>
      </svg>
    ),
    items: [
      {
        id: 'expenses' as ModuleType,
        label: 'Financials',
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M11.8 10.9C9.53 10.31 8.8 9.7 8.8 8.75C8.8 7.66 9.81 6.9 11.5 6.9C13.28 6.9 13.94 7.75 14 9H16.21C16.14 7.28 15.09 5.7 13 5.19V3H10V5.16C8.06 5.58 6.5 6.84 6.5 8.77C6.5 11.08 8.41 12.23 11.2 12.9C13.7 13.5 14.2 14.38 14.2 15.31C14.2 16 13.71 17.1 11.5 17.1C9.44 17.1 8.63 16.18 8.52 15H6.32C6.44 17.19 8.08 18.42 10 18.83V21H13V18.85C14.95 18.5 16.5 17.35 16.5 15.3C16.5 12.46 14.07 11.5 11.8 10.9Z"/>
          </svg>
        )
      },
      {
        id: 'team-management' as ModuleType,
        label: 'Team & Shifts',
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16 4C18.2 4 20 5.8 20 8S18.2 12 16 12 12 10.2 12 8 13.8 4 16 4M16 14C20.4 14 24 15.8 24 18V20H8V18C8 15.8 11.6 14 16 14M8 13C9.7 13 11 11.7 11 10S9.7 7 8 7 5 8.3 5 10 6.3 13 8 13M8 15C4.3 15 1 16.3 1 18V20H6V18C6 16.8 6.8 15.8 8 15Z"/>
          </svg>
        )
      },
      {
        id: 'location-management' as ModuleType,
        label: 'Locations',
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        )
      },
      {
        id: 'settings' as ModuleType,
        label: 'Settings',
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 15.5C13.933 15.5 15.5 13.933 15.5 12C15.5 10.067 13.933 8.5 12 8.5C10.067 8.5 8.5 10.067 8.5 12C8.5 13.933 10.067 15.5 12 15.5ZM19.43 12.98C19.47 12.66 19.5 12.34 19.5 12C19.5 11.66 19.47 11.34 19.43 11.02L21.54 9.37C21.73 9.22 21.78 8.95 21.66 8.73L19.66 5.27C19.54 5.05 19.27 4.97 19.05 5.05L16.56 6.05C16.04 5.65 15.48 5.32 14.87 5.07L14.49 2.42C14.46 2.18 14.25 2 14 2H10C9.75 2 9.54 2.18 9.51 2.42L9.13 5.07C8.52 5.32 7.96 5.66 7.44 6.05L4.95 5.05C4.72 4.96 4.46 5.05 4.34 5.27L2.34 8.73C2.21 8.95 2.27 9.22 2.46 9.37L4.57 11.02C4.53 11.34 4.5 11.67 4.5 12C4.5 12.33 4.53 12.66 4.57 12.98L2.46 14.63C2.27 14.78 2.21 15.05 2.34 15.27L4.34 18.73C4.46 18.95 4.73 19.03 4.95 18.95L7.44 17.95C7.96 18.35 8.52 18.68 9.13 18.93L9.51 21.58C9.54 21.82 9.75 22 10 22H14C14.25 22 14.46 21.82 14.49 21.58L14.87 18.93C15.48 18.68 16.04 18.34 16.56 17.95L19.05 18.95C19.28 19.04 19.54 18.95 19.66 18.73L21.66 15.27C21.78 15.05 21.73 14.78 21.54 14.63L19.43 12.98Z"/>
          </svg>
        )
      }
    ]
  }
]

export default function AccordionSidebar({
  activeModule,
  onModuleChange,
  isOpen,
  onToggle,
  allowedModules,
  currentRole
}: AccordionSidebarProps) {
  const { features } = useSubscription()
  const businessName = "CoreTrack Business" // Placeholder for now
  
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(['operations', 'analytics', 'management'])
  )

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(groupId)) {
        newSet.delete(groupId)
      } else {
        newSet.add(groupId)
      }
      return newSet
    })
  }

  const isModuleAllowed = (moduleId: ModuleType) => {
    return allowedModules.includes(moduleId as keyof import('../lib/rbac/subscriptionPermissions').ModuleFeatureMap)
  }

  return (
    <aside className={`${
      isOpen ? 'w-72' : 'w-16'
    } transition-all duration-300 ease-in-out bg-white border-r border-surface-200 flex flex-col h-full`}>
      
      {/* Logo Header */}
      <div className={`flex items-center ${isOpen ? 'px-6 py-5' : 'px-2 py-5 justify-center'}`}>
        {isOpen ? (
          <div className="flex items-center space-x-3">
            <CoreTrackLogo className="w-8 h-8" />
            <div>
              <h1 className="text-lg font-bold text-surface-800">CoreTrack</h1>
              {businessName && (
                <p className="text-xs text-surface-500 truncate max-w-[160px]">{businessName}</p>
              )}
            </div>
          </div>
        ) : (
          <CoreTrackLogo className="w-8 h-8" />
        )}
      </div>

      {/* Collapse Button */}
      <div className={`${isOpen ? 'px-6' : 'px-2 flex justify-center'} pb-2`}>
        <button
          onClick={onToggle}
          className="p-2 rounded-lg hover:bg-surface-100 transition-colors text-surface-600"
          aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <svg 
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto">
        <div className={`${isOpen ? 'px-4' : 'px-2'} space-y-1`}>
          {menuGroups.map((group) => {
            const allowedItems = group.items.filter(item => isModuleAllowed(item.id))
            if (allowedItems.length === 0) return null
            
            const isExpanded = expandedGroups.has(group.id)

            return (
              <div key={group.id} className="mb-2">
                {/* Group Header */}
                <button
                  onClick={() => toggleGroup(group.id)}
                  className={`w-full flex items-center ${
                    isOpen 
                      ? 'px-3 py-2 text-left' 
                      : 'px-2 py-2 justify-center'
                  } text-sm font-medium text-surface-700 hover:bg-surface-50 rounded-lg transition-colors group`}
                >
                  <div className="flex items-center flex-1">
                    <div className="text-surface-400 group-hover:text-surface-600">
                      {group.icon}
                    </div>
                    {isOpen && (
                      <>
                        <span className="ml-3 flex-1">{group.label}</span>
                        <svg 
                          className={`w-4 h-4 transition-transform text-surface-400 ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </>
                    )}
                  </div>
                </button>

                {/* Group Items */}
                {(isExpanded || !isOpen) && (
                  <div className={`${isOpen ? 'ml-4 mt-1' : 'mt-1'} space-y-1`}>
                    {allowedItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => onModuleChange(item.id)}
                        className={`w-full flex items-center ${
                          isOpen 
                            ? 'px-3 py-2 text-left' 
                            : 'px-2 py-2 justify-center'
                        } text-sm rounded-lg transition-colors ${
                          activeModule === item.id
                            ? 'bg-primary-100 text-primary-700 font-medium'
                            : 'text-surface-600 hover:bg-surface-50 hover:text-surface-800'
                        }`}
                        title={!isOpen ? item.label : undefined}
                      >
                        <div className={`${
                          activeModule === item.id ? 'text-primary-600' : 'text-surface-400'
                        }`}>
                          {item.icon}
                        </div>
                        {isOpen && (
                          <span className="ml-3 truncate">{item.label}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </nav>

      {/* Bottom Info */}
      {isOpen && (
        <div className="p-4 border-t border-surface-200 bg-surface-50">
          <div className="text-xs text-surface-500 text-center">
            <div className="font-medium">CoreTrack Enterprise</div>
            <div>Role: {currentRole}</div>
          </div>
        </div>
      )}
    </aside>
  )
}
