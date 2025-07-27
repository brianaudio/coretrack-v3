'use client';

import React, { useState } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { useAuth } from '../../lib/context/AuthContext';
import { useUser } from '../../lib/rbac/UserContext';

export default function DataTester() {
  const { user, profile } = useAuth();
  const { currentUser } = useUser();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testFirebaseConnection = async () => {
    setLoading(true);
    setResults([]);
    
    try {
      addResult('🔥 Testing Firebase connection...');
      
      // Test basic connection by trying to read from a collection
      const testRef = collection(db, 'test');
      const snapshot = await getDocs(testRef);
      addResult(`✅ Firebase connected successfully. Test collection has ${snapshot.size} documents.`);
      
      // Test writing
      const docRef = await addDoc(testRef, {
        message: 'Test connection',
        timestamp: new Date().toISOString(),
        user: currentUser?.email || user?.email || 'anonymous'
      });
      addResult(`✅ Write test successful. Document ID: ${docRef.id}`);
      
    } catch (error) {
      addResult(`❌ Firebase error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const addSampleInventory = async () => {
    setLoading(true);
    
    try {
      const tenantId = currentUser?.email?.split('@')[0] || 'demo-tenant';
      addResult(`📦 Adding sample inventory for tenant: ${tenantId}`);
      
      const inventoryRef = collection(db, `tenants/${tenantId}/inventory`);
      
      const sampleItems = [
        {
          name: 'Espresso Beans',
          category: 'Coffee',
          currentStock: 50,
          minThreshold: 10,
          maxThreshold: 100,
          unit: 'lbs',
          costPerUnit: 12.50,
          supplier: 'Coffee Roasters Inc',
          lastUpdated: new Date().toISOString()
        },
        {
          name: 'Milk',
          category: 'Dairy',
          currentStock: 20,
          minThreshold: 5,
          maxThreshold: 30,
          unit: 'gallons',
          costPerUnit: 4.50,
          supplier: 'Local Dairy',
          lastUpdated: new Date().toISOString()
        },
        {
          name: 'Pastries',
          category: 'Bakery',
          currentStock: 25,
          minThreshold: 10,
          maxThreshold: 50,
          unit: 'pieces',
          costPerUnit: 2.25,
          supplier: 'Fresh Bakery',
          lastUpdated: new Date().toISOString()
        }
      ];

      for (const item of sampleItems) {
        const docRef = await addDoc(inventoryRef, item);
        addResult(`✅ Added ${item.name} (ID: ${docRef.id})`);
      }
      
    } catch (error) {
      addResult(`❌ Inventory error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const addSampleMenu = async () => {
    setLoading(true);
    
    try {
      const tenantId = currentUser?.email?.split('@')[0] || 'demo-tenant';
      addResult(`🍽️ Adding sample menu for tenant: ${tenantId}`);
      
      const menuRef = collection(db, `tenants/${tenantId}/menu`);
      
      const sampleMenuItems = [
        {
          name: 'Cappuccino',
          category: 'Coffee',
          price: 4.50,
          description: 'Rich espresso with steamed milk foam',
          available: true,
          ingredients: ['Espresso Beans', 'Milk'],
          prepTime: 3,
          calories: 120
        },
        {
          name: 'Latte',
          category: 'Coffee',
          price: 5.00,
          description: 'Smooth espresso with steamed milk',
          available: true,
          ingredients: ['Espresso Beans', 'Milk'],
          prepTime: 3,
          calories: 150
        },
        {
          name: 'Croissant',
          category: 'Bakery',
          price: 3.25,
          description: 'Fresh buttery pastry',
          available: true,
          ingredients: ['Pastries'],
          prepTime: 1,
          calories: 240
        }
      ];

      for (const item of sampleMenuItems) {
        const docRef = await addDoc(menuRef, item);
        addResult(`✅ Added ${item.name} (ID: ${docRef.id})`);
      }
      
    } catch (error) {
      addResult(`❌ Menu error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Firebase Data Tester</h1>
      
      <div className="space-y-4 mb-6">
        <button
          onClick={testFirebaseConnection}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Test Firebase Connection
        </button>
        
        <button
          onClick={addSampleInventory}
          disabled={loading}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
        >
          Add Sample Inventory
        </button>
        
        <button
          onClick={addSampleMenu}
          disabled={loading}
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
        >
          Add Sample Menu Items
        </button>
      </div>

      <div className="bg-gray-100 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">Results:</h3>
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {results.map((result, index) => (
            <div key={index} className="text-sm font-mono">
              {result}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 bg-blue-50 p-4 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">Current User Info:</h3>
        <p className="text-sm">Demo User: {currentUser?.email || 'None'}</p>
        <p className="text-sm">Firebase User: {user?.email || 'None'}</p>
        <p className="text-sm">Profile: {profile ? 'Loaded' : 'Not loaded'}</p>
        <p className="text-sm">Tenant ID: {currentUser?.email?.split('@')[0] || profile?.tenantId || 'demo-tenant'}</p>
      </div>
    </div>
  );
}
