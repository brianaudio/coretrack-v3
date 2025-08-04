// Firebase Data Recovery Test
import { db } from '../lib/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

export async function testFirebaseConnection() {
  try {
    console.log('🔍 Testing Firebase connection...');
    
    // Test basic connection by checking collections
    const collections = [
      'tenants',
      'userProfiles', 
      'inventory',
      'menuItems',
      'branches',
      'locations',
      'posOrders'
    ];
    
    for (const collectionName of collections) {
      try {
        const querySnapshot = await getDocs(collection(db, collectionName));
        console.log(`📊 Collection '${collectionName}': ${querySnapshot.size} documents`);
        
        if (querySnapshot.size > 0) {
          querySnapshot.docs.slice(0, 2).forEach(doc => {
            console.log(`  - Document ID: ${doc.id}`);
            console.log(`  - Data keys: ${Object.keys(doc.data()).join(', ')}`);
          });
        }
      } catch (error) {
        console.error(`❌ Error accessing collection '${collectionName}':`, error);
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Firebase connection test failed:', error);
    return false;
  }
}
