// BRANCH-SPECIFIC MENU BUILDER FIX - Complete Solution
// Copy and paste this entire script in the browser console at http://localhost:3002

(async function() {
  console.log('🔧 BRANCH-SPECIFIC MENU BUILDER FIX');
  console.log('=====================================');
  
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
    
    // Helper functions
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
    
    async function createDocument(collection, data) {
      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}`;
      
      const fields = {};
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'string') fields[key] = { stringValue: value };
        else if (typeof value === 'number') fields[key] = { doubleValue: value };
        else if (typeof value === 'boolean') fields[key] = { booleanValue: value };
        else if (value instanceof Date) fields[key] = { timestampValue: value.toISOString() };
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fields })
      });
      
      if (response.ok) {
        const result = await response.json();
        return result.name.split('/').pop();
      }
      return null;
    }
    
    console.log('\n📍 STEP 1: Getting all locations...');
    const locations = await queryDocuments('locations');
    console.log(`Found ${locations.length} locations:`);
    
    const locationMap = {};
    locations.forEach(loc => {
      locationMap[loc.id] = loc.name || 'Unnamed';
      console.log(`   ${loc.id} → ${loc.name}`);
    });
    
    console.log('\n📋 STEP 2: Analyzing current menu structure...');
    
    // Get current menu categories (tenant-wide)
    const categories = await queryDocuments(`tenants/${tenantId}/menuCategories`);
    console.log(`Found ${categories.length} menu categories (tenant-wide):`);
    categories.forEach(cat => {
      console.log(`   - ${cat.name} (display order: ${cat.displayOrder || 0})`);
    });
    
    // Get current menu items
    const menuItems = await queryDocuments(`tenants/${tenantId}/menuItems`);
    console.log(`\nFound ${menuItems.length} menu items`);
    
    // Group items by location
    const itemsByLocation = {};
    const noLocationItems = [];
    
    menuItems.forEach(item => {
      const locationId = item.locationId;
      if (!locationId) {
        noLocationItems.push(item);
        return;
      }
      
      if (!itemsByLocation[locationId]) {
        itemsByLocation[locationId] = [];
      }
      itemsByLocation[locationId].push(item);
    });
    
    console.log('\n📊 Menu items by location:');
    for (const [locationId, items] of Object.entries(itemsByLocation)) {
      console.log(`\n🏢 ${locationId}:`);
      if (locationId.startsWith('location_')) {
        const branchId = locationId.replace('location_', '');
        const branchName = locationMap[branchId] || 'UNKNOWN BRANCH';
        console.log(`   📍 Maps to: ${branchId} (${branchName})`);
      }
      console.log(`   📊 ${items.length} menu items`);
      
      // Show category usage
      const categoriesUsed = {};
      items.forEach(item => {
        const category = item.category || 'No Category';
        categoriesUsed[category] = (categoriesUsed[category] || 0) + 1;
      });
      
      console.log(`   📂 Categories used:`, Object.entries(categoriesUsed).map(([cat, count]) => `${cat}(${count})`).join(', '));
    }
    
    if (noLocationItems.length > 0) {
      console.log(`\n❌ ${noLocationItems.length} items have NO locationId`);
    }
    
    console.log('\n🔧 STEP 3: Implementing branch-specific menu categories...');
    
    // The fix: Create location-specific categories for each branch
    let totalCategoriesCreated = 0;
    let totalItemsFixed = 0;
    
    for (const [branchId, branchName] of Object.entries(locationMap)) {
      const locationId = `location_${branchId}`;
      console.log(`\n🏪 Processing branch: ${branchName} (${locationId})`);
      
      const branchItems = itemsByLocation[locationId] || [];
      if (branchItems.length === 0) {
        console.log(`   ⚠️ No menu items found for this branch, skipping...`);
        continue;
      }
      
      // Get unique categories used by this branch
      const branchCategories = {};
      branchItems.forEach(item => {
        const category = item.category || 'Uncategorized';
        if (!branchCategories[category]) {
          branchCategories[category] = {
            name: category,
            items: []
          };
        }
        branchCategories[category].items.push(item);
      });
      
      console.log(`   📂 Found ${Object.keys(branchCategories).length} categories in use:`, Object.keys(branchCategories).join(', '));
      
      // Create branch-specific categories
      for (const [categoryName, categoryInfo] of Object.entries(branchCategories)) {
        // Find the original category details
        const originalCategory = categories.find(cat => cat.name === categoryName);
        const displayOrder = originalCategory?.displayOrder || 0;
        const description = originalCategory?.description || `${categoryName} items for ${branchName}`;
        
        // Create new branch-specific category with locationId
        const newCategoryData = {
          name: categoryName,
          description: description,
          displayOrder: displayOrder,
          isActive: true,
          tenantId: tenantId,
          locationId: locationId, // This makes it branch-specific!
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        const newCategoryId = await createDocument(`tenants/${tenantId}/menuCategories`, newCategoryData);
        
        if (newCategoryId) {
          console.log(`   ✅ Created branch-specific category: "${categoryName}" → ${newCategoryId}`);
          totalCategoriesCreated++;
        } else {
          console.log(`   ❌ Failed to create category: "${categoryName}"`);
        }
      }
    }
    
    console.log('\n🔧 STEP 4: Cleaning up orphaned items...');
    
    // Fix items with no locationId
    if (noLocationItems.length > 0) {
      console.log(`Assigning ${noLocationItems.length} orphaned items to main branch...`);
      
      const mainBranch = Object.entries(locationMap)[0];
      if (mainBranch) {
        const [mainBranchId, mainBranchName] = mainBranch;
        const mainLocationId = `location_${mainBranchId}`;
        
        for (const item of noLocationItems) {
          const success = await updateDocument(`tenants/${tenantId}/menuItems`, item.id, {
            locationId: mainLocationId
          });
          
          if (success) {
            console.log(`   ✅ Fixed: ${item.name} → ${mainLocationId}`);
            totalItemsFixed++;
          } else {
            console.log(`   ❌ Failed: ${item.name}`);
          }
        }
      }
    }
    
    console.log('\n🧹 STEP 5: Remove old tenant-wide categories...');
    
    // Mark original categories as inactive (don't delete to preserve history)
    let deactivatedCategories = 0;
    for (const category of categories) {
      const success = await updateDocument(`tenants/${tenantId}/menuCategories`, category.id, {
        isActive: false,
        description: `[LEGACY] ${category.description || category.name} - Replaced by branch-specific categories`,
        updatedAt: new Date()
      });
      
      if (success) {
        console.log(`   🔒 Deactivated legacy category: "${category.name}"`);
        deactivatedCategories++;
      }
    }
    
    console.log('\n🎉 BRANCH-SPECIFIC MENU BUILDER FIX COMPLETE!');
    console.log('===============================================');
    console.log(`📊 Results:`);
    console.log(`   ✅ Created ${totalCategoriesCreated} branch-specific categories`);
    console.log(`   ✅ Fixed ${totalItemsFixed} orphaned menu items`);
    console.log(`   🔒 Deactivated ${deactivatedCategories} legacy categories`);
    
    console.log('\n🔧 NEXT STEPS:');
    console.log('1. Restart your app to reload the menu builder');
    console.log('2. Each branch will now have its own categories');
    console.log('3. Menu items will only show for their specific branch');
    
    if (totalCategoriesCreated > 0 || totalItemsFixed > 0) {
      console.log('\n🔄 Refreshing page in 5 seconds...');
      setTimeout(() => {
        window.location.reload();
      }, 5000);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
})();
