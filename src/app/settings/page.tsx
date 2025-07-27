'use client'

import { useState } from 'react'
import { useAuth } from '../../lib/context/AuthContext'
import { useBranch } from '../../lib/context/BranchContext'

export default function SettingsPage() {
  const { profile } = useAuth()
  const { selectedBranch } = useBranch()
  const [activeTab, setActiveTab] = useState('business')

  const tabs = [
    { id: 'business', label: 'Business Profile', icon: '🏢' },
    { id: 'branches', label: 'Branch Management', icon: '🏪' },
    { id: 'users', label: 'User Management', icon: '👥' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'integration', label: 'Integrations', icon: '🔗' },
    { id: 'security', label: 'Security', icon: '🔒' },
    { id: 'billing', label: 'Billing & Plan', icon: '💳' },
    { id: 'advanced', label: 'Advanced', icon: '⚙️' }
  ]

  return (
    <div className="flex h-full bg-surface-50 min-h-screen">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-sm border-r border-surface-200 flex-shrink-0 hidden lg:block">
        <div className="sticky top-0 bg-white">
          <div className="px-6 py-5 border-b border-surface-200">
            <h1 className="text-xl font-bold text-surface-900">Settings</h1>
            <p className="text-sm text-surface-600 mt-1">Manage your CoreTrack configuration</p>
          </div>
          
          <nav className="p-4 h-[calc(100vh-120px)] overflow-y-auto">
            <div className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-primary-50 text-primary-700 border border-primary-200 shadow-sm'
                      : 'text-surface-700 hover:bg-surface-50 hover:text-surface-900 hover:shadow-sm'
                  }`}
                >
                  <span className="text-lg flex-shrink-0">{tab.icon}</span>
                  <span className="font-medium text-sm">{tab.label}</span>
                </button>
              ))}
            </div>
          </nav>
        </div>
      </div>

      {/* Mobile Tab Selector */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-surface-200 shadow-sm">
        <div className="px-4 py-3">
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm font-medium"
          >
            {tabs.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.icon} {tab.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto pt-16 lg:pt-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
            {activeTab === 'business' && <BusinessProfileTab />}
            {activeTab === 'branches' && <BranchManagementTab />}
            {activeTab === 'users' && <UserManagementTab />}
            {activeTab === 'notifications' && <NotificationsTab />}
            {activeTab === 'integration' && <IntegrationTab />}
            {activeTab === 'security' && <SecurityTab />}
            {activeTab === 'billing' && <BillingTab />}
            {activeTab === 'advanced' && <AdvancedTab />}
          </div>
        </div>
      </div>
    </div>
  )
}

// Business Profile Tab
function BusinessProfileTab() {
  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="pb-5 border-b border-surface-200">
        <h2 className="text-3xl font-bold text-surface-900">Business Profile</h2>
        <p className="mt-2 text-surface-600 max-w-2xl">
          Manage your business information, contact details, and operational settings across all locations.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Basic Information - Takes 2 columns */}
        <div className="xl:col-span-2 space-y-6">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-surface-900">Basic Information</h3>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Complete
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-surface-700 mb-2">
                  Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  defaultValue="CoreTrack Demo Store"
                  className="w-full px-4 py-3 border border-surface-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors text-surface-900 placeholder-surface-400"
                  placeholder="Enter your business name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">
                  Business Type <span className="text-red-500">*</span>
                </label>
                <select className="w-full px-4 py-3 border border-surface-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors text-surface-900">
                  <option>Restaurant</option>
                  <option>Retail Store</option>
                  <option>Coffee Shop</option>
                  <option>Grocery Store</option>
                  <option>Pharmacy</option>
                  <option>Convenience Store</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">
                  Tax ID Number
                </label>
                <input
                  type="text"
                  defaultValue="123-456-789-000"
                  className="w-full px-4 py-3 border border-surface-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors text-surface-900 placeholder-surface-400"
                  placeholder="Enter tax identification number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  defaultValue="+63 2 123 4567"
                  className="w-full px-4 py-3 border border-surface-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors text-surface-900 placeholder-surface-400"
                  placeholder="+63 XXX XXX XXXX"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">
                  Business Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  defaultValue="admin@coretrakdemo.com"
                  className="w-full px-4 py-3 border border-surface-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors text-surface-900 placeholder-surface-400"
                  placeholder="business@example.com"
                />
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-surface-900 mb-6">Business Address</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-surface-700 mb-2">
                  Street Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  defaultValue="123 Main Street, Building A, Floor 2"
                  className="w-full px-4 py-3 border border-surface-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors text-surface-900 placeholder-surface-400"
                  placeholder="Complete street address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  defaultValue="Metro Manila"
                  className="w-full px-4 py-3 border border-surface-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors text-surface-900 placeholder-surface-400"
                  placeholder="City"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">
                  Province/State <span className="text-red-500">*</span>
                </label>
                <select className="w-full px-4 py-3 border border-surface-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors text-surface-900">
                  <option>National Capital Region</option>
                  <option>Region I - Ilocos Region</option>
                  <option>Region II - Cagayan Valley</option>
                  <option>Region III - Central Luzon</option>
                  <option>Region IV-A - CALABARZON</option>
                  <option>Other...</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">
                  Postal Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  defaultValue="1000"
                  className="w-full px-4 py-3 border border-surface-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors text-surface-900 placeholder-surface-400"
                  placeholder="Postal code"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">
                  Country
                </label>
                <select className="w-full px-4 py-3 border border-surface-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors text-surface-900">
                  <option>Philippines</option>
                  <option>Singapore</option>
                  <option>Malaysia</option>
                  <option>Thailand</option>
                  <option>Other...</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Business Hours - Takes 1 column */}
        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-surface-900">Business Hours</h3>
              <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                Copy to All
              </button>
            </div>
            <div className="space-y-4">
              {[
                { day: 'Monday', short: 'Mon' },
                { day: 'Tuesday', short: 'Tue' },
                { day: 'Wednesday', short: 'Wed' },
                { day: 'Thursday', short: 'Thu' },
                { day: 'Friday', short: 'Fri' },
                { day: 'Saturday', short: 'Sat' },
                { day: 'Sunday', short: 'Sun' }
              ].map((day) => (
                <div key={day.day} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-surface-900">{day.day}</span>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        defaultChecked={day.day !== 'Sunday'}
                        className="rounded border-surface-300 text-primary-600 focus:ring-primary-500 focus:ring-offset-0"
                      />
                      <span className="ml-2 text-sm text-surface-600">Open</span>
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="time"
                      defaultValue="08:00"
                      className="px-3 py-2 border border-surface-300 rounded-lg text-sm focus:ring-1 focus:ring-primary-500 focus:border-transparent"
                    />
                    <span className="text-surface-500 text-sm">to</span>
                    <input
                      type="time"
                      defaultValue="20:00"
                      className="px-3 py-2 border border-surface-300 rounded-lg text-sm focus:ring-1 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-surface-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full flex items-center space-x-3 p-3 text-left border border-surface-200 rounded-xl hover:bg-surface-50 transition-colors">
                <span className="text-xl">🏷️</span>
                <div>
                  <div className="font-medium text-surface-900 text-sm">Update Logo</div>
                  <div className="text-xs text-surface-500">Upload business logo</div>
                </div>
              </button>
              <button className="w-full flex items-center space-x-3 p-3 text-left border border-surface-200 rounded-xl hover:bg-surface-50 transition-colors">
                <span className="text-xl">📋</span>
                <div>
                  <div className="font-medium text-surface-900 text-sm">Export Profile</div>
                  <div className="text-xs text-surface-500">Download business data</div>
                </div>
              </button>
              <button className="w-full flex items-center space-x-3 p-3 text-left border border-surface-200 rounded-xl hover:bg-surface-50 transition-colors">
                <span className="text-xl">🔗</span>
                <div>
                  <div className="font-medium text-surface-900 text-sm">Share Profile</div>
                  <div className="text-xs text-surface-500">Generate public link</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-6 border-t border-surface-200">
        <div className="flex items-center space-x-2 text-sm text-surface-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Last updated: Jan 15, 2025 at 2:30 PM</span>
        </div>
        <div className="flex space-x-3">
          <button className="px-6 py-3 border border-surface-300 text-surface-700 rounded-xl hover:bg-surface-50 transition-colors font-medium">
            Reset Changes
          </button>
          <button className="px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium shadow-sm">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

// Branch Management Tab
function BranchManagementTab() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-surface-900">Branch Management</h2>
          <p className="text-surface-600">Manage your business locations and branches</p>
        </div>
        <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
          Add New Branch
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-2xl font-bold text-surface-900">3</div>
          <div className="text-sm text-surface-600">Total Branches</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-green-600">3</div>
          <div className="text-sm text-surface-600">Active Branches</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-orange-600">0</div>
          <div className="text-sm text-surface-600">Inactive Branches</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-blue-600">₱1.3M</div>
          <div className="text-sm text-surface-600">Total Revenue</div>
        </div>
      </div>

      {/* Branch List */}
      <div className="card">
        <div className="p-6 border-b border-surface-200">
          <h3 className="text-lg font-semibold text-surface-900">Branch Locations</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {[
              { id: 'main', name: 'Main Branch', address: '123 Main Street, Metro Manila', manager: 'Juan Dela Cruz', status: 'active', revenue: '₱580k', orders: 342 },
              { id: 'downtown', name: 'Downtown Store', address: '456 Business District, Makati', manager: 'Maria Santos', status: 'active', revenue: '₱420k', orders: 256 },
              { id: 'mall', name: 'Mall Location', address: 'SM Megamall, Ortigas Center', manager: 'Roberto Garcia', status: 'active', revenue: '₱310k', orders: 189 }
            ].map((branch) => (
              <div key={branch.id} className="flex items-center justify-between p-4 border border-surface-200 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                    <span className="text-xl">{branch.id === 'main' ? '🏢' : '🏪'}</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-surface-900">{branch.name}</h4>
                    <p className="text-sm text-surface-600">{branch.address}</p>
                    <p className="text-sm text-surface-500">Manager: {branch.manager}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <div className="font-medium text-surface-900">{branch.revenue}</div>
                    <div className="text-xs text-surface-500">Revenue</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-surface-900">{branch.orders}</div>
                    <div className="text-xs text-surface-500">Orders</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-surface-600 capitalize">{branch.status}</span>
                  </div>
                  <button className="text-surface-400 hover:text-surface-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// User Management Tab
function UserManagementTab() {
  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="pb-5 border-b border-surface-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-surface-900">User Management</h2>
            <p className="mt-2 text-surface-600 max-w-2xl">
              Manage team members, assign roles, and control access across your organization.
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex space-x-3">
            <button className="inline-flex items-center px-4 py-2 border border-surface-300 rounded-xl text-sm font-medium text-surface-700 bg-white hover:bg-surface-50 transition-colors">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export Users
            </button>
            <button className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors text-sm font-medium shadow-sm">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Invite User
            </button>
          </div>
        </div>
      </div>

      {/* User Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-surface-900">12</div>
              <div className="text-sm text-surface-600">Total Users</div>
            </div>
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-green-600">10</div>
              <div className="text-sm text-surface-600">Active Users</div>
            </div>
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-purple-600">3</div>
              <div className="text-sm text-surface-600">Admins</div>
            </div>
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-orange-600">2</div>
              <div className="text-sm text-surface-600">Pending Invites</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex-1 max-w-lg">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-3 border border-surface-300 rounded-xl leading-5 bg-white placeholder-surface-500 focus:outline-none focus:placeholder-surface-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Search users by name, email, or role..."
              />
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <select className="px-4 py-3 border border-surface-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent">
              <option>All Roles</option>
              <option>Admin</option>
              <option>Manager</option>
              <option>Cashier</option>
              <option>Staff</option>
            </select>
            <select className="px-4 py-3 border border-surface-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent">
              <option>All Branches</option>
              <option>Main Branch</option>
              <option>Downtown Store</option>
              <option>Mall Location</option>
            </select>
          </div>
        </div>
      </div>

      {/* User Table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-200 bg-surface-50">
          <h3 className="text-lg font-semibold text-surface-900">Team Members</h3>
          <p className="text-sm text-surface-600 mt-1">Manage user access and permissions</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-surface-200">
            <thead className="bg-surface-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Branch</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Last Active</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-surface-200">
              {[
                { name: 'John Admin', email: 'admin@demo.com', role: 'Admin', roleColor: 'red', branch: 'All Branches', status: 'active', lastActive: '2 minutes ago' },
                { name: 'Maria Manager', email: 'maria@demo.com', role: 'Manager', roleColor: 'blue', branch: 'Main Branch', status: 'active', lastActive: '5 minutes ago' },
                { name: 'Carlos Cashier', email: 'carlos@demo.com', role: 'Cashier', roleColor: 'green', branch: 'Downtown Store', status: 'active', lastActive: '1 hour ago' },
                { name: 'Ana Staff', email: 'ana@demo.com', role: 'Staff', roleColor: 'gray', branch: 'Mall Location', status: 'inactive', lastActive: '2 days ago' },
                { name: 'Roberto Garcia', email: 'roberto@demo.com', role: 'Manager', roleColor: 'blue', branch: 'Mall Location', status: 'active', lastActive: '3 hours ago' }
              ].map((user, index) => (
                <tr key={index} className="hover:bg-surface-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-sm">
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-surface-900">{user.name}</div>
                        <div className="text-sm text-surface-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.roleColor === 'red' ? 'bg-red-100 text-red-800' :
                      user.roleColor === 'blue' ? 'bg-blue-100 text-blue-800' :
                      user.roleColor === 'green' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-surface-900">{user.branch}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full mr-2 ${
                        user.status === 'active' ? 'bg-green-400' : 'bg-gray-400'
                      }`}></div>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-surface-500">{user.lastActive}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-3">
                      <button className="text-primary-600 hover:text-primary-900 transition-colors">
                        Edit
                      </button>
                      <button className="text-surface-400 hover:text-surface-600 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 bg-surface-50 border-t border-surface-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-surface-700">
              Showing <span className="font-medium">1</span> to <span className="font-medium">5</span> of{' '}
              <span className="font-medium">12</span> results
            </div>
            <div className="flex items-center space-x-2">
              <button className="px-3 py-1 border border-surface-300 text-surface-500 rounded-lg text-sm hover:bg-surface-50 transition-colors">
                Previous
              </button>
              <button className="px-3 py-1 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 transition-colors">
                1
              </button>
              <button className="px-3 py-1 border border-surface-300 text-surface-700 rounded-lg text-sm hover:bg-surface-50 transition-colors">
                2
              </button>
              <button className="px-3 py-1 border border-surface-300 text-surface-700 rounded-lg text-sm hover:bg-surface-50 transition-colors">
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Notifications Tab
function NotificationsTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-surface-900">Notification Settings</h2>
        <p className="text-surface-600">Configure how and when you receive notifications</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Email Notifications */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-surface-900 mb-4">Email Notifications</h3>
          <div className="space-y-4">
            {[
              { id: 'low-stock', label: 'Low stock alerts', description: 'Get notified when items are running low' },
              { id: 'daily-reports', label: 'Daily sales reports', description: 'Receive daily performance summaries' },
              { id: 'user-activity', label: 'User activity alerts', description: 'Get notified of important user actions' },
              { id: 'system-updates', label: 'System updates', description: 'Receive notifications about new features' }
            ].map((setting) => (
              <div key={setting.id} className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-surface-900">{setting.label}</div>
                  <div className="text-sm text-surface-600">{setting.description}</div>
                </div>
                <label className="flex items-center">
                  <input type="checkbox" defaultChecked className="rounded" />
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Push Notifications */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-surface-900 mb-4">Push Notifications</h3>
          <div className="space-y-4">
            {[
              { id: 'new-orders', label: 'New orders', description: 'Get notified of new customer orders' },
              { id: 'payment-alerts', label: 'Payment alerts', description: 'Receive alerts for payment issues' },
              { id: 'emergency-alerts', label: 'Emergency alerts', description: 'Critical system notifications' },
              { id: 'shift-reminders', label: 'Shift reminders', description: 'Reminders for upcoming shifts' }
            ].map((setting) => (
              <div key={setting.id} className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-surface-900">{setting.label}</div>
                  <div className="text-sm text-surface-600">{setting.description}</div>
                </div>
                <label className="flex items-center">
                  <input type="checkbox" defaultChecked className="rounded" />
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Integration Tab
function IntegrationTab() {
  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="pb-5 border-b border-surface-200">
        <h2 className="text-3xl font-bold text-surface-900">Integrations</h2>
        <p className="mt-2 text-surface-600 max-w-3xl">
          Connect CoreTrack with your favorite business tools and services to streamline operations and automate workflows.
        </p>
      </div>

      {/* Integration Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-surface-900">12</div>
              <div className="text-sm text-surface-600">Total Integrations</div>
            </div>
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-green-600">4</div>
              <div className="text-sm text-surface-600">Connected</div>
            </div>
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-orange-600">8</div>
              <div className="text-sm text-surface-600">Available</div>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Integrations */}
      <div>
        <h3 className="text-xl font-semibold text-surface-900 mb-6">Popular Integrations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[
            { 
              name: 'QuickBooks', 
              description: 'Sync your financial data and automate accounting workflows', 
              icon: '💼', 
              status: 'available',
              category: 'Accounting',
              features: ['Auto sync transactions', 'Tax reporting', 'Financial analytics']
            },
            { 
              name: 'Shopify', 
              description: 'Connect your online store inventory and orders', 
              icon: '🛒', 
              status: 'available',
              category: 'E-commerce',
              features: ['Inventory sync', 'Order management', 'Product catalog']
            },
            { 
              name: 'Stripe', 
              description: 'Process payments securely with industry-leading technology', 
              icon: '💳', 
              status: 'connected',
              category: 'Payments',
              features: ['Payment processing', 'Subscription billing', 'Financial reporting']
            },
            { 
              name: 'Gmail', 
              description: 'Send reports and notifications via Gmail', 
              icon: '📧', 
              status: 'connected',
              category: 'Communication',
              features: ['Email notifications', 'Report delivery', 'Custom templates']
            },
            { 
              name: 'Slack', 
              description: 'Get real-time notifications in your Slack workspace', 
              icon: '💬', 
              status: 'available',
              category: 'Communication',
              features: ['Real-time alerts', 'Team notifications', 'Custom channels']
            },
            { 
              name: 'Zapier', 
              description: 'Automate workflows with 5000+ apps and services', 
              icon: '⚡', 
              status: 'connected',
              category: 'Automation',
              features: ['Workflow automation', '5000+ app connections', 'Custom triggers']
            }
          ].map((integration) => (
            <div key={integration.name} className="card p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">{integration.icon}</div>
                  <div>
                    <h4 className="font-semibold text-surface-900">{integration.name}</h4>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-surface-100 text-surface-600">
                      {integration.category}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    integration.status === 'connected' ? 'bg-green-500' : 'bg-surface-300'
                  }`}></div>
                  <span className={`text-xs font-medium ${
                    integration.status === 'connected' ? 'text-green-600' : 'text-surface-500'
                  }`}>
                    {integration.status === 'connected' ? 'Connected' : 'Available'}
                  </span>
                </div>
              </div>
              
              <p className="text-sm text-surface-600 mb-4">{integration.description}</p>
              
              <div className="mb-4">
                <h5 className="text-xs font-medium text-surface-700 mb-2">Key Features:</h5>
                <ul className="space-y-1">
                  {integration.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-xs text-surface-600">
                      <svg className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              
              <button className={`w-full py-3 px-4 rounded-xl text-sm font-medium transition-colors ${
                integration.status === 'connected'
                  ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                  : 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm'
              }`}>
                {integration.status === 'connected' ? 'Disconnect' : 'Connect Now'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Additional Integrations */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-surface-900">More Integrations</h3>
          <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            Browse All →
          </button>
        </div>
        <div className="card p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { name: 'Xero', icon: '📊', category: 'Accounting' },
              { name: 'WooCommerce', icon: '🏪', category: 'E-commerce' },
              { name: 'PayPal', icon: '💰', category: 'Payments' },
              { name: 'Mailchimp', icon: '📮', category: 'Marketing' },
              { name: 'Trello', icon: '📋', category: 'Project Management' },
              { name: 'Google Sheets', icon: '📈', category: 'Productivity' },
              { name: 'Microsoft Teams', icon: '👥', category: 'Communication' },
              { name: 'WhatsApp Business', icon: '💬', category: 'Messaging' }
            ].map((integration) => (
              <div key={integration.name} className="flex items-center space-x-3 p-3 border border-surface-200 rounded-xl hover:bg-surface-50 transition-colors cursor-pointer">
                <span className="text-xl">{integration.icon}</span>
                <div>
                  <div className="font-medium text-surface-900 text-sm">{integration.name}</div>
                  <div className="text-xs text-surface-500">{integration.category}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Integration Guidelines */}
      <div className="card p-6 bg-blue-50 border-blue-200">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h4 className="text-lg font-semibold text-blue-900 mb-2">Integration Best Practices</h4>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start">
                <span className="font-medium mr-2">•</span>
                Test integrations in a safe environment before connecting production data
              </li>
              <li className="flex items-start">
                <span className="font-medium mr-2">•</span>
                Review permissions carefully when connecting third-party services
              </li>
              <li className="flex items-start">
                <span className="font-medium mr-2">•</span>
                Monitor integration activity regularly for any unusual behavior
              </li>
              <li className="flex items-start">
                <span className="font-medium mr-2">•</span>
                Keep integration credentials secure and update them periodically
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

// Security Tab
function SecurityTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-surface-900">Security Settings</h2>
        <p className="text-surface-600">Manage your account security and access controls</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Password Settings */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-surface-900 mb-4">Password & Authentication</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-2">Current Password</label>
              <input
                type="password"
                className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-2">New Password</label>
              <input
                type="password"
                className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-2">Confirm New Password</label>
              <input
                type="password"
                className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <button className="w-full py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
              Update Password
            </button>
          </div>
        </div>

        {/* Security Features */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-surface-900 mb-4">Security Features</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-surface-900">Two-Factor Authentication</div>
                <div className="text-sm text-surface-600">Add extra security to your account</div>
              </div>
              <button className="px-3 py-1 bg-green-600 text-white rounded text-sm">
                Enable
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-surface-900">Login Notifications</div>
                <div className="text-sm text-surface-600">Get notified of new login attempts</div>
              </div>
              <label className="flex items-center">
                <input type="checkbox" defaultChecked className="rounded" />
              </label>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-surface-900">Session Timeout</div>
                <div className="text-sm text-surface-600">Auto-logout after inactivity</div>
              </div>
              <select className="px-2 py-1 border border-surface-300 rounded text-sm">
                <option>30 minutes</option>
                <option>1 hour</option>
                <option>2 hours</option>
                <option>Never</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Log */}
      <div className="card">
        <div className="p-6 border-b border-surface-200">
          <h3 className="text-lg font-semibold text-surface-900">Recent Activity</h3>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {[
              { action: 'Password changed', time: '2 hours ago', ip: '192.168.1.100' },
              { action: 'Logged in from new device', time: '1 day ago', ip: '192.168.1.105' },
              { action: 'Settings updated', time: '3 days ago', ip: '192.168.1.100' }
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between py-2">
                <div>
                  <div className="font-medium text-surface-900">{activity.action}</div>
                  <div className="text-sm text-surface-500">IP: {activity.ip}</div>
                </div>
                <div className="text-sm text-surface-600">{activity.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Billing Tab
function BillingTab() {
  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="pb-5 border-b border-surface-200">
        <h2 className="text-3xl font-bold text-surface-900">Billing & Subscription</h2>
        <p className="mt-2 text-surface-600 max-w-2xl">
          Manage your subscription plan, billing information, and payment history.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Current Plan - Takes 2 columns */}
        <div className="xl:col-span-2 space-y-6">
          {/* Current Plan Card */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-surface-900">Current Plan</h3>
                <div className="flex items-center space-x-3 mt-2">
                  <span className="text-2xl font-bold text-primary-600">Professional Plan</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-surface-900">₱2,999</div>
                <div className="text-sm text-surface-600">per month</div>
                <div className="text-xs text-surface-500 mt-1">Billed monthly</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                <div className="text-2xl font-bold text-blue-600">3</div>
                <div className="text-sm text-blue-700 font-medium">Branches</div>
                <div className="text-xs text-blue-600">Unlimited locations</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                <div className="text-2xl font-bold text-green-600">50</div>
                <div className="text-sm text-green-700 font-medium">Users</div>
                <div className="text-xs text-green-600">Team members</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
                <div className="text-2xl font-bold text-purple-600">∞</div>
                <div className="text-sm text-purple-700 font-medium">Transactions</div>
                <div className="text-xs text-purple-600">No limits</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
              <button className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium shadow-sm">
                Upgrade Plan
              </button>
              <button className="flex-1 px-6 py-3 border border-surface-300 text-surface-700 rounded-xl hover:bg-surface-50 transition-colors font-medium">
                Change Plan
              </button>
              <button className="px-6 py-3 border border-surface-300 text-surface-700 rounded-xl hover:bg-surface-50 transition-colors font-medium">
                Cancel Subscription
              </button>
            </div>
          </div>

          {/* Billing History */}
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-200 bg-surface-50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-surface-900">Billing History</h3>
                <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                  Download All
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-surface-200">
                <thead className="bg-surface-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Invoice</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-surface-200">
                  {[
                    { date: 'Jan 15, 2025', description: 'Professional Plan - Monthly', amount: '₱2,999', status: 'Paid', invoice: 'INV-2025-001' },
                    { date: 'Dec 15, 2024', description: 'Professional Plan - Monthly', amount: '₱2,999', status: 'Paid', invoice: 'INV-2024-012' },
                    { date: 'Nov 15, 2024', description: 'Professional Plan - Monthly', amount: '₱2,999', status: 'Paid', invoice: 'INV-2024-011' },
                    { date: 'Oct 15, 2024', description: 'Professional Plan - Monthly', amount: '₱2,999', status: 'Paid', invoice: 'INV-2024-010' }
                  ].map((bill, index) => (
                    <tr key={index} className="hover:bg-surface-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-surface-900 font-medium">{bill.date}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-surface-900">{bill.description}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-surface-900 font-medium">{bill.amount}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-2"></div>
                          {bill.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button className="flex items-center text-sm text-primary-600 hover:text-primary-700 font-medium">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          {bill.invoice}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar - Takes 1 column */}
        <div className="space-y-6">
          {/* Payment Method */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-surface-900 mb-4">Payment Method</h3>
            <div className="flex items-center space-x-3 p-4 border border-surface-200 rounded-xl">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="font-medium text-surface-900">•••• •••• •••• 4242</div>
                <div className="text-sm text-surface-600">Expires 12/26</div>
              </div>
            </div>
            <button className="w-full mt-4 px-4 py-2 text-sm border border-surface-300 text-surface-700 rounded-xl hover:bg-surface-50 transition-colors">
              Update Payment Method
            </button>
          </div>

          {/* Next Billing */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-surface-900 mb-4">Next Billing</h3>
            <div className="text-center">
              <div className="text-2xl font-bold text-surface-900">Feb 15, 2025</div>
              <div className="text-sm text-surface-600 mt-1">₱2,999 will be charged</div>
              <div className="text-xs text-surface-500 mt-2">19 days remaining</div>
            </div>
            <div className="mt-4 bg-surface-100 rounded-full h-2">
              <div className="bg-primary-600 h-2 rounded-full" style={{ width: '61%' }}></div>
            </div>
          </div>

          {/* Usage Stats */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-surface-900 mb-4">Current Usage</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-surface-600">Branches</span>
                  <span className="font-medium">3 / 50</span>
                </div>
                <div className="bg-surface-100 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '6%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-surface-600">Users</span>
                  <span className="font-medium">12 / 50</span>
                </div>
                <div className="bg-surface-100 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '24%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-surface-600">API Calls</span>
                  <span className="font-medium">8.2k / ∞</span>
                </div>
                <div className="bg-surface-100 rounded-full h-2">
                  <div className="bg-purple-600 h-2 rounded-full" style={{ width: '0%' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Support */}
          <div className="card p-6 bg-blue-50 border-blue-200">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Need Help?</h3>
            <p className="text-sm text-blue-800 mb-4">
              Contact our billing support team for assistance with your account.
            </p>
            <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium">
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Advanced Tab
function AdvancedTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-surface-900">Advanced Settings</h2>
        <p className="text-surface-600">Advanced configuration options for power users</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Data Management */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-surface-900 mb-4">Data Management</h3>
          <div className="space-y-4">
            <button className="w-full p-3 text-left border border-surface-300 rounded-lg hover:bg-surface-50 transition-colors">
              <div className="font-medium text-surface-900">Export All Data</div>
              <div className="text-sm text-surface-600">Download a complete backup of your data</div>
            </button>
            <button className="w-full p-3 text-left border border-surface-300 rounded-lg hover:bg-surface-50 transition-colors">
              <div className="font-medium text-surface-900">Import Data</div>
              <div className="text-sm text-surface-600">Import data from another system</div>
            </button>
            <button className="w-full p-3 text-left border border-red-300 rounded-lg hover:bg-red-50 transition-colors">
              <div className="font-medium text-red-600">Clear All Data</div>
              <div className="text-sm text-red-500">Permanently delete all data (irreversible)</div>
            </button>
          </div>
        </div>

        {/* System Settings */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-surface-900 mb-4">System Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-surface-900">Debug Mode</div>
                <div className="text-sm text-surface-600">Enable detailed logging for troubleshooting</div>
              </div>
              <label className="flex items-center">
                <input type="checkbox" className="rounded" />
              </label>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-surface-900">Auto Backup</div>
                <div className="text-sm text-surface-600">Automatically backup data daily</div>
              </div>
              <label className="flex items-center">
                <input type="checkbox" defaultChecked className="rounded" />
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-2">Data Retention Period</label>
              <select className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                <option>1 year</option>
                <option>2 years</option>
                <option>5 years</option>
                <option>Forever</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* API Settings */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-surface-900 mb-4">API Configuration</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-2">API Key</label>
            <div className="flex space-x-2">
              <input
                type="text"
                value="ct_live_1234567890abcdef"
                readOnly
                className="flex-1 px-3 py-2 border border-surface-300 rounded-lg bg-surface-50"
              />
              <button className="px-4 py-2 bg-surface-600 text-white rounded-lg hover:bg-surface-700 transition-colors">
                Copy
              </button>
              <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                Regenerate
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-surface-900">API Access</div>
              <div className="text-sm text-surface-600">Enable API access for third-party integrations</div>
            </div>
            <label className="flex items-center">
              <input type="checkbox" defaultChecked className="rounded" />
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}
