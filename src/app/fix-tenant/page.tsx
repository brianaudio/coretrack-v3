'use client';

import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export default function FixUserTenantPage() {
  const [user, setUser] = useState<any>(null);
  const [userDoc, setUserDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fixing, setFixing] = useState(false);
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            setUserDoc(data);
            setStatus(`✅ User document found - tenantId: ${data.tenantId || 'MISSING!'}`);
          } else {
            setStatus('❌ User document not found');
          }
        } catch (error: any) {
          setStatus(`❌ Error: ${error.message}`);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const fixTenantId = async () => {
    if (!user) return;
    
    setFixing(true);
    setStatus('⏳ Fixing tenantId...');

    try {
      const tenantId = `TENANT_${user.uid.substring(0, 8)}_${Date.now()}`;
      
      // Update user document with proper tenantId
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
      }, { merge: true });

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

      setStatus(`✅ Fixed! New tenantId: ${tenantId}`);
      
      // Refresh the page to reload with new tenantId
      setTimeout(() => {
        window.location.href = '/setup-branches';
      }, 2000);
      
    } catch (error: any) {
      setStatus(`❌ Error fixing tenantId: ${error.message}`);
    }
    
    setFixing(false);
  };

  if (loading) return <div className="p-8">Loading...</div>;

  if (!user) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">🔧 Fix TenantId</h1>
        <div className="text-red-600">Please log in first</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">🔧 Fix TenantId Issue</h1>
      
      <div className="bg-red-100 p-6 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-4">🚨 Problem Detected</h2>
        <div className="text-sm">
          The error shows: <code>tenants/undefined/posItems/...</code><br/>
          This means your user document has <code>tenantId: undefined</code>
        </div>
      </div>

      <div className="bg-blue-100 p-6 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-4">👤 Current User Info</h2>
        <div className="space-y-2 text-sm">
          <div><strong>Email:</strong> {user.email}</div>
          <div><strong>UID:</strong> {user.uid}</div>
          <div><strong>Status:</strong> {status}</div>
        </div>
      </div>

      <div className="bg-yellow-100 p-6 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-4">📄 User Document</h2>
        {userDoc ? (
          <div className="space-y-2 text-sm font-mono">
            <div><strong>TenantId:</strong> {userDoc.tenantId || '❌ UNDEFINED!'}</div>
            <div><strong>Role:</strong> {userDoc.role}</div>
            <div><strong>Email:</strong> {userDoc.email}</div>
            <div><strong>Created:</strong> {userDoc.createdAt?.toDate?.()?.toString() || 'No date'}</div>
          </div>
        ) : (
          <div>No user document found</div>
        )}
      </div>

      {(!userDoc?.tenantId) && (
        <div className="bg-green-100 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">🔧 Fix Required</h2>
          <button 
            onClick={fixTenantId}
            disabled={fixing}
            className="bg-green-500 text-white px-6 py-3 rounded hover:bg-green-600 disabled:opacity-50"
          >
            {fixing ? '⏳ Fixing TenantId...' : '🔧 Fix TenantId & Create Tenant'}
          </button>
          <div className="mt-4 text-sm text-gray-600">
            This will create a proper tenantId for your user and redirect to branch setup.
          </div>
        </div>
      )}
    </div>
  );
}
