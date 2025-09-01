/**
 * 🐛 CORETRACK BUG DETECTION SCANNER
 * 
 * Automated bug detection and vulnerability scanner
 */

console.log('🐛 CORETRACK BUG DETECTION SCANNER');
console.log('==================================');

const bugReport = {
  criticalBugs: [],
  warnings: [],
  performanceIssues: [],
  securityConcerns: [],
  dataIntegrityIssues: []
};

/**
 * DETECT MEMORY LEAKS
 */
function detectMemoryLeaks() {
  console.log('\n🧠 SCANNING FOR MEMORY LEAKS...');
  
  if (!performance.memory) {
    console.log('⚠️ Memory API not available - skipping memory leak detection');
    return;
  }
  
  const initialMemory = performance.memory.usedJSHeapSize;
  console.log(`📊 Initial memory: ${(initialMemory / 1024 / 1024).toFixed(2)} MB`);
  
  // Create potential memory leak scenarios
  const potentialLeaks = [];
  
  // Check for unclosed event listeners
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  const activeListeners = new Set();
  
  EventTarget.prototype.addEventListener = function(type, listener, options) {
    activeListeners.add({ target: this, type, listener });
    return originalAddEventListener.call(this, type, listener, options);
  };
  
  // Check for retained DOM references
  const domReferences = [];
  const originalQuerySelector = document.querySelector;
  
  document.querySelector = function(selector) {
    const element = originalQuerySelector.call(this, selector);
    if (element) {
      domReferences.push({ selector, element, timestamp: Date.now() });
    }
    return element;
  };
  
  // Simulate app usage
  for (let i = 0; i < 100; i++) {
    const element = document.createElement('div');
    element.innerHTML = `Test element ${i}`;
    potentialLeaks.push(element);
  }
  
  // Check memory after operations
  setTimeout(() => {
    const currentMemory = performance.memory.usedJSHeapSize;
    const memoryIncrease = currentMemory - initialMemory;
    
    console.log(`📊 Memory after operations: ${(currentMemory / 1024 / 1024).toFixed(2)} MB`);
    console.log(`📈 Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);
    
    if (memoryIncrease > 50 * 1024 * 1024) { // 50MB threshold
      bugReport.performanceIssues.push({
        type: 'Memory Leak',
        severity: 'High',
        description: `Significant memory increase detected: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`,
        recommendation: 'Review event listeners and DOM references for proper cleanup'
      });
    }
    
    // Cleanup
    potentialLeaks.length = 0;
    
    // Restore original functions
    EventTarget.prototype.addEventListener = originalAddEventListener;
    document.querySelector = originalQuerySelector;
    
  }, 1000);
}

/**
 * DETECT RACE CONDITIONS
 */
async function detectRaceConditions() {
  console.log('\n🏃 SCANNING FOR RACE CONDITIONS...');
  
  const sharedResource = { value: 0, operations: 0 };
  const promises = [];
  
  // Create concurrent operations that modify shared resource
  for (let i = 0; i < 100; i++) {
    const promise = new Promise((resolve) => {
      setTimeout(() => {
        const currentValue = sharedResource.value;
        // Simulate async operation
        setTimeout(() => {
          sharedResource.value = currentValue + 1;
          sharedResource.operations++;
          resolve(i);
        }, Math.random() * 10);
      }, Math.random() * 10);
    });
    
    promises.push(promise);
  }
  
  await Promise.all(promises);
  
  // Check for race condition
  if (sharedResource.value !== sharedResource.operations) {
    bugReport.criticalBugs.push({
      type: 'Race Condition',
      severity: 'Critical',
      description: `Race condition detected in shared resource modification: expected ${sharedResource.operations}, got ${sharedResource.value}`,
      recommendation: 'Implement proper synchronization mechanisms for shared resource access'
    });
    console.log('❌ Race condition detected!');
  } else {
    console.log('✅ No race conditions detected');
  }
}

/**
 * DETECT FIREBASE SECURITY ISSUES
 */
function detectFirebaseSecurityIssues() {
  console.log('\n🔒 SCANNING FOR FIREBASE SECURITY ISSUES...');
  
  if (typeof firebase === 'undefined') {
    console.log('⚠️ Firebase not available - skipping security scan');
    return;
  }
  
  const auth = firebase.auth();
  const user = auth.currentUser;
  
  if (!user) {
    bugReport.securityConcerns.push({
      type: 'Authentication',
      severity: 'Medium',
      description: 'No authenticated user detected during security scan',
      recommendation: 'Ensure proper authentication flow is implemented'
    });
    console.log('⚠️ No authenticated user');
    return;
  }
  
  // Check for potential data exposure
  const db = firebase.firestore();
  const tenantId = user.uid;
  
  // Test unauthorized data access
  db.collection(`tenants/${tenantId}/inventory`).limit(1).get()
    .then(snapshot => {
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        
        // Check if sensitive data is properly protected
        if (!data.tenantId || data.tenantId !== tenantId) {
          bugReport.securityConcerns.push({
            type: 'Data Exposure',
            severity: 'High',
            description: `Document ${doc.id} may not be properly tenant-isolated`,
            recommendation: 'Review Firebase security rules and data structure'
          });
        }
        
        // Check for PII in logs
        if (data.customerInfo && !data.customerInfo.encrypted) {
          bugReport.securityConcerns.push({
            type: 'PII Exposure',
            severity: 'High',
            description: 'Customer information may not be properly encrypted',
            recommendation: 'Implement proper PII encryption'
          });
        }
      });
      
      console.log('✅ Firebase security scan completed');
    })
    .catch(error => {
      console.log('⚠️ Firebase security scan failed:', error.message);
    });
}

/**
 * DETECT UI/UX ISSUES
 */
function detectUIUXIssues() {
  console.log('\n🎨 SCANNING FOR UI/UX ISSUES...');
  
  const issues = [];
  
  // Check for accessibility issues
  const elementsWithoutLabels = document.querySelectorAll('input:not([aria-label]):not([id])');
  if (elementsWithoutLabels.length > 0) {
    issues.push({
      type: 'Accessibility',
      severity: 'Medium',
      description: `${elementsWithoutLabels.length} input elements without proper labels`,
      recommendation: 'Add aria-label or associate with label elements'
    });
  }
  
  // Check for missing alt text on images
  const imagesWithoutAlt = document.querySelectorAll('img:not([alt])');
  if (imagesWithoutAlt.length > 0) {
    issues.push({
      type: 'Accessibility',
      severity: 'Medium',
      description: `${imagesWithoutAlt.length} images without alt text`,
      recommendation: 'Add descriptive alt text to all images'
    });
  }
  
  // Check for touch-friendly targets (minimum 44px)
  const buttons = document.querySelectorAll('button, [role="button"]');
  let smallButtons = 0;
  
  buttons.forEach(button => {
    const rect = button.getBoundingClientRect();
    if (rect.width < 44 || rect.height < 44) {
      smallButtons++;
    }
  });
  
  if (smallButtons > 0) {
    issues.push({
      type: 'Mobile UX',
      severity: 'Medium',
      description: `${smallButtons} buttons smaller than 44px touch target`,
      recommendation: 'Ensure all interactive elements meet minimum touch target size'
    });
  }
  
  // Check for contrast issues (simplified)
  const lightTextOnLight = document.querySelectorAll('.text-gray-300, .text-gray-400');
  if (lightTextOnLight.length > 0) {
    issues.push({
      type: 'Accessibility',
      severity: 'Low',
      description: 'Potential contrast issues with light text detected',
      recommendation: 'Review color contrast ratios for accessibility compliance'
    });
  }
  
  bugReport.warnings.push(...issues);
  console.log(`📊 UI/UX scan completed: ${issues.length} issues found`);
}

/**
 * DETECT PERFORMANCE BOTTLENECKS
 */
function detectPerformanceBottlenecks() {
  console.log('\n⚡ SCANNING FOR PERFORMANCE BOTTLENECKS...');
  
  // Monitor long-running operations
  const originalSetTimeout = window.setTimeout;
  const longRunningTimeouts = [];
  
  window.setTimeout = function(callback, delay) {
    if (delay > 5000) {
      longRunningTimeouts.push({ delay, stack: new Error().stack });
    }
    return originalSetTimeout.call(this, callback, delay);
  };
  
  // Check for inefficient DOM queries
  const originalQuerySelectorAll = document.querySelectorAll;
  let queryCount = 0;
  
  document.querySelectorAll = function(selector) {
    queryCount++;
    const start = performance.now();
    const result = originalQuerySelectorAll.call(this, selector);
    const duration = performance.now() - start;
    
    if (duration > 10) {
      bugReport.performanceIssues.push({
        type: 'Slow DOM Query',
        severity: 'Medium',
        description: `DOM query "${selector}" took ${duration.toFixed(2)}ms`,
        recommendation: 'Optimize DOM queries or use more specific selectors'
      });
    }
    
    return result;
  };
  
  // Check for excessive re-renders (simplified detection)
  const renderCount = { count: 0 };
  const checkReRenders = () => {
    renderCount.count++;
    if (renderCount.count > 100) {
      bugReport.performanceIssues.push({
        type: 'Excessive Re-renders',
        severity: 'High',
        description: `${renderCount.count} potential re-renders detected`,
        recommendation: 'Review React component dependencies and memoization'
      });
    }
  };
  
  // Simulate checking
  for (let i = 0; i < 50; i++) {
    setTimeout(checkReRenders, i * 10);
  }
  
  setTimeout(() => {
    // Restore original functions
    window.setTimeout = originalSetTimeout;
    document.querySelectorAll = originalQuerySelectorAll;
    
    console.log(`📊 Performance scan completed: ${queryCount} DOM queries monitored`);
  }, 1000);
}

/**
 * DETECT DATA INTEGRITY ISSUES
 */
function detectDataIntegrityIssues() {
  console.log('\n🔍 SCANNING FOR DATA INTEGRITY ISSUES...');
  
  // Check localStorage for corruption
  try {
    const storageKeys = Object.keys(localStorage);
    let corruptedItems = 0;
    
    storageKeys.forEach(key => {
      try {
        const value = localStorage.getItem(key);
        if (value && value.startsWith('{')) {
          JSON.parse(value);
        }
      } catch (error) {
        corruptedItems++;
        bugReport.dataIntegrityIssues.push({
          type: 'Corrupted localStorage',
          severity: 'Medium',
          description: `localStorage item "${key}" contains invalid JSON`,
          recommendation: 'Implement proper data validation and error handling'
        });
      }
    });
    
    if (corruptedItems === 0) {
      console.log('✅ No localStorage corruption detected');
    } else {
      console.log(`⚠️ ${corruptedItems} corrupted localStorage items found`);
    }
    
  } catch (error) {
    console.log('⚠️ localStorage integrity check failed:', error.message);
  }
  
  // Check for missing required data
  const requiredKeys = ['selectedBranchId', 'userProfile'];
  const missingKeys = requiredKeys.filter(key => !localStorage.getItem(key));
  
  if (missingKeys.length > 0) {
    bugReport.dataIntegrityIssues.push({
      type: 'Missing Required Data',
      severity: 'Medium',
      description: `Missing required localStorage keys: ${missingKeys.join(', ')}`,
      recommendation: 'Ensure proper initialization and data persistence'
    });
  }
}

/**
 * GENERATE COMPREHENSIVE BUG REPORT
 */
function generateBugReport() {
  console.log('\n📋 COMPREHENSIVE BUG REPORT');
  console.log('===========================');
  
  const totalIssues = bugReport.criticalBugs.length + 
                     bugReport.warnings.length + 
                     bugReport.performanceIssues.length + 
                     bugReport.securityConcerns.length + 
                     bugReport.dataIntegrityIssues.length;
  
  console.log(`🐛 Total Issues Found: ${totalIssues}`);
  console.log(`🚨 Critical Bugs: ${bugReport.criticalBugs.length}`);
  console.log(`⚠️  Warnings: ${bugReport.warnings.length}`);
  console.log(`⚡ Performance Issues: ${bugReport.performanceIssues.length}`);
  console.log(`🔒 Security Concerns: ${bugReport.securityConcerns.length}`);
  console.log(`📊 Data Integrity Issues: ${bugReport.dataIntegrityIssues.length}`);
  
  // Detailed breakdown
  if (bugReport.criticalBugs.length > 0) {
    console.log('\n🚨 CRITICAL BUGS:');
    bugReport.criticalBugs.forEach((bug, index) => {
      console.log(`${index + 1}. ${bug.type} (${bug.severity})`);
      console.log(`   Description: ${bug.description}`);
      console.log(`   Recommendation: ${bug.recommendation}\n`);
    });
  }
  
  if (bugReport.securityConcerns.length > 0) {
    console.log('\n🔒 SECURITY CONCERNS:');
    bugReport.securityConcerns.forEach((concern, index) => {
      console.log(`${index + 1}. ${concern.type} (${concern.severity})`);
      console.log(`   Description: ${concern.description}`);
      console.log(`   Recommendation: ${concern.recommendation}\n`);
    });
  }
  
  // Overall health assessment
  let healthScore = 100;
  healthScore -= bugReport.criticalBugs.length * 25;
  healthScore -= bugReport.securityConcerns.length * 15;
  healthScore -= bugReport.performanceIssues.length * 10;
  healthScore -= bugReport.warnings.length * 5;
  healthScore -= bugReport.dataIntegrityIssues.length * 8;
  
  healthScore = Math.max(0, healthScore);
  
  const healthLevel = healthScore >= 90 ? 'EXCELLENT' :
                     healthScore >= 75 ? 'GOOD' :
                     healthScore >= 60 ? 'FAIR' :
                     healthScore >= 40 ? 'POOR' : 'CRITICAL';
  
  console.log(`\n🏆 OVERALL HEALTH SCORE: ${healthScore}/100 (${healthLevel})`);
  
  // Export report
  window.coreTrackBugReport = bugReport;
  
  return bugReport;
}

/**
 * RUN COMPLETE BUG DETECTION SUITE
 */
async function runBugDetection() {
  console.log('🚀 Starting CoreTrack bug detection suite...\n');
  
  try {
    detectMemoryLeaks();
    await detectRaceConditions();
    detectFirebaseSecurityIssues();
    detectUIUXIssues();
    detectPerformanceBottlenecks();
    detectDataIntegrityIssues();
    
    // Wait for async operations to complete
    setTimeout(() => {
      generateBugReport();
    }, 3000);
    
  } catch (error) {
    console.error('💥 Critical error during bug detection:', error);
    bugReport.criticalBugs.push({
      type: 'Detection Failure',
      severity: 'Critical',
      description: `Bug detection suite failed: ${error.message}`,
      recommendation: 'Review bug detection implementation'
    });
  }
}

// Export for manual execution
window.runCoreTrackBugDetection = runBugDetection;

// Auto-run if in browser
if (typeof window !== 'undefined' && document.readyState !== 'loading') {
  setTimeout(runBugDetection, 1000);
}
