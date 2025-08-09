// Simple test script for wastage tracking without complex indexes
// Usage: node test-wastage-simple.js

import { initializeApp } from 'firebase/app'
import { 
  getFirestore, 
  collection, 
  addDoc,
  getDocs,
  query,
  where,
  Timestamp
} from 'firebase/firestore'

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDvU47s7dB7xeGYFDJz2n6xKqzN21xVkM8",
  authDomain: "inventory-system-latest.firebaseapp.com",
  projectId: "inventory-system-latest",
  storageBucket: "inventory-system-latest.firebasestorage.app",
  messagingSenderId: "77306527007",
  appId: "1:77306527007:web:2b834b513c4bd9e0eb8c8f"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function testSimpleQueries() {
  console.log('🧪 Testing simple wastage queries...\n')
  
  const tenantId = '0Pn5HXTRlKOoV3fJ8UqOBwVb6rm1'
  const branchId = 'DDIuUpcRMuegfegadPf2'
  
  try {
    // Test 1: Simple wastage entries query
    console.log('📊 Test 1: Fetching wastage entries...')
    const wastageQuery = query(
      collection(db, 'wastageEntries'),
      where('tenantId', '==', tenantId),
      where('branchId', '==', branchId)
    )
    
    const wastageSnapshot = await getDocs(wastageQuery)
    console.log(`✅ Found ${wastageSnapshot.size} wastage entries`)
    
    wastageSnapshot.docs.forEach((doc, index) => {
      const data = doc.data()
      console.log(`  ${index + 1}. ${data.itemName}: ${data.quantity} items, ₱${data.totalCost}`)
    })
    
    // Test 2: Simple thresholds query
    console.log('\n📊 Test 2: Fetching wastage thresholds...')
    const thresholdQuery = query(
      collection(db, 'wastageThresholds'),
      where('tenantId', '==', tenantId),
      where('branchId', '==', branchId)
    )
    
    const thresholdSnapshot = await getDocs(thresholdQuery)
    console.log(`✅ Found ${thresholdSnapshot.size} wastage thresholds`)
    
    thresholdSnapshot.docs.forEach((doc, index) => {
      const data = doc.data()
      console.log(`  ${index + 1}. ${data.itemName}: daily=${data.dailyThreshold}, weekly=${data.weeklyThreshold}`)
    })
    
    console.log('\n🎉 Simple queries working! The wastage system is ready to use.')
    console.log('\n💡 For better performance, consider creating Firestore indexes for:')
    console.log('   - wastageEntries: tenantId + branchId + timestamp')
    console.log('   - wastageThresholds: tenantId + branchId')
    
  } catch (error) {
    console.error('❌ Error in simple queries:', error)
    if (error.code === 'failed-precondition') {
      console.log('\n🔥 Index required error detected.')
      console.log('📋 Please create the Firestore index using the provided Firebase Console link.')
    }
  }
}

async function main() {
  await testSimpleQueries()
}

main().catch(console.error)
