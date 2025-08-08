/**
 * 🧪 CoreTrack Offline Functionality Test
 * 
 * Run this in the browser console of your installed PWA to test offline features
 */

console.log('🚀 Testing CoreTrack Offline Functionality...\n');

const testOfflineFeatures = async () => {
  // Test 1: Check if running as installed PWA
  console.log('📱 Test 1: PWA Installation Status');
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
    console.log('✅ Running as installed PWA in standalone mode');
  } else {
    console.log('ℹ️  Running in browser (not standalone PWA)');
  }
  
  // Test 2: Check Service Worker
  console.log('\n🔧 Test 2: Service Worker Status');
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      if (registrations.length > 0) {
        console.log('✅ Service Worker active:', registrations[0].active?.scriptURL);
        console.log('   Scope:', registrations[0].scope);
      } else {
        console.log('❌ No active Service Worker');
      }
    } catch (error) {
      console.log('❌ Service Worker error:', error);
    }
  }
  
  // Test 3: Check Cache Storage
  console.log('\n💾 Test 3: Cache Storage');
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      console.log(`✅ Found ${cacheNames.length} cache(s):`);
      cacheNames.forEach(name => console.log(`   - ${name}`));
    } catch (error) {
      console.log('❌ Cache storage error:', error);
    }
  }
  
  // Test 4: Check IndexedDB (Firebase offline)
  console.log('\n🗄️  Test 4: IndexedDB Storage');
  if ('indexedDB' in window) {
    try {
      const dbs = await indexedDB.databases();
      console.log(`✅ Found ${dbs.length} IndexedDB database(s):`);
      dbs.forEach(db => console.log(`   - ${db.name} (v${db.version})`));
    } catch (error) {
      console.log('❌ IndexedDB error:', error);
    }
  }
  
  // Test 5: Check Background Sync Service
  console.log('\n🔄 Test 5: Background Sync Service');
  try {
    // Check if our sync service is available
    if (window.BackgroundSyncService) {
      console.log('✅ Background Sync Service loaded');
      const queue = window.BackgroundSyncService.getQueue();
      console.log(`   Queue size: ${queue.length} items`);
    } else {
      console.log('ℹ️  Background Sync Service not exposed to window (this is normal)');
    }
    
    // Check localStorage for sync queue
    const syncQueue = localStorage.getItem('coretrack_sync_queue');
    if (syncQueue) {
      const queue = JSON.parse(syncQueue);
      console.log(`✅ Sync queue in localStorage: ${queue.length} items`);
    } else {
      console.log('ℹ️  No items in sync queue (this is normal if no offline actions)');
    }
  } catch (error) {
    console.log('❌ Background sync error:', error);
  }
  
  // Test 6: Network Status
  console.log('\n📡 Test 6: Network Status');
  console.log(`Current status: ${navigator.onLine ? '🟢 Online' : '🔴 Offline'}`);
  
  // Add network listeners
  window.addEventListener('online', () => {
    console.log('🟢 Network: Back online! Sync should trigger automatically.');
  });
  
  window.addEventListener('offline', () => {
    console.log('🔴 Network: Gone offline! Operations will be queued.');
  });
  
  console.log('\n🎯 Test Complete! Summary:');
  console.log('• Service Worker should be active');
  console.log('• Multiple caches should be present');
  console.log('• IndexedDB should have Firebase data');
  console.log('• Network status is being monitored');
  
  console.log('\n📋 Next Steps:');
  console.log('1. Go to Network tab in DevTools');
  console.log('2. Check "Offline" to simulate offline mode');
  console.log('3. Try creating POS orders - they should queue');
  console.log('4. Uncheck "Offline" - orders should sync automatically');
  
  return {
    serviceWorkerActive: 'serviceWorker' in navigator,
    cachesAvailable: 'caches' in window,
    indexedDBAvailable: 'indexedDB' in window,
    isStandalone: window.matchMedia && window.matchMedia('(display-mode: standalone)').matches,
    isOnline: navigator.onLine
  };
};

// Run the test
testOfflineFeatures().then(results => {
  console.log('\n📊 Test Results:', results);
});

// Make function available for manual testing
window.testOfflineFeatures = testOfflineFeatures;

console.log('\n💡 Tip: You can run testOfflineFeatures() again anytime!');
