'use client'

import React, { useState } from 'react'
import { useSettings } from '../../lib/context/SettingsContext'
import { useNotifications } from '../NotificationSystem'

export default function NotificationsTab() {
  const { 
    notificationSettings, 
    updateNotificationSettings, 
    saveNotificationSettings,
    loading,
    error 
  } = useSettings()
  
  const { showSuccess, showError } = useNotifications()
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    try {
      setSaving(true)
      await saveNotificationSettings()
      showSuccess('Settings Saved', 'Notification preferences updated successfully')
    } catch (err) {
      showError('Error', 'Failed to save notification settings')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = (key: keyof typeof notificationSettings) => {
    updateNotificationSettings({
      [key]: !notificationSettings[key]
    })
  }

  const handleThresholdChange = (key: keyof typeof notificationSettings.alertThresholds, value: number) => {
    updateNotificationSettings({
      alertThresholds: {
        ...notificationSettings.alertThresholds,
        [key]: value
      }
    })
  }

  const handleScheduleChange = (key: keyof typeof notificationSettings.reportSchedule, value: string | number) => {
    updateNotificationSettings({
      reportSchedule: {
        ...notificationSettings.reportSchedule,
        [key]: value
      }
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
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-6 border border-yellow-200">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Notification Settings</h1>
        <p className="text-gray-600">Configure how and when you receive notifications about your business</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid gap-8">
        {/* General Notification Settings */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">General Preferences</h2>
          
          <div className="space-y-4">
            {/* Email Notifications */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Email Notifications</h3>
                <p className="text-sm text-gray-600">Receive notifications via email</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('emailNotifications')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notificationSettings.emailNotifications ? 'bg-primary-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    notificationSettings.emailNotifications ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Email Address */}
            {notificationSettings.emailNotifications && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={notificationSettings.emailAddress}
                  onChange={(e) => updateNotificationSettings({ emailAddress: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter email address for notifications"
                />
              </div>
            )}

            {/* Push Notifications */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Push Notifications</h3>
                <p className="text-sm text-gray-600">Receive browser push notifications</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('pushNotifications')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notificationSettings.pushNotifications ? 'bg-primary-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    notificationSettings.pushNotifications ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Critical Alerts Only */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Critical Alerts Only</h3>
                <p className="text-sm text-gray-600">Only receive urgent and high-priority notifications</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('criticalAlertsOnly')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notificationSettings.criticalAlertsOnly ? 'bg-primary-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    notificationSettings.criticalAlertsOnly ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Alert Settings */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Alert Preferences</h2>
          
          <div className="space-y-4">
            {/* Low Stock Alerts */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Low Stock Alerts</h3>
                <p className="text-sm text-gray-600">Get notified when inventory runs low</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('lowStockAlerts')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notificationSettings.lowStockAlerts ? 'bg-primary-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    notificationSettings.lowStockAlerts ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Expiration Alerts */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Expiration Alerts</h3>
                <p className="text-sm text-gray-600">Get notified about items nearing expiration</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('expirationAlerts')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notificationSettings.expirationAlerts ? 'bg-primary-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    notificationSettings.expirationAlerts ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Reorder Suggestions */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Reorder Suggestions</h3>
                <p className="text-sm text-gray-600">Get smart suggestions for restocking</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('reorderSuggestions')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notificationSettings.reorderSuggestions ? 'bg-primary-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    notificationSettings.reorderSuggestions ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Alert Thresholds */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Alert Thresholds</h2>
          
          <div className="grid md:grid-cols-3 gap-4">
            {/* Low Stock Threshold */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Low Stock Threshold
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={notificationSettings.alertThresholds.lowStock}
                  onChange={(e) => handleThresholdChange('lowStock', parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <span className="absolute right-3 top-2 text-sm text-gray-500">items</span>
              </div>
              <p className="text-xs text-gray-600 mt-1">Alert when stock falls below this number</p>
            </div>

            {/* Expiration Alert Days */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expiration Alert
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={notificationSettings.alertThresholds.expiration}
                  onChange={(e) => handleThresholdChange('expiration', parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <span className="absolute right-3 top-2 text-sm text-gray-500">days</span>
              </div>
              <p className="text-xs text-gray-600 mt-1">Alert days before expiration</p>
            </div>

            {/* Critical Stock Percentage */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Critical Stock Level
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={notificationSettings.alertThresholds.criticalStock}
                  onChange={(e) => handleThresholdChange('criticalStock', parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <span className="absolute right-3 top-2 text-sm text-gray-500">%</span>
              </div>
              <p className="text-xs text-gray-600 mt-1">Percentage of minimum stock for critical alerts</p>
            </div>
          </div>
        </div>

        {/* Report Settings */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Report Schedule</h2>
          
          <div className="space-y-4">
            {/* Daily Reports */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Daily Reports</h3>
                <p className="text-sm text-gray-600">Receive daily business summary reports</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('dailyReports')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notificationSettings.dailyReports ? 'bg-primary-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    notificationSettings.dailyReports ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Daily Report Time */}
            {notificationSettings.dailyReports && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Daily Report Time
                </label>
                <input
                  type="time"
                  value={notificationSettings.reportSchedule.dailyTime}
                  onChange={(e) => handleScheduleChange('dailyTime', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            )}

            {/* Weekly Reports */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Weekly Reports</h3>
                <p className="text-sm text-gray-600">Receive weekly business summary reports</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('weeklyReports')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notificationSettings.weeklyReports ? 'bg-primary-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    notificationSettings.weeklyReports ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Weekly Report Schedule */}
            {notificationSettings.weeklyReports && (
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Weekly Report Day
                  </label>
                  <select
                    value={notificationSettings.reportSchedule.weeklyDay}
                    onChange={(e) => handleScheduleChange('weeklyDay', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value={0}>Sunday</option>
                    <option value={1}>Monday</option>
                    <option value={2}>Tuesday</option>
                    <option value={3}>Wednesday</option>
                    <option value={4}>Thursday</option>
                    <option value={5}>Friday</option>
                    <option value={6}>Saturday</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Weekly Report Time
                  </label>
                  <input
                    type="time"
                    value={notificationSettings.reportSchedule.weeklyTime}
                    onChange={(e) => handleScheduleChange('weeklyTime', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
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
