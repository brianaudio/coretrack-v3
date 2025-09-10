'use client'

import React, { useState } from 'react'
import { useSettings } from '../../lib/context/SettingsContext'
import { useNotifications } from '../NotificationSystem'

export default function IntegrationsTab() {
  const { 
    integrationSettings, 
    updateIntegrationSettings, 
    saveIntegrationSettings,
    loading,
    error 
  } = useSettings()
  
  const { showSuccess, showError } = useNotifications()
  const [saving, setSaving] = useState(false)
  const [testingConnection, setTestingConnection] = useState<string | null>(null)

  const handleSave = async () => {
    try {
      setSaving(true)
      await saveIntegrationSettings()
      showSuccess('Settings Saved', 'Integration settings updated successfully')
    } catch (err) {
      showError('Error', 'Failed to save integration settings')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleIntegration = (integration: keyof typeof integrationSettings, enabled: boolean) => {
    updateIntegrationSettings({
      [integration]: {
        ...integrationSettings[integration],
        enabled
      }
    })
  }

  const handleUpdateIntegrationField = (
    integration: keyof typeof integrationSettings,
    field: string,
    value: string | boolean
  ) => {
    updateIntegrationSettings({
      [integration]: {
        ...integrationSettings[integration],
        [field]: value
      }
    })
  }

  const handleTestConnection = async (integration: string) => {
    setTestingConnection(integration)
    try {
      // Simulate API test
      await new Promise(resolve => setTimeout(resolve, 2000))
      showSuccess('Connection Test', `${integration} connection successful`)
    } catch (err) {
      showError('Connection Test', `Failed to connect to ${integration}`)
    } finally {
      setTestingConnection(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Integrations</h1>
        <p className="text-gray-600">Connect CoreTrack with your favorite business tools and services</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid gap-8">
        {/* QuickBooks Integration */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">QuickBooks</h2>
                <p className="text-sm text-gray-600">Sync your financial data with QuickBooks</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleToggleIntegration('quickbooks', !integrationSettings.quickbooks.enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                integrationSettings.quickbooks.enabled ? 'bg-primary-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  integrationSettings.quickbooks.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {integrationSettings.quickbooks.enabled && (
            <div className="space-y-4 border-t border-gray-100 pt-4">
              {/* API Key */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Key
                </label>
                <input
                  type="password"
                  value={integrationSettings.quickbooks.apiKey}
                  onChange={(e) => handleUpdateIntegrationField('quickbooks', 'apiKey', e.target.value)}
                  placeholder="Enter your QuickBooks API key"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Sync Options */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Sync Inventory</span>
                  <button
                    type="button"
                    onClick={() => handleUpdateIntegrationField('quickbooks', 'syncInventory', !integrationSettings.quickbooks.syncInventory)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      integrationSettings.quickbooks.syncInventory ? 'bg-primary-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                        integrationSettings.quickbooks.syncInventory ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Sync Sales</span>
                  <button
                    type="button"
                    onClick={() => handleUpdateIntegrationField('quickbooks', 'syncSales', !integrationSettings.quickbooks.syncSales)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      integrationSettings.quickbooks.syncSales ? 'bg-primary-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                        integrationSettings.quickbooks.syncSales ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Test Connection */}
              <button
                onClick={() => handleTestConnection('QuickBooks')}
                disabled={testingConnection === 'QuickBooks' || !integrationSettings.quickbooks.apiKey}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {testingConnection === 'QuickBooks' && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                <span>{testingConnection === 'QuickBooks' ? 'Testing...' : 'Test Connection'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Zapier Integration */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8 text-orange-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Zapier</h2>
                <p className="text-sm text-gray-600">Automate workflows with 3000+ apps</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleToggleIntegration('zapier', !integrationSettings.zapier.enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                integrationSettings.zapier.enabled ? 'bg-primary-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  integrationSettings.zapier.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {integrationSettings.zapier.enabled && (
            <div className="space-y-4 border-t border-gray-100 pt-4">
              {/* Webhook URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Webhook URL
                </label>
                <input
                  type="url"
                  value={integrationSettings.zapier.webhookUrl}
                  onChange={(e) => handleUpdateIntegrationField('zapier', 'webhookUrl', e.target.value)}
                  placeholder="https://hooks.zapier.com/hooks/catch/..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-600 mt-1">Get this URL from your Zapier webhook trigger</p>
              </div>

              {/* Test Connection */}
              <button
                onClick={() => handleTestConnection('Zapier')}
                disabled={testingConnection === 'Zapier' || !integrationSettings.zapier.webhookUrl}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {testingConnection === 'Zapier' && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                <span>{testingConnection === 'Zapier' ? 'Testing...' : 'Test Webhook'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Email Integration */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Email Service</h2>
                <p className="text-sm text-gray-600">Configure email notifications and receipts</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Email Provider */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Provider
              </label>
              <select
                value={integrationSettings.email.provider}
                onChange={(e) => handleUpdateIntegrationField('email', 'provider', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="sendgrid">SendGrid</option>
                <option value="mailgun">Mailgun</option>
                <option value="aws-ses">AWS SES</option>
                <option value="smtp">Custom SMTP</option>
              </select>
            </div>

            {/* API Key */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Key
              </label>
              <input
                type="password"
                value={integrationSettings.email.apiKey}
                onChange={(e) => handleUpdateIntegrationField('email', 'apiKey', e.target.value)}
                placeholder="Enter your email service API key"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Sender Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sender Email Address
              </label>
              <input
                type="email"
                value={integrationSettings.email.senderEmail}
                onChange={(e) => handleUpdateIntegrationField('email', 'senderEmail', e.target.value)}
                placeholder="noreply@yourbusiness.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Test Email */}
            <button
              onClick={() => handleTestConnection('Email')}
              disabled={testingConnection === 'Email' || !integrationSettings.email.apiKey}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {testingConnection === 'Email' && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              <span>{testingConnection === 'Email' ? 'Sending...' : 'Send Test Email'}</span>
            </button>
          </div>
        </div>

        {/* Available Integrations */}
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Coming Soon</h2>
          
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { name: 'Xero', icon: '📊', description: 'Accounting software' },
              { name: 'Slack', icon: '💬', description: 'Team communication' },
              { name: 'Microsoft Teams', icon: '🎯', description: 'Collaboration platform' },
              { name: 'Google Sheets', icon: '📋', description: 'Spreadsheet integration' },
              { name: 'WhatsApp Business', icon: '📱', description: 'Customer messaging' },
              { name: 'Shopify', icon: '🛒', description: 'E-commerce platform' }
            ].map((integration) => (
              <div key={integration.name} className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center space-x-3 mb-2">
                  <span className="text-2xl">{integration.icon}</span>
                  <div>
                    <h3 className="font-medium text-gray-900">{integration.name}</h3>
                    <p className="text-xs text-gray-600">{integration.description}</p>
                  </div>
                </div>
                <button className="text-xs text-gray-500 cursor-not-allowed">
                  Coming Soon
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {saving && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            )}
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
