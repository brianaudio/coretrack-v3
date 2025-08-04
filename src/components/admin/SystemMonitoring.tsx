'use client'

import { useState, useEffect } from 'react'

export default function SystemMonitoring() {
  const [loading, setLoading] = useState(true)
  const [systemMetrics, setSystemMetrics] = useState<any>(null)

  useEffect(() => {
    // Since this is a development environment, show connection status instead of fake metrics
    setTimeout(() => {
      setSystemMetrics({
        systemHealth: {
          uptime: null, // No real uptime data
          responseTime: null, // No real response time data
          activeUsers: 1, // Current user count
          totalTenants: 1, // Current tenant count
          lastUpdated: new Date()
        },
        serverMetrics: null // No server metrics in development
      })
      setLoading(false)
    }, 1000)
  }, [])

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded-lg"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">System Monitoring</h2>
          <p className="text-gray-600">Development environment status and configuration</p>
        </div>
        <div className="bg-blue-100 border border-blue-200 rounded-lg px-4 py-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-blue-800">Development Mode</span>
          </div>
          <p className="text-xs text-blue-600 mt-1">Limited monitoring in dev environment</p>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-blue-900">
                {systemMetrics.systemHealth.uptime ? `${systemMetrics.systemHealth.uptime.toFixed(1)}%` : 'N/A'}
              </div>
              <div className="text-sm text-blue-700">System Uptime</div>
            </div>
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-blue-600 mt-2">Requires production monitoring</p>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-green-900">
                {systemMetrics.systemHealth.responseTime ? `${systemMetrics.systemHealth.responseTime}ms` : 'N/A'}
              </div>
              <div className="text-sm text-green-700">Avg Response Time</div>
            </div>
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-green-600 mt-2">Development environment</p>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-purple-900">
                {systemMetrics.systemHealth.activeUsers}
              </div>
              <div className="text-sm text-purple-700">Active Users</div>
            </div>
            <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-orange-900">
                {systemMetrics.systemHealth.totalTenants}
              </div>
              <div className="text-sm text-orange-700">Total Customers</div>
            </div>
            <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-lg font-medium text-gray-900">Server Performance</h4>
          <span className="text-xs text-amber-600 bg-amber-100 px-3 py-1 rounded-full">
            � Development Mode
          </span>
        </div>
        
        {systemMetrics.serverMetrics ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: 'CPU Usage', value: systemMetrics.serverMetrics.cpu, color: 'blue', unit: '%' },
              { name: 'Memory Usage', value: systemMetrics.serverMetrics.memory, color: 'green', unit: '%' },
              { name: 'Network Load', value: systemMetrics.serverMetrics.network, color: 'purple', unit: '%' },
              { name: 'Disk Usage', value: systemMetrics.serverMetrics.disk, color: 'orange', unit: '%' }
            ].map((metric) => (
              <div key={metric.name} className="text-center">
                <div className="text-sm text-gray-600 mb-2">{metric.name}</div>
                <div className="relative w-24 h-24 mx-auto">
                  <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="2"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke={`${metric.color === 'blue' ? '#3b82f6' : 
                              metric.color === 'green' ? '#10b981' : 
                              metric.color === 'purple' ? '#8b5cf6' : '#f59e0b'}`}
                      strokeWidth="2"
                      strokeDasharray={`${metric.value}, 100`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-gray-900">{metric.value}{metric.unit}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 012-2h2a2 2 0 012 2v15" />
              </svg>
            </div>
            <h5 className="text-lg font-semibold text-gray-700 mb-2">Performance Monitoring Unavailable</h5>
            <p className="text-gray-500 text-sm max-w-md mx-auto">
              Server performance metrics are not available in development mode. 
              In production, this would show real-time CPU, memory, network, and disk usage.
            </p>
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg max-w-md mx-auto">
              <p className="text-blue-700 text-xs">
                💡 <strong>Production Note:</strong> Connect to monitoring services like New Relic, DataDog, or AWS CloudWatch for real metrics.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Status Message */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-3 animate-pulse"></div>
            <div>
              <h4 className="text-sm font-medium text-green-800">Development Environment Active</h4>
              <p className="text-xs text-green-600 mt-1">
                Last updated: {systemMetrics.systemHealth.lastUpdated.toLocaleTimeString()}
              </p>
            </div>
          </div>
          <div className="text-xs text-green-600 bg-green-100 px-3 py-1 rounded-full">
            Local Development
          </div>
        </div>
        <div className="mt-4 p-3 bg-green-100 rounded-lg">
          <p className="text-green-800 text-sm">
            🚀 <strong>Ready for Production:</strong> To enable full system monitoring, configure monitoring services in your production environment.
          </p>
        </div>
      </div>
    </div>
  )
}
