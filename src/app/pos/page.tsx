'use client'

import React, { useState } from 'react'

export default function POSPage() {
  const [showEndShift, setShowEndShift] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header with End Shift Button */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left - Logo & Title */}
            <div className="flex items-center gap-4">
              <div className="text-2xl font-bold text-blue-600">CoreTrack</div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Point of Sale</h1>
                <p className="text-sm text-gray-500">Main Branch • Ready to Take Orders</p>
              </div>
            </div>

            {/* Right - End Shift Button */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowEndShift(true)}
                className="px-8 py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition-colors shadow-lg text-lg"
              >
                END SHIFT
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">POS System Ready</h2>
          <p className="text-gray-600 mb-8">Click the red "END SHIFT" button above to see the shift report</p>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <p className="text-lg text-gray-700">Menu items would appear here</p>
          </div>
        </div>
      </div>

      {/* End Shift Modal */}
      {showEndShift && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-5/6 flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">🔚</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">End Shift Report</h2>
                  <p className="text-gray-500">Review your shift performance</p>
                </div>
              </div>
              <button
                onClick={() => setShowEndShift(false)}
                className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors text-xl"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 💰 FINANCIAL SUMMARY */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
                  <h3 className="text-lg font-bold text-green-800 mb-4 flex items-center gap-2">
                    💰 FINANCIAL SUMMARY
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-green-700">Total Sales:</span>
                      <span className="text-xl font-bold text-green-800">₱15,420</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-green-700">Orders Count:</span>
                      <span className="font-semibold text-green-800">42</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-green-700">Avg Order Value:</span>
                      <span className="font-semibold text-green-800">₱367</span>
                    </div>
                  </div>
                </div>

                {/* 📈 SALES PERFORMANCE */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
                  <h3 className="text-lg font-bold text-blue-800 mb-4 flex items-center gap-2">
                    📈 SALES PERFORMANCE
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-blue-700">Peak Hour:</span>
                      <span className="font-semibold text-blue-800">12:00 PM</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-700">Growth vs Yesterday:</span>
                      <span className="font-semibold text-green-600">+12%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-700">Target Achievement:</span>
                      <span className="font-semibold text-blue-800">85%</span>
                    </div>
                  </div>
                </div>

                {/* 🍽️ INVENTORY & PRODUCT PERFORMANCE */}
                <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-6 rounded-xl border border-purple-200">
                  <h3 className="text-lg font-bold text-purple-800 mb-4 flex items-center gap-2">
                    🍽️ INVENTORY & PRODUCT PERFORMANCE
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-purple-700">Classic Burger:</span>
                      <span className="font-semibold text-purple-800">12 sold</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-purple-700">Iced Coffee:</span>
                      <span className="font-semibold text-purple-800">18 sold</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-purple-700">French Fries:</span>
                      <span className="font-semibold text-purple-800">15 sold</span>
                    </div>
                    <div className="mt-3 pt-2 border-t border-purple-200">
                      <div className="flex justify-between items-center">
                        <span className="text-purple-700">Low Stock Items:</span>
                        <span className="font-semibold text-orange-600">3 items</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 💸 EXPENSE TRACKING */}
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-6 rounded-xl border border-orange-200">
                  <h3 className="text-lg font-bold text-orange-800 mb-4 flex items-center gap-2">
                    💸 EXPENSE TRACKING
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-orange-700">Operating Expenses:</span>
                      <span className="font-semibold text-orange-800">₱2,450</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-orange-700">Net Profit:</span>
                      <span className="font-semibold text-green-600">₱12,970</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-orange-700">Profit Margin:</span>
                      <span className="font-semibold text-orange-800">84%</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* 📋 ACTION ITEMS FOR NEXT SHIFT */}
              <div className="mt-6 bg-gradient-to-br from-gray-50 to-slate-50 p-6 rounded-xl border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  📋 ACTION ITEMS FOR NEXT SHIFT
                </h3>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-gray-700">Restock 3 low inventory items</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-gray-700">Review pricing for underperforming items</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-gray-700">Continue promoting combo deals - performing well</span>
                  </li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex gap-4">
                <button
                  onClick={() => {
                    alert('PDF report generated!')
                    setShowEndShift(false)
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  📄 Generate PDF Report
                </button>
                <button
                  onClick={() => setShowEndShift(false)}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
