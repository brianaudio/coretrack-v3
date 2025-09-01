/**
 * 🎯 CORETRACK EDGE CASE & SUBTLE BUG DETECTOR
 * 
 * This script specifically tests edge cases and corner scenarios
 * that could reveal subtle bugs in CoreTrack
 */

console.log('🎯 CORETRACK EDGE CASE TESTING');
console.log('==============================');

const edgeCaseResults = {
  dataEdgeCases: [],
  uiEdgeCases: [],
  businessLogicIssues: [],
  concurrencyIssues: [],
  performanceRegressions: []
};

/**
 * TEST EDGE CASES IN DATA HANDLING
 */
async function testDataEdgeCases() {
  console.log('\n📊 TESTING DATA EDGE CASES');
  console.log('===========================');
  
  const testCases = [
    // Large numbers
    { type: 'Large Number', value: Number.MAX_SAFE_INTEGER },
    { type: 'Very Small Number', value: Number.MIN_VALUE },
    { type: 'Negative Infinity', value: -Infinity },
    { type: 'Positive Infinity', value: Infinity },
    { type: 'NaN', value: NaN },
    
    // Special strings
    { type: 'Empty String', value: '' },
    { type: 'Very Long String', value: 'x'.repeat(10000) },
    { type: 'Unicode String', value: '🏪🛒💰📊🔄' },
    { type: 'SQL Injection', value: "'; DROP TABLE inventory; --" },
    { type: 'XSS Attempt', value: '<script>alert("XSS")</script>' },
    { type: 'Path Traversal', value: '../../../etc/passwd' },
    
    // Date edge cases
    { type: 'Invalid Date', value: new Date('invalid') },
    { type: 'Year 2000', value: new Date('2000-01-01') },
    { type: 'Unix Epoch', value: new Date(0) },
    { type: 'Far Future', value: new Date('3000-12-31') },
    
    // Array edge cases
    { type: 'Empty Array', value: [] },
    { type: 'Sparse Array', value: [1, , , 4] },
    { type: 'Very Large Array', value: new Array(100000).fill(0) },
    
    // Object edge cases
    { type: 'Empty Object', value: {} },
    { type: 'Null Prototype', value: Object.create(null) },
    { type: 'Circular Reference', value: (() => { const obj = {}; obj.self = obj; return obj; })() }
  ];
  
  console.log(`🧪 Testing ${testCases.length} edge case scenarios...`);
  
  testCases.forEach((testCase, index) => {
    try {
      console.log(`Testing ${index + 1}/${testCases.length}: ${testCase.type}`);
      
      // Test JSON serialization
      try {
        const serialized = JSON.stringify(testCase.value);
        const deserialized = JSON.parse(serialized);
        
        if (testCase.type === 'NaN' && !Number.isNaN(deserialized)) {
          edgeCaseResults.dataEdgeCases.push({
            type: 'JSON Serialization Issue',
            description: 'NaN not properly handled in JSON serialization',
            severity: 'Medium'
          });
        }
        
      } catch (error) {
        if (testCase.type !== 'Circular Reference') {
          edgeCaseResults.dataEdgeCases.push({
            type: 'JSON Serialization Failure',
            description: `Failed to serialize ${testCase.type}: ${error.message}`,
            severity: 'Low'
          });
        }
      }
      
      // Test localStorage storage
      try {
        localStorage.setItem(`edge_test_${index}`, JSON.stringify(testCase.value));
        const retrieved = localStorage.getItem(`edge_test_${index}`);
        
        if (retrieved === null && testCase.value !== null) {
          edgeCaseResults.dataEdgeCases.push({
            type: 'LocalStorage Issue',
            description: `Failed to store ${testCase.type} in localStorage`,
            severity: 'Medium'
          });
        }
        
        localStorage.removeItem(`edge_test_${index}`);
        
      } catch (error) {
        edgeCaseResults.dataEdgeCases.push({
          type: 'LocalStorage Error',
          description: `Error storing ${testCase.type}: ${error.message}`,
          severity: 'Medium'
        });
      }
      
      // Test mathematical operations
      if (typeof testCase.value === 'number') {
        const operations = [
          testCase.value + 1,
          testCase.value - 1,
          testCase.value * 2,
          testCase.value / 2,
          Math.sqrt(testCase.value),
          Math.abs(testCase.value)
        ];
        
        operations.forEach(result => {
          if (Number.isNaN(result) && !Number.isNaN(testCase.value)) {
            edgeCaseResults.dataEdgeCases.push({
              type: 'Mathematical Operation Issue',
              description: `Operation on ${testCase.type} resulted in NaN`,
              severity: 'Low'
            });
          }
        });
      }
      
    } catch (error) {
      edgeCaseResults.dataEdgeCases.push({
        type: 'General Edge Case Error',
        description: `Error testing ${testCase.type}: ${error.message}`,
        severity: 'High'
      });
    }
  });
  
  console.log(`✅ Data edge case testing completed: ${edgeCaseResults.dataEdgeCases.length} issues found`);
}

