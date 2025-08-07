// Debug menu item location distribution and fix cross-branch contamination
// Copy and paste this in the browser console at http://localhost:3002

(async function() {
  console.log('🔍 MENU LOCATION DEBUG & FIX');
  console.log('================================');
  
  try {
    const tenantId = 'halYcRuDyldZNDp9H1mgtqwDpZh2';
    const projectId = 'inventory-system-latest';
    
    // Get auth token
    const user = JSON.parse(localStorage.getItem('firebase:authUser:AIzaSyDO1JilPcCm2-p6smKxVhXa_7rcI4VDKK0:[DEFAULT]') || '{}');
    if (!user.stsTokenManager?.accessToken) {
      console.error('❌ No auth token found. Please make sure you are logged in.');
      return;
    }
    
    const authToken = user.stsTokenManager.accessToken;
    console.log('✅ Found auth token');
    
    // Helper function to query documents
    async function queryDocuments(collection, field = null, value = null) {
      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
      
      let query = {
        structuredQuery: {
          from: [{ collectionId: collection }]
        }
      };
      
      if (field && value) {
        query.structuredQuery.where = {
          fieldFilter: {
            field: { fieldPath: field },
            op: 'EQUAL',
            value: { stringValue: value }
          }
        };
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(query)
      });
      
      if (!response.ok) return [];
      
      const result = await response.json();
      return result.filter(item => item.document).map(item => {
        const docPath = item.document.name;
        const docId = docPath.split('/').pop();
        const fields = item.document.fields || {};
        
        // Convert Firestore fields to regular object
        const data = {};
        for (const [key, value] of Object.entries(fields)) {
          if (value.stringValue !== undefined) data[key] = value.stringValue;
          else if (value.doubleValue !== undefined) data[key] = value.doubleValue;
          else if (value.integerValue !== undefined) data[key] = parseInt(value.integerValue);
          else if (value.booleanValue !== undefined) data[key] = value.booleanValue;
          else data[key] = value;
        }
        
        return { id: docId, ...data };
      });
    }
    
    // Helper function to update document
    async function updateDocument(collection, docId, updates) {
      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}/${docId}`;
      
      const fields = {};
      for (const [key, value] of Object.entries(updates)) {
        if (typeof value === 'string') fields[key] = { stringValue: value };
        else if (typeof value === 'number') fields[key] = { doubleValue: value };
        else if (typeof value === 'boolean') fields[key] = { booleanValue: value };
      }
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fields })
      });
      
      return response.ok;
    }
    
    console.log('\n📍 STEP 1: Getting all locations...');
    const locations = await queryDocuments('locations');
    console.log(`Found ${locations.length} locations:`);
    
    const locationMap = {};
    locations.forEach(loc => {
      locationMap[loc.id] = loc.name || 'Unnamed';
      console.log(`   ${loc.id} → ${loc.name}`);
    });
    
    console.log('\n📋 STEP 2: Getting all menu items...');
    const menuItems = await queryDocuments(`tenants/${tenantId}/menuItems`);
    console.log(`Found ${menuItems.length} menu items`);
    
    // Group by locationId
    const byLocation = {};
    const noLocationItems = [];
    
    menuItems.forEach(item => {
      const locationId = item.locationId;
      if (!locationId) {
        noLocationItems.push(item);
        return;
      }
      
      if (!byLocation[locationId]) {
        byLocation[locationId] = [];
      }
      byLocation[locationId].push(item);
    });
    
    console.log('\n📊 STEP 3: Menu item distribution:');
    for (const [locationId, items] of Object.entries(byLocation)) {
      console.log(`\n🏢 ${locationId}:`);
      
      // Try to map to actual branch
      if (locationId.startsWith('location_')) {
        const branchId = locationId.replace('location_', '');
        const branchName = locationMap[branchId] || 'UNKNOWN BRANCH';
        console.log(`   📍 Maps to: ${branchId} (${branchName})`);
        
        if (!locationMap[branchId]) {
          console.log(`   ⚠️ WARNING: This branch doesn't exist in locations!`);
        }
      }
      
      console.log(`   📊 ${items.length} menu items`);
      items.slice(0, 3).forEach(item => {
        console.log(`   - ${item.name}`);
      });
      if (items.length > 3) {
        console.log(`   ... and ${items.length - 3} more`);
      }
    }
    
    if (noLocationItems.length > 0) {
      console.log(`\n❌ ${noLocationItems.length} items have NO locationId:`);
      noLocationItems.forEach(item => {
        console.log(`   - ${item.name}`);
      });
    }
    
    console.log('\n🔧 STEP 4: Identifying issues...');
    
    // Check for cross-contamination
    const expectedLocations = Object.keys(locationMap).map(id => `location_${id}`);
    const actualLocations = Object.keys(byLocation);
    
    const orphanedLocations = actualLocations.filter(id => !expectedLocations.includes(id));
    const missingLocations = expectedLocations.filter(id => !actualLocations.includes(id));
    
    if (orphanedLocations.length > 0) {
      console.log(`❌ Orphaned location IDs: ${orphanedLocations.join(', ')}`);
    }
    
    if (missingLocations.length > 0) {
      console.log(`⚠️ No menu items for: ${missingLocations.join(', ')}`);
    }
    
    // Check for shared items across branches
    const itemNames = {};
    menuItems.forEach(item => {
      if (!itemNames[item.name]) {
        itemNames[item.name] = [];
      }
      itemNames[item.name].push(item.locationId);
    });
    
    const sharedItems = Object.entries(itemNames).filter(([name, locations]) => {
      const uniqueLocations = [...new Set(locations)];
      return uniqueLocations.length > 1;
    });
    
    if (sharedItems.length > 0) {
      console.log('\n🔄 ITEMS SHARED ACROSS BRANCHES:');
      sharedItems.forEach(([name, locations]) => {
        const uniqueLocations = [...new Set(locations)];
        console.log(`   "${name}" appears in: ${uniqueLocations.join(', ')}`);
      });
    }
    
    // Propose fix
    console.log('\n💡 SUGGESTED FIX:');
    if (locations.length === 2) {
      const [mainBranch, secondBranch] = locations;
      const mainLocationId = `location_${mainBranch.id}`;
      const secondLocationId = `location_${secondBranch.id}`;
      
      console.log(`Main branch: ${mainBranch.name} (${mainLocationId})`);
      console.log(`Second branch: ${secondBranch.name} (${secondLocationId})`);
      
      const mainItems = byLocation[mainLocationId] || [];
      const secondItems = byLocation[secondLocationId] || [];
      const orphanedItems = [...noLocationItems];
      
      // Add orphaned location items
      orphanedLocations.forEach(orphanedId => {
        orphanedItems.push(...(byLocation[orphanedId] || []));
      });
      
      console.log(`\nMain branch has: ${mainItems.length} items`);
      console.log(`Second branch has: ${secondItems.length} items`);
      console.log(`Orphaned/No location: ${orphanedItems.length} items`);
      
      if (orphanedItems.length > 0) {
        console.log('\n🔧 WOULD YOU LIKE TO FIX ORPHANED ITEMS?');
        console.log('Type "fix" to assign orphaned items to main branch');
        console.log('Type "split" to split items between branches');
        console.log('Type "check-only" to just analyze without changes');
        
        // For now, let's auto-assign to main branch
        console.log('\n🚀 AUTO-FIXING: Assigning orphaned items to main branch...');
        
        let fixedCount = 0;
        for (const item of orphanedItems) {
          const success = await updateDocument(`tenants/${tenantId}/menuItems`, item.id, {
            locationId: mainLocationId
          });
          
          if (success) {
            console.log(`   ✅ Fixed: ${item.name} → ${mainLocationId}`);
            fixedCount++;
          } else {
            console.log(`   ❌ Failed: ${item.name}`);
          }
        }
        
        console.log(`\n🎉 FIXED ${fixedCount} orphaned menu items!`);
        
        if (fixedCount > 0) {
          console.log('\n🔄 Refreshing page in 3 seconds...');
          setTimeout(() => {
            window.location.reload();
          }, 3000);
        }
      } else {
        console.log('\n✅ No orphaned items found - system looks clean!');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
})();
