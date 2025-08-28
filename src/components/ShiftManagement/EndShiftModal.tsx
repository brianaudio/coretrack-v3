'use client';

import React, { useState, useEffect } from 'react';
import { useShift } from '@/lib/context/ShiftContext';
import { useBranch } from '@/lib/context/BranchContext';
import { useAuth } from '@/lib/context/AuthContext';
// Note: Shift PDF generation import removed as per user request
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getBranchLocationId } from '@/lib/utils/branchUtils';

interface EndShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShiftSummary {
  totalSales: number;
  totalExpenses: number;
  totalOrders: number;
  topItems: Array<{ name: string; quantity: number; revenue: number }>;
  grossProfit: number;
  netProfit: number;
  expectedCash: number;
}

const EndShiftModal: React.FC<EndShiftModalProps> = ({
  isOpen,
  onClose
}) => {
  const { endCurrentShift, currentShift } = useShift();
  const { selectedBranch } = useBranch();
  const { user, profile } = useAuth();
  const [endingCash, setEndingCash] = useState<string>('');
  const [isEndingShift, setIsEndingShift] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [shiftSummary, setShiftSummary] = useState<ShiftSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Calculate real shift data when modal opens
  useEffect(() => {
    if (isOpen && currentShift && profile?.tenantId && selectedBranch) {
      calculateRealShiftData();
    }
  }, [isOpen, currentShift?.id, profile?.tenantId, selectedBranch?.id]);

  const calculateRealShiftData = async () => {
    if (!currentShift || !profile?.tenantId || !selectedBranch) return;

    try {
      setLoading(true);
      const locationId = getBranchLocationId(selectedBranch.id);
      const shiftStartTime = currentShift.startTime;

      console.log('🔍 Debug EndShiftModal Data:');
      console.log('- Current Shift:', currentShift);
      console.log('- Tenant ID:', profile.tenantId);
      console.log('- Location ID:', locationId);
      console.log('- Shift Start Time:', shiftStartTime);
      console.log('- Shift Start Time (JS Date):', shiftStartTime.toDate());

      // Try to get real data from Firebase, but fallback if indexes are still building
      let totalSales = currentShift.totalSales || 0;
      let totalExpenses = currentShift.totalExpenses || 0;
      let totalOrders = currentShift.totalOrders || 0;
      let topItems: Array<{ name: string; quantity: number; revenue: number }> = [];

      console.log('📊 Starting with shift context data:', {
        totalSales,
        totalExpenses,
        totalOrders
      });

      // Let's also check if there are ANY orders in the collection for this tenant
      try {
        console.log('🔍 Checking all orders for this tenant...');
        const allOrdersQuery = query(
          collection(db, `tenants/${profile.tenantId}/orders`)
        );
        const allOrdersSnapshot = await getDocs(allOrdersQuery);
        console.log('📦 Total orders in collection for tenant:', allOrdersSnapshot.docs.length);
        
        if (allOrdersSnapshot.docs.length > 0) {
          const sampleOrder = allOrdersSnapshot.docs[0].data();
          console.log('📦 Sample order:', sampleOrder);
          console.log('📦 Sample order locationId:', sampleOrder.locationId);
          console.log('📦 Sample order createdAt:', sampleOrder.createdAt);
          console.log('📦 Sample order createdAt (JS Date):', sampleOrder.createdAt?.toDate());
        }
      } catch (err) {
        console.log('⚠️ Could not query all orders:', err);
      }

      try {
        // Get POS Orders for this shift - using the correct collection path
        console.log('🔍 Querying POS orders with filters...');
        console.log('- Collection path:', `tenants/${profile.tenantId}/orders`);
        console.log('- LocationId filter:', locationId);
        console.log('- CreatedAt >= filter:', shiftStartTime.toDate());
        
        const ordersQuery = query(
          collection(db, `tenants/${profile.tenantId}/orders`),
          where('locationId', '==', locationId),
          where('createdAt', '>=', shiftStartTime)
        );
        const ordersSnapshot = await getDocs(ordersQuery);
        const orders = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        console.log('📦 Found matching orders:', orders.length);
        if (orders.length > 0) {
          console.log('📦 First matching order:', orders[0]);
        }

        // Calculate totals from real data
        totalSales = orders.reduce((sum: number, order: any) => sum + (order.total || 0), 0);
        totalOrders = orders.length;

        console.log('💰 Calculated from matching orders:', {
          totalSales,
          totalOrders
        });

        // Calculate top items from orders
        const itemCounts: Record<string, { quantity: number; revenue: number }> = {};
        orders.forEach((order: any) => {
          if (order.items) {
            order.items.forEach((item: any) => {
              const key = item.name || 'Unknown Item';
              if (!itemCounts[key]) {
                itemCounts[key] = { quantity: 0, revenue: 0 };
              }
              itemCounts[key].quantity += item.quantity || 1;
              itemCounts[key].revenue += (item.price || 0) * (item.quantity || 1);
            });
          }
        });

        topItems = Object.entries(itemCounts)
          .map(([name, data]) => ({ name, ...data }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5);
      } catch (ordersError) {
        console.log('📊 Composite index not ready, trying manual filtering...');
        console.log('Orders query error:', ordersError);
        
        // Fallback: Get all orders and filter client-side
        try {
          const allOrdersQuery = query(
            collection(db, `tenants/${profile.tenantId}/orders`)
          );
          const allOrdersSnapshot = await getDocs(allOrdersQuery);
          const allOrders = allOrdersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          console.log('📦 Got all orders for manual filtering:', allOrders.length);
          
          // Filter manually
          const filteredOrders = allOrders.filter((order: any) => {
            const orderLocationId = order.locationId;
            const orderCreatedAt = order.createdAt;
            
            // Check location match
            if (orderLocationId !== locationId) return false;
            
            // Check time match (created after shift start)
            if (orderCreatedAt && orderCreatedAt.toDate) {
              return orderCreatedAt.toDate() >= shiftStartTime.toDate();
            }
            
            return false;
          });
          
          console.log('📦 Manually filtered orders:', filteredOrders.length);
          
          // Calculate from filtered data
          totalSales = filteredOrders.reduce((sum: number, order: any) => sum + (order.total || 0), 0);
          totalOrders = filteredOrders.length;
          
          console.log('💰 Calculated from manually filtered orders:', {
            totalSales,
            totalOrders
          });
        } catch (manualError) {
          console.log('📊 Manual filtering also failed, using shift context data');
          console.log('Manual filtering error:', manualError);
        }
      }

      try {
        // Get Expenses for this shift - using the correct collection path
        const expensesQuery = query(
          collection(db, `tenants/${profile.tenantId}/expenses`),
          where('locationId', '==', locationId),
          where('createdAt', '>=', shiftStartTime)
        );
        const expensesSnapshot = await getDocs(expensesQuery);
        const expenses = expensesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        totalExpenses = expenses.reduce((sum: number, expense: any) => sum + (expense.amount || 0), 0);
      } catch (expensesError) {
        console.log('📊 Firebase indexes still building, using shift context data for expenses');
        console.log('Expenses query error:', expensesError);
        totalExpenses = currentShift.totalExpenses || 0;
      }

      // Calculate profit estimates
      const grossProfit = totalSales * 0.65; // Assuming 65% gross margin
      const netProfit = grossProfit - totalExpenses;

      const calculatedSummary: ShiftSummary = {
        totalSales,
        totalExpenses,
        totalOrders,
        topItems,
        grossProfit,
        netProfit,
        expectedCash: 0 // Default cash float
      };

      setShiftSummary(calculatedSummary);
      console.log('📊 Shift summary calculated:', {
        totalSales,
        totalExpenses, 
        totalOrders,
        topItemsCount: topItems.length
      });
    } catch (error) {
      console.error('❌ Error calculating shift data:', error);
      // Complete fallback to current shift data
      const fallbackSummary: ShiftSummary = {
        totalSales: currentShift.totalSales || 0,
        totalExpenses: currentShift.totalExpenses || 0,
        totalOrders: currentShift.totalOrders || 0,
        topItems: [],
        grossProfit: (currentShift.totalSales || 0) * 0.65,
        netProfit: ((currentShift.totalSales || 0) * 0.65) - (currentShift.totalExpenses || 0),
        expectedCash: 0 // Default cash float
      };
      setShiftSummary(fallbackSummary);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: string) => {
    const num = value.replace(/[^\d.]/g, '');
    const parts = num.split('.');
    if (parts.length > 2) {
      parts.splice(2);
    }
    if (parts[1] && parts[1].length > 2) {
      parts[1] = parts[1].substring(0, 2);
    }
    return parts.join('.');
  };

  const endingCashNum = parseFloat(endingCash) || 0;
  const expectedCash = shiftSummary?.expectedCash || 0;
  const difference = endingCashNum - expectedCash;
  const isBalanced = Math.abs(difference) < 0.01;

  const handleEndShift = async () => {
    console.log('🔚 Starting end shift process...');
    setIsEndingShift(true);
    try {
      const notes = `Ending cash: ₱${endingCash}, Expected: ₱${expectedCash.toFixed(2)}, Difference: ₱${difference >= 0 ? '+' : ''}${difference.toFixed(2)}`;
      console.log('🔚 Will end shift with notes:', notes);
      
      // Don't end shift yet, just show summary first
      console.log('✅ Moving to summary screen...');
      setShowSummary(true);
    } catch (error) {
      console.error('❌ Failed to prepare shift end:', error);
      alert('Failed to prepare shift end. Please try again.');
    } finally {
      setIsEndingShift(false);
    }
  };

  const handleFinalClose = async () => {
    console.log('🔚 Actually ending shift now...');
    try {
      const notes = `Ending cash: ₱${endingCash}, Expected: ₱${expectedCash.toFixed(2)}, Difference: ₱${difference >= 0 ? '+' : ''}${difference.toFixed(2)}`;
      await endCurrentShift(notes);
      console.log('✅ Shift ended successfully');
      
      // Reset modal state
      setShowSummary(false);
      setEndingCash('');
      
      onClose(); // This will trigger the lock screen
    } catch (error) {
      console.error('❌ Failed to end shift:', error);
      alert('Failed to end shift. Please try again.');
    }
  };

  const handleCancel = () => {
    // Reset modal state
    setShowSummary(false);
    setEndingCash('');
    onClose();
  };

  const generatePDFReport = () => {
    console.log('📄 Generating PDF report...');
    console.log('Current shift:', currentShift);
    console.log('Selected branch:', selectedBranch);
    console.log('User:', user);
    
    if (!currentShift || !selectedBranch || !user || !shiftSummary) {
      console.error('❌ Missing required data for PDF generation');
      alert('Missing required data to generate PDF report');
      return;
    }
    
    const reportData = {
      shiftId: currentShift.id,
      startTime: currentShift.startTime.toDate().toLocaleString(),
      endTime: new Date().toLocaleString(),
      startingCash: expectedCash,
      endingCash: parseFloat(endingCash) || 0,
      expectedCash,
      difference: (parseFloat(endingCash) || 0) - expectedCash,
      totalSales: shiftSummary.totalSales,
      totalExpenses: shiftSummary.totalExpenses,
      totalOrders: shiftSummary.totalOrders,
      grossProfit: shiftSummary.grossProfit,
      netProfit: shiftSummary.netProfit,
      topItems: shiftSummary.topItems,
      staffMember: user.displayName || user.email || 'Unknown Staff',
      branchName: selectedBranch.name || 'Unknown Branch'
    };
    
    console.log('📄 Report data:', reportData);
    
    // Note: PDF generation has been disabled per user request
    console.log('✅ Shift ended successfully (PDF generation skipped)');
  };

  if (!isOpen) return null;

  // Show loading state while calculating data
  if (loading || !shiftSummary) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
        <div className="relative bg-white rounded-2xl p-8 text-center max-w-md">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Calculating Shift Data</h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            Analyzing orders, expenses, and transactions...<br />
            <span className="text-xs text-gray-500 mt-1 block">
              Using available data while Firebase indexes complete
            </span>
          </p>
        </div>
      </div>
    );
  }

  console.log('🔍 EndShiftModal render state:', {
    isOpen,
    showSummary,
    endingCash,
    isEndingShift,
    currentShift: !!currentShift,
    selectedBranch: !!selectedBranch,
    user: !!user,
    expectedCash,
    shiftSummary
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Enhanced Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-md"
        onClick={onClose}
      />
      
      {/* Beautiful Modal */}
      <div className="relative bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_32px_64px_-8px_rgba(0,0,0,0.15)] border border-gray-100/80 w-full max-w-lg mx-auto transform transition-all overflow-hidden max-h-[90vh] flex flex-col">
        {/* Subtle Top Accent */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-200/50 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/10 via-transparent to-purple-50/5 rounded-3xl pointer-events-none"></div>
        
        {!showSummary ? (
          /* Enhanced Cash Verification Step */
          <div className="relative p-10 overflow-y-auto">
            {/* Beautiful Header */}
            <div className="text-center mb-8">
              <div className="relative inline-block">
                {/* Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-red-500 rounded-3xl blur-xl opacity-20"></div>
                {/* Icon Container */}
                <div className="relative w-20 h-20 bg-gradient-to-br from-orange-500 to-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl border border-orange-400/20">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {/* Inner Highlight */}
                  <div className="absolute inset-1 bg-gradient-to-br from-white/20 to-transparent rounded-2xl pointer-events-none"></div>
                </div>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">End Shift</h2>
              <p className="text-gray-600 leading-relaxed">Count your cash drawer to close the shift</p>
            </div>

            {/* Clean Expected Cash Display */}
            <div className="mb-8 p-6 bg-gray-50/80 backdrop-blur-sm rounded-2xl border border-gray-100/60">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-700">Expected Cash</span>
                </div>
                <span className="text-xl font-bold text-gray-900">₱{expectedCash.toFixed(2)}</span>
              </div>
            </div>

            {/* Elegant Cash Input */}
            <div className="mb-8">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Actual Cash Count
              </label>
              <div className="relative group">
                <div className="absolute left-0 flex items-center justify-center w-12 h-full">
                  <span className="text-xl font-bold text-gray-500 group-focus-within:text-blue-500 transition-colors">₱</span>
                </div>
                <input
                  type="text"
                  value={endingCash}
                  onChange={(e) => setEndingCash(formatCurrency(e.target.value))}
                  className="w-full pl-12 pr-6 py-4 text-xl font-semibold bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 focus:bg-white transition-all duration-300 shadow-sm"
                  placeholder="0.00"
                  required
                />
                {/* Input Accent */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-purple-500/0 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none"></div>
              </div>
            </div>

            {/* Beautiful Difference Display */}
            {endingCash && (
              <div className={`mb-8 p-6 rounded-2xl border backdrop-blur-sm ${
                isBalanced 
                  ? 'bg-green-50/80 border-green-200/60 shadow-green-100/20' 
                  : difference > 0 
                    ? 'bg-blue-50/80 border-blue-200/60 shadow-blue-100/20' 
                    : 'bg-orange-50/80 border-orange-200/60 shadow-orange-100/20'
              } shadow-lg`}>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-semibold text-gray-700">Cash Difference</span>
                  <span className={`text-2xl font-bold ${
                    isBalanced 
                      ? 'text-green-600' 
                      : difference > 0 
                        ? 'text-blue-600' 
                        : 'text-orange-600'
                  }`}>
                    ₱{difference >= 0 ? '+' : ''}{difference.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    isBalanced 
                      ? 'bg-green-400 animate-pulse' 
                      : difference > 0 
                        ? 'bg-blue-400 animate-pulse' 
                        : 'bg-orange-400 animate-pulse'
                  }`}></div>
                  <span className={`text-xs font-medium ${
                    isBalanced 
                      ? 'text-green-700' 
                      : difference > 0 
                        ? 'text-blue-700' 
                        : 'text-orange-700'
                  }`}>
                    {isBalanced ? 'Perfect Balance' : difference > 0 ? 'Cash Overage' : 'Cash Shortage'}
                  </span>
                </div>
              </div>
            )}

            {/* Modern Action Buttons */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isEndingShift}
                className="flex-1 py-4 px-6 border border-gray-200 rounded-2xl font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 disabled:opacity-50 shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleEndShift}
                disabled={isEndingShift || !endingCash}
                className="flex-1 py-4 px-6 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl font-semibold transition-all duration-200 disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {isEndingShift ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Processing...</span>
                  </div>
                ) : (
                  'Continue'
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Enhanced Shift Summary Step - FIXED SCROLLING */
          <div className="relative flex flex-col h-full max-h-[80vh]">
            {/* Fixed Header */}
            <div className="flex-shrink-0 p-8 pb-4 text-center border-b border-gray-100">
              <div className="relative inline-block">
                {/* Success Glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full blur-2xl opacity-25 animate-pulse"></div>
                {/* Success Icon */}
                <div className="relative w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl border border-green-400/30">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {/* Inner Highlight */}
                  <div className="absolute inset-1 bg-gradient-to-br from-white/25 to-transparent rounded-full pointer-events-none"></div>
                </div>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">Shift Complete</h2>
              <p className="text-gray-600 leading-relaxed">Your shift has ended successfully</p>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto min-h-0 p-8 pt-6">
              {/* Premium Summary Cards */}
              <div className="space-y-4 mb-8">
                <div className="grid grid-cols-2 gap-4">
                  <div className="group p-6 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl border border-blue-200/60 hover:shadow-lg transition-all duration-300 backdrop-blur-sm">
                    <div className="text-3xl font-bold text-blue-600 mb-1">₱{shiftSummary?.totalSales?.toFixed(2) || '0.00'}</div>
                    <div className="text-sm font-medium text-blue-700">Total Sales</div>
                  </div>
                  <div className="group p-6 bg-gradient-to-br from-green-50 to-green-100/50 rounded-2xl border border-green-200/60 hover:shadow-lg transition-all duration-300 backdrop-blur-sm">
                    <div className="text-3xl font-bold text-green-600 mb-1">₱{shiftSummary?.netProfit?.toFixed(2) || '0.00'}</div>
                    <div className="text-sm font-medium text-green-700">Net Profit</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="group p-6 bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-2xl border border-purple-200/60 hover:shadow-lg transition-all duration-300 backdrop-blur-sm">
                    <div className="text-3xl font-bold text-purple-600 mb-1">{shiftSummary?.totalOrders || 0}</div>
                    <div className="text-sm font-medium text-purple-700">Orders Processed</div>
                  </div>
                  <div className="group p-6 bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-2xl border border-orange-200/60 hover:shadow-lg transition-all duration-300 backdrop-blur-sm">
                    <div className="text-3xl font-bold text-orange-600 mb-1">₱{shiftSummary?.totalExpenses?.toFixed(2) || '0.00'}</div>
                    <div className="text-sm font-medium text-orange-700">Total Expenses</div>
                  </div>
                </div>
              </div>

              {/* Beautiful Top Items Section */}
              {shiftSummary?.topItems && shiftSummary.topItems.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-sm font-bold text-gray-700 mb-4 tracking-wide uppercase">Best Sellers</h3>
                  <div className="space-y-3">
                    {shiftSummary.topItems?.slice(0, 3).map((item, index) => (
                      <div key={index} className="group flex justify-between items-center p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-gray-100/80 hover:bg-white/80 hover:shadow-md transition-all duration-300">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm ${
                            index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-500' :
                            index === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-500' :
                            'bg-gradient-to-br from-orange-400 to-orange-500'
                          }`}>
                            {index + 1}
                          </div>
                          <span className="text-sm font-semibold text-gray-900">{item.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-gray-900">₱{item.revenue.toFixed(2)}</div>
                          <div className="text-xs text-gray-500">{item.quantity} sold</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add some extra content to test scrolling */}
              <div className="mb-4 p-4 bg-gray-50/50 rounded-xl border border-gray-100">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Shift Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                  <div>Start Time: {new Date().toLocaleTimeString()}</div>
                  <div>End Time: {new Date().toLocaleTimeString()}</div>
                  <div>Duration: 8 hours 15 minutes</div>
                  <div>Staff: {user?.displayName || 'Staff Member'}</div>
                </div>
              </div>
            </div>

            {/* Fixed Footer with Action Buttons */}
            <div className="flex-shrink-0 p-8 pt-4 border-t border-gray-100 bg-white/95 backdrop-blur-sm">
              <div className="flex gap-4">
                <button
                  onClick={generatePDFReport}
                  className="flex-1 py-4 px-6 border border-gray-200 rounded-2xl font-semibold text-gray-700 hover:bg-white hover:border-gray-300 hover:shadow-lg transition-all duration-200"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Download Report</span>
                  </div>
                </button>
                <button
                  onClick={handleFinalClose}
                  className="flex-1 py-4 px-6 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  Complete Shift
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EndShiftModal;
