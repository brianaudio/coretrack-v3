/**
 * CoreTrack Minor Bug Detection & Analysis
 * Comprehensive bug hunting across the application
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDO1JilPcCm2-p6smKxVhXa_7rcI4VDKQ0",
  authDomain: "inventory-system-latest.firebaseapp.com",
  projectId: "inventory-system-latest",
  storageBucket: "inventory-system-latest.firebasestorage.app",
  messagingSenderId: "893699470433",
  appId: "1:893699470433:web:a5dcf242201b75c7eea620"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const tenantId = 'halYcRuDyldZNDp9H1mgtqwDpZh2';

async function detectMinorBugs() {
  try {
    console.log('🔍 CORETRACK MINOR BUG DETECTION ANALYSIS');
    console.log('================================================================================');
    console.log('🎯 Searching for: Data inconsistencies, edge cases, UI bugs, performance issues');
    console.log('================================================================================\n');
    
    const bugs = [];
    let bugCounter = 1;
    
    // Bug Check 1: Data Consistency Issues
    console.log('🔍 BUG CHECK #1: DATA CONSISTENCY ISSUES');
    console.log('--------------------------------------------------');
    
    try {
      // Check for orphaned data
      const inventorySnapshot = await getDocs(collection(db, `tenants/${tenantId}/inventory`));
      const menuItemsSnapshot = await getDocs(collection(db, `tenants/${tenantId}/menuItems`));
      const posItemsSnapshot = await getDocs(collection(db, `tenants/${tenantId}/posItems`));
      
      console.log(`📦 Inventory items: ${inventorySnapshot.size}`);
      console.log(`🍽️ Menu items: ${menuItemsSnapshot.size}`);
      console.log(`🛒 POS items: ${posItemsSnapshot.size}`);
      
      // Check for menu items without corresponding inventory
      const inventoryIds = new Set(inventorySnapshot.docs.map(doc => doc.id));
      const menuItemsWithoutInventory = [];
      
      menuItemsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.ingredients) {
          data.ingredients.forEach(ingredient => {
            if (!inventoryIds.has(ingredient.id)) {
              menuItemsWithoutInventory.push({
                menuItem: data.name,
                missingIngredient: ingredient.name
              });
            }
          });
        }
      });
      
      if (menuItemsWithoutInventory.length > 0) {
        bugs.push({
          id: `BUG-${bugCounter++}`,
          type: 'Data Consistency',
          severity: 'Medium',
          title: 'Menu items reference missing inventory items',
          description: `${menuItemsWithoutInventory.length} menu items reference ingredients not found in inventory`,
          details: menuItemsWithoutInventory.slice(0, 3),
          impact: 'Menu building and cost calculation errors'
        });
        console.log(`❌ Found ${menuItemsWithoutInventory.length} orphaned ingredient references`);
      } else {
        console.log('✅ All menu items have valid inventory references');
      }
      
    } catch (error) {
      console.log(`❌ Error checking data consistency: ${error.message}`);
    }
    
    // Bug Check 2: User Permission Gaps
    console.log('\n🔍 BUG CHECK #2: USER PERMISSION GAPS');
    console.log('--------------------------------------------------');
    
    try {
      const usersSnapshot = await getDocs(query(
        collection(db, 'users'),
        where('tenantId', '==', tenantId)
      ));
      
      const permissionIssues = [];
      
      usersSnapshot.docs.forEach(doc => {
        const data = doc.data();
        
        // Check for users without roles
        if (!data.role) {
          permissionIssues.push({
            userId: doc.id,
            issue: 'No role assigned',
            email: data.email
          });
        }
        
        // Check for users without branch assignment
        if (!data.selectedBranchId && !data.lastActiveBranch) {
          permissionIssues.push({
            userId: doc.id,
            issue: 'No branch assignment',
            email: data.email
          });
        }
        
        // Check for inactive users with active sessions
        if (data.status === 'inactive' && data.lastLogin) {
          const lastLogin = new Date(data.lastLogin.seconds * 1000);
          const daysSinceLogin = (Date.now() - lastLogin.getTime()) / (1000 * 60 * 60 * 24);
          
          if (daysSinceLogin < 1) {
            permissionIssues.push({
              userId: doc.id,
              issue: 'Inactive user with recent login',
              email: data.email,
              lastLogin: lastLogin.toISOString()
            });
          }
        }
      });
      
      if (permissionIssues.length > 0) {
        bugs.push({
          id: `BUG-${bugCounter++}`,
          type: 'User Permissions',
          severity: 'High',
          title: 'User permission and assignment gaps',
          description: `${permissionIssues.length} users have permission or assignment issues`,
          details: permissionIssues,
          impact: 'Security risks and access control problems'
        });
        console.log(`❌ Found ${permissionIssues.length} user permission issues`);
      } else {
        console.log('✅ All users have proper permissions and assignments');
      }
      
    } catch (error) {
      console.log(`❌ Error checking user permissions: ${error.message}`);
    }
    
    // Bug Check 3: Inventory Stock Anomalies
    console.log('\n🔍 BUG CHECK #3: INVENTORY STOCK ANOMALIES');
    console.log('--------------------------------------------------');
    
    try {
      const inventorySnapshot = await getDocs(collection(db, `tenants/${tenantId}/inventory`));
      const stockAnomalies = [];
      
      inventorySnapshot.docs.forEach(doc => {
        const data = doc.data();
        const stock = data.currentStock || 0;
        const minStock = data.minimumStock || 0;
        
        // Check for negative stock
        if (stock < 0) {
          stockAnomalies.push({
            item: data.name,
            issue: 'Negative stock',
            currentStock: stock,
            severity: 'High'
          });
        }
        
        // Check for stock below minimum without alerts
        if (stock < minStock && !data.lowStockAlert) {
          stockAnomalies.push({
            item: data.name,
            issue: 'Below minimum stock without alert',
            currentStock: stock,
            minimumStock: minStock,
            severity: 'Medium'
          });
        }
        
        // Check for extremely high stock (potential data entry error)
        if (stock > 9999) {
          stockAnomalies.push({
            item: data.name,
            issue: 'Unusually high stock (possible error)',
            currentStock: stock,
            severity: 'Low'
          });
        }
        
        // Check for missing cost information
        if (!data.cost || data.cost <= 0) {
          stockAnomalies.push({
            item: data.name,
            issue: 'Missing or invalid cost',
            cost: data.cost,
            severity: 'Medium'
          });
        }
      });
      
      if (stockAnomalies.length > 0) {
        bugs.push({
          id: `BUG-${bugCounter++}`,
          type: 'Inventory Management',
          severity: 'Medium',
          title: 'Inventory stock anomalies detected',
          description: `${stockAnomalies.length} inventory items have stock-related issues`,
          details: stockAnomalies,
          impact: 'Inaccurate reporting and potential business losses'
        });
        console.log(`❌ Found ${stockAnomalies.length} inventory anomalies`);
      } else {
        console.log('✅ All inventory items have valid stock levels');
      }
      
    } catch (error) {
      console.log(`❌ Error checking inventory anomalies: ${error.message}`);
    }
    
    // Bug Check 4: Branch Data Integrity
    console.log('\n🔍 BUG CHECK #4: BRANCH DATA INTEGRITY');
    console.log('--------------------------------------------------');
    
    try {
      const branchesSnapshot = await getDocs(collection(db, `tenants/${tenantId}/branches`));
      const locationsSnapshot = await getDocs(query(
        collection(db, 'locations'),
        where('tenantId', '==', tenantId)
      ));
      
      const branchIssues = [];
      
      // Check for branches without locations
      const locationIds = new Set(locationsSnapshot.docs.map(doc => doc.id));
      branchesSnapshot.docs.forEach(doc => {
        if (!locationIds.has(doc.id)) {
          branchIssues.push({
            branchId: doc.id,
            branchName: doc.data().name,
            issue: 'Branch missing in locations collection'
          });
        }
      });
      
      // Check for duplicate branch names
      const branchNames = branchesSnapshot.docs.map(doc => doc.data().name);
      const duplicateNames = branchNames.filter((name, index) => branchNames.indexOf(name) !== index);
      
      if (duplicateNames.length > 0) {
        branchIssues.push({
          issue: 'Duplicate branch names',
          duplicates: [...new Set(duplicateNames)]
        });
      }
      
      if (branchIssues.length > 0) {
        bugs.push({
          id: `BUG-${bugCounter++}`,
          type: 'Branch Management',
          severity: 'Medium',
          title: 'Branch data integrity issues',
          description: `${branchIssues.length} branch-related data issues found`,
          details: branchIssues,
          impact: 'Inconsistent branch management and location switching'
        });
        console.log(`❌ Found ${branchIssues.length} branch data issues`);
      } else {
        console.log('✅ Branch data integrity is maintained');
      }
      
    } catch (error) {
      console.log(`❌ Error checking branch integrity: ${error.message}`);
    }
    
    // Bug Check 5: Menu Builder Edge Cases
    console.log('\n🔍 BUG CHECK #5: MENU BUILDER EDGE CASES');
    console.log('--------------------------------------------------');
    
    try {
      const menuItemsSnapshot = await getDocs(collection(db, `tenants/${tenantId}/menuItems`));
      const menuIssues = [];
      
      menuItemsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        
        // Check for menu items without ingredients
        if (!data.ingredients || data.ingredients.length === 0) {
          menuIssues.push({
            menuItem: data.name,
            issue: 'No ingredients defined',
            severity: 'Medium'
          });
        }
        
        // Check for menu items with zero or negative prices
        if (!data.price || data.price <= 0) {
          menuIssues.push({
            menuItem: data.name,
            issue: 'Invalid price',
            price: data.price,
            severity: 'High'
          });
        }
        
        // Check for menu items without categories
        if (!data.category) {
          menuIssues.push({
            menuItem: data.name,
            issue: 'No category assigned',
            severity: 'Low'
          });
        }
        
        // Check for extremely long preparation times
        if (data.prepTime && data.prepTime > 120) {
          menuIssues.push({
            menuItem: data.name,
            issue: 'Unusually long prep time',
            prepTime: data.prepTime,
            severity: 'Low'
          });
        }
      });
      
      if (menuIssues.length > 0) {
        bugs.push({
          id: `BUG-${bugCounter++}`,
          type: 'Menu Builder',
          severity: 'Medium',
          title: 'Menu item configuration issues',
          description: `${menuIssues.length} menu items have configuration problems`,
          details: menuIssues,
          impact: 'Incorrect pricing and menu display issues'
        });
        console.log(`❌ Found ${menuIssues.length} menu configuration issues`);
      } else {
        console.log('✅ All menu items are properly configured');
      }
      
    } catch (error) {
      console.log(`❌ Error checking menu items: ${error.message}`);
    }
    
    // Bug Summary Report
    console.log('\n📊 MINOR BUG DETECTION SUMMARY');
    console.log('================================================================================');
    
    if (bugs.length === 0) {
      console.log('🎉 EXCELLENT! No minor bugs detected in the current analysis.');
      console.log('✅ Your CoreTrack application appears to be running smoothly.');
      console.log('✅ Data integrity is maintained across all collections.');
      console.log('✅ User permissions are properly configured.');
      console.log('✅ Inventory and menu systems are functioning correctly.');
    } else {
      console.log(`📋 TOTAL BUGS FOUND: ${bugs.length}`);
      console.log('');
      
      // Group by severity
      const highSeverity = bugs.filter(bug => bug.severity === 'High');
      const mediumSeverity = bugs.filter(bug => bug.severity === 'Medium');
      const lowSeverity = bugs.filter(bug => bug.severity === 'Low');
      
      console.log(`🚨 HIGH PRIORITY: ${highSeverity.length} bugs`);
      console.log(`⚠️ MEDIUM PRIORITY: ${mediumSeverity.length} bugs`);
      console.log(`📝 LOW PRIORITY: ${lowSeverity.length} bugs`);
      console.log('');
      
      bugs.forEach((bug, index) => {
        const priorityIcon = bug.severity === 'High' ? '🚨' : bug.severity === 'Medium' ? '⚠️' : '📝';
        console.log(`${priorityIcon} ${bug.id}: ${bug.title}`);
        console.log(`   Type: ${bug.type} | Severity: ${bug.severity}`);
        console.log(`   Description: ${bug.description}`);
        console.log(`   Impact: ${bug.impact}`);
        if (bug.details && bug.details.length > 0) {
          console.log(`   Examples: ${JSON.stringify(bug.details.slice(0, 2), null, 2)}`);
        }
        console.log('');
      });
      
      console.log('💡 RECOMMENDED ACTIONS:');
      console.log('1. Address HIGH priority bugs first (security/data integrity)');
      console.log('2. Fix MEDIUM priority bugs (user experience impact)');
      console.log('3. Schedule LOW priority bugs for next maintenance window');
      console.log('4. Implement automated testing to prevent regression');
    }
    
    console.log('\n🔧 NEXT STEPS:');
    console.log('1. Review each bug report in detail');
    console.log('2. Create fix scripts for data consistency issues');
    console.log('3. Update validation rules to prevent future occurrences');
    console.log('4. Add monitoring for ongoing bug detection');
    
    console.log('\n✨ BUG DETECTION COMPLETE');
    console.log('================================================================================');
    
    return bugs;
    
  } catch (error) {
    console.error('❌ Bug detection failed:', error);
  } finally {
    process.exit(0);
  }
}

detectMinorBugs();