/**
 * TEST UI EDGE CASES
 */
function testUIEdgeCases() {
  console.log('\n🎨 TESTING UI EDGE CASES');
  console.log('=========================');
  
  const uiTests = [
    // Test viewport edge cases
    () => {
      const originalInnerWidth = window.innerWidth;
      const originalInnerHeight = window.innerHeight;
      
      // Simulate mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 667, configurable: true });
      
      window.dispatchEvent(new Event('resize'));
      
      // Check for responsive design issues
      const elements = document.querySelectorAll('*');
      let overflowIssues = 0;
      
      elements.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width > window.innerWidth) {
          overflowIssues++;
        }
      });
      
      if (overflowIssues > 0) {
        edgeCaseResults.uiEdgeCases.push({
          type: 'Responsive Design Issue',
          description: `${overflowIssues} elements overflow on mobile viewport`,
          severity: 'Medium'
        });
      }
      
      // Restore original dimensions
      Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: originalInnerHeight, configurable: true });
    },
    
    // Test keyboard navigation
    () => {
      const focusableElements = document.querySelectorAll(
        'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
      );
      
      let nonFocusableCount = 0;
      focusableElements.forEach(el => {
        try {
          el.focus();
          if (document.activeElement !== el) {
            nonFocusableCount++;
          }
        } catch (error) {
          nonFocusableCount++;
        }
      });
      
      if (nonFocusableCount > 0) {
        edgeCaseResults.uiEdgeCases.push({
          type: 'Keyboard Navigation Issue',
          description: `${nonFocusableCount} focusable elements cannot receive focus`,
          severity: 'Medium'
        });
      }
    },
    
    // Test form validation edge cases
    () => {
      const forms = document.querySelectorAll('form');
      forms.forEach(form => {
        const inputs = form.querySelectorAll('input, textarea, select');
        
        inputs.forEach(input => {
          // Test empty values
          const originalValue = input.value;
          input.value = '';
          
          const event = new Event('blur', { bubbles: true });
          input.dispatchEvent(event);
          
          // Check if proper validation occurs
          if (input.required && input.validity.valid) {
            edgeCaseResults.uiEdgeCases.push({
              type: 'Form Validation Issue',
              description: 'Required field accepts empty value',
              severity: 'Medium'
            });
          }
          
          input.value = originalValue;
        });
      });
    }
  ];
  
  console.log(`🧪 Running ${uiTests.length} UI edge case tests...`);
  
  uiTests.forEach((test, index) => {
    try {
      console.log(`UI Test ${index + 1}/${uiTests.length}`);
      test();
    } catch (error) {
      edgeCaseResults.uiEdgeCases.push({
        type: 'UI Test Failure',
        description: `UI test ${index + 1} failed: ${error.message}`,
        severity: 'High'
      });
    }
  });
  
  console.log(`✅ UI edge case testing completed: ${edgeCaseResults.uiEdgeCases.length} issues found`);
}

/**
 * TEST BUSINESS LOGIC EDGE CASES
 */
