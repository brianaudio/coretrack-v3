'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/context/AuthContext';
import { useBranch } from '../../lib/context/BranchContext';
import { useToast } from '../ui/Toast';
import { 
  collection, 
  getDocs, 
  addDoc,
  query, 
  orderBy,
  where,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getInventoryItems } from '../../lib/firebase/inventory';

// Simplified interfaces
interface InventoryCount {
  itemId: string;
  itemName: string;
  category: string;
  expectedCount: number;
  actualCount: number;
  discrepancy: number;
  costPerUnit: number;
  totalCost: number;
}

interface AuditReport {
  id: string;
  date: string;
  totalItems: number;
  itemsWithIssues: number;
  totalCostImpact: number;
  status: 'completed' | 'needs-review';
  createdBy: string;
  inventoryCounts: InventoryCount[];
}

export default function InventoryDiscrepancy() {
  const { user, profile } = useAuth();
  const { selectedBranch } = useBranch();
  const { addToast } = useToast();
  
  // Simplified state
  const [auditHistory, setAuditHistory] = useState<AuditReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [showQuickCheck, setShowQuickCheck] = useState(false);
  const [quickCheckItems, setQuickCheckItems] = useState<{
    id: string;
    name: string;
    expectedCount: number;
    actualCount?: number;
    costPerUnit: number;
  }[]>([]);

  // Load audit history
  useEffect(() => {
    loadAuditHistory();
  }, [profile?.tenantId, selectedBranch]);

  const loadAuditHistory = async () => {
    if (!profile?.tenantId) return;
    
    try {
      setLoading(true);
      const auditsRef = collection(db, `tenants/${profile.tenantId}/audits`);
      const q = query(auditsRef, orderBy('date', 'desc'));
      const snapshot = await getDocs(q);
      
      const audits = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as AuditReport));
      
      setAuditHistory(audits);
    } catch (error) {
      console.error('Error loading audit history:', error);
      addToast('Failed to load audit history', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Start quick check
  const startQuickCheck = async () => {
    if (!profile?.tenantId || !selectedBranch) {
      addToast('Please select a branch first', 'warning');
      return;
    }

    try {
      setLoading(true);
      const locationId = selectedBranch.id; // Use branch id as locationId
      const inventoryItems = await getInventoryItems(profile.tenantId, locationId);
      
      if (inventoryItems.length === 0) {
        addToast('No inventory items found. Please add inventory items first.', 'warning');
        return;
      }

      // Select top 5 high-value items for quick check
      const highValueItems = inventoryItems
        .filter(item => (item.costPerUnit || 0) > 5) // Items over $5
        .sort((a, b) => ((b.costPerUnit || 0) * b.currentStock) - ((a.costPerUnit || 0) * a.currentStock))
        .slice(0, 5)
        .map(item => ({
          id: item.id,
          name: item.name,
          expectedCount: item.currentStock,
          costPerUnit: item.costPerUnit || 0,
          actualCount: undefined
        }));

      if (highValueItems.length === 0) {
        addToast('No high-value items found for quick check', 'warning');
        return;
      }

      setQuickCheckItems(highValueItems);
      setShowQuickCheck(true);
      addToast('Quick check started! Count the displayed items.', 'success');
    } catch (error) {
      console.error('Error starting quick check:', error);
      addToast('Failed to start quick check', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Complete quick check
  const completeQuickCheck = async () => {
    const incompleteCounts = quickCheckItems.filter(item => item.actualCount === undefined);
    if (incompleteCounts.length > 0) {
      addToast('Please count all items before completing', 'warning');
      return;
    }

    try {
      setLoading(true);

      // Calculate discrepancies
      const inventoryCounts: InventoryCount[] = quickCheckItems.map(item => {
        const discrepancy = (item.actualCount || 0) - item.expectedCount;
        return {
          itemId: item.id,
          itemName: item.name,
          category: 'quick-check',
          expectedCount: item.expectedCount,
          actualCount: item.actualCount || 0,
          discrepancy,
          costPerUnit: item.costPerUnit,
          totalCost: Math.abs(discrepancy) * item.costPerUnit
        };
      });

      const itemsWithIssues = inventoryCounts.filter(item => Math.abs(item.discrepancy) > 0).length;
      const totalCostImpact = inventoryCounts.reduce((sum, item) => sum + item.totalCost, 0);

      // Save to Firebase
      const auditData = {
        date: new Date().toISOString().split('T')[0],
        totalItems: quickCheckItems.length,
        itemsWithIssues,
        totalCostImpact,
        status: itemsWithIssues > 0 ? 'needs-review' : 'completed',
        createdBy: user?.email || 'unknown',
        inventoryCounts,
        createdAt: Timestamp.now()
      };

      await addDoc(collection(db, `tenants/${profile!.tenantId}/audits`), auditData);
      
      setShowQuickCheck(false);
      setQuickCheckItems([]);
      await loadAuditHistory();

      const message = itemsWithIssues > 0 
        ? `Quick check completed! Found ${itemsWithIssues} items with discrepancies.`
        : 'Quick check completed! All items match expected counts.';
      
      addToast(message, itemsWithIssues > 0 ? 'warning' : 'success');
    } catch (error) {
      console.error('Error completing quick check:', error);
      addToast('Failed to save quick check results', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Update quick check count
  const updateQuickCheckCount = (itemId: string, count: number) => {
    setQuickCheckItems(prev => 
      prev.map(item => 
        item.id === itemId ? { ...item, actualCount: count } : item
      )
    );
  };

  // Get today's status
  const getTodayStatus = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayAudits = auditHistory.filter(audit => audit.date === today);
    const hasIssues = todayAudits.some(audit => audit.status === 'needs-review');
    
    if (hasIssues) {
      return { status: 'warning', text: 'Attention Needed', desc: 'Issues found in today\'s checks' };
    } else if (todayAudits.length > 0) {
      return { status: 'success', text: 'All Good', desc: 'No issues detected today' };
    } else {
      return { status: 'neutral', text: 'No Checks Today', desc: 'Run a quick check to get started' };
    }
  };

  const todayStatus = getTodayStatus();
  const todayChecks = auditHistory.filter(audit => 
    audit.date === new Date().toISOString().split('T')[0]
  ).length;

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Inventory Monitoring</h1>
          <p className="text-gray-600 mt-1">Track inventory levels and catch discrepancies early</p>
        </div>

        {/* Today's Status Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Today's Status</h2>
              <div className="flex items-center gap-2 mt-2">
                <div className={`w-3 h-3 rounded-full ${
                  todayStatus.status === 'success' ? 'bg-green-500' :
                  todayStatus.status === 'warning' ? 'bg-yellow-500' : 'bg-gray-400'
                }`}></div>
                <span className={`font-medium ${
                  todayStatus.status === 'success' ? 'text-green-700' :
                  todayStatus.status === 'warning' ? 'text-yellow-700' : 'text-gray-600'
                }`}>
                  {todayStatus.text}
                </span>
                <span className="text-sm text-gray-500">- {todayStatus.desc}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">{todayChecks}</div>
              <div className="text-sm text-gray-600">Checks today</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Quick Check Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Quick Check</h3>
                <p className="text-sm text-gray-600">5-minute spot check of high-value items</p>
              </div>
            </div>
            <button
              onClick={startQuickCheck}
              disabled={loading}
              className="w-full bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 disabled:bg-gray-400 transition-colors"
            >
              {loading ? 'Loading...' : 'Start Quick Check'}
            </button>
          </div>

          {/* Full Audit Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Full Audit</h3>
                <p className="text-sm text-gray-600">Complete inventory verification</p>
              </div>
            </div>
            <button
              onClick={() => addToast('Full audit feature coming soon!', 'info')}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              {loading ? 'Loading...' : 'Start Full Audit'}
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading...</p>
              </div>
            ) : auditHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <p>No inventory checks yet</p>
                <p className="text-sm">Start with a quick check to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {auditHistory.slice(0, 5).map((audit, index) => (
                  <div key={audit.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        audit.status === 'needs-review' ? 'bg-yellow-500' : 'bg-green-500'
                      }`}></div>
                      <div>
                        <p className="font-medium text-gray-900">
                          Quick Check
                        </p>
                        <p className="text-sm text-gray-600">
                          {audit.date} • {audit.totalItems} items checked
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${
                        audit.status === 'needs-review' ? 'text-yellow-700' : 'text-green-700'
                      }`}>
                        {audit.status === 'needs-review' ? 'Needs Review' : 'All Good'}
                      </div>
                      {audit.itemsWithIssues > 0 && (
                        <div className="text-xs text-gray-500">
                          {audit.itemsWithIssues} items flagged
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {auditHistory.length > 5 && (
                  <div className="text-center pt-4">
                    <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                      View All History ({auditHistory.length} total)
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Check Modal */}
      {showQuickCheck && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">⚡ 5-Minute Quick Check</h2>
              <button 
                onClick={() => setShowQuickCheck(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div className="space-y-4 mb-6">
              {quickCheckItems.map((item, index) => (
                <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-medium text-gray-900">{item.name}</h3>
                    <p className="text-sm text-gray-600">
                      Expected: {item.expectedCount} • ${item.costPerUnit.toFixed(2)} each
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Actual Count:</label>
                    <input
                      type="number"
                      min="0"
                      value={item.actualCount || ''}
                      onChange={(e) => updateQuickCheckCount(item.id, parseInt(e.target.value) || 0)}
                      className="w-20 border border-gray-300 rounded px-2 py-1 text-center"
                      placeholder="0"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowQuickCheck(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={completeQuickCheck}
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                {loading ? 'Saving...' : 'Complete Check'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
