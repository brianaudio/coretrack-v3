/**
 * 🚀 QUICK CORETRACK BUG DETECTION TEST
 * 
 * This is a simplified version to quickly test for common issues
 */

console.log('🚀 QUICK CORETRACK BUG DETECTION TEST');
console.log('====================================');

const quickBugReport = {
  issues: [],
  warnings: [],
  performance: []
};

// Test 1: Check for console errors
function checkConsoleErrors() {
  console.log('\n🔍 Checking for console errors...');
  
  // Override console.error to capture errors
  const originalError = console.error;
  const errors = [];
  
  console.error = function(...args) {
    errors.push(args.join(' '));
    originalError.apply(console, args);
  };
  
  // Wait a bit to capture any existing errors
  setTimeout(() => {
    console.error = originalError;
    
    if (errors.length > 0) {
      quickBugReport.issues.push({
        type: 'Console Errors',
        count: errors.length,
        errors: errors.slice(0, 3) // Show first 3
      });
      console.log(`❌ Found ${errors.length} console errors`);
    } else {
      console.log('✅ No console errors detected');
    }
  }, 2000);
}

// Test 2: Check localStorage usage
function checkLocalStorage() {
  console.log('\n💾 Checking localStorage...');
  
  try {
    const storageItems = Object.keys(localStorage);
    console.log(`📦 Found ${storageItems.length} localStorage items`);
    
    // Check for potential issues
    storageItems.forEach(key => {
      const value = localStorage.getItem(key);
      
      if (value && value.length > 50000) {
        quickBugReport.warnings.push({
          type: 'Large localStorage Item',
          key: key,
          size: `${(value.length / 1024).toFixed(2)}KB`
        });
      }
      
      if (value && value.startsWith('{')) {
        try {
          JSON.parse(value);
        } catch (error) {
          quickBugReport.issues.push({
            type: 'Corrupted localStorage',
            key: key,
            error: error.message
          });
        }
      }
    });
    
    console.log('✅ localStorage check completed');
    
  } catch (error) {
    quickBugReport.issues.push({
      type: 'localStorage Access Error',
      error: error.message
    });
  }
}

// Test 3: Check memory usage
function checkMemoryUsage() {
  console.log('\n🧠 Checking memory usage...');
  
  if (performance.memory) {
    const memory = performance.memory;
    const usedMB = (memory.usedJSHeapSize / 1024 / 1024).toFixed(2);
    const limitMB = (memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2);
    
    console.log(`📊 Memory usage: ${usedMB}MB / ${limitMB}MB`);
    
    if (memory.usedJSHeapSize > 100 * 1024 * 1024) { // 100MB
      quickBugReport.performance.push({
        type: 'High Memory Usage',
        usage: `${usedMB}MB`,
        threshold: '100MB'
      });
    }
    
    if (memory.usedJSHeapSize > memory.totalJSHeapSize * 0.9) {
      quickBugReport.performance.push({
        type: 'Memory Pressure',
        usage: `${(memory.usedJSHeapSize / memory.totalJSHeapSize * 100).toFixed(1)}%`
      });
    }
  } else {
    console.log('⚠️ Memory API not available');
  }
}

// Test 4: Check DOM performance
function checkDOMPerformance() {
  console.log('\n🌐 Checking DOM performance...');
  
  const start = performance.now();
  
  // Count DOM elements
  const allElements = document.querySelectorAll('*');
  const elementCount = allElements.length;
  
  const end = performance.now();
  const queryTime = end - start;
  
  console.log(`📊 DOM elements: ${elementCount}, Query time: ${queryTime.toFixed(2)}ms`);
  
  if (elementCount > 5000) {
    quickBugReport.performance.push({
      type: 'Large DOM',
      elements: elementCount,
      threshold: 5000
    });
  }
  
  if (queryTime > 50) {
    quickBugReport.performance.push({
      type: 'Slow DOM Query',
      time: `${queryTime.toFixed(2)}ms`,
      threshold: '50ms'
    });
  }
}

// Test 5: Check for React errors
function checkReactErrors() {
  console.log('\n⚛️ Checking for React issues...');
  
  // Look for React error boundaries or hydration errors
  const errorElements = document.querySelectorAll('[data-reactroot] *');
  let reactIssues = 0;
  
  // Check for hydration mismatches (common Next.js issue)
  const textNodes = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );
  
  let node;
  while (node = textNodes.nextNode()) {
    if (node.textContent.includes('Hydration failed')) {
      reactIssues++;
    }
  }
  
  if (reactIssues > 0) {
    quickBugReport.issues.push({
      type: 'React Hydration Issues',
      count: reactIssues
    });
  }
  
  console.log(reactIssues > 0 ? `❌ Found ${reactIssues} React issues` : '✅ No React issues detected');
}