function testBusinessLogicEdgeCases() {
  console.log('\n💼 TESTING BUSINESS LOGIC EDGE CASES');
  console.log('====================================');
  
  const businessTests = [
    // Test inventory calculations with edge values
    () => {
      const testInventoryItems = [
        { stock: 0, price: 100 },
        { stock: -1, price: 50 },
        { stock: Infinity, price: 0 },
        { stock: 1000000, price: 0.01 },
        { stock: 0.5, price: 99.99 }
      ];
      
      testInventoryItems.forEach(item => {
        try {
          const value = item.stock * item.price;
          
          if (Number.isNaN(value) || !Number.isFinite(value)) {
            edgeCaseResults.businessLogicIssues.push({
              type: 'Inventory Calculation Issue',
              description: `Invalid calculation result: ${item.stock} * ${item.price} = ${value}`,
              severity: 'High'
            });
          }
          
          if (item.stock < 0) {
            edgeCaseResults.businessLogicIssues.push({
              type: 'Negative Stock Issue',
              description: 'System allows negative stock values',
              severity: 'High'
            });
          }
          
        } catch (error) {
          edgeCaseResults.businessLogicIssues.push({
            type: 'Calculation Error',
            description: `Error in inventory calculation: ${error.message}`,
            severity: 'High'
          });
        }
      });
    },
    
    // Test currency calculations
    () => {
      const testAmounts = [0.1, 0.2, 99.99, 100.01, 1000000.99];
      
      testAmounts.forEach(amount => {
        const calculated = amount * 1.1; // Adding 10%
        const rounded = Math.round(calculated * 100) / 100;
        
        if (Math.abs(calculated - rounded) > 0.001) {
          edgeCaseResults.businessLogicIssues.push({
            type: 'Currency Precision Issue',
            description: `Potential rounding error with amount ${amount}`,
            severity: 'Medium'
          });
        }
      });
    },
    
    // Test date calculations
    () => {
      const testDates = [
        new Date('2000-01-01'),
        new Date('2024-02-29'), // Leap year
        new Date('2023-02-29'), // Invalid leap year
        new Date('2024-12-31'),
        new Date(0) // Unix epoch
      ];
      
      testDates.forEach(date => {
        if (isNaN(date.getTime())) {
          edgeCaseResults.businessLogicIssues.push({
            type: 'Invalid Date Issue',
            description: 'System processes invalid dates',
            severity: 'Medium'
          });
        }
        
        // Test date arithmetic
        const nextDay = new Date(date.getTime() + 24 * 60 * 60 * 1000);
        if (nextDay.getDate() === date.getDate() && nextDay.getMonth() === date.getMonth()) {
          edgeCaseResults.businessLogicIssues.push({
            type: 'Date Arithmetic Issue',
            description: 'Date arithmetic may not handle edge cases correctly',
            severity: 'Low'
          });
        }
      });
    }
  ];
  
  console.log(`🧪 Running ${businessTests.length} business logic tests...`);
  
  businessTests.forEach((test, index) => {
    try {
      console.log(`Business Test ${index + 1}/${businessTests.length}`);
      test();
    } catch (error) {
      edgeCaseResults.businessLogicIssues.push({
        type: 'Business Test Failure',
        description: `Business test ${index + 1} failed: ${error.message}`,
        severity: 'High'
      });
    }
  });
  
  console.log(`✅ Business logic testing completed: ${edgeCaseResults.businessLogicIssues.length} issues found`);
}

/**
 * TEST CONCURRENCY EDGE CASES
 */
async function testConcurrencyEdgeCases() {
  console.log('\n🔄 TESTING CONCURRENCY EDGE CASES');
  console.log('==================================');
  
  // Test rapid state changes
  const rapidStateTest = () => {
    return new Promise((resolve) => {
      let stateChanges = 0;
      const maxChanges = 1000;
      
      const changeState = () => {
        stateChanges++;
        localStorage.setItem('testState', stateChanges.toString());
        
        if (stateChanges < maxChanges) {
          setTimeout(changeState, 1);
        } else {
          const finalState = parseInt(localStorage.getItem('testState'));
          if (finalState !== maxChanges) {
            edgeCaseResults.concurrencyIssues.push({
              type: 'State Synchronization Issue',
              description: `Expected ${maxChanges} state changes, got ${finalState}`,
              severity: 'High'
            });
          }
          localStorage.removeItem('testState');
          resolve();
        }
      };
      
      changeState();
    });
  };
  
  // Test concurrent async operations
  const concurrentAsyncTest = async () => {
    const promises = [];
    const results = [];
    
    for (let i = 0; i < 100; i++) {
      const promise = new Promise(resolve => {
        setTimeout(() => {
          results.push(i);
          resolve(i);
        }, Math.random() * 50);
      });
      promises.push(promise);
    }
    
    await Promise.all(promises);
    
    // Check if all results are unique (no race conditions)
    const uniqueResults = new Set(results);
    if (uniqueResults.size !== 100) {
      edgeCaseResults.concurrencyIssues.push({
        type: 'Async Race Condition',
        description: `Expected 100 unique results, got ${uniqueResults.size}`,
        severity: 'High'
      });
    }
  };
  
  console.log('🧪 Testing rapid state changes...');
  await rapidStateTest();
  
  console.log('🧪 Testing concurrent async operations...');
  await concurrentAsyncTest();
  
  console.log(`✅ Concurrency testing completed: ${edgeCaseResults.concurrencyIssues.length} issues found`);
}

/**
 * TEST PERFORMANCE REGRESSION EDGE CASES
 */
