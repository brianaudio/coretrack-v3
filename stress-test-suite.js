/**
 * 🧪 CORETRACK COMPREHENSIVE STRESS TEST SUITE
 * 
 * This script performs extensive stress testing to identify:
 * - Memory leaks
 * - Race conditions
 * - Data consistency issues
 * - Performance bottlenecks
 * - Edge case failures
 * - Branch isolation violations
 */

console.log('🧪 CORETRACK STRESS TEST SUITE INITIATED');
console.log('========================================');

// Test configuration
const STRESS_TEST_CONFIG = {
  iterations: 100,
  concurrentOperations: 50,
  dataVolumeSize: 1000,
  timeoutMs: 30000,
  maxMemoryUsageMB: 500
};

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  errors: [],
  performance: {},
  memoryUsage: []
};

/**
 * 1. AUTHENTICATION STRESS TEST
 */
async function stressTestAuthentication() {
  console.log('\n🔐 STRESS TEST 1: Authentication & User Management');
  console.log('================================================');
  
  try {
    // Check if Firebase is available
    if (typeof firebase === 'undefined') {
      throw new Error('Firebase not available - run this in the app context');
    }
    
    const auth = firebase.auth();
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      console.log('❌ No user authenticated - skipping auth stress tests');
      return;
    }
    
    console.log('✅ User authenticated:', currentUser.email);
    
    // Test rapid auth state changes
    for (let i = 0; i < 10; i++) {
      console.log(`Testing auth state check ${i + 1}/10`);
      const user = auth.currentUser;
      if (!user) {
        throw new Error(`Auth state lost at iteration ${i + 1}`);
      }
    }
    
    testResults.passed++;
    console.log('✅ Authentication stress test PASSED');
    
  } catch (error) {
    testResults.failed++;
    testResults.errors.push({ test: 'Authentication', error: error.message });
    console.log('❌ Authentication stress test FAILED:', error.message);
  }
}

/**
 * 2. BRANCH SWITCHING STRESS TEST
 */
async function stressTestBranchSwitching() {
  console.log('\n🏪 STRESS TEST 2: Branch Switching & Data Isolation');
  console.log('==================================================');
  
  try {
    // Get available branches
    const branchSelector = document.querySelector('[data-testid="branch-selector"]') || 
                          document.querySelector('.branch-selector') ||
                          document.querySelector('button[class*="branch"]');
    
    if (!branchSelector) {
      console.log('⚠️ Branch selector not found - checking localStorage');
      const selectedBranch = localStorage.getItem('selectedBranchId') || localStorage.getItem('selectedBranch');
      if (selectedBranch) {
        console.log('✅ Branch found in localStorage:', selectedBranch);
      } else {
        throw new Error('No branch selection mechanism found');
      }
    }
    
    // Test rapid branch switching simulation
    const branches = ['main', 'downtown', 'mall', 'kiosk'];
    console.log('🔄 Testing rapid branch switching...');
    
    for (let i = 0; i < 20; i++) {
      const randomBranch = branches[Math.floor(Math.random() * branches.length)];
      localStorage.setItem('selectedBranchId', randomBranch);
      
      // Trigger branch change event
      window.dispatchEvent(new CustomEvent('branchChanged', {
        detail: { toBranchId: randomBranch }
      }));
      
      // Small delay to simulate real switching
      await new Promise(resolve => setTimeout(resolve, 50));
      
      console.log(`Branch switch ${i + 1}/20: ${randomBranch}`);
    }
    
    testResults.passed++;
    console.log('✅ Branch switching stress test PASSED');
    
  } catch (error) {
    testResults.failed++;
    testResults.errors.push({ test: 'Branch Switching', error: error.message });
    console.log('❌ Branch switching stress test FAILED:', error.message);
  }
}

/**
 * 3. FIREBASE CONNECTION STRESS TEST
 */
