'use client';

import { useState, useEffect } from 'react';
import { testFirebaseConnection, debugFirebaseData, FirebaseConnectionTest } from '../lib/firebase/connectionTest';
import { useAuth } from '../lib/context/AuthContext';

export default function FirebaseDebugger() {
  const [testResult, setTestResult] = useState<FirebaseConnectionTest | null>(null);
  const [testing, setTesting] = useState(false);
  const [debugging, setDebugging] = useState(false);
  const { profile } = useAuth();

  const runConnectionTest = async () => {
    setTesting(true);
    try {
      const result = await testFirebaseConnection();
      setTestResult(result);
      console.log('🔍 Firebase Test Result:', result);
    } catch (error) {
      console.error('❌ Test failed:', error);
    } finally {
      setTesting(false);
    }
  };

  const runDebugger = async () => {
    setDebugging(true);
    try {
      await debugFirebaseData();
    } catch (error) {
      console.error('❌ Debug failed:', error);
    } finally {
      setDebugging(false);
    }
  };

  useEffect(() => {
    // Auto-run test when component mounts
    if (profile) {
      runConnectionTest();
    }
  }, [profile]);

  const getStatusColor = (status: boolean) => status ? 'text-green-600' : 'text-red-600';
  const getStatusIcon = (status: boolean) => status ? '✅' : '❌';

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">🔍 Firebase Connection Debugger</h1>
        
        {/* User Info */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">User Authentication</h2>
          <div className="space-y-2">
            <div>
              <span className="font-medium">User:</span> {profile?.email || 'Not authenticated'}
            </div>
            <div>
              <span className="font-medium">Tenant ID:</span> {profile?.uid || 'N/A'}
            </div>
            <div>
              <span className="font-medium">Status:</span> 
              <span className={getStatusColor(!!profile)}> {profile ? 'Authenticated' : 'Not authenticated'}</span>
            </div>
          </div>
        </div>

        {/* Connection Test */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Firebase Connection Test</h2>
          
          <div className="space-y-4">
            <button
              onClick={runConnectionTest}
              disabled={testing || !profile}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              {testing ? '🔄 Testing...' : '🔍 Test Connection'}
            </button>

            {testResult && (
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold mb-3">Test Results:</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium">Connected:</span>
                    <span className={getStatusColor(testResult.isConnected)}>
                      {getStatusIcon(testResult.isConnected)} {testResult.isConnected ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Can Read:</span>
                    <span className={getStatusColor(testResult.canRead)}>
                      {getStatusIcon(testResult.canRead)} {testResult.canRead ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Can Write:</span>
                    <span className={getStatusColor(testResult.canWrite)}>
                      {getStatusIcon(testResult.canWrite)} {testResult.canWrite ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">User Auth:</span>
                    <span className={getStatusColor(testResult.userAuthenticated)}>
                      {getStatusIcon(testResult.userAuthenticated)} {testResult.userAuthenticated ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
                
                {testResult.error && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <h4 className="font-medium text-red-800">Error:</h4>
                    <p className="text-red-700">{testResult.error}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Data Summary */}
        {testResult && testResult.isConnected && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">📊 Firestore Data Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">{testResult.collections.posItems}</div>
                <div className="text-sm text-gray-600">POS Items</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">{testResult.collections.posOrders}</div>
                <div className="text-sm text-gray-600">Orders</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-purple-600">{testResult.collections.inventory}</div>
                <div className="text-sm text-gray-600">Inventory Items</div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-orange-600">{testResult.collections.menuItems}</div>
                <div className="text-sm text-gray-600">Menu Items</div>
              </div>
            </div>
            
            {Object.values(testResult.collections).every(count => count === 0) && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-medium text-yellow-800">⚠️ No Data Found</h4>
                <p className="text-yellow-700">Your Firestore database appears to be empty. This could mean:</p>
                <ul className="list-disc list-inside mt-2 text-yellow-700">
                  <li>This is a new setup and no data has been created yet</li>
                  <li>Data is stored in a different collection structure</li>
                  <li>There might be permission issues</li>
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Debug Console */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">🔧 Debug Console</h2>
          <div className="space-y-4">
            <button
              onClick={runDebugger}
              disabled={debugging || !profile}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-400"
            >
              {debugging ? '🔄 Debugging...' : '🔧 Debug All Collections'}
            </button>
            
            <div className="bg-gray-100 p-4 rounded-lg">
              <p className="text-sm text-gray-600">
                Click &quot;Debug All Collections&quot; to see detailed console output of all your Firestore data. 
                Open browser DevTools → Console to see the results.
              </p>
            </div>
          </div>
        </div>

        {/* Recovery Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mt-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">🔄 Data Recovery Options</h3>
          <div className="text-blue-700 space-y-2">
            <p><strong>If your Firebase is empty:</strong></p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Go to Settings → &quot;Restore Default Data&quot; to get sample menu items</li>
              <li>Use Menu Builder to create your actual menu items</li>
              <li>Use Inventory Center to set up your inventory</li>
              <li>Your data will be automatically saved to Firebase</li>
            </ol>
            <p className="mt-4"><strong>If you had data before:</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>Check if you&apos;re logged into the correct account</li>
              <li>Verify your Firebase project settings</li>
              <li>Look for data in different collection paths</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
