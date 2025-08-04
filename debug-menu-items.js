// Debug script to check all menu items in Firebase
// Run this in the browser console to see all menu items

async function debugMenuItems() {
  try {
    // Import Firebase functions (assuming they're available globally)
    const { db } = window.firebase || {};
    
    if (!db) {
      console.error('Firebase not available. Run this in the browser console.');
      return;
    }
    
    // Get all menu items without any filters
    const { getDocs, collection, query } = window.firebase.firestore;
    
    const menuItemsRef = collection(db, 'tenants', 'dev-tenant-123', 'menuItems');
    const snapshot = await getDocs(menuItemsRef);
    
    console.log('🔍 Total menu items in Firebase:', snapshot.size);
    console.log('📋 All menu items:');
    
    const items = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      const item = {
        id: doc.id,
        name: data.name,
        category: data.category,
        price: data.price,
        locationId: data.locationId,
        status: data.status,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        tenantId: data.tenantId
      };
      items.push(item);
      console.log('📄', item);
    });
    
    // Group by location
    const byLocation = items.reduce((acc, item) => {
      const loc = item.locationId || 'no-location';
      if (!acc[loc]) acc[loc] = [];
      acc[loc].push(item);
      return acc;
    }, {});
    
    console.log('📍 Items by location:', byLocation);
    
    return items;
  } catch (error) {
    console.error('Error checking menu items:', error);
  }
}

// Instructions for manual execution
console.log(`
🔍 DEBUG MENU ITEMS
==================
1. Copy and paste this entire function in browser console
2. Run: debugMenuItems()
3. Check the output to see all menu items in Firebase
`);

// If running in Node.js, export the function
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { debugMenuItems };
}
