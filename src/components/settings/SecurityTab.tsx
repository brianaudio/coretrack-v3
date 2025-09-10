'use client'

import React, { useState } from 'react'
import { useSettings } from '../../lib/context/SettingsContext'
import { useNotifications } from '../NotificationSystem'

export default function SecurityTab() {
  const { 
    securitySettings, 
    updateSecuritySettings, 
    saveSecuritySettings,
    loading,
    error 
  } = useSettings()
  
  const { showSuccess, showError } = useNotifications()
  const [saving, setSaving] = useState(false)
  const [newIpAddress, setNewIpAddress] = useState('')

  const handleSave = async () => {
    try {
      setSaving(true)
      await saveSecuritySettings()
      showSuccess('Settings Saved', 'Security settings updated successfully')
    } catch (err) {
      showError('Error', 'Failed to save security settings')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = (key: keyof typeof securitySettings) => {
    updateSecuritySettings({
      [key]: !securitySettings[key]
    })
  }

  const handleAddIpAddress = () => {
    if (newIpAddress.trim() && !securitySettings.allowedIpAddresses.includes(newIpAddress.trim())) {
      updateSecuritySettings({
        allowedIpAddresses: [...securitySettings.allowedIpAddresses, newIpAddress.trim()]
      })
      setNewIpAddress('')
    }
  }

  const handleRemoveIpAddress = (ipToRemove: string) => {
    updateSecuritySettings({
      allowedIpAddresses: securitySettings.allowedIpAddresses.filter(ip => ip !== ipToRemove)
    })
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
      <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-xl p-6 border border-red-200">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Security Settings</h1>
        <p className="text-gray-600">Manage security settings and access controls for your account</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid gap-8">
        {/* Authentication Settings */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Authentication</h2>
          
          <div className="space-y-4">
            {/* Two-Factor Authentication */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Two-Factor Authentication</h3>
                <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('twoFactorEnabled')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  securitySettings.twoFactorEnabled ? 'bg-primary-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    securitySettings.twoFactorEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Require Password Change */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Require Password Change</h3>
                <p className="text-sm text-gray-600">Force users to change passwords periodically</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('requirePasswordChange')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  securitySettings.requirePasswordChange ? 'bg-primary-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    securitySettings.requirePasswordChange ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Session Timeout */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Session Timeout
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="number"
                  min="5"
                  max="480"
                  value={securitySettings.sessionTimeout}
                  onChange={(e) => updateSecuritySettings({ sessionTimeout: parseInt(e.target.value) || 30 })}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <span className="text-sm text-gray-600">minutes</span>
              </div>
              <p className="text-xs text-gray-600 mt-1">Automatically log out inactive users</p>
            </div>
          </div>
        </div>

        {/* Access Control */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Access Control</h2>
          
          <div className="space-y-4">
            {/* IP Address Restrictions */}
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Allowed IP Addresses</h3>
              <p className="text-sm text-gray-600 mb-4">Restrict access to specific IP addresses (leave empty to allow all)</p>
              
              {/* Current IP Addresses */}
              {securitySettings.allowedIpAddresses.length > 0 && (
                <div className="space-y-2 mb-4">
                  {securitySettings.allowedIpAddresses.map((ip, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg">
                      <span className="font-mono text-sm">{ip}</span>
                      <button
                        onClick={() => handleRemoveIpAddress(ip)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New IP Address */}
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newIpAddress}
                  onChange={(e) => setNewIpAddress(e.target.value)}
                  placeholder="Enter IP address (e.g., 192.168.1.100)"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <button
                  onClick={handleAddIpAddress}
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Audit & Monitoring */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Audit & Monitoring</h2>
          
          <div className="space-y-4">
            {/* Audit Log */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Audit Log</h3>
                <p className="text-sm text-gray-600">Track all user actions and system events</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('auditLogEnabled')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  securitySettings.auditLogEnabled ? 'bg-primary-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    securitySettings.auditLogEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Data Retention */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Retention Period
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="number"
                  min="30"
                  max="2555"
                  value={securitySettings.dataRetentionDays}
                  onChange={(e) => updateSecuritySettings({ dataRetentionDays: parseInt(e.target.value) || 365 })}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <span className="text-sm text-gray-600">days</span>
              </div>
              <p className="text-xs text-gray-600 mt-1">How long to keep audit logs and sensitive data</p>
            </div>
          </div>
        </div>

        {/* Security Status */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Security Status</h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            {/* Security Score */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Security Score</h3>
              <div className="flex items-center space-x-3">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                    style={{ 
                      width: `${
                        (securitySettings.twoFactorEnabled ? 25 : 0) +
                        (securitySettings.auditLogEnabled ? 25 : 0) +
                        (securitySettings.allowedIpAddresses.length > 0 ? 25 : 0) +
                        (securitySettings.sessionTimeout <= 60 ? 25 : 0)
                      }%` 
                    }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {(securitySettings.twoFactorEnabled ? 25 : 0) +
                   (securitySettings.auditLogEnabled ? 25 : 0) +
                   (securitySettings.allowedIpAddresses.length > 0 ? 25 : 0) +
                   (securitySettings.sessionTimeout <= 60 ? 25 : 0)}%
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-2">Overall security configuration rating</p>
            </div>

            {/* Last Security Review */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Last Security Review</h3>
              <p className="text-sm text-gray-600">Never</p>
              <button className="text-xs text-primary-600 hover:text-primary-700 mt-1">
                Schedule Review
              </button>
            </div>
          </div>
        </div>

        {/* Security Recommendations */}
        <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-200">
          <h2 className="text-lg font-semibold text-yellow-900 mb-3">Security Recommendations</h2>
          
          <ul className="space-y-2 text-sm text-yellow-800">
            {!securitySettings.twoFactorEnabled && (
              <li className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>Enable two-factor authentication for better security</span>
              </li>
            )}
            {securitySettings.sessionTimeout > 60 && (
              <li className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>Consider reducing session timeout to 60 minutes or less</span>
              </li>
            )}
            {securitySettings.allowedIpAddresses.length === 0 && (
              <li className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>Consider restricting access to specific IP addresses</span>
              </li>
            )}
          </ul>
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
