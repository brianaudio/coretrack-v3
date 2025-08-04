'use client';

import { useState } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, query, limit } from 'firebase/firestore';

export default function FirebaseTestPage() {
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    setResults([]);
    
    try {
      const testResults = [`🔍 Testing connection to: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'inventory-system-latest'}`];
      
      // Test basic collections
      const collections = ['tenants', 'userProfiles', 'inventory', 'menuItems', 'branches'];
      
      for (const collectionName of collections) {
        try {
          const q = query(collection(db, collectionName), limit(5));
          const querySnapshot = await getDocs(q);
          testResults.push(`✅ ${collectionName}: ${querySnapshot.size} documents found`);
          
          if (querySnapshot.size > 0) {
            querySnapshot.docs.slice(0, 2).forEach(doc => {
              testResults.push(`   - Document ID: ${doc.id}`);
            });
          }
        } catch (error) {
          testResults.push(`❌ ${collectionName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      setResults(testResults);
    } catch (error) {
      setResults([`❌ Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🔧 Firebase Connection Test</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Current Configuration</h2>
          <div className="space-y-2 text-sm">
            <p><strong>Project ID:</strong> {process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'inventory-system-latest'}</p>
            <p><strong>Auth Domain:</strong> {process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'inventory-system-latest.firebaseapp.com'}</p>
            <p><strong>API Key:</strong> {process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '✅ Set' : '❌ Not set'}</p>
          </div>
        </div>

        <button
          onClick={testConnection}
          disabled={loading}
          className="mb-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Testing Connection...' : 'Test Firebase Connection'}
        </button>

        {results.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Test Results</h2>
            <div className="space-y-1 font-mono text-sm">
              {results.map((result, index) => (
                <div key={index} className={`${
                  result.includes('❌') ? 'text-red-600' : 
                  result.includes('✅') ? 'text-green-600' : 
                  'text-gray-700'
                }`}>
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
