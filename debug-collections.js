// Debug script to check Firebase collections and data structure
// Usage: node debug-collections.js

import { initializeApp } from 'firebase/app'
import { 
  getFirestore, 
  collection, 
  getDocs,
  query,
  limit
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

async function checkCollection(collectionName) {
  try {
    const q = query(collection(db, collectionName), limit(5))
    const snapshot = await getDocs(q)
    
    if (snapshot.empty) {
      console.log(`📂 ${collectionName}: Empty`)
      return
    }
    
    console.log(`📂 ${collectionName}: ${snapshot.size} documents (showing first 5)`)
    snapshot.docs.forEach((doc, index) => {
      const data = doc.data()
      console.log(`  ${index + 1}. ${doc.id}:`, {
        tenantId: data.tenantId || 'N/A',
        locationId: data.locationId || 'N/A',
        branchId: data.branchId || 'N/A',
        name: data.name || 'N/A',
        keys: Object.keys(data).slice(0, 5).join(', ')
      })
    })
    console.log()
  } catch (error) {
    console.log(`❌ Error checking ${collectionName}:`, error.message)
  }
}

async function main() {
  console.log('🔍 Checking Firebase collections...\n')
  
  // Check key collections
  await checkCollection('users')
  await checkCollection('branches') 
  await checkCollection('locations')
  await checkCollection('inventory')
  await checkCollection('orders')
  await checkCollection('expenses')
  await checkCollection('shifts')
  await checkCollection('movements')
  
  console.log('✅ Collection check complete!')
}

main().catch(console.error)