// Test 6: Check network requests
function checkNetworkRequests() {
  console.log('\n🌐 Monitoring network requests...');
  
  const originalFetch = window.fetch;
  const requests = [];
  
  window.fetch = function(...args) {
    const start = performance.now();
    
    return originalFetch.apply(this, args).then(response => {
      const end = performance.now();
      const duration = end - start;
      
      requests.push({
        url: args[0],
        status: response.status,
        duration: duration
      });
      
      if (duration > 5000) { // 5 second threshold
        quickBugReport.performance.push({
          type: 'Slow Network Request',
          url: args[0],
          duration: `${duration.toFixed(2)}ms`
        });
      }
      
      if (!response.ok) {
        quickBugReport.issues.push({
          type: 'Failed Network Request',
          url: args[0],
          status: response.status
        });
      }
      
      return response;
    });
  };
  
  // Restore after 10 seconds
  setTimeout(() => {
    window.fetch = originalFetch;
    console.log(`📡 Monitored ${requests.length} network requests`);
  }, 10000);
}

// Test 7: Check for Firebase issues
function checkFirebaseIssues() {
  console.log('\n🔥 Checking Firebase integration...');
  
  if (typeof firebase !== 'undefined') {
    console.log('✅ Firebase is available');
    
    const auth = firebase.auth();
    const user = auth.currentUser;
    
    if (user) {
      console.log(`✅ User authenticated: ${user.email}`);
      
      // Quick Firestore test
      const db = firebase.firestore();
      const start = performance.now();
      
      db.collection('test').limit(1).get()
        .then(() => {
          const end = performance.now();
          const duration = end - start;
          console.log(`🔥 Firestore response: ${duration.toFixed(2)}ms`);
          
          if (duration > 2000) {
            quickBugReport.performance.push({
              type: 'Slow Firestore Query',
              duration: `${duration.toFixed(2)}ms`
            });
          }
        })
        .catch(error => {
          quickBugReport.issues.push({
            type: 'Firestore Error',
            error: error.message
          });
        });
        
    } else {
      console.log('⚠️ No user authenticated');
      quickBugReport.warnings.push({
        type: 'No Authentication',
        description: 'User not logged in'
      });
    }
    
  } else {
    console.log('⚠️ Firebase not available');
    quickBugReport.warnings.push({
      type: 'Firebase Not Available',
      description: 'Firebase SDK not loaded'
    });
  }
}

// Generate quick report
function generateQuickReport() {
  console.log('\n📋 QUICK BUG DETECTION REPORT');
  console.log('=============================');
  
  const totalIssues = quickBugReport.issues.length;
  const totalWarnings = quickBugReport.warnings.length;
  const totalPerformance = quickBugReport.performance.length;
  
  console.log(`🐛 Issues Found: ${totalIssues}`);
  console.log(`⚠️  Warnings: ${totalWarnings}`);
  console.log(`⚡ Performance Concerns: ${totalPerformance}`);
  
  if (totalIssues > 0) {
    console.log('\n🚨 ISSUES DETECTED:');
    quickBugReport.issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.type}`, issue);
    });
  }
  
  if (totalWarnings > 0) {
    console.log('\n⚠️ WARNINGS:');
    quickBugReport.warnings.forEach((warning, index) => {
      console.log(`${index + 1}. ${warning.type}`, warning);
    });
  }
  
  if (totalPerformance > 0) {
    console.log('\n⚡ PERFORMANCE CONCERNS:');
    quickBugReport.performance.forEach((perf, index) => {
      console.log(`${index + 1}. ${perf.type}`, perf);
    });
  }
  
  // Overall health
  const healthScore = Math.max(0, 100 - (totalIssues * 20) - (totalWarnings * 5) - (totalPerformance * 10));
  const health = healthScore >= 90 ? 'EXCELLENT' :
               healthScore >= 75 ? 'GOOD' :
               healthScore >= 60 ? 'FAIR' : 'POOR';
  
  console.log(`\n🏆 QUICK HEALTH SCORE: ${healthScore}/100 (${health})`);
  
  // Store results
  window.quickCoreTrackBugReport = quickBugReport;
  
  return quickBugReport;
}

// Run all quick tests
async function runQuickBugDetection() {
  console.log('🚀 Starting quick CoreTrack bug detection...\n');
  
  checkConsoleErrors();
  checkLocalStorage();
  checkMemoryUsage();
  checkDOMPerformance();
  checkReactErrors();
  checkNetworkRequests();
  checkFirebaseIssues();
  
  // Generate report after tests complete
  setTimeout(() => {
    generateQuickReport();
  }, 3000);
}

// Auto-run
runQuickBugDetection();
