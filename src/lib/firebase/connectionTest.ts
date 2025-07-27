import { collection, getDocs, doc, getDoc, addDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';

export interface FirebaseConnectionTest {
  isConnected: boolean;
  canRead: boolean;
  canWrite: boolean;
  error?: string;
  userAuthenticated: boolean;
  tenantId?: string;
  collections: {
    posItems: number;
    posOrders: number;
    inventory: number;
    menuItems: number;
  };
}

export const testFirebaseConnection = async (): Promise<FirebaseConnectionTest> => {
  const result: FirebaseConnectionTest = {
    isConnected: false,
    canRead: false,
    canWrite: false,
    userAuthenticated: false,
    collections: {
      posItems: 0,
      posOrders: 0,
      inventory: 0,
      menuItems: 0
    }
  };

  try {
    // Check if user is authenticated
    const user = auth.currentUser;
    result.userAuthenticated = !!user;
    
    if (!user) {
      result.error = 'User not authenticated';
      return result;
    }

    result.tenantId = user.uid;
    console.log('🔍 Testing Firebase connection for tenant:', user.uid);

    // Test basic connection by reading user document
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      result.isConnected = true;
      result.canRead = true;
      console.log('✅ Firebase connection successful');
    } catch (error) {
      console.error('❌ Firebase connection failed:', error);
      result.error = `Connection failed: ${error}`;
      return result;
    }

    // Test reading collections
    try {
      // Count POS items
      const posItemsRef = collection(db, `tenants/${user.uid}/posItems`);
      const posItemsSnapshot = await getDocs(posItemsRef);
      result.collections.posItems = posItemsSnapshot.size;

      // Count POS orders
      const posOrdersRef = collection(db, `tenants/${user.uid}/posOrders`);
      const posOrdersSnapshot = await getDocs(posOrdersRef);
      result.collections.posOrders = posOrdersSnapshot.size;

      // Count inventory items
      const inventoryRef = collection(db, `tenants/${user.uid}/inventory`);
      const inventorySnapshot = await getDocs(inventoryRef);
      result.collections.inventory = inventorySnapshot.size;

      // Count menu items (check if they're in different location)
      const menuRef = collection(db, `tenants/${user.uid}/menuItems`);
      const menuSnapshot = await getDocs(menuRef);
      result.collections.menuItems = menuSnapshot.size;

      console.log('📊 Data counts:', result.collections);
    } catch (error) {
      console.error('❌ Error reading collections:', error);
      result.error = `Read error: ${error}`;
    }

    // Test write permissions
    try {
      const testRef = collection(db, `tenants/${user.uid}/connectionTest`);
      const testDoc = await addDoc(testRef, {
        timestamp: Timestamp.now(),
        test: true
      });
      result.canWrite = true;
      console.log('✅ Write test successful:', testDoc.id);
    } catch (error) {
      console.error('❌ Write test failed:', error);
      result.error = result.error ? `${result.error}, Write failed: ${error}` : `Write failed: ${error}`;
    }

  } catch (error) {
    console.error('❌ Firebase test failed:', error);
    result.error = `Test failed: ${error}`;
  }

  return result;
};

export const debugFirebaseData = async () => {
  const user = auth.currentUser;
  if (!user) {
    console.log('❌ No authenticated user');
    return;
  }

  console.log('🔍 Debugging Firebase data for tenant:', user.uid);
  
  try {
    // List all collections under the tenant
    const collections = [
      'posItems',
      'posOrders', 
      'inventory',
      'menuItems',
      'users',
      'settings',
      'customers'
    ];

    for (const collectionName of collections) {
      try {
        const collectionRef = collection(db, `tenants/${user.uid}/${collectionName}`);
        const snapshot = await getDocs(collectionRef);
        console.log(`📊 ${collectionName}: ${snapshot.size} documents`);
        
        if (snapshot.size > 0) {
          snapshot.forEach((doc) => {
            console.log(`  📄 ${doc.id}:`, doc.data());
          });
        }
      } catch (error) {
        console.log(`❌ Error reading ${collectionName}:`, error);
      }
    }
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
};
