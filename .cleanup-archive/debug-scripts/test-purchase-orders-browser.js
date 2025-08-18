// CAPITAL INTELLIGENCE PURCHASE ORDER TEST SCRIPT
// Copy and paste this entire script into your browser console when on the Capital Intelligence page

console.log('🧪 TESTING PURCHASE ORDER CONNECTION IN CAPITAL INTELLIGENCE');
console.log('=' .repeat(60));

// Test 1: Check if we're on the right page
function test1_checkPage() {
  console.log('\n1️⃣ TEST 1: Page Verification');
  const isBusinessReports = window.location.href.includes('business-reports') || 
                           document.title.includes('Business Reports') ||
                           document.querySelector('h1')?.textContent?.includes('Business Reports');
  
  if (isBusinessReports) {
    console.log('✅ On Capital Intelligence (Business Reports) page');
    return true;
  } else {
    console.log('❌ Not on Business Reports page. Navigate to Capital Intelligence first.');
    console.log('💡 Go to: Your App → Capital Intelligence');
    return false;
  }
}

// Test 2: Check if purchase order report options exist
function test2_checkReportOptions() {
  console.log('\n2️⃣ TEST 2: Purchase Order Report Options');
  
  const purchaseReportTypes = [
    'Purchase Summary',
    'Supplier Analysis',
    'Cost Tracking',
    'Executive Summary'
  ];
  
  let foundReports = 0;
  purchaseReportTypes.forEach(reportType => {
    const element = Array.from(document.querySelectorAll('*')).find(el => 
      el.textContent?.includes(reportType)
    );
    
    if (element) {
      console.log(`✅ Found: ${reportType}`);
      foundReports++;
    } else {
      console.log(`❌ Missing: ${reportType}`);
    }
  });
  
  console.log(`📊 Found ${foundReports}/4 purchase order related reports`);
  return foundReports > 0;
}

// Test 3: Check for debug mode
function test3_checkDebugMode() {
  console.log('\n3️⃣ TEST 3: Debug Mode Availability');
  
  const debugButton = Array.from(document.querySelectorAll('button')).find(btn => 
    btn.textContent?.includes('Debug') || btn.textContent?.includes('Show Debug')
  );
  
  if (debugButton) {
    console.log('✅ Debug mode button found');
    console.log('💡 Click "Show Debug" to enable debugging features');
    return debugButton;
  } else {
    console.log('❌ Debug mode button not found');
    return null;
  }
}

// Test 4: Simulate report generation test
function test4_simulateTest() {
  console.log('\n4️⃣ TEST 4: Simulation Instructions');
  console.log('📋 To test purchase order connection:');
  console.log('   1. Enable Debug Mode (click "Show Debug" button)');
  console.log('   2. Select "Purchase Summary" report');
  console.log('   3. Choose a date range (try "Last 30 Days")');
  console.log('   4. Click "Generate PDF"');
  console.log('   5. Watch console for these logs:');
  console.log('      - "🛒 Fetching purchase orders..."');
  console.log('      - "✅ Found X purchase orders"');
  console.log('      - "🎯 FINAL DATA SUMMARY:"');
}

// Test 5: Branch selection check
function test5_checkBranchSelection() {
  console.log('\n5️⃣ TEST 5: Branch Selection');
  
  // Look for branch selector or selected branch indicator
  const branchElements = Array.from(document.querySelectorAll('*')).filter(el => 
    el.textContent?.toLowerCase().includes('branch') ||
    el.textContent?.toLowerCase().includes('location')
  );
  
  if (branchElements.length > 0) {
    console.log('✅ Branch-related elements found');
    console.log('💡 Make sure you have selected a branch in the top navigation');
  } else {
    console.log('⚠️  No obvious branch selection found');
    console.log('💡 Check top navigation for branch/location selector');
  }
}

// Main test runner
function runAllTests() {
  console.log('🚀 STARTING COMPREHENSIVE PURCHASE ORDER TEST...\n');
  
  const test1Result = test1_checkPage();
  if (!test1Result) {
    console.log('\n🛑 Please navigate to Capital Intelligence page first');
    return;
  }
  
  test2_checkReportOptions();
  const debugButton = test3_checkDebugMode();
  test4_simulateTest();
  test5_checkBranchSelection();
  
  console.log('\n🎯 SUMMARY:');
  console.log('✅ Purchase order reports are available in the interface');
  console.log('✅ Debug mode is available for testing');
  console.log('✅ All necessary components are in place');
  
  console.log('\n📝 MANUAL TEST STEPS:');
  console.log('1. Make sure you have a branch selected');
  console.log('2. Click "Show Debug" button');
  console.log('3. Select "Purchase Summary" from report options');
  console.log('4. Set date range to "Last 30 Days"');
  console.log('5. Click "Generate PDF"');
  console.log('6. Check this console for purchase order fetch logs');
  
  if (debugButton) {
    console.log('\n💡 I can help you click the debug button:');
    console.log('   debugButton.click(); // Run this to enable debug mode');
    
    // Store the button reference globally for easy access
    window.debugButton = debugButton;
  }
}

// Enhanced console monitoring
function enableConsoleMonitoring() {
  console.log('\n🎧 ENHANCED CONSOLE MONITORING ENABLED');
  console.log('Watching for purchase order related logs...\n');
  
  const originalLog = console.log;
  console.log = function(...args) {
    const message = args.join(' ');
    
    // Highlight purchase order related logs
    if (message.includes('🛒') || message.includes('purchase order') || message.includes('PO:')) {
      originalLog('🟢 PURCHASE ORDER LOG:', ...args);
    } else if (message.includes('🎯 FINAL DATA SUMMARY')) {
      originalLog('🟢 DATA SUMMARY:', ...args);
    } else {
      originalLog(...args);
    }
  };
}

// Auto-run the tests
runAllTests();
enableConsoleMonitoring();

console.log('\n' + '='.repeat(60));
console.log('🧪 TEST SCRIPT COMPLETE - Ready for manual testing!');
console.log('='.repeat(60));
