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
  const maxValue = Math.max(...data.map(item => item.value))
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']

  if (type === 'bar') {
    return (
      <div className="space-y-4">
        {data.map((item, index) => (
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
                  width: `${(item.value / maxValue) * 100}%`,
                  backgroundColor: item.color || colors[index % colors.length]
                }}
              />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (type === 'line') {
    const stepX = 100 / (data.length - 1)
    
    return (
      <div className="relative" style={{ height }}>
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Grid lines */}
          {[0, 20, 40, 60, 80, 100].map(y => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="100"
              y2={y}
              stroke="#f3f4f6"
              strokeWidth="0.3"
            />
          ))}
          
          {/* Gradient area under the line */}
          <defs>
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#3B82F6', stopOpacity: 0.2 }} />
              <stop offset="100%" style={{ stopColor: '#3B82F6', stopOpacity: 0.05 }} />
            </linearGradient>
          </defs>
          
          <polygon
            fill="url(#areaGradient)"
            points={`0,100 ${data
              .map((item, index) => `${index * stepX},${100 - (item.value / maxValue) * 100}`)
              .join(' ')} 100,100`}
          />
          
          {/* Line */}
          <polyline
            fill="none"
            stroke="#3B82F6"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={data
              .map((item, index) => `${index * stepX},${100 - (item.value / maxValue) * 100}`)
              .join(' ')}
          />
          
          {/* Data points */}
          {data.map((item, index) => (
            <g key={index}>
              <circle
                cx={index * stepX}
                cy={100 - (item.value / maxValue) * 100}
                r="4"
                fill="white"
                stroke="#3B82F6"
                strokeWidth="2"
              />
              <circle
                cx={index * stepX}
                cy={100 - (item.value / maxValue) * 100}
                r="2"
                fill="#3B82F6"
              />
            </g>
          ))}
        </svg>
        
        {/* Labels */}
        <div className="flex justify-between mt-4 px-2">
          {data.map((item, index) => (
            <div key={index} className="text-center">
              <span className="text-xs text-surface-500 font-medium">
                {item.label}
              </span>
              {showValues && (
                <div className="text-xs text-surface-600 mt-1">
                  {typeof item.value === 'number' && item.value > 1000 
                    ? `₱${(item.value / 1000).toFixed(1)}k` 
                    : item.value
                  }
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (type === 'pie') {
    const total = data.reduce((sum, item) => sum + item.value, 0)
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
            
            {data.map((item, index) => {
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
          {data.map((item, index) => (
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
