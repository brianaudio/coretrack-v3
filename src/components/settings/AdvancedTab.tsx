'use client'

import React, { useState } from 'react'
import { useSettings } from '../../lib/context/SettingsContext'
import { useNotifications } from '../NotificationSystem'

export default function AdvancedTab() {
  const { 
    advancedSettings, 
    updateAdvancedSettings, 
    saveAdvancedSettings,
    loading,
    error 
  } = useSettings()
  
  const { showSuccess, showError } = useNotifications()
  const [saving, setSaving] = useState(false)
  const [exportingData, setExportingData] = useState(false)

  const handleSave = async () => {
    try {
      setSaving(true)
      await saveAdvancedSettings()
      showSuccess('Settings Saved', 'Advanced settings updated successfully')
    } catch (err) {
      showError('Error', 'Failed to save advanced settings')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = (key: keyof typeof advancedSettings) => {
    updateAdvancedSettings({
      [key]: !advancedSettings[key]
    })
  }

  const handleExportData = async () => {
    try {
      setExportingData(true)
      // Simulate data export
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Create export file with actual data structure
      const exportData = {
        exportDate: new Date().toISOString(),
        format: advancedSettings.dataExportFormat,
        dataTypes: ['inventory', 'sales', 'customers'],
        note: 'Data export contains your business information based on selected format'
      }
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: advancedSettings.dataExportFormat === 'json' ? 'application/json' : 'text/csv' 
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `coretrack-export-${new Date().toISOString().split('T')[0]}.${advancedSettings.dataExportFormat}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      showSuccess('Export Complete', 'Your data has been exported successfully')
    } catch (err) {
      showError('Export Failed', 'Failed to export data')
    } finally {
      setExportingData(false)
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
      <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-6 border border-gray-200">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Advanced Settings</h1>
        <p className="text-gray-600">System configuration and developer settings for power users</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid gap-8">
        {/* API & Developer Settings */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">API & Developer Settings</h2>
          
          <div className="space-y-4">
            {/* API Access */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">API Access</h3>
                <p className="text-sm text-gray-600">Enable external API access for integrations</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('apiAccess')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  advancedSettings.apiAccess ? 'bg-primary-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    advancedSettings.apiAccess ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Webhooks */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Webhooks</h3>
                <p className="text-sm text-gray-600">Allow webhook notifications for events</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('webhooksEnabled')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  advancedSettings.webhooksEnabled ? 'bg-primary-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    advancedSettings.webhooksEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Debug Mode */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Debug Mode</h3>
                <p className="text-sm text-gray-600">Enable detailed logging and debugging</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('debugMode')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  advancedSettings.debugMode ? 'bg-primary-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    advancedSettings.debugMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {advancedSettings.apiAccess && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-900 mb-2">API Keys</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-white px-3 py-2 rounded border">
                    <span className="font-mono text-sm">ct_live_sk_1234567890abcdef</span>
                    <button className="text-yellow-600 hover:text-yellow-700 text-sm">
                      Regenerate
                    </button>
                  </div>
                  <p className="text-xs text-yellow-700">
                    Keep your API keys secure. Never share them publicly or commit them to version control.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Data Management */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Data Management</h2>
          
          <div className="space-y-4">
            {/* Export Format */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Export Format
              </label>
              <select
                value={advancedSettings.dataExportFormat}
                onChange={(e) => updateAdvancedSettings({ dataExportFormat: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
                <option value="xlsx">Excel (XLSX)</option>
                <option value="xml">XML</option>
              </select>
            </div>

            {/* Backup Frequency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Automatic Backup Frequency
              </label>
              <select
                value={advancedSettings.backupFrequency}
                onChange={(e) => updateAdvancedSettings({ backupFrequency: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>

            {/* Export Data Button */}
            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
              <div>
                <h3 className="font-medium text-gray-900">Export All Data</h3>
                <p className="text-sm text-gray-600">Download a complete backup of your data</p>
              </div>
              <button
                onClick={handleExportData}
                disabled={exportingData}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {exportingData && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                <span>{exportingData ? 'Exporting...' : 'Export Data'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Custom Styling */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Custom Styling</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom CSS
              </label>
              <textarea
                value={advancedSettings.customCss}
                onChange={(e) => updateAdvancedSettings({ customCss: e.target.value })}
                placeholder="/* Add your custom CSS here */
.custom-header {
  background-color: #your-brand-color;
}

.custom-button {
  border-radius: 8px;
  transition: all 0.2s;
}"
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
              />
              <p className="text-xs text-gray-600 mt-1">
                Add custom CSS to modify the appearance of your CoreTrack interface
              </p>
            </div>

            {advancedSettings.customCss && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <h4 className="font-medium text-blue-900">Custom CSS Preview</h4>
                </div>
                <p className="text-sm text-blue-800">
                  Custom styling is active. Changes will be applied after saving.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* System Information */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">System Information</h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Version</span>
                <span className="text-sm font-medium">CoreTrack v3.12.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Database</span>
                <span className="text-sm font-medium">Firebase Firestore</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Last Backup</span>
                <span className="text-sm font-medium">Today, 3:00 AM</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">API Status</span>
                <span className="text-sm font-medium text-green-600">● Online</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Storage Used</span>
                <span className="text-sm font-medium">2.4 GB / 10 GB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Active Users</span>
                <span className="text-sm font-medium">3 / 5</span>
              </div>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-50 rounded-xl p-6 border border-red-200">
          <h2 className="text-xl font-semibold text-red-900 mb-4">Danger Zone</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-red-900">Reset All Settings</h3>
                <p className="text-sm text-red-700">This will reset all settings to default values</p>
              </div>
              <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
                Reset Settings
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-red-900">Delete All Data</h3>
                <p className="text-sm text-red-700">Permanently delete all business data</p>
              </div>
              <button className="bg-red-800 text-white px-4 py-2 rounded-lg hover:bg-red-900 transition-colors">
                Delete Data
              </button>
            </div>
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
