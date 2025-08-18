# 🎨 EMOJI SYNC FIX - BROWSER CONSOLE METHOD

## Copy and paste this into your browser console while logged into your app:

```javascript
// 🎨 EMOJI SYNC FIX FOR POS
console.log('🎨 Starting emoji sync fix...')

async function fixEmojiSync() {
  try {
    // Get Firebase instance from your app
    if (typeof window === 'undefined' || !window.firebase) {
      console.error('❌ Firebase not found. Make sure you are logged into your app.')
      return
    }
    
    const db = window.firebase.firestore()
    const auth = window.firebase.auth()
    
    if (!auth.currentUser) {
      console.error('❌ Not logged in. Please log into your restaurant app first.')
      return
    }
    
    const tenantId = auth.currentUser.uid
    const locationId = 'location_main-location-gJPRV0nFGiULXAW9nciyGad686z2'
    
    console.log('🔍 Fixing emoji sync for tenant:', tenantId)
    
    // Get all menu items
    const menuSnapshot = await db.collection('menuItems')
      .where('tenantId', '==', tenantId)
      .where('locationId', '==', locationId)
      .get()
    
    console.log(`📋 Found ${menuSnapshot.docs.length} menu items`)
    
    let fixed = 0
    
    for (const doc of menuSnapshot.docs) {
      const item = { id: doc.id, ...doc.data() }
      console.log(`🔍 Checking item: "${item.name}", emoji: "${item.emoji || 'none'}"`)
      
      // If no emoji set, set a default one
      let emojiToSync = item.emoji
      if (!emojiToSync) {
        emojiToSync = '🍽️' // Default emoji
        
        // Update menu item with default emoji
        await doc.ref.update({ emoji: emojiToSync })
        console.log(`✏️ Set default emoji for "${item.name}"`)
      }
      
      // Sync to POS
      const posDocRef = db.collection('pos')
        .doc(`${tenantId}_${locationId}`)
        .collection('menuItems')
        .doc(item.id)
      
      await posDocRef.set({
        ...item,
        emoji: emojiToSync,
        lastUpdated: window.firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true })
      
      console.log(`✅ Synced "${item.name}" with emoji "${emojiToSync}"`)
      fixed++
    }
    
    console.log(`\n🎉 EMOJI SYNC COMPLETE!`)
    console.log(`📊 Fixed ${fixed} items`)
    console.log(`✨ Your POS should now show the correct emojis!`)
    console.log(`\n📱 Go to your POS and refresh to see the changes`)
    
  } catch (error) {
    console.error('❌ Emoji sync failed:', error)
  }
}

// Run the fix
fixEmojiSync()
```

## How to use:

1. **Open your restaurant app** in the browser
2. **Make sure you're logged in** to your restaurant account  
3. **Open browser console** (F12, then click "Console" tab)
4. **Copy the entire JavaScript code above** (from `console.log('🎨 Starting...` to `fixEmojiSync()`)
5. **Paste it in console** and press Enter
6. **Wait for completion** - it will show progress messages
7. **Go to POS** and check if emojis now appear correctly

## What it does:

- ✅ Finds all your menu items for current branch
- ✅ Checks if they have emojis set
- ✅ Sets default 🍽️ emoji for items without emojis  
- ✅ Syncs all emojis to POS system
- ✅ Updates both MenuBuilder and POS collections

After running this, both existing items (like "coke" and "Coke Float 22 oz") and new items should show their selected emojis in POS instead of the default 🍽️.
