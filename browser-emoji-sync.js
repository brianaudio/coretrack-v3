// ========================================
// 🎨 BROWSER EMOJI SYNC SCRIPT
// ========================================
// Copy and paste this entire script into your browser console
// while you're logged into your restaurant app

console.log('🎨 STARTING EMOJI SYNC TO POS...')

async function syncMenuEmojisToPOS() {
  try {
    // Check if we're in Firebase environment
    if (typeof firebase === 'undefined' || !firebase.auth().currentUser) {
      console.error('❌ Please make sure you are logged into your restaurant app first!')
      return
    }

    const user = firebase.auth().currentUser
    const tenantId = user.uid // Adjust based on your auth structure
    
    console.log('🔍 Starting emoji sync for tenant:', tenantId)
    
    // Get all branches (locations)
    const locationsSnapshot = await firebase.firestore()
      .collection('locations')
      .where('tenantId', '==', tenantId)
      .get()
    
    console.log('📍 Found', locationsSnapshot.docs.length, 'locations')
    
    let totalSynced = 0
    
    for (const locationDoc of locationsSnapshot.docs) {
      const locationId = locationDoc.id
      const locationName = locationDoc.data().name || locationId
      
      console.log(`\n🏪 Processing location: ${locationName}`)
      
      // Get menu items for this location
      const menuItemsSnapshot = await firebase.firestore()
        .collection('menuItems')
        .where('tenantId', '==', tenantId)
        .where('locationId', '==', locationId)
        .get()
      
      console.log(`   📋 Found ${menuItemsSnapshot.docs.length} menu items`)
      
      for (const menuItemDoc of menuItemsSnapshot.docs) {
        const menuItem = { id: menuItemDoc.id, ...menuItemDoc.data() }
        
        if (menuItem.emoji) {
          console.log(`   🎨 Syncing emoji "${menuItem.emoji}" for "${menuItem.name}"`)
          
          // Sync to POS collection
          try {
            await firebase.firestore()
              .collection('pos')
              .doc(`${tenantId}_${locationId}`)
              .collection('menuItems')
              .doc(menuItem.id)
              .set({
                ...menuItem,
                emoji: menuItem.emoji,
                lastUpdated: new Date()
              }, { merge: true })
            
            totalSynced++
            console.log(`   ✅ Synced: ${menuItem.name}`)
          } catch (error) {
            console.error(`   ❌ Failed to sync ${menuItem.name}:`, error)
          }
        } else {
          console.log(`   ⚠️  No emoji set for "${menuItem.name}"`)
        }
      }
    }
    
    console.log(`\n🎉 EMOJI SYNC COMPLETE!`)
    console.log(`📊 Total items synced: ${totalSynced}`)
    console.log(`✨ Your POS should now show the correct emojis!`)
    
  } catch (error) {
    console.error('❌ Emoji sync failed:', error)
    console.log('\n🔧 Troubleshooting:')
    console.log('1. Make sure you are logged in to your restaurant app')
    console.log('2. Make sure you are on the correct tenant/restaurant')
    console.log('3. Check browser console for any additional error details')
  }
}

// Run the sync
syncMenuEmojisToPOS()
