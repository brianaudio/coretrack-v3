// Simple category debug without Firebase admin
console.log('🔍 Debugging Modal Categories Issue');
console.log('\n📋 Common Causes for Empty Category Dropdown:');
console.log('1. Categories array is empty');
console.log('2. All categories have isActive = false');  
console.log('3. Categories not loaded properly');
console.log('4. Branch-specific filtering removing all categories');

console.log('\n🔧 In MenuBuilder.tsx, the category filtering is:');
console.log('categories.filter(cat => cat.isActive).map(cat => ...)');

console.log('\n💡 To debug:');
console.log('1. Open browser dev tools');
console.log('2. Go to Menu Builder');
console.log('3. Click "Add Menu Item"');  
console.log('4. Check console for:');
console.log('   - How many categories loaded');
console.log('   - How many are active');
console.log('   - What the categories array contains');

console.log('\n🔍 Add this to EnhancedMenuItemModal component:');
console.log('console.log("Categories received:", categories);');
console.log('console.log("Active categories:", categories.filter(cat => cat.isActive));');
