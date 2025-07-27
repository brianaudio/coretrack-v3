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
    <div className="flex h-full bg-surface-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-sm border-r border-surface-200">
        <div className="p-6 border-b border-surface-200">
          <h1 className="text-xl font-bold text-surface-900">Settings</h1>
          <p className="text-sm text-surface-600 mt-1">Manage your CoreTrack configuration</p>
        </div>
        
        <nav className="p-4">
          <div className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary-50 text-primary-700 border border-primary-200'
                    : 'text-surface-700 hover:bg-surface-50 hover:text-surface-900'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
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
  )
}

// Business Profile Tab
function BusinessProfileTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-surface-900">Business Profile</h2>
        <p className="text-surface-600">Manage your business information and branding</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Basic Information */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-surface-900 mb-4">Basic Information</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-2">Business Name</label>
              <input
                type="text"
                defaultValue="CoreTrack Demo Store"
                className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-2">Business Type</label>
              <select className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                <option>Restaurant</option>
                <option>Retail Store</option>
                <option>Coffee Shop</option>
                <option>Grocery Store</option>
                <option>Pharmacy</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-2">Phone Number</label>
              <input
                type="tel"
                defaultValue="+63 2 123 4567"
                className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-2">Email</label>
              <input
                type="email"
                defaultValue="admin@coretrakdemo.com"
                className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Business Hours */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-surface-900 mb-4">Business Hours</h3>
          <div className="space-y-3">
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
              <div key={day} className="flex items-center space-x-4">
                <div className="w-20 text-sm font-medium text-surface-700">{day}</div>
                <input
                  type="time"
                  defaultValue="08:00"
                  className="px-2 py-1 border border-surface-300 rounded text-sm"
                />
                <span className="text-surface-500">to</span>
                <input
                  type="time"
                  defaultValue="20:00"
                  className="px-2 py-1 border border-surface-300 rounded text-sm"
                />
                <label className="flex items-center">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="ml-2 text-sm text-surface-600">Open</span>
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Address Information */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-surface-900 mb-4">Address Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-2">Street Address</label>
            <input
              type="text"
              defaultValue="123 Main Street"
              className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-2">City</label>
            <input
              type="text"
              defaultValue="Metro Manila"
              className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-2">Province/State</label>
            <input
              type="text"
              defaultValue="National Capital Region"
              className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-2">Postal Code</label>
            <input
              type="text"
              defaultValue="1000"
              className="w-full px-3 py-2 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
          Save Changes
        </button>
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-surface-900">User Management</h2>
          <p className="text-surface-600">Manage users and their permissions</p>
        </div>
        <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
          Invite User
        </button>
      </div>

      {/* User Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-2xl font-bold text-surface-900">12</div>
          <div className="text-sm text-surface-600">Total Users</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-green-600">10</div>
          <div className="text-sm text-surface-600">Active Users</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-blue-600">3</div>
          <div className="text-sm text-surface-600">Admins</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold text-orange-600">2</div>
          <div className="text-sm text-surface-600">Pending Invites</div>
        </div>
      </div>

      {/* User Table */}
      <div className="card">
        <div className="p-6 border-b border-surface-200">
          <h3 className="text-lg font-semibold text-surface-900">Team Members</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Branch</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Last Active</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-surface-200">
              {[
                { name: 'John Admin', email: 'admin@demo.com', role: 'Admin', branch: 'All Branches', status: 'active', lastActive: '2 minutes ago' },
                { name: 'Maria Manager', email: 'maria@demo.com', role: 'Manager', branch: 'Main Branch', status: 'active', lastActive: '5 minutes ago' },
                { name: 'Carlos Cashier', email: 'carlos@demo.com', role: 'Cashier', branch: 'Downtown Store', status: 'active', lastActive: '1 hour ago' }
              ].map((user, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {user.name.charAt(0)}
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-surface-900">{user.name}</div>
                        <div className="text-sm text-surface-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-surface-500">{user.branch}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-surface-500">{user.lastActive}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-primary-600 hover:text-primary-700">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-surface-900">Integrations</h2>
        <p className="text-surface-600">Connect CoreTrack with your favorite tools and services</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { name: 'QuickBooks', description: 'Sync your financial data with QuickBooks', icon: '💼', status: 'available' },
          { name: 'Shopify', description: 'Connect your online store inventory', icon: '🛒', status: 'available' },
          { name: 'Stripe', description: 'Process payments with Stripe', icon: '💳', status: 'connected' },
          { name: 'Gmail', description: 'Send reports and notifications via Gmail', icon: '📧', status: 'connected' },
          { name: 'Slack', description: 'Get notifications in your Slack workspace', icon: '💬', status: 'available' },
          { name: 'Zapier', description: 'Automate workflows with 5000+ apps', icon: '⚡', status: 'available' }
        ].map((integration) => (
          <div key={integration.name} className="card p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="text-2xl">{integration.icon}</div>
              <div>
                <h3 className="font-semibold text-surface-900">{integration.name}</h3>
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
            </div>
            <p className="text-sm text-surface-600 mb-4">{integration.description}</p>
            <button className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              integration.status === 'connected'
                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                : 'bg-primary-600 text-white hover:bg-primary-700'
            }`}>
              {integration.status === 'connected' ? 'Disconnect' : 'Connect'}
            </button>
          </div>
        ))}
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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-surface-900">Billing & Subscription</h2>
        <p className="text-surface-600">Manage your subscription and billing information</p>
      </div>

      {/* Current Plan */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-surface-900">Current Plan</h3>
            <p className="text-surface-600">Professional Plan</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-surface-900">₱2,999</div>
            <div className="text-sm text-surface-600">per month</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-surface-50 rounded-lg">
            <div className="text-xl font-bold text-surface-900">3</div>
            <div className="text-sm text-surface-600">Branches</div>
          </div>
          <div className="text-center p-4 bg-surface-50 rounded-lg">
            <div className="text-xl font-bold text-surface-900">50</div>
            <div className="text-sm text-surface-600">Users</div>
          </div>
          <div className="text-center p-4 bg-surface-50 rounded-lg">
            <div className="text-xl font-bold text-surface-900">∞</div>
            <div className="text-sm text-surface-600">Transactions</div>
          </div>
        </div>

        <div className="flex space-x-4">
          <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
            Upgrade Plan
          </button>
          <button className="px-4 py-2 border border-surface-300 text-surface-700 rounded-lg hover:bg-surface-50 transition-colors">
            Change Plan
          </button>
        </div>
      </div>

      {/* Billing History */}
      <div className="card">
        <div className="p-6 border-b border-surface-200">
          <h3 className="text-lg font-semibold text-surface-900">Billing History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
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
                { date: 'Jan 15, 2025', description: 'Professional Plan - Monthly', amount: '₱2,999', status: 'Paid' },
                { date: 'Dec 15, 2024', description: 'Professional Plan - Monthly', amount: '₱2,999', status: 'Paid' },
                { date: 'Nov 15, 2024', description: 'Professional Plan - Monthly', amount: '₱2,999', status: 'Paid' }
              ].map((bill, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-surface-900">{bill.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-surface-900">{bill.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-surface-900">{bill.amount}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                      {bill.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-600 hover:text-primary-700">
                    <button>Download</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
