'use client';

import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export default function UserSetupPage() {
  const [user, setUser] = useState<any>(null);
  const [userDoc, setUserDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Check if user document exists
        const userDocRef = doc(db, 'users', currentUser.uid);
        try {
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            setUserDoc(userDocSnap.data());
            setStatus('✅ User document exists');
          } else {
            setUserDoc(null);
            setStatus('❌ User document missing - this is causing the permission error');
          }
        } catch (error: any) {
          setStatus(`❌ Error checking user document: ${error.message}`);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const createUserDocument = async () => {
    if (!user) return;
    
    setCreating(true);
    setStatus('⏳ Creating user document...');

    try {
      const tenantId = `TENANT_${user.uid.substring(0, 8)}_${Date.now()}`;
      
      // Create user document
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        displayName: user.displayName || 'User',
        role: 'owner',
        tenantId: tenantId,
        createdAt: new Date(),
        assignedBranches: ['main'],
        permissions: {
          inventory: true,
          pos: true,
          analytics: true,
          team: true,
          settings: true
        }
      });

      // Create tenant document
      await setDoc(doc(db, 'tenants', tenantId), {
        name: 'My Restaurant',
        plan: 'professional',
        status: 'active',
        ownerId: user.uid,
        createdAt: new Date(),
        settings: {
          currency: 'USD',
          timezone: 'America/New_York',
          businessType: 'restaurant'
        }
      });

      setStatus('✅ User and tenant documents created successfully!');
      
      // Refresh the page to reload with new permissions
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error: any) {
      setStatus(`❌ Error creating user document: ${error.message}`);
    }
    
    setCreating(false);
  };

  if (loading) return <div className="p-8">Loading...</div>;

  if (!user) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">🔐 User Setup</h1>
        <div className="text-red-600">Please log in first</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">🔧 User Setup & Permissions Fix</h1>
      
      <div className="bg-blue-100 p-6 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-4">👤 Current User</h2>
        <div className="space-y-2 text-sm">
          <div><strong>Email:</strong> {user.email}</div>
          <div><strong>UID:</strong> {user.uid}</div>
          <div><strong>Display Name:</strong> {user.displayName || 'Not set'}</div>
        </div>
      </div>

      <div className="bg-yellow-100 p-6 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-4">📄 User Document Status</h2>
        <div className="mb-4">{status}</div>
        
        {userDoc ? (
          <div className="space-y-2 text-sm font-mono">
            <div><strong>Role:</strong> {userDoc.role}</div>
            <div><strong>Tenant ID:</strong> {userDoc.tenantId}</div>
            <div><strong>Assigned Branches:</strong> {userDoc.assignedBranches?.join(', ')}</div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-red-600 font-semibold">
              This is why you're getting "Missing or insufficient permissions" errors!
            </div>
            <button 
              onClick={createUserDocument}
              disabled={creating}
              className="bg-green-500 text-white px-6 py-3 rounded hover:bg-green-600 disabled:opacity-50"
            >
              {creating ? '⏳ Creating...' : '🔧 Fix Permissions - Create User Document'}
            </button>
          </div>
        )}
      </div>

      <div className="bg-gray-100 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">📋 What This Does</h2>
        <div className="space-y-2 text-sm">
          <div>• Creates a user document in Firestore with your UID</div>
          <div>• Assigns you as an owner with full permissions</div>
          <div>• Creates a new tenant (restaurant) for you</div>
          <div>• Fixes the "Missing or insufficient permissions" error</div>
          <div>• Allows you to access inventory, POS, and all other features</div>
        </div>
      </div>
    </div>
  );
}