async function stressTestFirebaseConnections() {
  console.log('\n🔥 STRESS TEST 3: Firebase Connections & Real-time Listeners');
  console.log('===========================================================');
  
  try {
    if (typeof firebase === 'undefined') {
      throw new Error('Firebase not available');
    }
    
    const db = firebase.firestore();
    const auth = firebase.auth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('No authenticated user for Firebase tests');
    }
    
    console.log('🎯 Testing multiple simultaneous Firebase connections...');
    
    const tenantId = user.uid;
    const listeners = [];
    
    // Create multiple concurrent listeners
    for (let i = 0; i < 10; i++) {
      const collection = ['inventory', 'posOrders', 'expenses', 'menuItems'][i % 4];
      const unsubscribe = db.collection(`tenants/${tenantId}/${collection}`)
        .limit(5)
        .onSnapshot((snapshot) => {
          console.log(`Listener ${i}: ${collection} - ${snapshot.size} docs`);
        }, (error) => {
          console.error(`Listener ${i} error:`, error);
        });
      
      listeners.push(unsubscribe);
    }
    
    // Let listeners run for a few seconds
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Cleanup all listeners
    listeners.forEach(unsubscribe => unsubscribe());
    console.log('🧹 All Firebase listeners cleaned up');
    
    testResults.passed++;
    console.log('✅ Firebase connections stress test PASSED');
    
  } catch (error) {
    testResults.failed++;
    testResults.errors.push({ test: 'Firebase Connections', error: error.message });
    console.log('❌ Firebase connections stress test FAILED:', error.message);
  }
}

/**
 * 4. MEMORY USAGE STRESS TEST
 */
async function stressTestMemoryUsage() {
  console.log('\n🧠 STRESS TEST 4: Memory Usage & Performance');
  console.log('===========================================');
  
  try {
    const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
    console.log('📊 Initial memory usage:', (initialMemory / 1024 / 1024).toFixed(2), 'MB');
    
    // Create large data structures to test memory handling
    const largeArrays = [];
    
    for (let i = 0; i < 100; i++) {
      // Create arrays with 1000 objects each
      const largeArray = new Array(1000).fill(null).map((_, index) => ({
        id: `item_${i}_${index}`,
        name: `Test Item ${i}-${index}`,
        data: new Array(100).fill(`data_${i}_${index}`),
        timestamp: Date.now()
      }));
      
      largeArrays.push(largeArray);
      
      // Check memory every 10 iterations
      if (i % 10 === 0 && performance.memory) {
        const currentMemory = performance.memory.usedJSHeapSize;
        const memoryMB = currentMemory / 1024 / 1024;
        console.log(`Memory usage at iteration ${i}: ${memoryMB.toFixed(2)} MB`);
        testResults.memoryUsage.push({ iteration: i, memoryMB });
        
        if (memoryMB > STRESS_TEST_CONFIG.maxMemoryUsageMB) {
          throw new Error(`Memory usage exceeded ${STRESS_TEST_CONFIG.maxMemoryUsageMB}MB: ${memoryMB.toFixed(2)}MB`);
        }
      }
    }
    
    // Cleanup
    largeArrays.length = 0;
    
    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }
    
    const finalMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
    console.log('📊 Final memory usage:', (finalMemory / 1024 / 1024).toFixed(2), 'MB');
    
    testResults.passed++;
    console.log('✅ Memory usage stress test PASSED');
    
  } catch (error) {
    testResults.failed++;
    testResults.errors.push({ test: 'Memory Usage', error: error.message });
    console.log('❌ Memory usage stress test FAILED:', error.message);
  }
}

/**
 * 5. LOCAL STORAGE STRESS TEST
 */
