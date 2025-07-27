'use client'

import { ModuleType } from './Dashboard'
import CoreTrackLogo from './CoreTrackLogo'
import { ModulePermission, UserRole } from '../lib/rbac/permissions'

interface SidebarProps {
  activeModule: ModuleType
  onModuleChange: (module: ModuleType) => void
  isOpen: boolean
  onToggle: () => void
  allowedModules: ModulePermission[]
  currentRole: UserRole
}

const menuItems = [
  {
    id: 'pos' as ModuleType,
    label: 'Point of Sale',
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M7 18C5.9 18 5 18.9 5 20S5.9 22 7 22 9 21.1 9 20 8.1 18 7 18ZM1 2V4H3L6.6 11.59L5.25 14.04C5.09 14.32 5 14.65 5 15C5 16.1 5.9 17 7 17H19V15H7.42C7.28 15 7.17 14.89 7.17 14.75L7.2 14.63L8.1 13H15.55C16.3 13 16.96 12.59 17.3 11.97L20.88 5H5.21L4.27 3H1ZM17 18C15.9 18 15 18.9 15 20S15.9 22 17 22 19 21.1 19 20 18.1 18 17 18Z"/>
      </svg>
    )
  },
  {
    id: 'inventory' as ModuleType,
    label: 'Inventory',
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M4 6H2V20C2 21.1 2.9 22 4 22H18V20H4V6ZM20 2H8C6.9 2 6 2.9 6 4V16C6 17.1 6.9 18 8 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H8V4H20V16ZM12 5.5V9.5C12 10.3 12.7 11 13.5 11S15 10.3 15 9.5V5.5C15 4.7 14.3 4 13.5 4S12 4.7 12 5.5ZM9 7H11V9H9V7ZM16 7H18V9H16V7ZM9 10H11V12H9V10ZM16 10H18V12H16V10ZM9 13H11V15H9V13ZM16 13H18V15H16V13Z"/>
      </svg>
    )
  },
  {
    id: 'purchase-orders' as ModuleType,
    label: 'Purchase Orders',
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19 7h-3V6a4 4 0 0 0-8 0v1H5a1 1 0 0 0-1 1v11a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V8a1 1 0 0 0-1-1zM10 6a2 2 0 0 1 4 0v1h-4V6zm8 13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V9h2v1a1 1 0 0 0 2 0V9h4v1a1 1 0 0 0 2 0V9h2v10z"/>
      </svg>
    )
  },
  {
    id: 'menu-builder' as ModuleType,
    label: 'Menu Builder',
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19Z"/>
        <path d="M7 7H17V9H7V7ZM7 11H17V13H7V11ZM7 15H14V17H7V15Z"/>
      </svg>
    )
  },
  {
    id: 'dashboard' as ModuleType,
    label: 'Analytics',
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M3 13H11V3H3V13ZM3 21H11V15H3V21ZM13 21H21V11H13V21ZM13 3V9H21V3H13Z"/>
      </svg>
    )
  },
  {
    id: 'expenses' as ModuleType,
    label: 'Financials',
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M11.8 10.9C9.53 10.31 8.8 9.7 8.8 8.75C8.8 7.66 9.81 6.9 11.5 6.9C13.28 6.9 13.94 7.75 14 9H16.21C16.14 7.28 15.09 5.7 13 5.19V3H10V5.16C8.06 5.58 6.5 6.84 6.5 8.77C6.5 11.08 8.41 12.23 11.2 12.9C13.7 13.5 14.2 14.38 14.2 15.31C14.2 16 13.71 17.1 11.5 17.1C9.44 17.1 8.63 16.18 8.52 15H6.32C6.44 17.19 8.08 18.42 10 18.83V21H13V18.85C14.95 18.5 16.5 17.35 16.5 15.3C16.5 12.46 14.07 11.5 11.8 10.9Z"/>
      </svg>
    )
  },
  {
    id: 'team-management' as ModuleType,
    label: 'Team & Shifts',
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M16 4C18.2 4 20 5.8 20 8S18.2 12 16 12 12 10.2 12 8 13.8 4 16 4M16 14C20.4 14 24 15.8 24 18V20H8V18C8 15.8 11.6 14 16 14M8 13C9.7 13 11 11.7 11 10S9.7 7 8 7 5 8.3 5 10 6.3 13 8 13M8 15C4.3 15 1 16.3 1 18V20H6V18C6 16.8 6.8 15.8 8 15Z"/>
      </svg>
    )
  },
  {
    id: 'location-management' as ModuleType,
    label: 'Locations',
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
    )
  },
  {
    id: 'discrepancy-monitoring' as ModuleType,
    label: 'Discrepancy Monitor',
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
      </svg>
    )
  },
  {
    id: 'settings' as ModuleType,
    label: 'Settings',
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.82,11.69,4.82,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
      </svg>
    )
  }
]

export default function Sidebar({ 
  activeModule, 
  onModuleChange, 
  isOpen, 
  onToggle, 
  allowedModules, 
  currentRole 
}: SidebarProps) {
  // Filter menu items based on user permissions
  const filteredMenuItems = menuItems.filter(item => 
    allowedModules.includes(item.id as ModulePermission)
  )

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={onToggle}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed lg:relative z-30 lg:z-0
        h-full w-80 bg-white border-r border-surface-200
        transform transition-all duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${!isOpen ? 'lg:w-20' : 'lg:w-80'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className={`flex items-center justify-between border-b border-surface-200 py-4 transition-all duration-300 ${isOpen ? 'px-6' : 'px-2'}`}>
            <div className="flex items-center">
              <CoreTrackLogo size="md" />
              {(isOpen) && (
                <div className="ml-3">
                  <h1 className="text-xl font-bold text-surface-900">CoreTrack</h1>
                  <p className="text-sm text-surface-600">Business Management</p>
                </div>
              )}
            </div>
            
            {/* Collapse/Expand button - desktop only */}
            <button
              onClick={onToggle}
              className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg hover:bg-surface-100 transition-colors"
              title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              <svg 
                className={`w-5 h-5 text-surface-600 transition-transform duration-200 ${!isOpen ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav className={`flex-1 py-6 space-y-2 transition-all duration-300 ${isOpen ? 'px-4' : 'px-2'}`}>
            {/* Role indicator */}
            {isOpen && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs font-medium text-blue-800 uppercase tracking-wide">Current Role</p>
                <p className="text-sm font-semibold text-blue-900 capitalize">{currentRole}</p>
              </div>
            )}
            
            {filteredMenuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onModuleChange(item.id)}
                className={`
                  sidebar-item w-full text-left
                  ${activeModule === item.id ? 'active' : ''}
                  ${!isOpen ? 'justify-center' : ''}
                `}
                title={!isOpen ? item.label : ''}
              >
                {item.icon}
                {isOpen && <span className="font-medium">{item.label}</span>}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </>
  )
}
