'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/context/AuthContext'
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  subscribeToNotifications,
  getNotificationSettings,
  updateNotificationSettings,
  type Notification,
  type NotificationSettings
} from '../../lib/firebase/notifications'
import {
  runSmartAlerts,
  generateDailyReport,
  type SmartAlert,
  type ExpirationAlert,
  type ReorderSuggestion
} from '../../lib/firebase/smartAlerts'

interface NotificationsProps {
  showAsWidget?: boolean;
  maxItems?: number;
}

export default function Notifications({ showAsWidget = false, maxItems = 10 }: NotificationsProps) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<NotificationSettings | null>(null)
  const [selectedTab, setSelectedTab] = useState<'all' | 'unread' | 'critical' | 'settings'>('all')
  const [showSettings, setShowSettings] = useState(false)
  const [smartAlerts, setSmartAlerts] = useState<{
    lowStockAlerts: SmartAlert[];
    expirationAlerts: ExpirationAlert[];
    reorderSuggestions: ReorderSuggestion[];
  } | null>(null)

  // Load notifications and settings
  useEffect(() => {
    if (!user?.uid) return

    const loadData = async () => {
      try {
        setLoading(true)
        const [notificationsData, settingsData, alertsData] = await Promise.all([
          getNotifications(user.uid, { limit: maxItems }),
          getNotificationSettings(user.uid),
          runSmartAlerts(user.uid)
        ])
        
        setNotifications(notificationsData)
        setUnreadCount(notificationsData.filter(n => !n.isRead).length)
        setSettings(settingsData)
        setSmartAlerts(alertsData)
      } catch (error) {
        console.error('Error loading notifications:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()

    // Subscribe to real-time notifications
    const unsubscribe = subscribeToNotifications(
      user.uid,
      (newNotifications) => {
        setNotifications(newNotifications.slice(0, maxItems))
        setUnreadCount(newNotifications.filter(n => !n.isRead).length)
      },
      { limit: maxItems }
    )

    return unsubscribe
  }, [user?.uid, maxItems])

  const handleMarkAsRead = async (notificationId: string) => {
    if (!user?.uid) return
    
    try {
      await markNotificationAsRead(user.uid, notificationId)
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    if (!user?.uid) return
    
    try {
      await markAllNotificationsAsRead(user.uid)
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  const handleDeleteNotification = async (notificationId: string) => {
    if (!user?.uid) return
    
    try {
      await deleteNotification(user.uid, notificationId)
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      setUnreadCount(prev => {
        const notification = notifications.find(n => n.id === notificationId)
        return notification && !notification.isRead ? prev - 1 : prev
      })
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  const handleUpdateSettings = async (newSettings: Partial<NotificationSettings>) => {
    if (!user?.uid) return
    
    try {
      await updateNotificationSettings(user.uid, newSettings)
      setSettings(prev => prev ? { ...prev, ...newSettings } : null)
    } catch (error) {
      console.error('Error updating settings:', error)
    }
  }

  const handleRunSmartAlerts = async () => {
    if (!user?.uid) return
    
    try {
      const alerts = await runSmartAlerts(user.uid)
      setSmartAlerts(alerts)
    } catch (error) {
      console.error('Error running smart alerts:', error)
    }
  }

  const handleGenerateReport = async () => {
    if (!user?.uid) return
    
    try {
      const report = await generateDailyReport(user.uid)
      // Create a blob for download
      const blob = new Blob([report], { type: 'text/plain' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `inventory-report-${new Date().toISOString().split('T')[0]}.txt`
      link.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error generating report:', error)
    }
  }

  const getFilteredNotifications = () => {
    switch (selectedTab) {
      case 'unread':
        return notifications.filter(n => !n.isRead)
      case 'critical':
        return notifications.filter(n => n.priority === 'critical' || n.priority === 'high')
      default:
        return notifications
    }
  }

  const getPriorityColor = (priority: Notification['priority']) => {
    switch (priority) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200'
    }
  }

  const getTypeIcon = (type: Notification['type']) => {
    switch (type) {
      case 'low_stock':
      case 'out_of_stock':
        return '📦'
      case 'expiration':
        return '⏰'
      case 'reorder_suggestion':
        return '🔄'
      case 'critical':
        return '🚨'
      case 'system':
        return '⚙️'
      default:
        return '📢'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  // Widget view for dashboard
  if (showAsWidget) {
    const criticalNotifications = notifications.filter(n => 
      n.priority === 'critical' || n.priority === 'high'
    ).slice(0, 5)

    return (
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-semibold text-surface-900">Critical Alerts</h3>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <button
            onClick={handleRunSmartAlerts}
            className="text-sm px-3 py-1 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Refresh
          </button>
        </div>

        {criticalNotifications.length === 0 ? (
          <div className="text-center py-6">
            <div className="text-4xl mb-2">✅</div>
            <p className="text-surface-600">No critical alerts</p>
            <p className="text-sm text-surface-500">All systems running smoothly</p>
          </div>
        ) : (
          <div className="space-y-3">
            {criticalNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-3 rounded-lg border ${getPriorityColor(notification.priority)} ${
                  !notification.isRead ? 'border-l-4' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <span className="text-lg">{getTypeIcon(notification.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-surface-900 truncate">
                        {notification.title}
                      </p>
                      <p className="text-sm text-surface-600 mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-surface-500">
                        <span>{new Date(notification.createdAt.toDate()).toLocaleDateString()}</span>
                        <span className={`px-2 py-1 rounded-full ${getPriorityColor(notification.priority)}`}>
                          {notification.priority}
                        </span>
                      </div>
                    </div>
                  </div>
                  {!notification.isRead && (
                    <button
                      onClick={() => handleMarkAsRead(notification.id)}
                      className="text-primary-600 hover:text-primary-700 ml-2"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {smartAlerts && (
          <div className="mt-4 pt-4 border-t border-surface-200">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-2 bg-red-50 rounded-lg">
                <p className="text-lg font-bold text-red-600">
                  {smartAlerts.lowStockAlerts.filter(a => a.priority === 'critical' || a.priority === 'high').length}
                </p>
                <p className="text-xs text-red-600">Stock Alerts</p>
              </div>
              <div className="p-2 bg-orange-50 rounded-lg">
                <p className="text-lg font-bold text-orange-600">
                  {smartAlerts.expirationAlerts.filter(a => a.urgency === 'critical').length}
                </p>
                <p className="text-xs text-orange-600">Expiring Soon</p>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <p className="text-lg font-bold text-blue-600">
                  {smartAlerts.reorderSuggestions.filter(s => s.urgency === 'critical' || s.urgency === 'high').length}
                </p>
                <p className="text-xs text-blue-600">Reorder Now</p>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Full notifications panel
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h2 className="text-xl font-bold text-surface-900">Smart Notifications & Alerts</h2>
            <p className="text-surface-600">
              Real-time alerts and automated inventory insights
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleRunSmartAlerts}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Refresh Alerts
            </button>
            <button
              onClick={handleGenerateReport}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Generate Report
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="px-4 py-2 bg-surface-100 text-surface-700 rounded-lg hover:bg-surface-200"
            >
              Settings
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-surface-100 rounded-lg p-1 mt-4">
          {[
            { id: 'all', label: 'All', count: notifications.length },
            { id: 'unread', label: 'Unread', count: unreadCount },
            { id: 'critical', label: 'Critical', count: notifications.filter(n => n.priority === 'critical' || n.priority === 'high').length }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md font-medium transition-colors ${
                selectedTab === tab.id
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-surface-600 hover:text-surface-900'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className={`px-2 py-1 text-xs rounded-full ${
                  selectedTab === tab.id ? 'bg-primary-100 text-primary-600' : 'bg-surface-200 text-surface-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && settings && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-surface-900 mb-4">Notification Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium text-surface-900">Alert Types</h4>
              {[
                { key: 'lowStockAlerts', label: 'Low Stock Alerts' },
                { key: 'expirationAlerts', label: 'Expiration Alerts' },
                { key: 'reorderSuggestions', label: 'Reorder Suggestions' },
                { key: 'emailNotifications', label: 'Email Notifications' }
              ].map((setting) => (
                <label key={setting.key} className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={settings[setting.key as keyof NotificationSettings] as boolean}
                    onChange={(e) => handleUpdateSettings({ [setting.key]: e.target.checked })}
                    className="rounded border-surface-300 text-primary-600"
                  />
                  <span className="text-surface-700">{setting.label}</span>
                </label>
              ))}
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-surface-900">Report Schedule</h4>
              {[
                { key: 'dailyReports', label: 'Daily Reports' },
                { key: 'weeklyReports', label: 'Weekly Reports' }
              ].map((setting) => (
                <label key={setting.key} className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={settings[setting.key as keyof NotificationSettings] as boolean}
                    onChange={(e) => handleUpdateSettings({ [setting.key]: e.target.checked })}
                    className="rounded border-surface-300 text-primary-600"
                  />
                  <span className="text-surface-700">{setting.label}</span>
                </label>
              ))}

              <div className="pt-2">
                <label className="block text-sm font-medium text-surface-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={settings.emailAddress || ''}
                  onChange={(e) => handleUpdateSettings({ emailAddress: e.target.value })}
                  className="w-full px-3 py-2 border border-surface-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  placeholder="notifications@restaurant.com"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notifications List */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-surface-900">
            {selectedTab === 'all' ? 'All Notifications' : 
             selectedTab === 'unread' ? 'Unread Notifications' : 
             'Critical Alerts'}
          </h3>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              Mark all as read
            </button>
          )}
        </div>

        <div className="space-y-3">
          {getFilteredNotifications().length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">📬</div>
              <p className="text-surface-600">No notifications found</p>
              <p className="text-sm text-surface-500 mt-1">
                {selectedTab === 'unread' ? 'All caught up!' : 'Check back later for updates'}
              </p>
            </div>
          ) : (
            getFilteredNotifications().map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-lg border transition-colors ${
                  !notification.isRead 
                    ? 'bg-surface-50 border-primary-200 border-l-4 border-l-primary-500' 
                    : 'bg-white border-surface-200'
                } hover:shadow-md`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <span className="text-xl">{getTypeIcon(notification.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium text-surface-900">{notification.title}</h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(notification.priority)}`}>
                          {notification.priority}
                        </span>
                      </div>
                      <p className="text-surface-700 mb-2">{notification.message}</p>
                      
                      {notification.actionRequired && (
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded">
                            Action Required
                          </span>
                          {notification.actionType && (
                            <span className="text-xs text-surface-500">
                              {notification.actionType.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center space-x-4 text-xs text-surface-500">
                        <span>
                          {new Date(notification.createdAt.toDate()).toLocaleString()}
                        </span>
                        <span className="capitalize">{notification.category}</span>
                        {notification.relatedItemName && (
                          <span>Item: {notification.relatedItemName}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    {!notification.isRead && (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="p-1 text-primary-600 hover:text-primary-700"
                        title="Mark as read"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteNotification(notification.id)}
                      className="p-1 text-surface-400 hover:text-red-600"
                      title="Delete notification"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