function testPerformanceRegressions() {
  console.log('\n⚡ TESTING PERFORMANCE REGRESSIONS');
  console.log('===================================');
  
  const performanceTests = [
    // Test large data rendering
    () => {
      const start = performance.now();
      
      const largeContainer = document.createElement('div');
      largeContainer.style.cssText = 'position: fixed; top: -2000px; left: -2000px;';
      
      for (let i = 0; i < 1000; i++) {
        const element = document.createElement('div');
        element.textContent = `Item ${i}`;
        element.className = 'test-item';
        largeContainer.appendChild(element);
      }
      
      document.body.appendChild(largeContainer);
      
      const end = performance.now();
      const duration = end - start;
      
      document.body.removeChild(largeContainer);
      
      if (duration > 100) {
        edgeCaseResults.performanceRegressions.push({
          type: 'Slow DOM Manipulation',
          description: `DOM manipulation took ${duration.toFixed(2)}ms (>100ms threshold)`,
          severity: 'Medium'
        });
      }
      
      console.log(`DOM manipulation test: ${duration.toFixed(2)}ms`);
    },
    
    // Test memory allocation
    () => {
      if (!performance.memory) return;
      
      const initialMemory = performance.memory.usedJSHeapSize;
      
      // Allocate large objects
      const largeObjects = [];
      for (let i = 0; i < 100; i++) {
        largeObjects.push(new Array(10000).fill(`data_${i}`));
      }
      
      const peakMemory = performance.memory.usedJSHeapSize;
      const memoryIncrease = peakMemory - initialMemory;
      
      // Cleanup
      largeObjects.length = 0;
      
      if (window.gc) window.gc();
      
      setTimeout(() => {
        const finalMemory = performance.memory.usedJSHeapSize;
        const memoryLeaked = finalMemory - initialMemory;
        
        if (memoryLeaked > 10 * 1024 * 1024) { // 10MB threshold
          edgeCaseResults.performanceRegressions.push({
            type: 'Memory Leak',
            description: `Memory not properly released: ${(memoryLeaked / 1024 / 1024).toFixed(2)}MB leaked`,
            severity: 'High'
          });
        }
        
        console.log(`Memory test: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB allocated, ${(memoryLeaked / 1024 / 1024).toFixed(2)}MB leaked`);
      }, 100);
    }
  ];
  
  console.log(`🧪 Running ${performanceTests.length} performance tests...`);
  
  performanceTests.forEach((test, index) => {
    try {
      console.log(`Performance Test ${index + 1}/${performanceTests.length}`);
      test();
    } catch (error) {
      edgeCaseResults.performanceRegressions.push({
        type: 'Performance Test Failure',
        description: `Performance test ${index + 1} failed: ${error.message}`,
        severity: 'High'
      });
    }
  });
  
  console.log(`✅ Performance regression testing completed: ${edgeCaseResults.performanceRegressions.length} issues found`);
}

/**
 * GENERATE EDGE CASE REPORT
 */
function generateEdgeCaseReport() {
  console.log('\n📋 EDGE CASE TEST REPORT');
  console.log('========================');
  
  const totalIssues = Object.values(edgeCaseResults).reduce((sum, issues) => sum + issues.length, 0);
  
  console.log(`🎯 Total Edge Case Issues: ${totalIssues}`);
  console.log(`📊 Data Issues: ${edgeCaseResults.dataEdgeCases.length}`);
  console.log(`🎨 UI Issues: ${edgeCaseResults.uiEdgeCases.length}`);
  console.log(`💼 Business Logic Issues: ${edgeCaseResults.businessLogicIssues.length}`);
  console.log(`🔄 Concurrency Issues: ${edgeCaseResults.concurrencyIssues.length}`);
  console.log(`⚡ Performance Issues: ${edgeCaseResults.performanceRegressions.length}`);
  
  // Show critical issues
  const criticalIssues = Object.values(edgeCaseResults)
    .flat()
    .filter(issue => issue.severity === 'High');
  
  if (criticalIssues.length > 0) {
    console.log('\n🚨 CRITICAL ISSUES FOUND:');
    criticalIssues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.type}: ${issue.description}`);
    });
  }
  
  // Overall edge case health
  const edgeCaseScore = Math.max(0, 100 - (criticalIssues.length * 20) - ((totalIssues - criticalIssues.length) * 5));
  const healthLevel = edgeCaseScore >= 90 ? 'EXCELLENT' :
                     edgeCaseScore >= 75 ? 'GOOD' :
                     edgeCaseScore >= 60 ? 'FAIR' : 'POOR';
  
  console.log(`\n🏆 EDGE CASE HANDLING SCORE: ${edgeCaseScore}/100 (${healthLevel})`);
  
  window.coreTrackEdgeCaseResults = edgeCaseResults;
  
  return edgeCaseResults;
}

/**
 * RUN ALL EDGE CASE TESTS
 */
async function runEdgeCaseTests() {
  console.log('🚀 Starting CoreTrack edge case testing suite...\n');
  
  try {
    await testDataEdgeCases();
    testUIEdgeCases();
    testBusinessLogicEdgeCases();
    await testConcurrencyEdgeCases();
    testPerformanceRegressions();
    
    setTimeout(() => {
      generateEdgeCaseReport();
    }, 2000);
    
  } catch (error) {
    console.error('💥 Critical error during edge case testing:', error);
  }
}

// Export for manual execution
window.runCoreTrackEdgeCaseTests = runEdgeCaseTests;

// Auto-run if in browser
if (typeof window !== 'undefined' && document.readyState !== 'loading') {
  setTimeout(runEdgeCaseTests, 500);
}
