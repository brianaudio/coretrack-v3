'use client'

import React from 'react'

interface SimpleChartProps {
  data: Array<{ label: string; value: number; color?: string }>
  type: 'bar' | 'line' | 'pie'
  height?: number
  showValues?: boolean
}

const SimpleChart: React.FC<SimpleChartProps> = ({ 
  data, 
  type, 
  height = 200, 
  showValues = true 
}) => {
  // Validate data and filter out invalid entries
  const validData = data.filter(item => 
    item && 
    typeof item.value === 'number' && 
    !isNaN(item.value) && 
    item.value >= 0 &&
    item.label
  )

  // If no valid data, return empty state
  if (validData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-surface-500">No data available</p>
      </div>
    )
  }

  const maxValue = Math.max(...validData.map(item => item.value))
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']

  if (type === 'bar') {
    return (
      <div className="space-y-4">
        {validData.map((item, index) => {
          const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0
          return (
            <div key={item.label} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-surface-700">{item.label}</span>
                {showValues && (
                  <span className="text-sm text-surface-600">
                    {typeof item.value === 'number' && item.value > 1000 
                      ? `₱${item.value.toLocaleString()}` 
                      : item.value
                    }
                  </span>
                )}
              </div>
              <div className="w-full bg-surface-200 rounded-full h-3">
                <div
                  className="h-3 rounded-full transition-all duration-500"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: item.color || colors[index % colors.length]
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (type === 'line') {
    const stepX = validData.length > 1 ? 100 / (validData.length - 1) : 50
    
    return (
      <div className="relative bg-gray-50 border-2 border-blue-200 rounded-lg" style={{ height }}>
        <div className="absolute top-2 left-2 text-xs text-blue-600 font-bold z-10">
          LINE CHART - Data points: {validData.length}
        </div>
        <svg className="w-full h-full p-4" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Simple grid lines */}
          {[0, 25, 50, 75, 100].map(y => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="100"
              y2={y}
              stroke="#e5e7eb"
              strokeWidth="0.5"
            />
          ))}
          
          {/* Bright colored area under line */}
          {validData.length > 0 && (
            <polygon
              fill="rgba(59, 130, 246, 0.2)"
              stroke="none"
              points={`0,100 ${validData
                .map((item, index) => {
                  const x = validData.length === 1 ? 50 : index * stepX
                  const y = maxValue > 0 ? 100 - (item.value / maxValue) * 100 : 100
                  return `${x},${y}`
                })
                .join(' ')} 100,100`}
            />
          )}
          
          {/* Thick, bright line */}
          {validData.length > 0 && (
            <polyline
              fill="none"
              stroke="#3B82F6"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={validData
                .map((item, index) => {
                  const x = validData.length === 1 ? 50 : index * stepX
                  const y = maxValue > 0 ? 100 - (item.value / maxValue) * 100 : 100
                  return `${x},${y}`
                })
                .join(' ')}
            />
          )}
          
          {/* Large, visible data points */}
          {validData.map((item, index) => {
            const x = validData.length === 1 ? 50 : index * stepX
            const y = maxValue > 0 ? 100 - (item.value / maxValue) * 100 : 100
            return (
              <g key={index}>
                <circle
                  cx={x}
                  cy={y}
                  r="6"
                  fill="white"
                  stroke="#3B82F6"
                  strokeWidth="3"
                />
                <circle
                  cx={x}
                  cy={y}
                  r="3"
                  fill="#3B82F6"
                />
                <text
                  x={x}
                  y={y - 8}
                  textAnchor="middle"
                  fill="#374151"
                  fontSize="3"
                  fontWeight="bold"
                >
                  ₱{item.value}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    )
  }

  if (type === 'pie') {
    const total = validData.reduce((sum, item) => sum + item.value, 0)
    
    // If total is 0 or invalid, return empty state
    if (total <= 0) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-sm text-surface-500">No data to display</p>
        </div>
      )
    }
    
    let currentAngle = 0

    return (
      <div className="flex items-center gap-6">
        <div className="relative" style={{ width: height, height }}>
          <svg className="w-full h-full" viewBox="0 0 42 42">
            <circle
              cx="21"
              cy="21"
              r="15.915"
              fill="transparent"
              stroke="#f3f4f6"
              strokeWidth="3"
            />
            
            {validData.map((item, index) => {
              const percentage = (item.value / total) * 100
              const strokeDasharray = `${percentage} ${100 - percentage}`
              const strokeDashoffset = 100 - currentAngle
              currentAngle += percentage
              
              return (
                <circle
                  key={index}
                  cx="21"
                  cy="21"
                  r="15.915"
                  fill="transparent"
                  stroke={item.color || colors[index % colors.length]}
                  strokeWidth="3"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  transform="rotate(-90 21 21)"
                />
              )
            })}
          </svg>
        </div>
        
        <div className="space-y-2">
          {validData.map((item, index) => (
            <div key={item.label} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color || colors[index % colors.length] }}
              />
              <span className="text-sm text-surface-700">{item.label}</span>
              {showValues && (
                <span className="text-sm text-surface-500">
                  ({((item.value / total) * 100).toFixed(1)}%)
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return null
}

export default SimpleChart
