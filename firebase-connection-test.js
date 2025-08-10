/**
 * Firebase Connection Test - Find out which project we're actually using
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

console.log('🔍 FIREBASE CONNECTION TEST');
console.log('================================================================================');

// Read the current environment file
try {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  console.log('📄 Current .env.local configuration:');
  
  const lines = envContent.split('\n');
  lines.forEach(line => {
    if (line.includes('FIREBASE')) {
      console.log(`   ${line}`);
    }
  });
  
  // Extract the project ID
  const projectIdMatch = envContent.match(/NEXT_PUBLIC_FIREBASE_PROJECT_ID=(.+)/);
  const projectId = projectIdMatch ? projectIdMatch[1].trim() : 'NOT_FOUND';
  
  console.log(`\n🎯 Detected Project ID: ${projectId}`);
  
  if (projectId === 'coretrack-inventory') {
    console.log('✅ Configuration points to coretrack-inventory');
  } else {
    console.log('❌ Configuration does NOT point to coretrack-inventory!');
    console.log(`   It points to: ${projectId}`);
  }
  
  // Try to connect and write a test document
  const firebaseConfig = {
    apiKey: envContent.match(/NEXT_PUBLIC_FIREBASE_API_KEY=(.+)/)?.[1]?.trim(),
    authDomain: envContent.match(/NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=(.+)/)?.[1]?.trim(),
    projectId: projectId,
    storageBucket: envContent.match(/NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=(.+)/)?.[1]?.trim(),
    messagingSenderId: envContent.match(/NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=(.+)/)?.[1]?.trim(),
    appId: envContent.match(/NEXT_PUBLIC_FIREBASE_APP_ID=(.+)/)?.[1]?.trim()
  };
  
  console.log('\n🔧 Firebase Config being used:');
  console.log(`   Project ID: ${firebaseConfig.projectId}`);
  console.log(`   Auth Domain: ${firebaseConfig.authDomain}`);
  console.log(`   API Key: ${firebaseConfig.apiKey?.substring(0, 10)}...`);
  
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  
  console.log('\n🧪 Attempting to write test document...');
  
  const testDoc = doc(db, 'connectionTest', 'test-' + Date.now());
  await setDoc(testDoc, {
    message: 'Connection test from debug script',
    timestamp: new Date(),
    projectId: firebaseConfig.projectId
  });
  
  console.log('✅ Test document written successfully!');
  console.log(`🎯 This confirms your app is writing to: ${firebaseConfig.projectId}`);
  console.log(`\n🔍 Check this Firebase console: https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore`);
  
} catch (error) {
  console.error('❌ Error during connection test:', error.message);
  console.log('\n📋 Possible issues:');
  console.log('   1. Wrong Firebase project configuration');
  console.log('   2. Network connectivity issues');
  console.log('   3. Firebase API key problems');
}

console.log('\n================================================================================');
console.log('🎯 CHECK THE CORRECT FIREBASE CONSOLE LINK ABOVE');
console.log('================================================================================');
