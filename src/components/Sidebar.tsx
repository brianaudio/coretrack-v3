'use client'

import { ModuleType } from './Dashboard'
import CoreTrackLogo from './CoreTrackLogo'

interface SidebarProps {
  activeModule: ModuleType
  onModuleChange: (module: ModuleType) => void
  isOpen: boolean
  onToggle: () => void
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
    id: 'menu-builder' as ModuleType,
    label: 'Product Builder',
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19Z"/>
        <path d="M7 7H17V9H7V7ZM7 11H17V13H7V11ZM7 15H14V17H7V15Z"/>
      </svg>
    )
  },
  {
    id: 'dashboard' as ModuleType,
    label: 'Dashboard',
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M3 13H11V3H3V13ZM3 21H11V15H3V21ZM13 21H21V11H13V21ZM13 3V9H21V3H13Z"/>
      </svg>
    )
  },
  {
    id: 'purchase-orders' as ModuleType,
    label: 'Purchase Orders',
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20Z"/>
        <path d="M8 12H16V14H8V12ZM8 16H13V18H8V16Z"/>
      </svg>
    )
  },
  {
    id: 'expenses' as ModuleType,
    label: 'Profit and Expenses',
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M11.8 10.9C9.53 10.31 8.8 9.7 8.8 8.75C8.8 7.66 9.81 6.9 11.5 6.9C13.28 6.9 13.94 7.75 14 9H16.21C16.14 7.28 15.09 5.7 13 5.19V3H10V5.16C8.06 5.58 6.5 6.84 6.5 8.77C6.5 11.08 8.41 12.23 11.2 12.9C13.7 13.5 14.2 14.38 14.2 15.31C14.2 16 13.71 17.1 11.5 17.1C9.44 17.1 8.63 16.18 8.52 15H6.32C6.44 17.19 8.08 18.42 10 18.83V21H13V18.85C14.95 18.5 16.5 17.35 16.5 15.3C16.5 12.46 14.07 11.5 11.8 10.9Z"/>
      </svg>
    )
  },
  {
    id: 'payment-monitoring' as ModuleType,
    label: 'Payment Monitoring',
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20 4H4C2.89 4 2.01 4.89 2.01 6L2 18C2 19.11 2.89 20 4 20H20C21.11 20 22 19.11 22 18V6C22 4.89 21.11 4 20 4ZM20 18H4V12H20V18ZM20 8H4V6H20V8Z"/>
        <circle cx="9" cy="15" r="1"/>
        <circle cx="15" cy="15" r="1"/>
      </svg>
    )
  },
  {
    id: 'team-management' as ModuleType,
    label: 'Team Management',
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
        <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22S19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9S10.62 6.5 12 6.5 14.5 7.62 14.5 9 13.38 11.5 12 11.5Z"/>
      </svg>
    )
  },
  {
    id: 'business-config' as ModuleType,
    label: 'Business Config',
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10M10,22C9.75,22 9.54,21.82 9.5,21.58L9.13,18.93C8.5,18.68 7.96,18.34 7.44,17.94L4.95,18.95C4.73,19.03 4.46,18.95 4.34,18.73L2.34,15.27C2.21,15.05 2.27,14.78 2.46,14.63L4.57,12.97L4.5,12L4.57,11L2.46,9.37C2.27,9.22 2.21,8.95 2.34,8.73L4.34,5.27C4.46,5.05 4.73,4.96 4.95,5.05L7.44,6.05C7.96,5.66 8.5,5.32 9.13,5.07L9.5,2.42C9.54,2.18 9.75,2 10,2H14C14.25,2 14.46,2.18 14.5,2.42L14.87,5.07C15.5,5.32 16.04,5.66 16.56,6.05L19.05,5.05C19.27,4.96 19.54,5.05 19.66,5.27L21.66,8.73C21.79,8.95 21.73,9.22 21.54,9.37L19.43,11L19.5,12L19.43,13L21.54,14.63C21.73,14.78 21.79,15.05 21.66,15.27L19.66,18.73C19.54,18.95 19.27,19.04 19.05,18.95L16.56,17.95C16.04,18.34 15.5,18.68 14.87,18.93L14.5,21.58C14.46,21.82 14.25,22 14,22H10M11.25,4L10.88,6.61C9.68,6.86 8.62,7.5 7.85,8.39L5.44,7.35L4.69,8.65L6.8,10.2C6.4,11.37 6.4,12.64 6.8,13.8L4.68,15.36L5.43,16.66L7.86,15.62C8.63,16.5 9.68,17.14 10.87,17.38L11.24,20H12.76L13.13,17.39C14.32,17.14 15.37,16.5 16.14,15.62L18.57,16.66L19.32,15.36L17.2,13.81C17.6,12.64 17.6,11.37 17.2,10.2L19.31,8.65L18.56,7.35L16.15,8.39C15.38,7.5 14.32,6.86 13.12,6.62L12.75,4H11.25Z"/>
      </svg>
    )
  }
]

export default function Sidebar({ activeModule, onModuleChange, isOpen, onToggle }: SidebarProps) {
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
                  <p className="text-sm text-surface-600">Restaurant Management</p>
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
            {menuItems.map((item) => (
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

          {/* User section */}
          <div className={`border-t border-surface-200 transition-all duration-300 ${isOpen ? 'p-4' : 'p-2'}`}>
            <button
              onClick={() => alert('User Profile:\n• Manager: John Doe\n• Restaurant: #001\n• Role: Administrator\n• Last Login: Today 9:30 AM')}
              className={`w-full flex items-center hover:bg-surface-50 rounded-lg p-2 transition-colors ${!isOpen ? 'justify-center' : ''}`}
            >
              <div className="w-10 h-10 bg-surface-300 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-surface-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              {isOpen && (
                <div className="ml-3 text-left">
                  <p className="text-sm font-medium text-surface-900">Manager</p>
                  <p className="text-xs text-surface-600">John Doe</p>
                </div>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
