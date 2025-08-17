'use client';

import React, { useState } from 'react';
import { useShift } from '../../lib/context/ShiftContext';
import { useAuth } from '../../lib/context/AuthContext';

interface QuickCheckItem {
  id: string;
  name: string;
  expectedCount: number;
  actualCount?: number;
  costPerUnit: number;
}

export default function UnifiedShiftStatusBar() {
  const { profile } = useAuth();
  const { 
    currentShift, 
    isShiftActive, 
    loading,
    endCurrentShift 
  } = useShift();
  
  const [showQuickCheck, setShowQuickCheck] = useState(false);
  const [quickCheckItems, setQuickCheckItems] = useState<QuickCheckItem[]>([]);
  const [isEndingShift, setIsEndingShift] = useState(false);

  // Only show for staff members
  if (profile?.role !== 'staff' || loading) {
    return null;
  }

  // Get today's high-risk items for quick check
  const getTodaysQuickCheckItems = (): QuickCheckItem[] => {
    const baseItems = [
      { id: 'cash_drawer', name: '💰 Cash Drawer', expectedCount: 2500, costPerUnit: 1 },
      { id: 'premium_beef', name: '🥩 Premium Beef Patties', expectedCount: 45, costPerUnit: 85 },
      { id: 'cheese_slices', name: '🧀 Cheese Slices', expectedCount: 120, costPerUnit: 15 }
    ];

    return baseItems.slice(0, 3);
  };

  const startQuickCheck = () => {
    setQuickCheckItems(getTodaysQuickCheckItems());
    setShowQuickCheck(true);
  };

  const completeQuickCheck = () => {
    const flaggedItems = quickCheckItems.filter(item => {
      if (!item.actualCount) return false;
      const discrepancy = Math.abs(item.expectedCount - item.actualCount);
      const discrepancyPercent = (discrepancy / item.expectedCount) * 100;
      return discrepancyPercent > 10;
    });

    if (flaggedItems.length > 0) {
      alert(`⚠️ ${flaggedItems.length} items flagged for manager review`);
    } else {
      alert('✅ Quick check complete - no issues detected');
    }

    setShowQuickCheck(false);
  };

  const updateItemCount = (itemId: string, count: number) => {
    setQuickCheckItems(prev => 
      prev.map(item => 
        item.id === itemId ? { ...item, actualCount: count } : item
      )
    );
  };

  const handleEndShift = async () => {
    // Check if theft prevention check is needed
    const shouldPromptQuickCheck = await checkIfQuickCheckNeeded();
    
    if (shouldPromptQuickCheck) {
      const proceed = window.confirm(
        '🔍 Quick 5-minute theft prevention check recommended before ending shift. Continue?'
      );
      if (!proceed) {
        return;
      }
    }

    try {
      setIsEndingShift(true);
      await endCurrentShift('Shift ended by staff member');
      console.log('✅ Shift ended successfully using ShiftContext');
      
      // NUCLEAR SOLUTION: Force immediate page refresh to guarantee data reset
      console.log('🚀 NUCLEAR SOLUTION: Forcing page refresh to reset all data...');
      alert('✅ Shift ended successfully! Page will refresh in 1 second to reset all financial data.');
      
      // Force immediate page refresh - the nuclear option!
      setTimeout(() => {
        console.log('💥 NUCLEAR PAGE REFRESH - Your 24-hour frustration ends NOW!');
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('❌ Error ending shift:', error);
      alert('Failed to end shift. Please try again.');
    } finally {
      setIsEndingShift(false);
    }
  };

  // Check if theft prevention check is needed
  const checkIfQuickCheckNeeded = async (): Promise<boolean> => {
    if (!currentShift) return false;
    
    const now = new Date();
    const shiftStart = currentShift.startTime.toDate();
    const shiftDuration = now.getTime() - shiftStart.getTime();
    const hoursWorked = shiftDuration / (1000 * 60 * 60);
    
    // Recommend check for shifts longer than 4 hours
    return hoursWorked > 4;
  };

  // Show active shift status
  if (isShiftActive && currentShift) {
    const startTime = currentShift.startTime.toDate();
    const duration = Math.floor((Date.now() - startTime.getTime()) / (1000 * 60)); // minutes

    return (
      <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 shadow-sm">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-200 rounded-full animate-pulse"></div>
              <span className="font-medium">Shift Active</span>
            </div>
            <div className="text-green-100">
              Started: {startTime.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
            <div className="text-green-100">
              Duration: {Math.floor(duration / 60)}h {duration % 60}m
            </div>
            <div className="text-green-100 text-sm">
              {currentShift.name}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={startQuickCheck}
              disabled={isEndingShift}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-1 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <span>Quick Check</span>
            </button>
            <button
              onClick={handleEndShift}
              disabled={isEndingShift}
              className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 flex items-center space-x-1"
            >
              {isEndingShift ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Ending...</span>
                </>
              ) : (
                <span>End Shift</span>
              )}
            </button>
          </div>
        </div>

        {/* Quick Check Modal */}
        {showQuickCheck && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">⚡ 5-Minute Theft Prevention Check</h3>
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
                <p className="text-sm text-blue-800 font-medium">
                  🎯 <strong>Quick & Smart:</strong> Count only these 3 high-risk items. Takes ~5 minutes total.
                </p>
              </div>

              <div className="space-y-4">
                {quickCheckItems.map((item) => {
                  const actualCount = item.actualCount || 0;
                  const discrepancy = item.expectedCount - actualCount;
                  const discrepancyPercent = actualCount > 0 ? (Math.abs(discrepancy) / item.expectedCount) * 100 : 0;
                  const isHighRisk = discrepancyPercent > 10;
                  const lossAmount = Math.abs(discrepancy) * item.costPerUnit;

                  return (
                    <div key={item.id} className={`p-4 rounded-lg border ${
                      isHighRisk ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium text-gray-900">{item.name}</h4>
                          <p className="text-xs text-gray-600">Expected: {item.expectedCount} units</p>
                        </div>
                        <div className="text-right">
                          <label className="block text-xs text-gray-600 mb-1">Actual Count</label>
                          <input
                            type="number"
                            min="0"
                            value={actualCount}
                            onChange={(e) => updateItemCount(item.id, parseInt(e.target.value) || 0)}
                            className={`w-20 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 ${
                              isHighRisk ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                            }`}
                            placeholder="Count"
                          />
                        </div>
                      </div>
                      
                      {actualCount > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className={`text-sm font-medium ${isHighRisk ? 'text-red-600' : 'text-green-600'}`}>
                            {discrepancy > 0 ? 'Shortage' : 'Overage'}: {Math.abs(discrepancy)} units
                            ({discrepancyPercent.toFixed(1)}%)
                            {lossAmount > 0 && ` - ₱${lossAmount.toFixed(0)} impact`}
                            {isHighRisk && ' 🚨 FLAGGED'}
                          </div>
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
      </div>
    );
  }

  // No active shift
  return null;
}
