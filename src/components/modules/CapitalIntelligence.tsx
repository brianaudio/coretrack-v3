'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/context/AuthContext'

// Capital Intelligence Dashboard Component
export default function CapitalIntelligence() {
  const { profile, tenant } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [alertThresholds, setAlertThresholds] = useState({
    highICR: 75,
    slowRecovery: 30,
    lowVelocity: 0.5
  })

  // Real data integration - replace with Firebase data
  const [capitalData, setCapitalData] = useState({
    currentICR: 0,
    capitalRecoveryTime: 0,
    purchaseToSalesVelocity: 0,
    totalInventoryValue: 0,
    totalCapitalDeployed: 0,
    recentPurchases: [],
    recommendations: []
  })

  // Load real data from Firebase (placeholder - integrate with your actual data structure)
  useEffect(() => {
    // TODO: Replace with actual Firebase data fetching
    // For now, showing empty state or loading from tenant data
    if (tenant?.id) {
      // Calculate real metrics from Firebase data
      const calculatedMetrics = {
        currentICR: 0, // Calculate from inventory/sales ratio
        capitalRecoveryTime: 0, // Calculate from average daily sales
        purchaseToSalesVelocity: 0, // Calculate from purchases vs sales
        totalInventoryValue: 0, // Sum from inventory collection
        totalCapitalDeployed: 0, // Sum from purchase orders
        recentPurchases: [], // Fetch from purchase orders collection
        recommendations: [] // Generate based on actual data patterns
      }
      setCapitalData(calculatedMetrics)
    }
  }, [tenant?.id])

  const tabs = [
    { id: 'overview', label: 'Capital Overview', icon: '📊' },
    { id: 'analysis', label: 'Deep Analysis', icon: '🔍' },
    { id: 'recommendations', label: 'Smart Recommendations', icon: '💡' },
    { id: 'settings', label: 'Alert Settings', icon: '⚙️' }
  ]

  const getICRColor = (icr: number) => {
    if (icr <= 40) return 'text-green-600'
    if (icr <= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getEfficiencyScore = (icr: number, recoveryTime: number, velocity: number) => {
    const icrScore = Math.max(0, (100 - icr))
    const recoveryScore = Math.max(0, (50 - recoveryTime) * 2)
    const velocityScore = Math.min(100, velocity * 30)
    return Math.round((icrScore + recoveryScore + velocityScore) / 3)
  }

  const efficiencyScore = getEfficiencyScore(capitalData.currentICR, capitalData.capitalRecoveryTime, capitalData.purchaseToSalesVelocity)

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Inventory Capital Ratio</p>
              <p className="text-xs text-gray-500">Capital tied up in inventory</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-xl">💰</span>
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className={`text-3xl font-bold ${getICRColor(capitalData.currentICR)}`}>
              {capitalData.currentICR}%
            </span>
            <span className="text-sm text-gray-500">
              {capitalData.currentICR <= 50 ? 'Efficient' : capitalData.currentICR <= 70 ? 'Moderate' : 'High Risk'}
            </span>
          </div>
          <div className="mt-2 text-xs text-gray-600">
            ₱{capitalData.totalCapitalDeployed.toLocaleString()} of ₱{capitalData.totalInventoryValue.toLocaleString()}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Capital Recovery Time</p>
              <p className="text-xs text-gray-500">Days to recover investment</p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-xl">⏱️</span>
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-green-600">{capitalData.capitalRecoveryTime}</span>
            <span className="text-sm text-gray-500">days</span>
          </div>
          <div className="mt-2 text-xs text-gray-600">
            {capitalData.capitalRecoveryTime <= 21 ? 'Excellent' : capitalData.capitalRecoveryTime <= 35 ? 'Good' : 'Needs Improvement'}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Purchase-to-Sales Velocity</p>
              <p className="text-xs text-gray-500">Sales per dollar invested</p>
            </div>
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-xl">🚀</span>
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-purple-600">{capitalData.purchaseToSalesVelocity}x</span>
            <span className="text-sm text-gray-500">velocity</span>
          </div>
          <div className="mt-2 text-xs text-gray-600">
            {capitalData.purchaseToSalesVelocity >= 2.0 ? 'High Performance' : capitalData.purchaseToSalesVelocity >= 1.5 ? 'Good' : 'Below Target'}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Capital Efficiency Score</p>
              <p className="text-xs text-gray-500">Overall performance rating</p>
            </div>
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <span className="text-xl">⭐</span>
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className={`text-3xl font-bold ${efficiencyScore >= 80 ? 'text-green-600' : efficiencyScore >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
              {efficiencyScore}
            </span>
            <span className="text-sm text-gray-500">/100</span>
          </div>
          <div className="mt-2 text-xs text-gray-600">
            {efficiencyScore >= 80 ? 'Excellent' : efficiencyScore >= 60 ? 'Good' : 'Needs Focus'}
          </div>
        </div>
      </div>

      {/* Recent Purchase Analysis */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Recent Purchase Impact</h3>
            <p className="text-sm text-gray-600">How recent purchases affect your capital efficiency</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Last 7 days</span>
            <select className="text-sm border border-gray-300 rounded-md px-2 py-1">
              <option>Last 7 days</option>
              <option>Last 30 days</option>
              <option>Last 90 days</option>
            </select>
          </div>
        </div>
        <div className="space-y-3">
          {capitalData.recentPurchases.map((purchase: any) => (
            <div key={purchase.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className={`w-3 h-3 rounded-full ${
                  purchase.status === 'good' ? 'bg-green-500' : 
                  purchase.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                }`}></div>
                <div>
                  <p className="font-medium text-gray-900">{purchase.item}</p>
                  <p className="text-sm text-gray-600">{purchase.date}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">${purchase.amount.toLocaleString()}</p>
                <p className={`text-sm ${
                  purchase.status === 'good' ? 'text-green-600' : 
                  purchase.status === 'warning' ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {purchase.impact}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Recommendations */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Wins</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {capitalData.recommendations.slice(0, 3).map((rec: any, index: number) => (
            <div key={index} className={`p-4 rounded-lg border-2 ${
              rec.priority === 'high' ? 'border-red-200 bg-red-50' :
              rec.priority === 'medium' ? 'border-yellow-200 bg-yellow-50' :
              'border-green-200 bg-green-50'
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                <span className={`w-2 h-2 rounded-full ${
                  rec.priority === 'high' ? 'bg-red-500' :
                  rec.priority === 'medium' ? 'bg-yellow-500' :
                  'bg-green-500'
                }`}></span>
                <h4 className="font-medium text-gray-900">{rec.title}</h4>
              </div>
              <p className="text-sm text-gray-600 mb-2">{rec.description}</p>
              <p className="text-xs font-medium text-blue-600">{rec.impact}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderAnalysis = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Capital Efficiency Deep Dive</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ICR Breakdown */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Inventory Capital Ratio Breakdown</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Fast-Moving Items (0-7 days)</span>
                <span className="font-medium text-green-600">18.2%</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Medium-Moving Items (8-21 days)</span>
                <span className="font-medium text-yellow-600">21.4%</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Slow-Moving Items (22+ days)</span>
                <span className="font-medium text-red-600">13.3%</span>
              </div>
            </div>
          </div>

          {/* Capital Recovery Analysis */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Capital Recovery Analysis</h4>
            <div className="space-y-3">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-blue-900">Average Recovery Time</span>
                  <span className="text-lg font-bold text-blue-600">16 days</span>
                </div>
                <div className="text-xs text-blue-700">
                  Industry average: 28 days (43% better)
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Best performing category:</span>
                  <span className="font-medium text-green-600">Beverages (8 days)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Needs improvement:</span>
                  <span className="font-medium text-red-600">Equipment (45 days)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trending Analysis */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">30-Day Capital Efficiency Trend</h3>
        <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📈</span>
            </div>
            <p className="text-gray-600 mb-2">Interactive charts will be implemented here</p>
            <p className="text-sm text-gray-500">Showing ICR, recovery time, and velocity trends</p>
          </div>
        </div>
      </div>
    </div>
  )

  const renderRecommendations = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">AI-Powered Capital Optimization</h3>
        <div className="space-y-4">
          {capitalData.recommendations.map((rec: any, index: number) => (
            <div key={index} className="p-6 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    rec.type === 'reduce' ? 'bg-red-100 text-red-600' :
                    rec.type === 'optimize' ? 'bg-blue-100 text-blue-600' :
                    'bg-green-100 text-green-600'
                  }`}>
                    {rec.type === 'reduce' ? '📉' : rec.type === 'optimize' ? '⚙️' : '📈'}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{rec.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                  rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {rec.priority.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-blue-600">{rec.impact}</p>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderSettings = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Alert Thresholds</h3>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              High ICR Alert Threshold (%)
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="50"
                max="90"
                value={alertThresholds.highICR}
                onChange={(e) => setAlertThresholds({...alertThresholds, highICR: parseInt(e.target.value)})}
                className="flex-1"
              />
              <span className="w-12 text-sm font-medium text-gray-900">{alertThresholds.highICR}%</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Alert when ICR exceeds this percentage</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Slow Recovery Alert (Days)
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="14"
                max="60"
                value={alertThresholds.slowRecovery}
                onChange={(e) => setAlertThresholds({...alertThresholds, slowRecovery: parseInt(e.target.value)})}
                className="flex-1"
              />
              <span className="w-12 text-sm font-medium text-gray-900">{alertThresholds.slowRecovery}d</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Alert when recovery time exceeds this many days</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Low Velocity Alert (Minimum Rate)
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="0.1"
                max="2.0"
                step="0.1"
                value={alertThresholds.lowVelocity}
                onChange={(e) => setAlertThresholds({...alertThresholds, lowVelocity: parseFloat(e.target.value)})}
                className="flex-1"
              />
              <span className="w-12 text-sm font-medium text-gray-900">{alertThresholds.lowVelocity}x</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Alert when velocity falls below this rate</p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-medium text-gray-900">Notification Settings</h4>
              <p className="text-sm text-gray-600">Configure how you receive capital efficiency alerts</p>
            </div>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Capital Intelligence Dashboard</h1>
            <p className="text-gray-600">Monitor if your inventory purchases are aligned with capital efficiency and cash flow</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Business: {tenant?.name || 'CoreTrack Business'}</div>
            <div className="text-xs text-gray-500">Real-time capital analysis</div>
          </div>
        </div>
        
        {/* Unique Value Proposition */}
        <div className="mt-4 p-3 bg-blue-100 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="text-blue-600">💡</span>
            <p className="text-sm text-blue-800 font-medium">
              <strong>World's First</strong> inventory system that tells you if purchases are eating your profits!
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </div>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'analysis' && renderAnalysis()}
          {activeTab === 'recommendations' && renderRecommendations()}
          {activeTab === 'settings' && renderSettings()}
        </div>
      </div>
    </div>
  )
}
