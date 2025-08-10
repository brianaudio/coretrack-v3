'use client';

import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export default function FirebaseDebugPage() {
  const [connectionInfo, setConnectionInfo] = useState<any>(null);
  const [testResult, setTestResult] = useState<string>('');

  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Get Firebase app info
        const app = auth.app;
        const config = app.options;
        
        setConnectionInfo({
          projectId: config.projectId,
          authDomain: config.authDomain,
          apiKey: config.apiKey?.substring(0, 10) + '...',
          appId: config.appId?.substring(0, 20) + '...'
        });

        // Try to write a test document
        const testDoc = doc(db, 'connectionTest', 'debug-' + Date.now());
        await setDoc(testDoc, {
          message: 'Debug test from Next.js app',
          timestamp: new Date(),
          projectId: config.projectId,
          userAgent: navigator.userAgent
        });

        setTestResult(`✅ Successfully wrote to Firebase project: ${config.projectId}`);
      } catch (error: any) {
        setTestResult(`❌ Error: ${error.message}`);
      }
    };

    checkConnection();
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">🔍 Firebase Connection Debug</h1>
      
      <div className="bg-gray-100 p-6 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-4">📋 Environment Variables</h2>
        <div className="space-y-2 text-sm font-mono">
          <div>PROJECT_ID: {process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}</div>
          <div>AUTH_DOMAIN: {process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}</div>
          <div>API_KEY: {process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.substring(0, 10)}...</div>
          <div>NODE_ENV: {process.env.NODE_ENV}</div>
          <div>APP_ENV: {process.env.NEXT_PUBLIC_APP_ENV}</div>
        </div>
      </div>

      <div className="bg-blue-100 p-6 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-4">🔥 Firebase App Configuration</h2>
        {connectionInfo ? (
          <div className="space-y-2 text-sm font-mono">
            <div>Project ID: {connectionInfo.projectId}</div>
            <div>Auth Domain: {connectionInfo.authDomain}</div>
            <div>API Key: {connectionInfo.apiKey}</div>
            <div>App ID: {connectionInfo.appId}</div>
          </div>
        ) : (
          <div>Loading Firebase config...</div>
        )}
      </div>

      <div className="bg-green-100 p-6 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-4">🧪 Connection Test</h2>
        <div className="text-sm">
          {testResult || 'Testing Firebase connection...'}
        </div>
      </div>

      <div className="bg-yellow-100 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">🎯 Firebase Console Links</h2>
        <div className="space-y-2">
          <div>
            <strong>Current Project Console:</strong><br/>
            <a 
              href={`https://console.firebase.google.com/project/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/firestore`}
              target="_blank" 
              className="text-blue-600 underline"
            >
              https://console.firebase.google.com/project/{process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/firestore
            </a>
          </div>
          <div className="text-sm text-gray-600 mt-4">
            ⚠️ Make sure you're logged into the correct Google account!<br/>
            The coretrack-inventory project belongs to: <strong>calireese0201@gmail.com</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
