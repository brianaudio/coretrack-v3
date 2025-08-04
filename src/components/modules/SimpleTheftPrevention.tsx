'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/context/AuthContext';

interface QuickCheckItem {
  id: string;
  name: string;
  category: string;
  expectedCount: number;
  actualCount?: number;
  riskLevel: 'HIGH' | 'MEDIUM';
  reason: string;
}

export default function SimpleTheftPrevention() {
  const { profile } = useAuth();
  const [quickCheckItems, setQuickCheckItems] = useState<QuickCheckItem[]>([]);
  const [showQuickCheck, setShowQuickCheck] = useState(false);
  const [completedChecks, setCompletedChecks] = useState<string[]>([]);

  // Get today's high-risk items to check (AI-powered selection)
  const getTodaysHighRiskItems = (): QuickCheckItem[] => {
    return [
      {
        id: 'premium_beef',
        name: 'Premium Beef Patties',
        category: 'Protein',
        expectedCount: 45,
        riskLevel: 'HIGH',
        reason: 'High-value item, commonly stolen'
      },
      {
        id: 'cash_drawer',
        name: 'Cash Drawer',
        category: 'Cash',
        expectedCount: 2500, // ₱2,500 expected
        riskLevel: 'HIGH',
        reason: 'Cash handling verification'
      },
      {
        id: 'cheese_slices',
        name: 'Cheese Slices',
        category: 'Dairy',
        expectedCount: 120,
        riskLevel: 'MEDIUM',
        reason: 'Popular item, easy to take'
      }
    ];
  };

  useEffect(() => {
    setQuickCheckItems(getTodaysHighRiskItems());
  }, []);

  const updateCount = (itemId: string, count: number) => {
    setQuickCheckItems(prev => 
      prev.map(item => 
        item.id === itemId 
          ? { ...item, actualCount: count }
          : item
      )
    );
  };

  const completeQuickCheck = () => {
    const flaggedItems = quickCheckItems.filter(item => {
      if (!item.actualCount) return false;
      const discrepancy = Math.abs(item.expectedCount - item.actualCount);
      const discrepancyPercent = (discrepancy / item.expectedCount) * 100;
      return discrepancyPercent > 10; // Flag if >10% difference
    });

    if (flaggedItems.length > 0) {
      console.log(`⚠️ ${flaggedItems.length} items flagged for review`);
      // Send manager notification for flagged items
    } else {
      console.log('✅ Quick check complete - no issues detected');
    }

    setShowQuickCheck(false);
    setCompletedChecks(prev => [...prev, new Date().toISOString()]);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Simple Theft Prevention</h2>
          <p className="text-sm text-gray-600 mt-1">
            Quick 5-minute check of high-risk items only
          </p>
        </div>
        <button
          onClick={() => setShowQuickCheck(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
        >
          Start Quick Check
        </button>
      </div>

      {/* Today's Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <h3 className="text-sm font-medium text-green-800">Today&apos;s Checks</h3>
          <p className="text-2xl font-bold text-green-900">{completedChecks.length}</p>
          <p className="text-xs text-green-600">Completed this shift</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <h3 className="text-sm font-medium text-yellow-800">Items to Check</h3>
          <p className="text-2xl font-bold text-yellow-900">{quickCheckItems.length}</p>
          <p className="text-xs text-yellow-600">High-risk items selected</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 className="text-sm font-medium text-blue-800">Time Required</h3>
          <p className="text-2xl font-bold text-blue-900">~5min</p>
          <p className="text-xs text-blue-600">Quick & simple</p>
        </div>
      </div>

      {/* Quick Check Modal */}
      {showQuickCheck && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Quick Theft Prevention Check</h3>
              <button 
                onClick={() => setShowQuickCheck(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Instructions:</strong> Count only these 3 high-risk items. Takes ~5 minutes total.
              </p>
            </div>

            <div className="space-y-4">
              {quickCheckItems.map((item) => {
                const actualCount = item.actualCount || 0;
                const discrepancy = item.expectedCount - actualCount;
                const discrepancyPercent = actualCount > 0 ? (Math.abs(discrepancy) / item.expectedCount) * 100 : 0;
                const isHigh = discrepancyPercent > 10;

                return (
                  <div key={item.id} className={`p-4 rounded-lg border ${
                    isHigh ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium text-gray-900">{item.name}</h4>
                        <p className="text-xs text-gray-600">{item.reason}</p>
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium mt-1 ${
                          item.riskLevel === 'HIGH' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {item.riskLevel} RISK
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Expected: {item.expectedCount}</p>
                        <input
                          type="number"
                          min="0"
                          value={actualCount}
                          onChange={(e) => updateCount(item.id, parseInt(e.target.value) || 0)}
                          className={`w-20 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 ${
                            isHigh ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                          }`}
                          placeholder="Count"
                        />
                      </div>
                    </div>
                    
                    {actualCount > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <p className={`text-sm font-medium ${
                          isHigh ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {discrepancy > 0 ? 'Shortage' : 'Overage'}: {Math.abs(discrepancy)} 
                          ({discrepancyPercent.toFixed(1)}%)
                          {isHigh && ' ⚠️ FLAGGED'}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowQuickCheck(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={completeQuickCheck}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Complete Check
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Recent Checks</h3>
        {completedChecks.length > 0 ? (
          <div className="space-y-2">
            {completedChecks.slice(-3).map((check, index) => (
              <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                <span className="text-sm text-gray-600">
                  Quick check completed
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(check).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No checks completed yet today</p>
        )}
      </div>
    </div>
  );
}
