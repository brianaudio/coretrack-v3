'use client';

import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';

export default function AuthTestPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log('Auth state changed:', currentUser);
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDemoLogin = async () => {
    try {
      setError('');
      const email = process.env.NEXT_PUBLIC_DEMO_EMAIL || 'demo@coretrack.dev';
      const password = process.env.NEXT_PUBLIC_DEMO_PASSWORD || 'SecureDemo123!';
      
      console.log('Attempting demo login with:', email);
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('Login successful:', result.user);
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message);
    }
  };

  if (loading) return <div className="p-8">Loading auth state...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">🔐 Authentication Test</h1>
      
      <div className="bg-gray-100 p-6 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-4">👤 Current User</h2>
        {user ? (
          <div className="space-y-2 text-sm font-mono">
            <div>✅ User authenticated</div>
            <div>Email: {user.email}</div>
            <div>UID: {user.uid}</div>
            <div>Email Verified: {user.emailVerified ? 'Yes' : 'No'}</div>
          </div>
        ) : (
          <div className="text-red-600">❌ No user authenticated</div>
        )}
      </div>

      {!user && (
        <div className="bg-blue-100 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">🚪 Demo Login</h2>
          <button 
            onClick={handleDemoLogin}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Login with Demo Account
          </button>
          {error && (
            <div className="mt-4 text-red-600 text-sm">
              Error: {error}
            </div>
          )}
        </div>
      )}

      <div className="bg-yellow-100 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">📋 Environment Check</h2>
        <div className="space-y-2 text-sm">
          <div>Demo Email: {process.env.NEXT_PUBLIC_DEMO_EMAIL || 'Not set'}</div>
          <div>Demo Password: {process.env.NEXT_PUBLIC_DEMO_PASSWORD ? '***Set***' : 'Not set'}</div>
          <div>Firebase Project: {process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}</div>
        </div>
      </div>
    </div>
  );
}