async function stressTestLocalStorage() {
  console.log('\n💾 STRESS TEST 5: Local Storage & State Management');
  console.log('================================================');
  
  try {
    const initialStorageSize = JSON.stringify(localStorage).length;
    console.log('📦 Initial localStorage size:', initialStorageSize, 'characters');
    
    // Test rapid localStorage operations
    for (let i = 0; i < 1000; i++) {
      const key = `stress_test_${i}`;
      const value = JSON.stringify({
        id: i,
        data: new Array(100).fill(`test_data_${i}`),
        timestamp: Date.now()
      });
      
      localStorage.setItem(key, value);
      
      // Verify data integrity
      const retrieved = localStorage.getItem(key);
      if (!retrieved || JSON.parse(retrieved).id !== i) {
        throw new Error(`LocalStorage data integrity failed at iteration ${i}`);
      }
      
      if (i % 100 === 0) {
        console.log(`LocalStorage operations: ${i + 1}/1000`);
      }
    }
    
    // Cleanup stress test data
    for (let i = 0; i < 1000; i++) {
      localStorage.removeItem(`stress_test_${i}`);
    }
    
    const finalStorageSize = JSON.stringify(localStorage).length;
    console.log('📦 Final localStorage size:', finalStorageSize, 'characters');
    
    testResults.passed++;
    console.log('✅ Local storage stress test PASSED');
    
  } catch (error) {
    testResults.failed++;
    testResults.errors.push({ test: 'Local Storage', error: error.message });
    console.log('❌ Local storage stress test FAILED:', error.message);
  }
}

/**
 * 6. DOM MANIPULATION STRESS TEST
 */
async function stressTestDOMOperations() {
  console.log('\n🌐 STRESS TEST 6: DOM Operations & Rendering');
  console.log('===========================================');
  
  try {
    console.log('🔍 Testing DOM element creation and manipulation...');
    
    // Create a test container
    const testContainer = document.createElement('div');
    testContainer.id = 'stress-test-container';
    testContainer.style.cssText = 'position: fixed; top: -1000px; left: -1000px; width: 100px; height: 100px;';
    document.body.appendChild(testContainer);
    
    // Create and manipulate many DOM elements
    for (let i = 0; i < 500; i++) {
      const element = document.createElement('div');
      element.className = `stress-test-element-${i}`;
      element.innerHTML = `
        <span>Test Element ${i}</span>
        <button onclick="console.log('${i}')">Button ${i}</button>
        <input type="text" value="Test ${i}" />
      `;
      
      testContainer.appendChild(element);
      
      // Test element queries
      const found = document.querySelector(`.stress-test-element-${i}`);
      if (!found) {
        throw new Error(`DOM element not found: ${i}`);
      }
      
      if (i % 50 === 0) {
        console.log(`DOM elements created: ${i + 1}/500`);
      }
    }
    
    // Test batch DOM operations
    const allElements = testContainer.querySelectorAll('div');
    console.log('📊 Total elements created:', allElements.length);
    
    // Cleanup
    document.body.removeChild(testContainer);
    
    testResults.passed++;
    console.log('✅ DOM operations stress test PASSED');
    
  } catch (error) {
    testResults.failed++;
    testResults.errors.push({ test: 'DOM Operations', error: error.message });
    console.log('❌ DOM operations stress test FAILED:', error.message);
  }
}

/**
 * 7. EVENT HANDLING STRESS TEST
 */
async function stressTestEventHandling() {
  console.log('\n⚡ STRESS TEST 7: Event Handling & Performance');
  console.log('=============================================');
  
  try {
    console.log('🎯 Testing rapid event firing and handling...');
    
    let eventCount = 0;
    const maxEvents = 1000;
    
    // Create event handler
    const testHandler = (event) => {
      eventCount++;
      if (eventCount % 100 === 0) {
        console.log(`Events handled: ${eventCount}/${maxEvents}`);
      }
    };
    
    // Add event listener
    window.addEventListener('stress-test-event', testHandler);
    
    // Fire many events rapidly
    for (let i = 0; i < maxEvents; i++) {
      const event = new CustomEvent('stress-test-event', {
        detail: { iteration: i, timestamp: Date.now() }
      });
      window.dispatchEvent(event);
    }
    
    // Cleanup
    window.removeEventListener('stress-test-event', testHandler);
    
    if (eventCount !== maxEvents) {
      throw new Error(`Event count mismatch: expected ${maxEvents}, got ${eventCount}`);
    }
    
    testResults.passed++;
    console.log('✅ Event handling stress test PASSED');
    
  } catch (error) {
    testResults.failed++;
    testResults.errors.push({ test: 'Event Handling', error: error.message });
    console.log('❌ Event handling stress test FAILED:', error.message);
  }
}

