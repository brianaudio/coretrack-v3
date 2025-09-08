'use client'

import { useState } from 'react'
import { SettingsProvider } from '../../lib/context/SettingsContext'
import BusinessProfileTab from '../../components/settings/BusinessProfileTab'
import POSPaymentsTab from '../../components/settings/POSPaymentsTab'
import NotificationsTab from '../../components/settings/NotificationsTab'
import IntegrationsTab from '../../components/settings/IntegrationsTab'
import SecurityTab from '../../components/settings/SecurityTab'
import BillingTab from '../../components/settings/BillingTab'
import AdvancedTab from '../../components/settings/AdvancedTab'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('business')

  const tabs = [
    { id: 'business', label: 'Business Profile', icon: '🏢' },
    { id: 'pos-payments', label: 'POS & Payments', icon: '💳' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'integrations', label: 'Integrations', icon: '🔗' },
    { id: 'security', label: 'Security', icon: '🔒' },
    { id: 'billing', label: 'Billing', icon: '💰' },
    { id: 'advanced', label: 'Advanced', icon: '⚙️' }
  ]

  return (
    <SettingsProvider>
      <div className="min-h-screen bg-gray-50 lg:flex">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block lg:w-80 lg:bg-white lg:border-r lg:border-gray-200">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-8">Settings</h1>
            <nav className="space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 text-left rounded-xl transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-xl flex-shrink-0">{tab.icon}</span>
                  <span className="font-medium">{tab.label}</span>
                  {activeTab === tab.id && (
                    <div className="ml-auto w-2 h-2 bg-blue-600 rounded-full"></div>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Mobile Tab Selector */}
        <div className="lg:hidden bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="px-4 py-3">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium"
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
          <div className="h-full overflow-y-auto">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
              {activeTab === 'business' && <BusinessProfileTab />}
              {activeTab === 'pos-payments' && <POSPaymentsTab />}
              {activeTab === 'notifications' && <NotificationsTab />}
              {activeTab === 'integrations' && <IntegrationsTab />}
              {activeTab === 'security' && <SecurityTab />}
              {activeTab === 'billing' && <BillingTab />}
              {activeTab === 'advanced' && <AdvancedTab />}
            </div>
          </div>
        </div>
      </div>
    </SettingsProvider>
  )
}
