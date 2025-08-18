'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/context/AuthContext';

interface BusinessMetrics {
  totalSales: number;
  totalOrders: number;
  inventoryItems: number;
  lowStockItems: number;
  topSellingItem: string;
  dailyAverage: number;
  growthRate: number;
  efficiency: number;
}

interface ValueDemonstrationProps {
  className?: string;
}

const ValueDemonstrationCard: React.FC<ValueDemonstrationProps> = ({ className = '' }) => {
  const { profile } = useAuth();
  const [metrics, setMetrics] = useState<BusinessMetrics>({
    totalSales: 0,
    totalOrders: 0,
    inventoryItems: 0,
    lowStockItems: 0,
    topSellingItem: '',
    dailyAverage: 0,
    growthRate: 0,
    efficiency: 0
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading real business metrics
    // In production, this would fetch actual data from Firebase
    const loadMetrics = async () => {
      setIsLoading(true);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data that shows business value
      setMetrics({
        totalSales: 125750,
        totalOrders: 342,
        inventoryItems: 89,
        lowStockItems: 5,
        topSellingItem: 'Iced Coffee',
        dailyAverage: 4525,
        growthRate: 23,
        efficiency: 87
      });
      
      setIsLoading(false);
    };

    loadMetrics();
  }, []);

  if (isLoading) {
    return (
      <div className={`bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-sm border border-blue-100 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-blue-200 rounded w-3/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-blue-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const valuePropositions = [
    {
      icon: '📈',
      title: 'Sales Growth',
      value: `+${metrics.growthRate}%`,
      subtitle: 'vs last month',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      description: 'Your business is growing fast with CoreTrack!'
    },
    {
      icon: '💰',
      title: 'Total Revenue',
      value: `₱${metrics.totalSales.toLocaleString()}`,
      subtitle: 'managed this month',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      description: 'Track every peso with precision'
    },
    {
      icon: '📦',
      title: 'Inventory Items',
      value: metrics.inventoryItems.toString(),
      subtitle: `${metrics.lowStockItems} need reordering`,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      description: 'Never run out of stock again'
    },
    {
      icon: '⚡',
      title: 'Efficiency Score',
      value: `${metrics.efficiency}%`,
      subtitle: 'operational efficiency',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      description: 'Streamlined operations save time & money'
    }
  ];

  return (
    <div className={`bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-sm border border-blue-100 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center">
            <span className="text-2xl mr-2">✨</span>
            Your Business Impact
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            See how CoreTrack is transforming your operations
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">Daily Average</div>
          <div className="text-xl font-bold text-blue-600">
            ₱{metrics.dailyAverage.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Value Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {valuePropositions.map((item, index) => (
          <div key={index} className={`${item.bgColor} rounded-xl p-4 border border-opacity-20`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-lg">{item.icon}</span>
                  <h4 className="text-sm font-semibold text-gray-800">{item.title}</h4>
                </div>
                <div className={`text-xl font-bold ${item.color} mb-1`}>{item.value}</div>
                <div className="text-xs text-gray-600">{item.subtitle}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Success Story */}
      <div className="bg-white rounded-xl p-4 border border-blue-200">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <span className="text-green-600 text-lg">🎯</span>
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 mb-1">Business Intelligence Unlocked</h4>
            <p className="text-sm text-gray-700 mb-2">
              Your top-selling item is <strong>{metrics.topSellingItem}</strong> with {metrics.totalOrders} total orders this month. 
              Keep this data forever by upgrading to a paid plan.
            </p>
            <div className="flex items-center space-x-4 text-xs text-gray-600">
              <span className="flex items-center">
                <svg className="w-4 h-4 text-green-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Real-time insights
              </span>
              <span className="flex items-center">
                <svg className="w-4 h-4 text-green-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Automated tracking
              </span>
              <span className="flex items-center">
                <svg className="w-4 h-4 text-green-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Business growth
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="mt-6 p-4 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl text-white">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h4 className="font-semibold mb-1">Don't Lose This Progress!</h4>
            <p className="text-sm text-blue-100">
              Your business data and insights will be lost when your trial expires. 
              Upgrade now to keep growing.
            </p>
          </div>
          <div className="ml-4">
            <button
              onClick={() => window.location.href = '/subscription'}
              className="bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-blue-50 transition-colors duration-200 whitespace-nowrap shadow-sm"
            >
              Save My Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ValueDemonstrationCard;