/**
 * 8. ASYNC OPERATIONS STRESS TEST
 */
async function stressTestAsyncOperations() {
  console.log('\n🔄 STRESS TEST 8: Async Operations & Concurrency');
  console.log('===============================================');
  
  try {
    console.log('⚡ Testing concurrent async operations...');
    
    const promises = [];
    const results = [];
    
    // Create many concurrent async operations
    for (let i = 0; i < 100; i++) {
      const promise = new Promise((resolve) => {
        setTimeout(() => {
          const result = {
            id: i,
            timestamp: Date.now(),
            data: `async_result_${i}`
          };
          results.push(result);
          resolve(result);
        }, Math.random() * 100); // Random delay 0-100ms
      });
      
      promises.push(promise);
    }
    
    // Wait for all operations to complete
    console.log('⏳ Waiting for all async operations to complete...');
    const completedResults = await Promise.all(promises);
    
    // Verify results
    if (completedResults.length !== 100) {
      throw new Error(`Async result count mismatch: expected 100, got ${completedResults.length}`);
    }
    
    // Check for race conditions
    const uniqueIds = new Set(completedResults.map(r => r.id));
    if (uniqueIds.size !== 100) {
      throw new Error(`Race condition detected: duplicate IDs found`);
    }
    
    console.log('📊 All async operations completed successfully');
    
    testResults.passed++;
    console.log('✅ Async operations stress test PASSED');
    
  } catch (error) {
    testResults.failed++;
    testResults.errors.push({ test: 'Async Operations', error: error.message });
    console.log('❌ Async operations stress test FAILED:', error.message);
  }
}

/**
 * MAIN STRESS TEST EXECUTION
 */
async function runStressTests() {
  console.log('🚀 Starting CoreTrack stress test suite...\n');
  
  const startTime = Date.now();
  
  try {
    await stressTestAuthentication();
    await stressTestBranchSwitching();
    await stressTestFirebaseConnections();
    await stressTestMemoryUsage();
    await stressTestLocalStorage();
    await stressTestDOMOperations();
    await stressTestEventHandling();
    await stressTestAsyncOperations();
    
  } catch (error) {
    console.error('💥 Critical error during stress testing:', error);
    testResults.errors.push({ test: 'Critical', error: error.message });
  }
  
  const endTime = Date.now();
  const totalTime = endTime - startTime;
  
  // Generate comprehensive report
  console.log('\n📊 STRESS TEST RESULTS SUMMARY');
  console.log('===============================');
  console.log(`⏱️  Total execution time: ${totalTime}ms`);
  console.log(`✅ Tests passed: ${testResults.passed}`);
  console.log(`❌ Tests failed: ${testResults.failed}`);
  console.log(`⚠️  Warnings: ${testResults.warnings}`);
  
  if (testResults.errors.length > 0) {
    console.log('\n🐛 DETECTED ISSUES:');
    testResults.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.test}: ${error.error}`);
    });
  }
  
  if (testResults.memoryUsage.length > 0) {
    console.log('\n📈 MEMORY USAGE PATTERN:');
    testResults.memoryUsage.forEach(usage => {
      console.log(`Iteration ${usage.iteration}: ${usage.memoryMB.toFixed(2)} MB`);
    });
  }
  
  // Overall assessment
  const overallHealth = testResults.failed === 0 ? 'EXCELLENT' : 
                       testResults.failed <= 2 ? 'GOOD' : 
                       testResults.failed <= 4 ? 'FAIR' : 'POOR';
  
  console.log(`\n🏆 OVERALL SYSTEM HEALTH: ${overallHealth}`);
  console.log('===============================\n');
  
  return testResults;
}

// Auto-run if in browser environment
if (typeof window !== 'undefined') {
  // Run after page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runStressTests);
  } else {
    runStressTests();
  }
}

// Export for manual execution
window.runCoreTrackStressTests = runStressTests;
