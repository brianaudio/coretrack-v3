/**
 * 🔍 PWA Installation Debug Script
 * 
 * This script helps diagnose why the PWA install button might not be visible
 */

console.log('🔍 Checking PWA Installation Requirements...\n');

// Function to check PWA installability in browser console
const checkPWAInstallability = () => {
  console.log('📱 PWA Installation Checklist:');
  
  // 1. Check if service worker is registered
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      if (registrations.length > 0) {
        console.log('✅ Service Worker registered:', registrations.length, 'worker(s)');
        registrations.forEach((reg, index) => {
          console.log(`   Worker ${index + 1}:`, reg.scope);
        });
      } else {
        console.log('❌ No Service Workers registered');
      }
    });
  } else {
    console.log('❌ Service Worker not supported');
  }
  
  // 2. Check manifest
  const manifestLink = document.querySelector('link[rel="manifest"]');
  if (manifestLink) {
    console.log('✅ Manifest link found:', manifestLink.href);
    
    // Fetch and validate manifest
    fetch(manifestLink.href)
      .then(response => response.json())
      .then(manifest => {
        console.log('✅ Manifest loaded successfully');
        console.log('   Name:', manifest.name);
        console.log('   Start URL:', manifest.start_url);
        console.log('   Display:', manifest.display);
        console.log('   Icons:', manifest.icons?.length || 0, 'icons');
        
        // Check for required fields
        const requiredFields = ['name', 'start_url', 'display', 'icons'];
        const missingFields = requiredFields.filter(field => !manifest[field]);
        
        if (missingFields.length === 0) {
          console.log('✅ All required manifest fields present');
        } else {
          console.log('❌ Missing manifest fields:', missingFields);
        }
      })
      .catch(error => {
        console.log('❌ Error loading manifest:', error);
      });
  } else {
    console.log('❌ No manifest link found in HTML');
  }
  
  // 3. Check HTTPS (required for PWA)
  if (location.protocol === 'https:' || location.hostname === 'localhost') {
    console.log('✅ HTTPS/localhost requirement met');
  } else {
    console.log('❌ PWA requires HTTPS or localhost');
  }
  
  // 4. Check beforeinstallprompt event
  let installPromptEvent = null;
  
  window.addEventListener('beforeinstallprompt', (e) => {
    console.log('✅ PWA install prompt available!');
    installPromptEvent = e;
    
    // Prevent the default mini-infobar from appearing
    e.preventDefault();
    
    // Show custom install button or trigger install
    console.log('🚀 You can now install the PWA!');
    console.log('💡 Run installPWA() in console to trigger install');
    
    // Make install function available globally
    window.installPWA = () => {
      if (installPromptEvent) {
        installPromptEvent.prompt();
        installPromptEvent.userChoice.then((result) => {
          console.log('User choice:', result.outcome);
          if (result.outcome === 'accepted') {
            console.log('✅ PWA installed successfully!');
          } else {
            console.log('❌ PWA installation declined');
          }
          installPromptEvent = null;
        });
      }
    };
  });
  
  // 5. Check if already installed
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
    console.log('✅ PWA is already installed and running in standalone mode');
  }
  
  // 6. Additional Chrome-specific checks
  setTimeout(() => {
    if (!installPromptEvent) {
      console.log('\n🔍 PWA install prompt not triggered. Possible reasons:');
      console.log('   • App might already be installed');
      console.log('   • Browser doesn\'t support PWA installation');
      console.log('   • Missing required PWA criteria');
      console.log('   • Need to interact with page first (user gesture required)');
      console.log('\n💡 Try:');
      console.log('   1. Check Chrome DevTools > Application > Manifest');
      console.log('   2. Look for install banner in address bar');
      console.log('   3. Chrome menu > Install CoreTrack...');
    }
  }, 3000);
};

// Auto-run when script loads
if (typeof window !== 'undefined') {
  // Browser environment
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkPWAInstallability);
  } else {
    checkPWAInstallability();
  }
} else {
  // Node.js environment
  console.log('ℹ️  This script should be run in the browser console');
  console.log('📝 Copy and paste this script into browser DevTools console on your CoreTrack app');
}

// Export for browser console
if (typeof window !== 'undefined') {
  window.checkPWAInstallability = checkPWAInstallability;
}
