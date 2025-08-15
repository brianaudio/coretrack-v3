import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthProvider } from '../lib/context/AuthContext'
import { BranchProvider } from '../lib/context/BranchContext'
import { ShiftProvider } from '../lib/context/ShiftContext'
import { SubscriptionProvider } from '../lib/context/SubscriptionContext'
import { UserPermissionsProvider } from '../lib/context/UserPermissionsContext'
import { BusinessSettingsProvider } from '../lib/context/BusinessSettingsContext'
import { MenuPOSSyncProvider } from '../lib/context/MenuPOSSyncContext'
import { UserProvider } from '../lib/rbac/UserContext'
import { ToastProvider } from '../components/ui/Toast'
import { HelpProvider } from '../lib/context/HelpContext'
import ErrorBoundary from '../components/ErrorBoundary'
import DataInitializer from '../components/DataInitializer'
import TrialExpirationHandler from '../components/TrialExpirationHandler'
import AIAssistant from '../components/AIAssistant'
import SimpleOnboarding from '../components/onboarding/SimpleOnboarding'
import HelpModal from '../components/HelpModal'

export const metadata: Metadata = {
  title: 'CoreTrack - Business Inventory Management',
  description: 'Complete inventory management system for businesses with offline capabilities',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.svg',
    apple: '/icon-192.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CoreTrack',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0ea5e9',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full" data-scroll-behavior="smooth">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.svg" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="format-detection" content="telephone=no" />
        {/* Inventory Diagnostic Tool */}
        <script dangerouslySetInnerHTML={{
          __html: `
            // INVENTORY DIAGNOSTIC TOOL - Auto-loaded
            window.addEventListener('load', function() {
              window.checkInventoryStatus = async function() {
                console.log('🔍 INVENTORY STATUS CHECK');
                console.log('=' .repeat(50));
                
                const TENANT_ID = 'halYcRuDyldZNDp9H1mgtqwDpZh2';
                
                try {
                  const { collection, getDocs } = await import('firebase/firestore');
                  const { db } = await import('../lib/firebase.js');
                  
                  const inventoryRef = collection(db, \`tenants/\${TENANT_ID}/inventory\`);
                  const snapshot = await getDocs(inventoryRef);
                  
                  console.log(\`📦 Found \${snapshot.size} inventory items:\`);
                  
                  if (snapshot.size === 0) {
                    console.log('📭 NO INVENTORY ITEMS FOUND');
                    console.log('💡 This could mean:');
                    console.log('   • No sales have been made yet');
                    console.log('   • Items are in a different location');
                    return;
                  }
                  
                  let hasDeductions = false;
                  const items = [];
                  
                  snapshot.docs.forEach((doc, index) => {
                    const data = doc.data();
                    const stock = data.currentStock || 0;
                    const isDeducted = stock < 99;
                    
                    if (isDeducted) hasDeductions = true;
                    
                    items.push({
                      name: data.name,
                      stock: stock,
                      isDeducted: isDeducted
                    });
                    
                    console.log(\`\${index + 1}. \${data.name}: \${stock} units \${isDeducted ? '🔻 (SOLD ITEMS)' : '🆕 (NEW ITEM)'}\`);
                  });
                  
                  console.log('\\n📊 DIAGNOSIS:');
                  if (hasDeductions) {
                    console.log('✅ INVENTORY DEDUCTION IS WORKING!');
                    console.log(\`   • \${items.filter(i => i.isDeducted).length} items show sales\`);
                    console.log(\`   • \${items.filter(i => !i.isDeducted).length} items are new (99 stock)\`);
                  } else {
                    console.log('❓ NO SALES DETECTED');
                    console.log('   • All items at 99 stock (newly created)');
                    console.log('   • Try making a sale and checking again');
                  }
                  
                  return { hasDeductions, totalItems: snapshot.size, items };
                  
                } catch (error) {
                  console.error('❌ Error checking inventory:', error.message);
                  console.log('🔧 Make sure you are on the main app page while logged in');
                  return null;
                }
              };
              
              console.log('✅ Inventory checker loaded! Type: checkInventoryStatus()');
              
              // CHECK MENU INGREDIENTS vs INVENTORY CENTER
              window.checkMenuIngredients = async function() {
                console.log('🔍 MENU INGREDIENTS vs INVENTORY CENTER CHECK');
                console.log('=' .repeat(60));
                
                const TENANT_ID = 'halYcRuDyldZNDp9H1mgtqwDpZh2';
                
                try {
                  const { collection, getDocs } = await import('firebase/firestore');
                  const { db } = await import('../lib/firebase.js');
                  
                  // CHECK MENU ITEMS INGREDIENTS
                  console.log('🍽️ CHECKING MENU ITEMS:');
                  const menuRef = collection(db, \`tenants/\${TENANT_ID}/menuItems\`);
                  const menuSnapshot = await getDocs(menuRef);
                  
                  console.log(\`   Found \${menuSnapshot.size} menu items:\`);
                  
                  menuSnapshot.docs.forEach((doc, index) => {
                    const data = doc.data();
                    console.log(\`\\n   \${index + 1}. \${data.name}:\`);
                    console.log(\`      Price: $\${data.price}\`);
                    console.log(\`      Has ingredients: \${data.ingredients ? 'YES' : 'NO'}\`);
                    
                    if (data.ingredients && data.ingredients.length > 0) {
                      console.log(\`      Ingredients (\${data.ingredients.length}):\`);
                      data.ingredients.forEach(ing => {
                        console.log(\`        - \${ing.inventoryItemName}: \${ing.quantity} \${ing.unit}\`);
                      });
                    } else {
                      console.log('      ❌ NO INGREDIENTS CONFIGURED!');
                      console.log('      💡 This is why inventory deduction fails!');
                    }
                  });
                  
                  // CHECK ACTUAL INVENTORY CENTER
                  console.log('\\n📦 CHECKING INVENTORY CENTER:');
                  const invRef = collection(db, \`tenants/\${TENANT_ID}/inventory\`);
                  const invSnapshot = await getDocs(invRef);
                  
                  console.log(\`   Found \${invSnapshot.size} inventory items:\`);
                  
                  const ingredientInventory = [];
                  const finishedProductInventory = [];
                  
                  invSnapshot.docs.forEach((doc, index) => {
                    const data = doc.data();
                    const stock = data.currentStock || 0;
                    
                    // Categorize items
                    const isIngredient = ['cup', 'straw', 'lid', 'syrup', 'ice', 'cream'].some(keyword => 
                      data.name.toLowerCase().includes(keyword)
                    );
                    
                    const item = \`\${data.name}: \${stock} \${data.unit || 'units'}\`;
                    
                    if (isIngredient) {
                      ingredientInventory.push(item);
                    } else {
                      finishedProductInventory.push(item);
                    }
                    
                    console.log(\`   \${index + 1}. \${item} \${isIngredient ? '🧪 (INGREDIENT)' : '🍽️ (FINISHED PRODUCT)'}\`);
                  });
                  
                  console.log('\\n🎯 SUMMARY:');
                  console.log(\`   Ingredient items: \${ingredientInventory.length}\`);
                  console.log(\`   Finished product items: \${finishedProductInventory.length}\`);
                  
                  if (ingredientInventory.length > 0) {
                    console.log('\\n🧪 INGREDIENTS IN INVENTORY:');
                    ingredientInventory.forEach(item => console.log(\`     ✅ \${item}\`));
                  }
                  
                  if (finishedProductInventory.length > 0) {
                    console.log('\\n🍽️ FINISHED PRODUCTS IN INVENTORY:');
                    finishedProductInventory.forEach(item => console.log(\`     🔸 \${item}\`));
                  }
                  
                  console.log('\\n💡 TO FIX THE ISSUE:');
                  console.log('   1. Go to Menu Builder');
                  console.log('   2. Edit each menu item (Coke Float 16 oz, etc.)');
                  console.log('   3. Add ingredients like: 1x Cups 16 oz, 1x Straw, etc.');
                  console.log('   4. Save the menu item');
                  console.log('   5. Test a sale - ingredients should deduct properly!');
                  
                  return {
                    menuItems: menuSnapshot.size,
                    inventoryItems: invSnapshot.size,
                    ingredientItems: ingredientInventory.length,
                    finishedProductItems: finishedProductInventory.length
                  };
                  
                } catch (error) {
                  console.error('❌ Error checking menu ingredients:', error.message);
                  return null;
                }
              };
              
              console.log('✅ Menu ingredients checker loaded! Type: checkMenuIngredients()');
              
              // COMPREHENSIVE DIAGNOSTIC - Check orders AND inventory
              window.fullDiagnostic = async function() {
                console.log('🔍 FULL SYSTEM DIAGNOSTIC');
                console.log('=' .repeat(60));
                
                const TENANT_ID = 'halYcRuDyldZNDp9H1mgtqwDpZh2';
                
                try {
                  const { collection, getDocs, query, orderBy, limit } = await import('firebase/firestore');
                  const { db } = await import('../lib/firebase.js');
                  
                  // CHECK RECENT ORDERS
                  console.log('📋 CHECKING RECENT ORDERS:');
                  const ordersRef = collection(db, \`tenants/\${TENANT_ID}/posOrders\`);
                  const ordersQuery = query(ordersRef, orderBy('createdAt', 'desc'), limit(10));
                  const ordersSnapshot = await getDocs(ordersQuery);
                  
                  console.log(\`   Found \${ordersSnapshot.size} recent orders\`);
                  
                  let completedOrders = 0;
                  let totalItemsSold = 0;
                  
                  ordersSnapshot.docs.forEach((doc, index) => {
                    const data = doc.data();
                    if (data.status === 'completed') {
                      completedOrders++;
                      if (data.items) totalItemsSold += data.items.length;
                    }
                    
                    console.log(\`   \${index + 1}. \${data.orderNumber || doc.id.slice(-6)} - \${data.status} - \$\${data.total} - \${data.items?.length || 0} items\`);
                  });
                  
                  console.log(\`   ✅ Completed Orders: \${completedOrders}\`);
                  console.log(\`   📦 Total Items Sold: \${totalItemsSold}\`);
                  
                  // CHECK INVENTORY
                  console.log('\\n📦 CHECKING INVENTORY:');
                  const inventoryRef = collection(db, \`tenants/\${TENANT_ID}/inventory\`);
                  const inventorySnapshot = await getDocs(inventoryRef);
                  
                  console.log(\`   Found \${inventorySnapshot.size} inventory items\`);
                  
                  let itemsWithDeductions = 0;
                  
                  inventorySnapshot.docs.forEach((doc, index) => {
                    const data = doc.data();
                    const stock = data.currentStock || 0;
                    const isDeducted = stock < 99;
                    
                    if (isDeducted) itemsWithDeductions++;
                    
                    console.log(\`   \${index + 1}. \${data.name}: \${stock} units \${isDeducted ? '🔻 (DEDUCTED)' : '🆕 (FULL STOCK)'}\`);
                  });
                  
                  // FINAL DIAGNOSIS
                  console.log('\\n🎯 FINAL DIAGNOSIS:');
                  console.log(\`   Orders Made: \${ordersSnapshot.size}\`);
                  console.log(\`   Completed Orders: \${completedOrders}\`);
                  console.log(\`   Items Sold: \${totalItemsSold}\`);
                  console.log(\`   Inventory Items with Deductions: \${itemsWithDeductions}\`);
                  
                  if (completedOrders > 0 && itemsWithDeductions === 0) {
                    console.log('\\n❌ PROBLEM CONFIRMED: Sales made but NO inventory deductions!');
                    console.log('💡 The inventory deduction system is NOT working properly.');
                  } else if (completedOrders > 0 && itemsWithDeductions > 0) {
                    console.log('\\n✅ SYSTEM WORKING: Sales made AND inventory deducted!');
                  } else {
                    console.log('\\n⚠️ No completed sales to analyze yet.');
                  }
                  
                  return {
                    ordersMade: ordersSnapshot.size,
                    completedOrders,
                    itemsSold: totalItemsSold,
                    inventoryDeductions: itemsWithDeductions
                  };
                  
                } catch (error) {
                  console.error('❌ Error in full diagnostic:', error.message);
                  return null;
                }
              };
              
              console.log('✅ Full diagnostic loaded! Type: fullDiagnostic()');
              
              // Make it available immediately
              if (typeof window !== 'undefined') {
                window.fullDiagnostic = window.fullDiagnostic;
              }
              
              // Auto-monitor for inventory changes (runs every 10 seconds)
              window.startInventoryMonitoring = function() {
                console.log('🔍 Starting automatic inventory monitoring...');
                let previousInventory = {};
                
                const monitor = async () => {
                  try {
                    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js');
                    const { getFirestore, collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js');
                    
                    const firebaseConfig = {
                      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
                      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
                      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
                      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
                      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
                    };
                    
                    const app = initializeApp(firebaseConfig);
                    const db = getFirestore(app);
                    const tenantId = 'halYcRuDyldZNDp9H1mgtqwDpZh2';
                    
                    const inventoryRef = collection(db, \`tenants/\${tenantId}/inventory\`);
                    const snapshot = await getDocs(inventoryRef);
                    
                    const currentInventory = {};
                    snapshot.docs.forEach(doc => {
                      const data = doc.data();
                      currentInventory[doc.id] = { name: data.name, quantity: data.currentStock || data.quantity || 0 };
                    });
                    
                    // Check for changes
                    for (const [itemId, item] of Object.entries(currentInventory)) {
                      if (previousInventory[itemId] && previousInventory[itemId].quantity !== item.quantity) {
                        console.log(\`🔄 INVENTORY CHANGE DETECTED: \${item.name} changed from \${previousInventory[itemId].quantity} to \${item.quantity}\`);
                      }
                    }
                    
                    previousInventory = { ...currentInventory };
                    
                  } catch (error) {
                    console.error('❌ Error monitoring inventory:', error);
                  }
                };
                
                // Run immediately, then every 10 seconds
                monitor();
                const interval = setInterval(monitor, 10000);
                
                console.log('✅ Inventory monitoring started! Changes will be logged automatically.');
                return interval;
              };
              
              console.log('✅ Inventory monitor loaded! Type: startInventoryMonitoring()');
              
              // SIMPLE INVENTORY CHECK
              window.checkDeductionNow = async function() {
                console.log('🔍 SIMPLE DEDUCTION CHECK');
                console.log('=' .repeat(40));
                
                const TENANT_ID = 'halYcRuDyldZNDp9H1mgtqwDpZh2';
                
                try {
                  const { collection, getDocs } = await import('firebase/firestore');
                  const { db } = await import('../lib/firebase.js');
                  
                  // Step 1: Get current inventory state
                  console.log('📦 STEP 1: Getting current inventory state...');
                  const inventoryRef = collection(db, \`tenants/\${TENANT_ID}/inventory\`);
                  const inventorySnapshot = await getDocs(inventoryRef);
                  
                  const beforeState = {};
                  inventorySnapshot.docs.forEach(doc => {
                    const data = doc.data();
                    beforeState[doc.id] = {
                      name: data.name,
                      stock: data.currentStock || 0
                    };
                    console.log(\`   \${data.name}: \${data.currentStock || 0} units\`);
                  });
                  
                  // Step 2: Find Coke Float 16 oz and check its ingredients
                  console.log('\\n🍽️ STEP 2: Analyzing Coke Float 16 oz ingredients...');
                  const menuRef = collection(db, \`tenants/\${TENANT_ID}/menuItems\`);
                  const menuSnapshot = await getDocs(menuRef);
                  
                  let cokeFloat = null;
                  menuSnapshot.docs.forEach(docSnap => {
                    const data = docSnap.data();
                    if (data.name === 'Coke Float 16 oz') {
                      cokeFloat = { id: docSnap.id, ...data };
                    }
                  });
                  
                  if (!cokeFloat) {
                    console.log('❌ Coke Float 16 oz not found in menu');
                    return;
                  }
                  
                  console.log(\`✅ Found Coke Float 16 oz with \${cokeFloat.ingredients?.length || 0} ingredients:\`);
                  
                  if (!cokeFloat.ingredients || cokeFloat.ingredients.length === 0) {
                    console.log('❌ NO INGREDIENTS CONFIGURED! This is the problem.');
                    console.log('💡 Go to Menu Builder and add ingredients to this item.');
                    return;
                  }
                  
                  // Step 3: Check ingredient mapping
                  console.log('\\n🔍 STEP 3: Checking ingredient mapping...');
                  const ingredientMappings = [];
                  
                  for (const ingredient of cokeFloat.ingredients) {
                    console.log(\`   Ingredient: \${ingredient.inventoryItemName} (Qty: \${ingredient.quantity} \${ingredient.unit})\`);
                    console.log(\`   Looking for ID: \${ingredient.inventoryItemId}\`);
                    
                    // Check if this inventory item exists
                    try {
                      const invDoc = await getDoc(doc(db, \`tenants/\${TENANT_ID}/inventory\`, ingredient.inventoryItemId));
                      if (invDoc.exists()) {
                        const invData = invDoc.data();
                        console.log(\`   ✅ Found inventory item: \${invData.name} (Stock: \${invData.currentStock})\`);
                        
                        if (ingredient.inventoryItemName === invData.name) {
                          console.log(\`   ✅ Names match perfectly!\`);
                          ingredientMappings.push({
                            ingredient,
                            inventoryData: invData,
                            inventoryId: ingredient.inventoryItemId,
                            canDeduct: invData.currentStock >= ingredient.quantity
                          });
                        } else {
                          console.log(\`   ⚠️  NAME MISMATCH: Menu expects '\${ingredient.inventoryItemName}' but inventory has '\${invData.name}'\`);
                          console.log(\`   🔧 This will prevent deduction! Need to fix in Menu Builder.\`);
                        }
                      } else {
                        console.log(\`   ❌ Inventory item not found!\`);
                      }
                    } catch (error) {
                      console.log(\`   ❌ Error checking inventory: \${error.message}\`);
                    }
                  }
                  
                  // Step 4: Simulate deduction
                  console.log(\`\\n⚡ STEP 4: Simulating inventory deduction...\`);
                  
                  if (ingredientMappings.length === 0) {
                    console.log('❌ No valid ingredient mappings found! Cannot deduct.');
                    console.log('💡 Fix the ingredient names in Menu Builder to match inventory exactly.');
                    return;
                  }
                  
                  let deductionSuccess = true;
                  
                  for (const mapping of ingredientMappings) {
                    if (mapping.canDeduct) {
                      const newStock = mapping.inventoryData.currentStock - mapping.ingredient.quantity;
                      console.log(\`   ✅ Would deduct \${mapping.ingredient.quantity} from \${mapping.inventoryData.name}: \${mapping.inventoryData.currentStock} → \${newStock}\`);
                    } else {
                      console.log(\`   ❌ Insufficient stock for \${mapping.inventoryData.name}: need \${mapping.ingredient.quantity}, have \${mapping.inventoryData.currentStock}\`);
                      deductionSuccess = false;
                    }
                  }
                  
                  if (deductionSuccess) {
                    console.log('\\n🎉 INVENTORY DEDUCTION SIMULATION SUCCESSFUL!');
                    console.log('💡 Your system should work. Try making a real sale now.');
                  } else {
                    console.log('\\n❌ INVENTORY DEDUCTION WOULD FAIL due to insufficient stock.');
                  }
                  
                  return {
                    menuItem: cokeFloat.name,
                    ingredients: cokeFloat.ingredients?.length || 0,
                    validMappings: ingredientMappings.length,
                    canDeduct: deductionSuccess
                  };
                  
                } catch (error) {
                  console.error('❌ Error in deduction test:', error.message);
                  return null;
                }
              };
              
              console.log('✅ Real-time deduction test loaded! Type: testRealTimeDeduction()');
              
              // QUICK FIX FOR NAME MISMATCHES
              window.fixIngredientNames = async function() {
                console.log('🔧 FIXING INGREDIENT NAME MISMATCHES');
                console.log('=' .repeat(40));
                
                const TENANT_ID = 'halYcRuDyldZNDp9H1mgtqwDpZh2';
                
                try {
                  const { collection, getDocs, doc, getDoc, updateDoc } = await import('firebase/firestore');
                  const { db } = await import('../lib/firebase.js');
                  
                  console.log('🔍 Checking Coke Float 16 oz ingredient...');
                  
                  // Get menu items
                  const menuRef = collection(db, \`tenants/\${TENANT_ID}/menuItems\`);
                  const menuSnapshot = await getDocs(menuRef);
                  
                  let cokeFloat = null;
                  menuSnapshot.docs.forEach(docSnap => {
                    const data = docSnap.data();
                    if (data.name === 'Coke Float 16 oz') {
                      cokeFloat = { id: docSnap.id, ...data };
                    }
                  });
                  
                  if (!cokeFloat || !cokeFloat.ingredients || cokeFloat.ingredients.length === 0) {
                    console.log('❌ Coke Float 16 oz has no ingredients configured!');
                    return;
                  }
                  
                  console.log(\`📋 Current ingredients (\${cokeFloat.ingredients.length}):\`);
                  
                  let needsUpdate = false;
                  const updatedIngredients = [];
                  
                  for (const ingredient of cokeFloat.ingredients) {
                    console.log(\`   \${ingredient.inventoryItemName} (ID: \${ingredient.inventoryItemId})\`);
                    
                    // Check actual inventory name
                    const invDoc = await getDoc(doc(db, \`tenants/\${TENANT_ID}/inventory\`, ingredient.inventoryItemId));
                    if (invDoc.exists()) {
                      const invData = invDoc.data();
                      console.log(\`     Actual inventory name: \${invData.name}\`);
                      
                      if (ingredient.inventoryItemName !== invData.name) {
                        console.log(\`     🔧 FIXING: \${ingredient.inventoryItemName} → \${invData.name}\`);
                        needsUpdate = true;
                        updatedIngredients.push({
                          ...ingredient,
                          inventoryItemName: invData.name
                        });
                      } else {
                        console.log(\`     ✅ Names match!\`);
                        updatedIngredients.push(ingredient);
                      }
                    } else {
                      console.log(\`     ❌ Inventory item not found!\`);
                      updatedIngredients.push(ingredient);
                    }
                  }
                  
                  if (needsUpdate) {
                    console.log('\\n💾 Updating menu item with correct ingredient names...');
                    const menuItemRef = doc(db, \`tenants/\${TENANT_ID}/menuItems\`, cokeFloat.id);
                    await updateDoc(menuItemRef, {
                      ingredients: updatedIngredients
                    });
                    console.log('✅ Menu item updated successfully!');
                    console.log('🎉 Try making a sale now - inventory should deduct properly!');
                  } else {
                    console.log('\\n✅ All ingredient names are correct! No fix needed.');
                  }
                  
                } catch (error) {
                  console.error('❌ Error fixing ingredient names:', error.message);
                }
              };
              
              console.log('✅ Ingredient name fixer loaded! Type: fixIngredientNames()');
            });
          `
        }} />
      </head>
      <body className="h-full bg-surface-50">
        <DataInitializer />
        <ErrorBoundary>
          <AuthProvider>
            <BranchProvider>
              <ShiftProvider>
                <UserProvider>
                  <BusinessSettingsProvider>
                    <SubscriptionProvider>
                      <UserPermissionsProvider>
                        <MenuPOSSyncProvider>
                          <HelpProvider>
                            <ToastProvider>
                              <TrialExpirationHandler>
                                <SimpleOnboarding />
                                {children}
                                <AIAssistant />
                                <HelpModal />
                              </TrialExpirationHandler>
                            </ToastProvider>
                          </HelpProvider>
                        </MenuPOSSyncProvider>
                      </UserPermissionsProvider>
                    </SubscriptionProvider>
                  </BusinessSettingsProvider>
                </UserProvider>
              </ShiftProvider>
            </BranchProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
