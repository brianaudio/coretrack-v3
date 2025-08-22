'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, TrendingUp, DollarSign, ShoppingCart, BarChart3, MapPin, ChevronDown } from 'lucide-react';

const DataExplorerDebug = () => {
  const router = useRouter();
  const [selectedBranch, setSelectedBranch] = useState({ id: 'main', name: 'Main Branch', isMain: true });
  
  // Sample data to demonstrate the interface
  const sampleBranches = [
    { id: 'main', name: 'Main Branch', isMain: true },
    { id: 'downtown', name: 'Downtown Location', isMain: false },
    { id: 'mall', name: 'Mall Kiosk', isMain: false }
  ];

  const sampleAnalytics = {
    revenue: { current: 15420.50, previous: 12800.00, trend: 20.5 },
    orders: { current: 156, previous: 142, trend: 9.9 },
    profit: { current: 4626.15, previous: 3840.00, trend: 20.5 },
    avgOrder: { current: 98.85, previous: 90.14, trend: 9.7 }
  };

  const sampleSearchResults = {
    standardPOSOrders: 245,
    directOrders: 89,
    salesCollection: 156,
    archivedOrders: 78,
    totalFound: 568,
    totalRevenue: 45230.75
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => router.push('/dashboard?module=business-reports')}
                  className="bg-white/90 backdrop-blur-sm border border-gray-200/50 text-gray-700 hover:bg-white hover:shadow-lg p-3 rounded-2xl transition-all duration-300 hover:scale-105 shadow-sm"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-4xl font-light text-gray-900 tracking-tight">Data Explorer (Debug Mode)</h1>
                  <p className="text-gray-500 mt-2 font-light">Advanced business insights and comprehensive POS data search</p>
                </div>
              </div>
              
              <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg text-sm font-medium">
                🔧 Debug Mode - Sample Data
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Branch Selector */}
      <div className="bg-white/60 backdrop-blur-sm border-b border-gray-100/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Analyzing Data For:</span>
            </div>
            
            <div className="relative">
              <select
                value={selectedBranch?.id || ''}
                onChange={(e) => {
                  const branch = sampleBranches.find(b => b.id === e.target.value);
                  if (branch) setSelectedBranch(branch);
                }}
                className="appearance-none bg-white/90 backdrop-blur-sm border border-gray-200/50 text-gray-700 py-2 pl-4 pr-10 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
              >
                {sampleBranches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name} {branch.isMain ? '(Main)' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          
          {/* Branch Info */}
          {selectedBranch && (
            <div className="mt-3 text-sm text-gray-600">
              <span className="font-medium">Current Branch:</span> {selectedBranch.name}
              {selectedBranch.isMain && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Main Branch</span>}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        
        {/* Debug Information Panel */}
        <div className="mb-8 bg-green-50/50 border border-green-200/50 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center gap-2">
            ✅ COMPREHENSIVE POS DATA SEARCH COMPLETE (SAMPLE DATA)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="bg-white/60 rounded-xl p-4">
              <p className="font-medium text-gray-700">Search Status</p>
              <p className="text-green-600 font-bold text-xs">8 METHODS EXECUTED</p>
              <p className="text-gray-600 text-xs">All collection paths searched</p>
            </div>
            <div className="bg-white/60 rounded-xl p-4">
              <p className="font-medium text-gray-700">Total Orders Found</p>
              <p className="text-blue-600 font-bold text-lg">{sampleSearchResults.totalFound}</p>
              <p className="text-gray-600 text-xs">Across all collections</p>
            </div>
            <div className="bg-white/60 rounded-xl p-4">
              <p className="font-medium text-gray-700">Total Revenue</p>
              <p className="text-green-600 font-bold text-lg">${sampleSearchResults.totalRevenue.toLocaleString()}</p>
              <p className="text-gray-600 text-xs">From found transactions</p>
            </div>
            <div className="bg-white/60 rounded-xl p-4">
              <p className="font-medium text-gray-700">Data Sources</p>
              <div className="space-y-1">
                <p className="text-xs text-blue-600">✅ Standard: {sampleSearchResults.standardPOSOrders}</p>
                <p className="text-xs text-purple-600">✅ Direct: {sampleSearchResults.directOrders}</p>
                <p className="text-xs text-orange-600">✅ Archived: {sampleSearchResults.archivedOrders}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Revenue Card */}
          <div className="bg-white/60 backdrop-blur-sm rounded-3xl border border-gray-100/50 p-6 shadow-sm hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div className="flex items-center gap-1 text-green-600">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">+{sampleAnalytics.revenue.trend.toFixed(1)}%</span>
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">${sampleAnalytics.revenue.current.toFixed(2)}</p>
              <p className="text-sm text-gray-500">Revenue (vs ${sampleAnalytics.revenue.previous.toFixed(2)})</p>
            </div>
          </div>

          {/* Orders Card */}
          <div className="bg-white/60 backdrop-blur-sm rounded-3xl border border-gray-100/50 p-6 shadow-sm hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
              <div className="flex items-center gap-1 text-green-600">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">+{sampleAnalytics.orders.trend.toFixed(1)}%</span>
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{sampleAnalytics.orders.current}</p>
              <p className="text-sm text-gray-500">Orders (vs {sampleAnalytics.orders.previous})</p>
            </div>
          </div>

          {/* Profit Card */}
          <div className="bg-white/60 backdrop-blur-sm rounded-3xl border border-gray-100/50 p-6 shadow-sm hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div className="flex items-center gap-1 text-green-600">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">+{sampleAnalytics.profit.trend.toFixed(1)}%</span>
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">${sampleAnalytics.profit.current.toFixed(2)}</p>
              <p className="text-sm text-gray-500">Profit (vs ${sampleAnalytics.profit.previous.toFixed(2)})</p>
            </div>
          </div>

          {/* Average Order Card */}
          <div className="bg-white/60 backdrop-blur-sm rounded-3xl border border-gray-100/50 p-6 shadow-sm hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div className="flex items-center gap-1 text-green-600">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">+{sampleAnalytics.avgOrder.trend.toFixed(1)}%</span>
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">${sampleAnalytics.avgOrder.current.toFixed(2)}</p>
              <p className="text-sm text-gray-500">Avg Order (vs ${sampleAnalytics.avgOrder.previous.toFixed(2)})</p>
            </div>
          </div>
        </div>

        {/* Success Message */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-3xl p-8 mb-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">🎉 Data Explorer Interface Working!</h2>
            <p className="text-lg opacity-90 mb-4">
              This debug version shows the Data Explorer interface with sample data while we fix the authentication and context issues.
            </p>
            <div className="bg-white/20 rounded-2xl p-4 mb-4">
              <p className="font-semibold mb-2">✅ Interface Features Working:</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <p>📊 Analytics Cards</p>
                <p>🏢 Branch Selector</p>
                <p>🔍 Search Status</p>
                <p>💰 Revenue Display</p>
                <p>📈 Trend Indicators</p>
                <p>🔄 Navigation</p>
                <p>📱 Responsive Design</p>
                <p>🎨 Glass Morphism UI</p>
              </div>
            </div>
            <p className="opacity-80">
              <strong>Next Step:</strong> Fix the authentication and BranchContext issues so this can display real data instead of sample data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataExplorerDebug;
