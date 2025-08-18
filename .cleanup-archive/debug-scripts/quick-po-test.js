// QUICK PURCHASE ORDER TEST - Run this in browser console on Capital Intelligence page
console.log('🛒 QUICK PURCHASE ORDER TEST');
console.log('='.repeat(40));

// Step 1: Check current page
const onBusinessReports = document.querySelector('h1')?.textContent?.includes('Business Reports');
console.log('📍 On Capital Intelligence page:', onBusinessReports);

if (!onBusinessReports) {
  console.log('❌ Please navigate to Capital Intelligence first');
} else {
  console.log('✅ Ready to test purchase orders');
  
  // Step 2: Find and click debug button
  const debugButton = Array.from(document.querySelectorAll('button')).find(btn => 
    btn.textContent?.includes('Debug')
  );
  
  if (debugButton) {
    console.log('🐛 Found debug button - clicking it now...');
    debugButton.click();
    
    setTimeout(() => {
      // Step 3: Look for Purchase Summary option
      const purchaseSummaryOption = Array.from(document.querySelectorAll('*')).find(el => 
        el.textContent?.includes('Purchase Summary')
      );
      
      if (purchaseSummaryOption) {
        console.log('🛒 Found Purchase Summary option');
        console.log('📋 NEXT STEPS:');
        console.log('1. Click on "Purchase Summary" report');
        console.log('2. Set date range to "Last 30 Days"');
        console.log('3. Click "Generate PDF"');
        console.log('4. Watch for these logs:');
        console.log('   - "🛒 Fetching purchase orders..."');
        console.log('   - "✅ Found 1 purchase orders" (you have 1 in database)');
        
        // Store the option for easy clicking
        window.purchaseSummaryOption = purchaseSummaryOption;
        console.log('💡 Auto-click Purchase Summary: purchaseSummaryOption.click()');
      } else {
        console.log('❌ Purchase Summary option not found');
      }
    }, 500);
    
  } else {
    console.log('❌ Debug button not found');
  }
}

// Enhanced monitoring for purchase order logs
const originalConsoleLog = console.log;
console.log = function(...args) {
  const message = args.join(' ');
  if (message.includes('🛒') || message.includes('purchase order') || message.includes('Found') && message.includes('purchase')) {
    originalConsoleLog('🟢 PURCHASE ORDER:', ...args);
  } else if (message.includes('🎯 FINAL DATA SUMMARY')) {
    originalConsoleLog('🟢 DATA SUMMARY:', ...args);
  } else {
    originalConsoleLog(...args);
  }
};

console.log('🎧 Enhanced monitoring enabled for purchase order logs');
