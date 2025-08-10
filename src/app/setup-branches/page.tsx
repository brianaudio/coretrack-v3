'use client';

import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, getDoc, collection, addDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export default function SetupBranchesPage() {
  const [user, setUser] = useState<any>(null);
  const [userDoc, setUserDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            setUserDoc(userDocSnap.data());
            setStatus('✅ User document loaded');
          } else {
            setStatus('❌ User document not found - go to /setup-user first');
          }
        } catch (error: any) {
          setStatus(`❌ Error: ${error.message}`);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const createBranchData = async () => {
    if (!user || !userDoc) return;
    
    setCreating(true);
    setStatus('⏳ Creating branch/location data...');

    try {
      const tenantId = userDoc.tenantId;
      
      // Create main location/branch
      const mainLocationId = 'main';
      
      await setDoc(doc(db, 'tenants', tenantId, 'locations', mainLocationId), {
        id: mainLocationId,
        name: 'Main Location',
        address: '123 Main Street',
        city: 'Your City',
        state: 'Your State',
        zipCode: '12345',
        phone: '(555) 123-4567',
        isActive: true,
        isMain: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        settings: {
          timezone: 'America/New_York',
          currency: 'USD',
          taxRate: 0.08
        }
      });

      // Create some sample inventory items
      await setDoc(doc(db, 'tenants', tenantId, 'inventory', 'coffee-beans'), {
        id: 'coffee-beans',
        name: 'Coffee Beans',
        category: 'Beverages',
        unit: 'lbs',
        currentStock: 50,
        minStock: 10,
        maxStock: 100,
        costPerUnit: 8.50,
        supplier: 'Local Coffee Roaster',
        locationId: mainLocationId,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await setDoc(doc(db, 'tenants', tenantId, 'inventory', 'milk'), {
        id: 'milk',
        name: 'Milk',
        category: 'Dairy',
        unit: 'gallons',
        currentStock: 20,
        minStock: 5,
        maxStock: 30,
        costPerUnit: 3.50,
        supplier: 'Local Dairy',
        locationId: mainLocationId,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Create sample menu item
      await setDoc(doc(db, 'tenants', tenantId, 'menuItems', 'espresso'), {
        id: 'espresso',
        name: 'Espresso',
        category: 'Coffee',
        price: 2.50,
        cost: 0.75,
        description: 'Rich, bold espresso shot',
        isActive: true,
        locationId: mainLocationId,
        ingredients: [
          { inventoryId: 'coffee-beans', quantity: 0.05 }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      setStatus('✅ Branch and sample data created successfully!');
      
      // Refresh the page
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
      
    } catch (error: any) {
      setStatus(`❌ Error creating branch data: ${error.message}`);
    }
    
    setCreating(false);
  };

  if (loading) return <div className="p-8">Loading...</div>;

  if (!user || !userDoc) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">🏢 Branch Setup</h1>
        <div className="text-red-600">Please complete user setup first at /setup-user</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">🏢 Branch Setup & Sample Data</h1>
      
      <div className="bg-blue-100 p-6 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-4">👤 User Info</h2>
        <div className="space-y-2 text-sm">
          <div><strong>Email:</strong> {user.email}</div>
          <div><strong>Tenant ID:</strong> {userDoc.tenantId}</div>
          <div><strong>Role:</strong> {userDoc.role}</div>
        </div>
      </div>

      <div className="bg-yellow-100 p-6 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-4">🏗️ Branch Setup Status</h2>
        <div className="mb-4">{status}</div>
        
        <div className="space-y-4">
          <div className="text-red-600 font-semibold">
            The "Failed to load branches" error means your tenant needs location/branch data.
          </div>
          <button 
            onClick={createBranchData}
            disabled={creating}
            className="bg-blue-500 text-white px-6 py-3 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {creating ? '⏳ Creating...' : '🏢 Create Main Branch & Sample Data'}
          </button>
        </div>
      </div>

      <div className="bg-gray-100 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">📋 What This Creates</h2>
        <div className="space-y-2 text-sm">
          <div>• <strong>Main Location:</strong> Your primary restaurant branch</div>
          <div>• <strong>Sample Inventory:</strong> Coffee beans, milk, etc.</div>
          <div>• <strong>Sample Menu Item:</strong> Espresso with ingredient mapping</div>
          <div>• <strong>Proper Structure:</strong> All data organized by tenant and location</div>
          <div>• <strong>Fixes Error:</strong> Resolves the "Failed to load branches" error</div>
        </div>
      </div>
    </div>
  );
}
