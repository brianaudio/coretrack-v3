// Emergency script to resync menu item emojis to POS
// This will ensure all menu items in POS show the correct emoji selected in Menu Builder

(async function resyncMenuEmojisToPOS() {
  try {
    console.log('🎨 RESYNC MENU EMOJIS TO POS');
    console.log('==================================');

    // Get your Firebase config (you may need to adjust these)
    const projectId = 'coretrack-dabbe';
    const tenantId = 'bKfEqLaYPy7LCEHqDHJd';

    // Firebase REST API endpoint
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
    
    // Get auth token (assuming you're logged in)
    const authToken = await new Promise((resolve, reject) => {
      if (typeof firebase !== 'undefined' && firebase.auth?.currentUser) {
        firebase.auth().currentUser.getIdToken().then(resolve).catch(reject);
      } else {
        reject(new Error('Please make sure you are logged in to Firebase'));
      }
    });

    console.log('🔍 Fetching all menu items...');
    
    // Get all menu items
    const menuResponse = await fetch(`${baseUrl}/tenants/${tenantId}/menuItems`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (!menuResponse.ok) {
      throw new Error(`Failed to fetch menu items: ${menuResponse.statusText}`);
    }
    
    const menuData = await menuResponse.json();
    const menuItems = menuData.documents || [];
    
    console.log(`📋 Found ${menuItems.length} menu items`);

    // Get all POS items  
    const posResponse = await fetch(`${baseUrl}/tenants/${tenantId}/posItems`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (!posResponse.ok) {
      throw new Error(`Failed to fetch POS items: ${posResponse.statusText}`);
    }
    
    const posData = await posResponse.json();
    const posItems = posData.documents || [];
    
    console.log(`🛒 Found ${posItems.length} POS items`);
    console.log('');

    let updatedCount = 0;
    let skippedCount = 0;

    // Process each menu item
    for (const menuItem of menuItems) {
      const menuItemId = menuItem.name.split('/').pop();
      const menuName = menuItem.fields?.name?.stringValue || 'Unknown';
      const menuEmoji = menuItem.fields?.emoji?.stringValue || '🍽️';
      
      console.log(`🔍 Processing: "${menuName}" (${menuEmoji})`);
      
      // Find corresponding POS item
      const correspondingPOSItem = posItems.find(posItem => 
        posItem.fields?.menuItemId?.stringValue === menuItemId
      );
      
      if (!correspondingPOSItem) {
        console.log(`   ⚠️ No corresponding POS item found, skipping`);
        skippedCount++;
        continue;
      }
      
      const posItemId = correspondingPOSItem.name.split('/').pop();
      const currentPOSEmoji = correspondingPOSItem.fields?.emoji?.stringValue || '🍽️';
      
      // Check if emoji needs updating
      if (currentPOSEmoji === menuEmoji) {
        console.log(`   ✅ POS emoji already matches (${currentPOSEmoji}), skipping`);
        skippedCount++;
        continue;
      }
      
      console.log(`   🔄 Updating POS emoji: ${currentPOSEmoji} → ${menuEmoji}`);
      
      // Update POS item with correct emoji
      const updateData = {
        fields: {
          ...correspondingPOSItem.fields,
          emoji: { stringValue: menuEmoji },
          updatedAt: { timestampValue: new Date().toISOString() }
        }
      };
      
      const updateResponse = await fetch(`${baseUrl}/tenants/${tenantId}/posItems/${posItemId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });
      
      if (updateResponse.ok) {
        console.log(`   ✅ Successfully updated POS item`);
        updatedCount++;
      } else {
        console.log(`   ❌ Failed to update POS item: ${updateResponse.statusText}`);
      }
    }
    
    console.log('');
    console.log('🎉 EMOJI RESYNC COMPLETE!');
    console.log('========================');
    console.log(`📊 Results:`);
    console.log(`   • Menu Items Processed: ${menuItems.length}`);
    console.log(`   • POS Items Updated: ${updatedCount}`);
    console.log(`   • Items Skipped: ${skippedCount}`);
    console.log('');
    console.log('🔄 Refreshing POS in 3 seconds...');
    
    // Refresh the POS page
    setTimeout(() => {
      if (window.location.pathname.includes('/pos')) {
        window.location.reload();
      } else {
        window.location.href = '/pos';
      }
    }, 3000);
    
  } catch (error) {
    console.error('❌ Emoji resync failed:', error);
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('1. Make sure you are logged in to Firebase');
    console.log('2. Make sure you are on the correct tenant/restaurant');
    console.log('3. Try refreshing the page and running the script again');
  }
})();

console.log('');
console.log('🎨 MENU EMOJI RESYNC SCRIPT');
console.log('===========================');
console.log('This script will sync the emojis you selected in Menu Builder to the POS system.');
console.log('');
console.log('📋 To run this script:');
console.log('1. Make sure you are logged in to your restaurant app');
console.log('2. Open browser console (F12)');
console.log('3. Copy and paste this entire script');
console.log('4. Press Enter to run');
console.log('5. Wait for completion, then check your POS');
