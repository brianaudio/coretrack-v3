'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, TrendingUp, AlertTriangle, Package, DollarSign, ShoppingCart, BarChart3, MapPin } from 'lucide-react';

// Import the safe unified data service
import { unifiedDataService, type UnifiedBusinessRecord, type UnifiedDataStats } from '../../../lib/firebase/unifiedDataService';
// Import auth context to get real tenant ID
import { useAuth } from '../../../lib/context/AuthContext';
// Import branch context to get selected branch
import { useBranch } from '../../../lib/context/BranchContext';

const DataExplorerPage = () => {
  const router = useRouter();
  
  // Get real authentication context
  const { profile, loading: authLoading } = useAuth();
  
  // Get selected branch context - BRANCH-SPECIFIC DATA ONLY
  const { selectedBranch, loading: branchLoading } = useBranch();

  // State for unified data
  const [dataLoading, setDataLoading] = useState(true);
  const [unifiedData, setUnifiedData] = useState<UnifiedBusinessRecord[]>([]);
  const [unifiedStats, setUnifiedStats] = useState<UnifiedDataStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load data on component mount - BRANCH-SPECIFIC ONLY
  useEffect(() => {
    const loadData = async () => {
      console.log('🚀 Data Explorer: Starting BRANCH-SPECIFIC data load...');
      
      // Wait for auth and branch to load
      if (authLoading || branchLoading) {
        console.log('⏳ Waiting for authentication and branch selection...');
        return;
      }

      if (!profile?.tenantId) {
        console.log('❌ No tenant ID found in profile:', profile);
        setError('No tenant found. Please make sure you are logged in.');
        setDataLoading(false);
        return;
      }

      if (!selectedBranch?.id) {
        console.log('❌ No branch selected:', selectedBranch);
        setError('No branch selected. Please select a branch from the dashboard first.');
        setDataLoading(false);
        return;
      }
      
      try {
        setDataLoading(true);
        setError(null);

        // Use real tenant ID and ONLY the selected branch ID
        const REAL_TENANT_ID = profile.tenantId;
        const SELECTED_BRANCH_ID = selectedBranch.id;
        
        console.log('🔍 Fetching BRANCH-SPECIFIC data ONLY:', { 
          tenantId: REAL_TENANT_ID, 
          branchId: SELECTED_BRANCH_ID,
          branchName: selectedBranch.name,
          isolatedData: true 
        });

        // Fetch data ONLY for the selected branch - NO cross-branch mixing
        const [businessData, businessStats] = await Promise.all([
          unifiedDataService.getAllBusinessData(REAL_TENANT_ID, SELECTED_BRANCH_ID),
          unifiedDataService.getUnifiedStats(REAL_TENANT_ID, SELECTED_BRANCH_ID)
        ]);

        console.log('✅ BRANCH-SPECIFIC data results:', {
          records: businessData.length,
          stats: businessStats,
          tenantId: REAL_TENANT_ID,
          branchId: SELECTED_BRANCH_ID,
          branchName: selectedBranch.name,
          isolatedData: true
        });

        setUnifiedData(businessData);
        setUnifiedStats(businessStats);

        if (businessData.length === 0) {
          setError(`No data found for branch "${selectedBranch.name}" (${SELECTED_BRANCH_ID}). This branch has no business activity yet.`);
        }

      } catch (error) {
        console.error('❌ Data loading failed:', error);
        setError(`Failed to load data: ${(error as Error).message}`);
      } finally {
        setDataLoading(false);
      }
    };

    loadData();
  }, [profile, authLoading, selectedBranch, branchLoading]);

  // Loading state
  if (authLoading || branchLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {authLoading ? '🔐 Authenticating...' : 
             branchLoading ? '🏪 Loading branches...' : 
             '🔍 Loading branch data...'}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            {authLoading ? 'Getting your tenant info' : 
             branchLoading ? 'Finding your branches' :
             'Branch-Specific Data Service'}
          </p>
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
          <p className="text-gray-600 mb-4 max-w-md">{error}</p>
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
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Data Explorer</h1>
              <p className="text-sm text-gray-600">
                Branch: {selectedBranch?.name || 'No branch selected'} 
                {selectedBranch?.id && <span className="text-gray-400"> ({selectedBranch.id})</span>}
              </p>
            </div>
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              Branch-Specific Data Only
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Branch Isolation Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <MapPin className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                🏪 Branch Isolation Active
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>Data shown is ONLY for "{selectedBranch?.name}" branch. No cross-branch data mixing.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        {unifiedStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Records */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Records</p>
                  <p className="text-2xl font-bold text-gray-900">{unifiedStats.totalRecords.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">This branch only</p>
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
                  <p className="text-sm font-medium text-gray-600">Branch Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">₱{unifiedStats.transactions.totalRevenue.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{unifiedStats.transactions.count} transactions</p>
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
                  <p className="text-sm font-medium text-gray-600">Branch Expenses</p>
                  <p className="text-2xl font-bold text-gray-900">₱{unifiedStats.expenses.totalAmount.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{unifiedStats.expenses.count} expenses</p>
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
                  <p className="text-sm font-medium text-gray-600">Branch Inventory</p>
                  <p className="text-2xl font-bold text-gray-900">₱{unifiedStats.inventory.totalValue.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{unifiedStats.inventory.count} items</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Package className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {unifiedData.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  🎉 Success! Branch-specific data loaded!
                </h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>Found {unifiedData.length} business records for "{selectedBranch?.name}" branch only!</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Data Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Branch Business Records</h2>
            <p className="text-sm text-gray-600">
              Showing {unifiedData.length} records from "{selectedBranch?.name}" branch only - no cross-branch data
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
              Showing first 50 records of {unifiedData.length} total records for this branch
            </div>
          )}

          {unifiedData.length === 0 && (
            <div className="px-6 py-12 text-center">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Found for This Branch</h3>
              <p className="text-gray-600">
                No business records were found for "{selectedBranch?.name}" branch.
              </p>
              <div className="mt-4 text-xs text-gray-500">
                <p>Searched collections: orders, expenses, inventory, menu items</p>
                <p>Tenant ID: {profile?.tenantId || 'Unknown'}</p>
                <p>Branch ID: {selectedBranch?.id || 'None selected'}</p>
                <p>Branch Name: {selectedBranch?.name || 'None selected'}</p>
                <p className="font-semibold text-blue-600">Data isolation: ACTIVE (branch-specific only)</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataExplorerPage;
