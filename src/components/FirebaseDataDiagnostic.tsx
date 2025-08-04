import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, query, limit } from 'firebase/firestore';

interface DiagnosticResult {
  collection: string;
  count: number;
  status: 'success' | 'error';
  error?: string;
  sampleDocs: Array<{
    id: string;
    keys: string[];
  }>;
}

export default function FirebaseDataDiagnostic() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [loading, setLoading] = useState(false);

  const checkCollections = async () => {
    setLoading(true);
    const collections = [
      'tenants',
      'userProfiles', 
      'inventory',
      'menuItems',
      'branches',
      'locations',
      'posOrders',
      'expenses',
      'shifts'
    ];

    const testResults: DiagnosticResult[] = [];

    for (const collectionName of collections) {
      try {
        const q = query(collection(db, collectionName), limit(10));
        const querySnapshot = await getDocs(q);
        
        testResults.push({
          collection: collectionName,
          count: querySnapshot.size,
          status: 'success',
          sampleDocs: querySnapshot.docs.slice(0, 3).map(doc => ({
            id: doc.id,
            keys: Object.keys(doc.data())
          }))
        });
      } catch (error) {
        testResults.push({
          collection: collectionName,
          count: 0,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          sampleDocs: []
        });
      }
    }

    setResults(testResults);
    setLoading(false);
  };

  useEffect(() => {
    checkCollections();
  }, []);

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">🔍 Firebase Data Diagnostic</h2>
      
      <button
        onClick={checkCollections}
        disabled={loading}
        className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Checking...' : 'Refresh Data Check'}
      </button>

      <div className="space-y-4">
        {results.map((result) => (
          <div key={result.collection} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-lg">{result.collection}</h3>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs ${
                  result.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {result.status}
                </span>
                <span className="text-sm text-gray-600">
                  {result.count} documents
                </span>
              </div>
            </div>

            {result.error && (
              <div className="bg-red-50 border border-red-200 rounded p-3 mb-2">
                <p className="text-red-800 text-sm">❌ Error: {result.error}</p>
              </div>
            )}

            {result.sampleDocs.length > 0 && (
              <div className="bg-gray-50 rounded p-3">
                <h4 className="font-semibold text-sm mb-2">Sample Documents:</h4>
                {result.sampleDocs.map((doc) => (
                  <div key={doc.id} className="text-xs text-gray-700 mb-1">
                    <strong>ID:</strong> {doc.id} | <strong>Fields:</strong> {doc.keys.join(', ')}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">🔧 Configuration Check</h3>
        <div className="text-sm text-blue-800 space-y-1">
          <p><strong>Project ID:</strong> {process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'Not set'}</p>
          <p><strong>Auth Domain:</strong> {process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'Not set'}</p>
          <p><strong>Environment:</strong> {process.env.NODE_ENV}</p>
        </div>
      </div>
    </div>
  );
}
