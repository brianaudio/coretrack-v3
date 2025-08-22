'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, TrendingUp, AlertTriangle, Package, DollarSign, ShoppingCart, BarChart3, MapPin } from 'lucide-react';

// 🚀 Import the safe unified data service
import { unifiedDataService, type UnifiedBusinessRecord, type UnifiedDataStats } from '../../../../lib/firebase/unifiedDataService';

const DataExplorerPageClean = () => {
  const router = useRouter();

  // State for unified data
  const [dataLoading, setDataLoading] = useState(true);
  const [unifiedData, setUnifiedData] = useState<UnifiedBusinessRecord[]>([]);
  const [unifiedStats, setUnifiedStats] = useState<UnifiedDataStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      console.log('🚀 Data Explorer Clean: Starting data load...');
      
      try {
        setDataLoading(true);
        setError(null);

        // Use development values to bypass auth issues
        const DEV_TENANT_ID = 'dev-tenant-123';
        const DEV_LOCATION_ID = 'main';

        console.log('🔍 Fetching unified data:', { 
          tenantId: DEV_TENANT_ID, 
          locationId: DEV_LOCATION_ID 
        });

        // Fetch unified data
        const [businessData, businessStats] = await Promise.all([
          unifiedDataService.getAllBusinessData(DEV_TENANT_ID, DEV_LOCATION_ID),
          unifiedDataService.getUnifiedStats(DEV_TENANT_ID, DEV_LOCATION_ID)
        ]);

        console.log('✅ Unified service results:', {
          records: businessData.length,
          stats: businessStats
        });

        setUnifiedData(businessData);
        setUnifiedStats(businessStats);

        if (businessData.length === 0) {
          setError(`No data found in any collection for tenant: ${DEV_TENANT_ID}`);
        }

      } catch (error) {
        console.error('❌ Data loading failed:', error);
        setError(`Failed to load data: ${(error as Error).message}`);
      } finally {
        setDataLoading(false);
      }
    };

    loadData();
  }, []);

  // Loading state
  if (dataLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">🔍 Searching all data sources...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Data Loading Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard?module=business-reports')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Reports</span>
            </button>
            <div className="h-6 w-px bg-gray-300"></div>
            <h1 className="text-2xl font-bold text-gray-900">Data Explorer</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Statistics Cards */}
        {unifiedStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Records */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Records</p>
                  <p className="text-2xl font-bold text-gray-900">{unifiedStats.totalRecords.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Revenue */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">₱{unifiedStats.transactions.totalRevenue.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">{unifiedStats.transactions.count} transactions</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            {/* Expenses */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                  <p className="text-2xl font-bold text-gray-900">₱{unifiedStats.expenses.totalAmount.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">{unifiedStats.expenses.count} expenses</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>

            {/* Inventory */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Inventory Value</p>
                  <p className="text-2xl font-bold text-gray-900">₱{unifiedStats.inventory.totalValue.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">{unifiedStats.inventory.count} items</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Package className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Data Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">All Business Records</h2>
            <p className="text-sm text-gray-600">
              Showing {unifiedData.length} records from all data sources
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {unifiedData.slice(0, 50).map((record, index) => (
                  <tr key={record.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.timestamp.toLocaleDateString()} {record.timestamp.toLocaleTimeString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        record.type === 'transaction' ? 'bg-green-100 text-green-800' :
                        record.type === 'expense' ? 'bg-red-100 text-red-800' :
                        record.type === 'inventory' ? 'bg-blue-100 text-blue-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {record.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {record.source}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {record.type === 'transaction' && record.items && record.items.length > 0 
                        ? `Order: ${record.items.map((item: any) => item.name).join(', ')}`
                        : record.type === 'expense' 
                        ? `${record.expenseCategory}: ${record.vendor || 'N/A'}`
                        : record.type === 'inventory'
                        ? `${record.itemName}: ${record.currentStock} units`
                        : record.menuItemName || 'Menu item'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {record.type === 'transaction' 
                        ? `₱${(record.revenue || 0).toLocaleString()}`
                        : record.type === 'expense'
                        ? `-₱${(record.expenseAmount || 0).toLocaleString()}`
                        : record.type === 'inventory'
                        ? `₱${(record.totalValue || 0).toLocaleString()}`
                        : `₱${(record.menuItemPrice || 0).toLocaleString()}`
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {unifiedData.length > 50 && (
            <div className="px-6 py-4 border-t border-gray-200 text-sm text-gray-600">
              Showing first 50 records of {unifiedData.length} total records
            </div>
          )}

          {unifiedData.length === 0 && (
            <div className="px-6 py-12 text-center">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Found</h3>
              <p className="text-gray-600">
                No business records were found in any of the data sources.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataExplorerPageClean;
