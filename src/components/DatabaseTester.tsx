'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { useBranch } from '@/lib/context/BranchContext';
import { useShift } from '@/lib/context/ShiftContext';
import { collection, query, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getBranchLocationId } from '@/lib/utils/branchUtils';

const DatabaseTester: React.FC = () => {
  const { profile } = useAuth();
  const { selectedBranch } = useBranch();
  const { currentShift } = useShift();
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testDatabase = async () => {
    if (!profile?.tenantId || !selectedBranch) {
      setResults('Missing tenant ID or branch');
      return;
    }

    setLoading(true);
    const locationId = getBranchLocationId(selectedBranch.id);
    
    try {
      const testResults: any = {
        tenantId: profile.tenantId,
        locationId,
        currentShift: currentShift,
        collections: {}
      };

      // Test orders collection
      try {
        const ordersQuery = query(collection(db, `tenants/${profile.tenantId}/orders`));
        const ordersSnapshot = await getDocs(ordersQuery);
        testResults.collections.orders = {
          path: `tenants/${profile.tenantId}/orders`,
          count: ordersSnapshot.docs.length,
          sample: ordersSnapshot.docs.length > 0 ? ordersSnapshot.docs[0].data() : null
        };
      } catch (err) {
        testResults.collections.orders = { error: err };
      }

      // Test expenses collection
      try {
        const expensesQuery = query(collection(db, `tenants/${profile.tenantId}/expenses`));
        const expensesSnapshot = await getDocs(expensesQuery);
        testResults.collections.expenses = {
          path: `tenants/${profile.tenantId}/expenses`,
          count: expensesSnapshot.docs.length,
          sample: expensesSnapshot.docs.length > 0 ? expensesSnapshot.docs[0].data() : null
        };
      } catch (err) {
        testResults.collections.expenses = { error: err };
      }

      setResults(testResults);
    } catch (error) {
      setResults({ error: error });
    } finally {
      setLoading(false);
    }
  };

  const createTestOrder = async () => {
    if (!profile?.tenantId || !selectedBranch) return;
    
    setLoading(true);
    const locationId = getBranchLocationId(selectedBranch.id);
    
    try {
      const testOrder = {
        orderNumber: `TEST-${Date.now()}`,
        items: [
          {
            itemId: 'test-item-1',
            name: 'Test Coffee',
            price: 150,
            quantity: 2
          }
        ],
        total: 300,
        status: 'completed',
        paymentMethod: 'cash',
        tenantId: profile.tenantId,
        locationId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      const docRef = await addDoc(collection(db, `tenants/${profile.tenantId}/orders`), testOrder);
      setResults({ success: `Test order created with ID: ${docRef.id}`, order: testOrder });
    } catch (error) {
      setResults({ error: error });
    } finally {
      setLoading(false);
    }
  };

  if (!profile?.tenantId || !selectedBranch) {
    return <div className="p-4 bg-yellow-100 text-yellow-800">Please ensure you're logged in and have a branch selected</div>;
  }

  return (
    <div className="fixed top-4 right-4 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50">
      <h3 className="text-lg font-semibold mb-3">Database Tester</h3>
      
      <div className="space-y-2 mb-4">
        <button
          onClick={testDatabase}
          disabled={loading}
          className="w-full px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Database'}
        </button>
        
        <button
          onClick={createTestOrder}
          disabled={loading}
          className="w-full px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Test Order'}
        </button>
      </div>

      {results && (
        <div className="bg-gray-50 p-3 rounded text-xs overflow-auto max-h-96">
          <pre>{JSON.stringify(results, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default DatabaseTester;
