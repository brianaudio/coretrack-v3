import React, { useState } from 'react';
import { useAuth } from '../../lib/context/AuthContext';
import { getCurrentBranch } from '../../lib/utils/branchUtils';
import { seedInventoryData } from '../../lib/firebase/seedData';
import { getInventoryItems, addInventoryItem } from '../../lib/firebase/inventory';
import { getPOSItems } from '../../lib/firebase/pos';
import { testFirebaseConnection } from '../../lib/firebase/connectionTest';

export default function FirebaseDebugger() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const checkFirebaseConnection = async () => {
    setLoading(true);
    try {
      const connectionResult = await testFirebaseConnection();
      setResult({
        type: 'connection',
        data: connectionResult
      });
    } catch (error) {
      setResult({
        type: 'error',
        data: error
      });
    }
    setLoading(false);
  };

  const checkInventoryData = async () => {
    if (!profile?.tenantId) {
      setResult({ type: 'error', data: 'No tenant ID found' });
      return;
    }

    setLoading(true);
    try {
      const currentBranch = getCurrentBranch()
      const locationId = `location_${currentBranch.toLowerCase()}`
      const items = await getInventoryItems(profile.tenantId, locationId);
      setResult({
        type: 'inventory',
        data: {
          count: items.length,
          items: items.slice(0, 5), // Show first 5 items
          tenantId: profile.tenantId
        }
      });
    } catch (error) {
      setResult({
        type: 'error',
        data: error
      });
    }
    setLoading(false);
  };

  const checkPOSData = async () => {
    if (!profile?.tenantId) {
      setResult({ type: 'error', data: 'No tenant ID found' });
      return;
    }

    setLoading(true);
    try {
      const items = await getPOSItems(profile.tenantId);
      setResult({
        type: 'pos',
        data: {
          count: items.length,
          items: items.slice(0, 5), // Show first 5 items
          tenantId: profile.tenantId
        }
      });
    } catch (error) {
      setResult({
        type: 'error',
        data: error
      });
    }
    setLoading(false);
  };

  const seedSampleData = async () => {
    if (!profile?.tenantId) {
      setResult({ type: 'error', data: 'No tenant ID found' });
      return;
    }

    setLoading(true);
    try {
      await seedInventoryData(profile.tenantId);
      setResult({
        type: 'success',
        data: 'Sample inventory data has been seeded to Firebase!'
      });
    } catch (error) {
      setResult({
        type: 'error',
        data: error
      });
    }
    setLoading(false);
  };

  const addTestItem = async () => {
    if (!profile?.tenantId) {
      setResult({ type: 'error', data: 'No tenant ID found' });
      return;
    }

    setLoading(true);
    try {
      const currentBranch = getCurrentBranch()
      const locationId = `location_${currentBranch.toLowerCase()}`
      const testItem = {
        name: 'Test Item ' + Date.now(),
        category: 'Test Category',
        currentStock: 100,
        minStock: 20,
        unit: 'pcs',
        costPerUnit: 5.99,
        tenantId: profile.tenantId,
        locationId: locationId
      };

      const itemId = await addInventoryItem(testItem, profile.uid, profile.displayName);
      setResult({
        type: 'success',
        data: `Test item added with ID: ${itemId}`
      });
    } catch (error) {
      setResult({
        type: 'error',
        data: error
      });
    }
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Firebase Debugger & Data Manager</h1>
      
      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <button
            onClick={checkFirebaseConnection}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Test Connection
          </button>
          
          <button
            onClick={checkInventoryData}
            disabled={loading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            Check Inventory
          </button>
          
          <button
            onClick={checkPOSData}
            disabled={loading}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
          >
            Check POS Items
          </button>
          
          <button
            onClick={addTestItem}
            disabled={loading}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
          >
            Add Test Item
          </button>
          
          <button
            onClick={seedSampleData}
            disabled={loading}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
          >
            Seed Sample Data
          </button>
        </div>

        {profile && (
          <div className="p-4 bg-gray-100 rounded">
            <h3 className="font-semibold">Current User Info:</h3>
            <p>Email: {profile.email}</p>
            <p>Role: {profile.role}</p>
            <p>Tenant ID: {profile.tenantId}</p>
            <p>UID: {profile.uid}</p>
          </div>
        )}
      </div>

      {loading && (
        <div className="text-center p-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="mt-2">Loading...</p>
        </div>
      )}

      {result && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg overflow-auto">
          <h3 className="font-semibold mb-2">Result:</h3>
          <pre className="text-sm whitespace-pre-wrap">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
