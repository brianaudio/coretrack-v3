#!/usr/bin/env node

/**
 * Clean Mock Data Script
 * 
 * This script removes any mock/demo menu items from Firebase
 * Run this to clean up fictitious menu items
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc, query, where } = require('firebase/firestore');

// Firebase config (same as your app)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const MOCK_ITEM_NAMES = [
  'Classic Burger',
  'Chicken Wings', 
  'French Fries',
  'Iced Coffee',
  'Chocolate Cake',
  'Caesar Salad',
  'Beef Burger',
  'Chicken Sandwich',
  'Fish Fillet',
  'Vegetable Salad',
  'Soft Drink'
];

const TENANT_IDS = ['dev-tenant-123', 'dev-tenant'];

async function cleanMockMenuItems() {
  console.log('🧹 Starting mock data cleanup...');
  
  let totalDeleted = 0;
  
  for (const tenantId of TENANT_IDS) {
    console.log(`\n📋 Checking tenant: ${tenantId}`);
    
    try {
      // Check POS items
      const posRef = collection(db, 'tenants', tenantId, 'pos_items');
      const posSnapshot = await getDocs(posRef);
      
      console.log(`   Found ${posSnapshot.size} POS items`);
      
      for (const docSnap of posSnapshot.docs) {
        const data = docSnap.data();
        if (MOCK_ITEM_NAMES.includes(data.name)) {
          console.log(`   🗑️  Deleting mock POS item: ${data.name}`);
          await deleteDoc(doc(db, 'tenants', tenantId, 'pos_items', docSnap.id));
          totalDeleted++;
        }
      }
      
      // Check menu items
      const menuRef = collection(db, 'tenants', tenantId, 'menu_items');
      const menuSnapshot = await getDocs(menuRef);
      
      console.log(`   Found ${menuSnapshot.size} menu items`);
      
      for (const docSnap of menuSnapshot.docs) {
        const data = docSnap.data();
        if (MOCK_ITEM_NAMES.includes(data.name)) {
          console.log(`   🗑️  Deleting mock menu item: ${data.name}`);
          await deleteDoc(doc(db, 'tenants', tenantId, 'menu_items', docSnap.id));
          totalDeleted++;
        }
      }
      
    } catch (error) {
      console.log(`   ⚠️  Error checking tenant ${tenantId}:`, error.message);
    }
  }
  
  console.log(`\n✅ Cleanup complete! Deleted ${totalDeleted} mock items.`);
}

// Run the cleanup
cleanMockMenuItems()
  .then(() => {
    console.log('🎉 Mock data cleanup finished successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  });
