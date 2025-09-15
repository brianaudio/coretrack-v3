'use client'

import { useCapitalIntelligence } from '../../lib/hooks/useCapitalIntelligence'
import { useBranch } from '../../lib/context/BranchContext'

// Simplified Capital Intelligence - Easy to Understand
export default function CapitalIntelligence() {
  const { selectedBranch } = useBranch()
  const { data: capitalData, loading, error, refresh, lastUpdated } = useCapitalIntelligence({
    refreshInterval: 300000, // 5 minutes
    autoRefresh: true
  })

  // Simple status checker
  const getBusinessHealth = () => {
    if (!capitalData) return { status: 'Loading...', color: 'gray', emoji: '⏳', advice: 'Please wait...' }
    
    const days = capitalData.capitalRecoveryTime
    const dailySales = capitalData.purchaseToSalesVelocity
    
    if (!isFinite(days) || days > 999) {
      return { 
        status: 'Need More Sales', 
        color: 'gray', 
        emoji: '📊', 
        advice: 'Start making sales to see your business health'
      }
    }
    
    if (days <= 14 && dailySales >= 1000) {
      return { 
        status: 'Amazing!', 
        color: 'green', 
        emoji: '🚀', 
        advice: 'Your business is performing excellently!'
      }
    }
    
    if (days <= 30 && dailySales >= 500) {
      return { 
        status: 'Good', 
        color: 'blue', 
        emoji: '✅', 
        advice: 'Healthy business with room to grow'
      }
    }
    
    if (days <= 60) {
      return { 
        status: 'Okay', 
        color: 'yellow', 
        emoji: '⚠️', 
        advice: 'Consider promotional campaigns to boost sales'
      }
    }
    
    return { 
      status: 'Needs Attention', 
      color: 'red', 
      emoji: '🐌', 
      advice: 'Focus on faster-moving products and marketing'
    }
  }

  const businessHealth = getBusinessHealth()

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl border border-red-200 p-8 text-center">
            <span className="text-4xl">❌</span>
            <h3 className="text-xl font-semibold text-red-900 mt-4">Something went wrong</h3>
            <p className="text-red-700 mt-2">{error}</p>
            <button
              onClick={refresh}
              className="bg-red-600 text-white px-6 py-2 rounded-lg mt-4 hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Loading state
  if (loading && !capitalData) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-lg text-gray-600">Loading your business insights...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Business Health Check</h1>
              <p className="text-gray-600 mt-1">Simple insights about your money and sales</p>
              {selectedBranch && (
                <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm mt-2">
                  {selectedBranch.name}
                </span>
              )}
            </div>
            <button
              onClick={refresh}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Main Health Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="text-6xl mb-4">{businessHealth.emoji}</div>
          <h2 className={`text-2xl font-semibold mb-2 text-${businessHealth.color}-600`}>
            {businessHealth.status}
          </h2>
          <p className="text-gray-600 text-lg mb-6">{businessHealth.advice}</p>
          
          {capitalData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-500">Daily Sales</div>
                <div className="text-xl font-semibold text-gray-900">
                  ₱{Math.round(capitalData.purchaseToSalesVelocity).toLocaleString()}
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-500">Monthly Revenue</div>
                <div className="text-xl font-semibold text-gray-900">
                  ₱{capitalData.totalRecentSales.toLocaleString()}
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-500">Money in Stock</div>
                <div className="text-xl font-semibold text-gray-900">
                  ₱{capitalData.totalInventoryValue.toLocaleString()}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Simple Money Flow */}
        {capitalData && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">💰 How Your Money Moves</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Money Spent */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-red-600 text-xl">📤</span>
                  <h4 className="font-medium text-red-800">Money Spent</h4>
                </div>
                <div className="text-2xl font-bold text-red-700">
                  ₱{capitalData.totalCapitalDeployed.toLocaleString()}
                </div>
                <div className="text-sm text-red-600">On buying products</div>
              </div>

              {/* Money in Stock */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-yellow-600 text-xl">📦</span>
                  <h4 className="font-medium text-yellow-800">Money in Stock</h4>
                </div>
                <div className="text-2xl font-bold text-yellow-700">
                  ₱{capitalData.totalInventoryValue.toLocaleString()}
                </div>
                <div className="text-sm text-yellow-600">Value of products you have</div>
              </div>

              {/* Money Earned */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-green-600 text-xl">💚</span>
                  <h4 className="font-medium text-green-800">Money Earned</h4>
                </div>
                <div className="text-2xl font-bold text-green-700">
                  ₱{capitalData.totalRecentSales.toLocaleString()}
                </div>
                <div className="text-sm text-green-600">From sales (last 30 days)</div>
              </div>
            </div>

            {/* Simple explanation */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-start gap-2">
                <span className="text-blue-600 text-lg">💡</span>
                <div>
                  <h4 className="font-medium text-blue-800 mb-1">Simple Goal:</h4>
                  <p className="text-blue-700 text-sm">
                    Sell your products quickly to turn your stock into cash. The faster you sell, the healthier your business!
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Simple Tips */}
        {capitalData && capitalData.recommendations && capitalData.recommendations.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">💡 Simple Tips to Improve</h3>
            <div className="space-y-3">
              {capitalData.recommendations.slice(0, 3).map((tip, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="text-lg">✨</span>
                  <div>
                    <h4 className="font-medium text-gray-900">{tip.title}</h4>
                    <p className="text-gray-600 text-sm">{tip.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Sales */}
        {capitalData && capitalData.recentSales && capitalData.recentSales.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🛒 Recent Sales</h3>
            <div className="space-y-2">
              {capitalData.recentSales.slice(0, 5).map((sale, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">{sale.customer}</div>
                    <div className="text-sm text-gray-600">
                      {sale.date.toLocaleDateString()} • {sale.items} item{sale.items !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="text-lg font-semibold text-gray-900">
                    ₱{sale.amount.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Last updated */}
        {lastUpdated && (
          <div className="text-center text-sm text-gray-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        )}

      </div>
    </div>
  )
}
