'use client'

import { useState } from 'react'
import { useCapitalIntelligence } from '../../lib/hooks/useCapitalIntelligence'

// Capital Intelligence Dashboard Component
export default function CapitalIntelligence() {
  const [activeTab, setActiveTab] = useState('overview')
  const [alertThresholds, setAlertThresholds] = useState({
    highICR: 75,
    slowRecovery: 30,
    lowVelocity: 0.5
  })

  // Use the new hook for data management
  const { data: capitalData, loading, error, refresh, lastUpdated } = useCapitalIntelligence({
    refreshInterval: 300000, // 5 minutes
    autoRefresh: true
  })

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'tips', label: 'Tips', icon: '💡' }
  ]

  const getICRColor = (icr: number) => {
    if (icr <= 40) return 'text-green-600'
    if (icr <= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getEfficiencyScore = (icr: number, recoveryTime: number, velocity: number) => {
    // Handle infinity and invalid values properly
    const safeRecoveryTime = isFinite(recoveryTime) ? recoveryTime : 999
    const icrScore = Math.max(0, (100 - icr))
    const recoveryScore = Math.max(0, (50 - safeRecoveryTime) * 2)
    const velocityScore = Math.min(100, velocity * 30)
    return Math.round((icrScore + recoveryScore + velocityScore) / 3)
  }

  // Helper functions for easy understanding
  const getStockHealthStatus = () => {
    if (!capitalData) return { status: 'Loading', color: 'gray', emoji: '⏳', message: 'Loading data...' }
    
    const days = capitalData.capitalRecoveryTime
    // Handle invalid days values
    if (!isFinite(days) || days > 999) return { status: 'Unknown', color: 'gray', emoji: '❓', message: 'Insufficient data' }
    if (days <= 14) return { status: 'Excellent', color: 'green', emoji: '🔥', message: 'Your money moves super fast!' }
    if (days <= 30) return { status: 'Good', color: 'blue', emoji: '✅', message: 'Healthy cash flow' }
    if (days <= 60) return { status: 'Okay', color: 'yellow', emoji: '⚠️', message: 'Could be faster' }
    return { status: 'Slow', color: 'red', emoji: '🐌', message: 'Money is stuck too long' }
  }

  const getSpendingEfficiency = () => {
    if (!capitalData) return { status: 'Loading', message: 'Calculating efficiency...', color: 'gray' }
    
    const efficiencyScore = getEfficiencyScore(
      capitalData.currentICR, 
      capitalData.capitalRecoveryTime, 
      capitalData.purchaseToSalesVelocity
    )
    
    if (efficiencyScore >= 80) return { status: 'Excellent', message: 'Highly efficient capital usage', color: 'green' }
    if (efficiencyScore >= 60) return { status: 'Good', message: 'Good capital efficiency', color: 'blue' }
    if (efficiencyScore >= 40) return { status: 'Fair', message: 'Room for improvement', color: 'yellow' }
    return { status: 'Needs Attention', message: 'Capital efficiency needs improvement', color: 'red' }
  }

  const stockHealth = getStockHealthStatus()
  const spendingEfficiency = getSpendingEfficiency()

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <div className="text-red-600 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.96-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-red-900 mb-2">Failed to Load Data</h3>
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={refresh}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-white text-lg">💰</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Capital Intelligence</h1>
                <p className="text-gray-600">Smart business financial insights</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {lastUpdated && (
                <span className="text-xs text-gray-500">
                  Updated {lastUpdated.toLocaleTimeString()}
                </span>
              )}
              <button
                onClick={refresh}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {loading && !capitalData && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading capital intelligence data...</p>
            </div>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && capitalData && (
          <div className="space-y-6">
            {/* Quick Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Stock Health */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-600">Stock Health</h3>
                  <span className="text-2xl">{stockHealth.emoji}</span>
                </div>
                <div className="space-y-2">
                  <p className={`text-lg font-semibold text-${stockHealth.color}-600`}>
                    {stockHealth.status}
                  </p>
                  <p className="text-xs text-gray-500">{stockHealth.message}</p>
                  {isFinite(capitalData.capitalRecoveryTime) && capitalData.capitalRecoveryTime < 999 && (
                    <p className="text-xs text-gray-400">
                      {Math.round(capitalData.capitalRecoveryTime)} days to sell current stock
                    </p>
                  )}
                </div>
              </div>

              {/* Spending Efficiency */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-600">Efficiency</h3>
                  <span className="text-2xl">📈</span>
                </div>
                <div className="space-y-2">
                  <p className={`text-lg font-semibold text-${spendingEfficiency.color}-600`}>
                    {spendingEfficiency.status}
                  </p>
                  <p className="text-xs text-gray-500">{spendingEfficiency.message}</p>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`bg-${spendingEfficiency.color}-500 h-2 rounded-full transition-all`}
                      style={{ 
                        width: `${getEfficiencyScore(
                          capitalData.currentICR, 
                          capitalData.capitalRecoveryTime, 
                          capitalData.purchaseToSalesVelocity
                        )}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* ICR (Inventory to Capital Ratio) */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-600">ICR</h3>
                  <span className="text-2xl">⚖️</span>
                </div>
                <div className="space-y-2">
                  <p className={`text-2xl font-bold ${getICRColor(capitalData.currentICR * 100)}`}>
                    {Math.round(capitalData.currentICR * 100)}%
                  </p>
                  <p className="text-xs text-gray-500">
                    {capitalData.currentICR <= 0.4 ? 'Optimal' : 
                     capitalData.currentICR <= 0.6 ? 'Good' : 'High'}
                  </p>
                </div>
              </div>

              {/* Money Flow */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-600">Money Flow</h3>
                  <span className="text-2xl">
                    {capitalData.moneyFlowAnalysis.isGood ? '✅' : '⚠️'}
                  </span>
                </div>
                <div className="space-y-2">
                  <p className={`text-sm font-semibold ${
                    capitalData.moneyFlowAnalysis.isGood ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    {capitalData.moneyFlowAnalysis.type.replace('_', ' ').toUpperCase()}
                  </p>
                  <p className="text-xs text-gray-500 line-clamp-2">
                    {capitalData.moneyFlowAnalysis.message}
                  </p>
                </div>
              </div>
            </div>

            {/* Detailed Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Financial Overview */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600">💰</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Financial Overview</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <span className="text-gray-600">Capital Deployed (Purchases)</span>
                    <span className="font-semibold">₱{capitalData.totalCapitalDeployed.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <span className="text-gray-600">Current Inventory Value</span>
                    <span className="font-semibold">₱{capitalData.totalInventoryValue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <span className="text-gray-600">Recent Sales Revenue (30 days)</span>
                    <span className="font-semibold">₱{capitalData.totalRecentSales.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <span className="text-gray-600">Daily Sales Velocity</span>
                    <span className="font-semibold">₱{Math.round(capitalData.purchaseToSalesVelocity).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Money Flow Analysis */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <span className="text-purple-600">🔍</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Money Flow Analysis</h3>
                </div>
                
                <div className="space-y-4">
                  <div className={`p-4 rounded-lg ${
                    capitalData.moneyFlowAnalysis.isGood 
                      ? 'bg-green-50 border border-green-200' 
                      : 'bg-yellow-50 border border-yellow-200'
                  }`}>
                    <p className={`font-medium mb-2 ${
                      capitalData.moneyFlowAnalysis.isGood ? 'text-green-800' : 'text-yellow-800'
                    }`}>
                      {capitalData.moneyFlowAnalysis.message}
                    </p>
                    <ul className="space-y-1">
                      {capitalData.moneyFlowAnalysis.details.map((detail, index) => (
                        <li key={index} className={`text-sm ${
                          capitalData.moneyFlowAnalysis.isGood ? 'text-green-700' : 'text-yellow-700'
                        }`}>
                          • {detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Sales & Recommendations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Sales */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-green-600">�</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Recent Sales</h3>
                </div>
                
                <div className="space-y-3">
                  {capitalData.recentSales.length > 0 ? (
                    capitalData.recentSales.map((sale, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{sale.customer}</p>
                          <p className="text-sm text-gray-500">
                            {sale.date.toLocaleDateString()} • {sale.items} item{sale.items !== 1 ? 's' : ''} • {sale.status}
                          </p>
                        </div>
                        <span className="font-semibold text-gray-900">
                          ₱{sale.amount.toLocaleString()}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 py-4">No recent sales found</p>
                  )}
                </div>
              </div>

              {/* Recommendations */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                    <span className="text-orange-600">💡</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Smart Recommendations</h3>
                </div>
                
                <div className="space-y-3">
                  {capitalData.recommendations.length > 0 ? (
                    capitalData.recommendations.map((rec, index) => (
                      <div key={index} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-blue-900">{rec.title}</h4>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            rec.priority === 'high' ? 'bg-red-100 text-red-800' :
                            rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {rec.priority}
                          </span>
                        </div>
                        <p className="text-sm text-blue-700 mb-2">{rec.message}</p>
                        <p className="text-xs text-blue-600 font-medium">{rec.action}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 py-4">All metrics look good! 🎉</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tips Tab */}
        {activeTab === 'tips' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Understanding Capital Intelligence</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h4 className="font-medium text-gray-900 mb-2">📊 ICR (Inventory to Capital Ratio)</h4>
                    <p className="text-sm text-gray-600">
                      Shows how much of your spending is still sitting as inventory. 
                      Lower is better - it means you're selling faster.
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Good: &lt;40% • Okay: 40-60% • High: &gt;60%
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-green-500 pl-4">
                    <h4 className="font-medium text-gray-900 mb-2">⏱️ Capital Recovery Time</h4>
                    <p className="text-sm text-gray-600">
                      How many days it takes to sell your current inventory at current sales pace.
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Excellent: &lt;14 days • Good: 14-30 days • Slow: &gt;60 days
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="border-l-4 border-purple-500 pl-4">
                    <h4 className="font-medium text-gray-900 mb-2">💰 Money Flow Analysis</h4>
                    <p className="text-sm text-gray-600">
                      Tracks what happened to the money you spent on inventory - whether it became sales or is still sitting as stock.
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-orange-500 pl-4">
                    <h4 className="font-medium text-gray-900 mb-2">🚀 Sales Velocity</h4>
                    <p className="text-sm text-gray-600">
                      Your average daily sales amount. Higher velocity means faster money flow.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">💡 Pro Tips for Better Capital Efficiency</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Focus on fast-moving products to improve recovery time</li>
                  <li>• Avoid overstocking - high ICR ties up your cash</li>
                  <li>• Track seasonal patterns to optimize purchase timing</li>
                  <li>• Monitor slow-moving items and consider promotions</li>
                  <li>• Regular inventory counts ensure accurate metrics</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
