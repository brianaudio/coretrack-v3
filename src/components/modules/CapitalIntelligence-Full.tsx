'use client'

import { useState } from 'react'
import { useCapitalIntelligence } from '../../lib/hooks/useCapitalIntelligence'
import { useBranch } from '../../lib/context/BranchContext'

// Full Capital Intelligence with detailed metrics
export default function CapitalIntelligence() {
  const { selectedBranch } = useBranch()
  const { data: capitalData, loading, error, refresh, lastUpdated } = useCapitalIntelligence({
    refreshInterval: 300000, // 5 minutes
    autoRefresh: true
  })

  const [activeTab, setActiveTab] = useState('overview')

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'tips', label: 'Tips', icon: '💡' }
  ]

  // Helper functions for status calculations
  const getStockHealth = () => {
    if (!capitalData) return { status: 'Loading...', color: 'gray', emoji: '⏳', message: 'Please wait...' }
    
    const days = capitalData.capitalRecoveryTime
    const icr = capitalData.currentICR
    
    if (!isFinite(days) || days > 999) {
      return { 
        status: 'Need More Sales', 
        color: 'gray', 
        emoji: '📊', 
        message: 'Start making sales to see health metrics'
      }
    }
    
    if (days <= 14 && icr <= 0.4) {
      return { 
        status: 'Excellent', 
        color: 'green', 
        emoji: '🚀', 
        message: 'Money flows quickly through your business'
      }
    }
    
    if (days <= 30 && icr <= 0.6) {
      return { 
        status: 'Good', 
        color: 'blue', 
        emoji: '✅', 
        message: 'Healthy stock turnover rate'
      }
    }
    
    if (days <= 60) {
      return { 
        status: 'Okay', 
        color: 'yellow', 
        emoji: '⚠️', 
        message: 'Could sell stock faster'
      }
    }
    
    return { 
      status: 'Slow', 
      color: 'red', 
      emoji: '🐌', 
      message: 'Money is stuck too long'
    }
  }

  const getSpendingEfficiency = () => {
    if (!capitalData) return { status: 'Loading...', color: 'gray', message: 'Please wait...' }
    
    const icr = capitalData.currentICR
    const recoveryTime = capitalData.capitalRecoveryTime
    const velocity = capitalData.purchaseToSalesVelocity
    
    // Calculate efficiency score
    let score = 0
    if (icr <= 0.4) score += 40
    else if (icr <= 0.6) score += 30
    else score += 10
    
    if (isFinite(recoveryTime)) {
      if (recoveryTime <= 14) score += 40
      else if (recoveryTime <= 30) score += 30
      else if (recoveryTime <= 60) score += 20
      else score += 10
    }
    
    if (velocity >= 1000) score += 20
    else if (velocity >= 500) score += 15
    else if (velocity >= 100) score += 10
    else score += 5
    
    if (score >= 85) {
      return { status: 'Excellent', color: 'green', message: 'Highly efficient capital use' }
    } else if (score >= 70) {
      return { status: 'Good', color: 'blue', message: 'Good capital efficiency' }
    } else if (score >= 50) {
      return { status: 'Fair', color: 'yellow', message: 'Room for improvement' }
    } else {
      return { status: 'Poor', color: 'red', message: 'Needs attention' }
    }
  }

  const getEfficiencyScore = (icr: number, recoveryTime: number, velocity: number) => {
    let score = 0
    if (icr <= 0.4) score += 40
    else if (icr <= 0.6) score += 30
    else score += 10
    
    if (isFinite(recoveryTime)) {
      if (recoveryTime <= 14) score += 40
      else if (recoveryTime <= 30) score += 30
      else if (recoveryTime <= 60) score += 20
      else score += 10
    }
    
    if (velocity >= 1000) score += 20
    else if (velocity >= 500) score += 15
    else if (velocity >= 100) score += 10
    else score += 5
    
    return Math.min(score, 100)
  }

  const getICRColor = (icrPercent: number) => {
    if (icrPercent <= 40) return 'text-green-600'
    if (icrPercent <= 60) return 'text-blue-600'
    return 'text-red-600'
  }

  const stockHealth = getStockHealth()
  const spendingEfficiency = getSpendingEfficiency()

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto p-6">
          <div className="bg-white/70 backdrop-blur-lg rounded-3xl border border-red-200/50 shadow-xl p-12 text-center">
            <div className="text-red-600 mb-6">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.96-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-2xl font-light text-red-900 mb-4 tracking-tight">Failed to Load Data</h3>
            <p className="text-red-700 mb-6 font-light">{error}</p>
            {selectedBranch && (
              <p className="text-sm text-red-600/70 mb-6 font-light">Branch: {selectedBranch.name}</p>
            )}
            <button
              onClick={refresh}
              className="bg-red-600/10 border border-red-200 hover:bg-red-600/20 text-red-700 px-8 py-4 rounded-2xl transition-all duration-300 font-medium backdrop-blur-sm"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white space-y-6">
      {/* Enhanced Glassmorphism Header */}
      <div className="bg-gradient-to-br from-gray-50 to-white backdrop-blur-lg border border-white/20 rounded-3xl p-8 shadow-2xl shadow-gray-500/10">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-700 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/25">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-light text-gray-900 tracking-tight">Capital Intelligence</h1>
                {selectedBranch && (
                  <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1.5 rounded-lg font-medium shadow-sm">
                    {selectedBranch.name}
                  </span>
                )}
              </div>
              <p className="text-lg text-gray-500 font-light leading-relaxed max-w-2xl">
                Smart business financial insights with real-time analytics and capital efficiency monitoring.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right space-y-2">
              <div className="text-sm text-gray-500 font-light">System Status</div>
              <div className="flex items-center gap-2 justify-end">
                <div className="w-3 h-3 rounded-full bg-blue-500 shadow-lg shadow-blue-500/40 animate-pulse"></div>
                <div className="text-xl font-light tracking-tight text-gray-900">
                  Analytics Active
                </div>
              </div>
              {lastUpdated && (
                <div className="text-xs text-gray-400 font-light">
                  Updated {lastUpdated.toLocaleTimeString()}
                </div>
              )}
            </div>
            <button
              onClick={refresh}
              disabled={loading}
              className="px-4 py-3 bg-blue-600/10 border border-blue-200 text-blue-700 rounded-xl hover:bg-blue-600/20 transition-all duration-300 font-medium backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">

        {/* Enhanced Tab Navigation */}
        <div className="bg-white/70 backdrop-blur-lg rounded-3xl border border-white/20 shadow-xl p-6 mb-6">
          <div className="flex space-x-2 bg-gray-50/50 backdrop-blur-sm p-2 rounded-2xl">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-sm font-medium transition-all duration-300 ${
                  activeTab === tab.id
                    ? 'bg-white text-blue-600 shadow-lg shadow-blue-500/10 backdrop-blur-lg'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Enhanced Loading State */}
        {loading && !capitalData && (
          <div className="bg-white/70 backdrop-blur-lg rounded-3xl border border-white/20 shadow-xl p-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-6"></div>
              <p className="text-lg text-gray-600 font-light">Loading capital intelligence data...</p>
              {selectedBranch && (
                <p className="text-sm text-gray-500 mt-2 font-light">For {selectedBranch.name}</p>
              )}
            </div>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && capitalData && (
          <div className="space-y-6">
            {/* Enhanced Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Stock Health */}
              <div className="bg-white/70 backdrop-blur-lg rounded-3xl border border-white/20 shadow-xl p-6 hover:shadow-2xl hover:scale-[1.02] transition-all duration-500">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-600">Stock Health</h3>
                  <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center">
                    <span className="text-2xl">{stockHealth.emoji}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <p className={`text-lg font-light tracking-tight text-${stockHealth.color}-600`}>
                    {stockHealth.status}
                  </p>
                  <p className="text-xs text-gray-500 font-light leading-relaxed">{stockHealth.message}</p>
                  {isFinite(capitalData.capitalRecoveryTime) && capitalData.capitalRecoveryTime < 999 && (
                    <p className="text-xs text-gray-400 font-light">
                      {Math.round(capitalData.capitalRecoveryTime)} days to sell current stock
                    </p>
                  )}
                </div>
              </div>

              {/* Spending Efficiency */}
              <div className="bg-white/70 backdrop-blur-lg rounded-3xl border border-white/20 shadow-xl p-6 hover:shadow-2xl hover:scale-[1.02] transition-all duration-500">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-600">Efficiency</h3>
                  <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center">
                    <span className="text-2xl">📈</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <p className={`text-lg font-light tracking-tight text-${spendingEfficiency.color}-600`}>
                    {spendingEfficiency.status}
                  </p>
                  <p className="text-xs text-gray-500 font-light leading-relaxed">{spendingEfficiency.message}</p>
                  <div className="w-full bg-gray-200/70 rounded-full h-2 backdrop-blur-sm">
                    <div 
                      className={`bg-${spendingEfficiency.color}-500 h-2 rounded-full transition-all shadow-sm`}
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
              <div className="bg-white/70 backdrop-blur-lg rounded-3xl border border-white/20 shadow-xl p-6 hover:shadow-2xl hover:scale-[1.02] transition-all duration-500">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-600">ICR</h3>
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                </div>
                <div className="space-y-3">
                  <p className={`text-2xl font-light tracking-tight ${getICRColor(capitalData.currentICR * 100)}`}>
                    {Math.round(capitalData.currentICR * 100)}%
                  </p>
                  <p className="text-xs text-gray-500 font-light">
                    {capitalData.currentICR <= 0.4 ? 'Optimal' : 
                     capitalData.currentICR <= 0.6 ? 'Good' : 'High'}
                  </p>
                </div>
              </div>

              {/* Money Flow */}
              <div className="bg-white/70 backdrop-blur-lg rounded-3xl border border-white/20 shadow-xl p-6 hover:shadow-2xl hover:scale-[1.02] transition-all duration-500">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-600">Money Flow</h3>
                  <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center">
                    <span className="text-xl">
                      {capitalData.moneyFlowAnalysis.isGood ? '✅' : '⚠️'}
                    </span>
                  </div>
                </div>
                <div className="space-y-3">
                  <p className={`text-sm font-medium tracking-tight ${
                    capitalData.moneyFlowAnalysis.isGood ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    {capitalData.moneyFlowAnalysis.type.replace('_', ' ').toUpperCase()}
                  </p>
                  <p className="text-xs text-gray-500 font-light leading-relaxed line-clamp-2">
                    {capitalData.moneyFlowAnalysis.message}
                  </p>
                </div>
              </div>
            </div>

            {/* Enhanced Detailed Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Financial Overview */}
              <div className="bg-white/70 backdrop-blur-lg rounded-3xl border border-white/20 shadow-xl p-8">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-light text-gray-900 tracking-tight">Financial Overview</h3>
                </div>
                
                <div className="space-y-6">
                  <div className="flex justify-between items-center py-4 border-b border-gray-100/50">
                    <span className="text-gray-600 font-light">Capital Deployed (Purchases)</span>
                    <span className="font-medium text-gray-900">₱{capitalData.totalCapitalDeployed.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-4 border-b border-gray-100/50">
                    <span className="text-gray-600 font-light">Current Inventory Value</span>
                    <span className="font-medium text-gray-900">₱{capitalData.totalInventoryValue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-4">
                    <span className="text-gray-600 font-light">Daily Sales Velocity</span>
                    <span className="font-semibold">₱{Math.round(capitalData.purchaseToSalesVelocity).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Capital Flow Breakdown */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <span className="text-indigo-600">🔄</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Capital Flow</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Money OUT - Purchases */}
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-red-600 text-lg">📤</span>
                      <h4 className="font-medium text-red-800">Money OUT</h4>
                    </div>
                    <div className="text-2xl font-bold text-red-700 mb-1">
                      ₱{capitalData.totalCapitalDeployed.toLocaleString()}
                    </div>
                    <div className="text-sm text-red-600">Spent on purchases</div>
                  </div>

                  {/* Money TIED UP - Inventory */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-yellow-600 text-lg">📦</span>
                      <h4 className="font-medium text-yellow-800">Money TIED UP</h4>
                    </div>
                    <div className="text-2xl font-bold text-yellow-700 mb-1">
                      ₱{capitalData.totalInventoryValue.toLocaleString()}
                    </div>
                    <div className="text-sm text-yellow-600">Current stock value</div>
                  </div>
                </div>

                {/* Flow Explanation */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">💡</span>
                    <span className="font-medium text-gray-800">Business Cycle:</span>
                  </div>
                  <div className="text-sm text-gray-600 leading-relaxed">
                    Money flows from purchases → inventory → sales. Faster conversion means better cash flow.
                  </div>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            {capitalData.recommendations && capitalData.recommendations.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                    <span className="text-orange-600">💡</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Smart Recommendations</h3>
                </div>
                
                <div className="space-y-3">
                  {capitalData.recommendations.map((rec, index) => (
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
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Enhanced Tips Tab */}
        {activeTab === 'tips' && (
          <div className="space-y-6">
            <div className="bg-white/70 backdrop-blur-lg rounded-3xl border border-white/20 shadow-xl p-8">
              <h3 className="text-2xl font-light text-gray-900 mb-8 tracking-tight">Understanding Capital Intelligence</h3>
              
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
