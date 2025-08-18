#!/usr/bin/env node

/**
 * COMPREHENSIVE REPORTS CENTER DEBUG ANALYSIS
 * Deep dive investigation into sales data flow issues
 */

console.log('🔍 COMPREHENSIVE REPORTS CENTER ANALYSIS');
console.log('=' .repeat(80));
console.log('Current Date:', new Date().toISOString());
console.log('Timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);

// Test 1: Date Range Calculation Analysis
console.log('\n📅 TEST 1: Date Range Calculation Analysis');
const testDateRange = () => {
  const endDate = new Date()
  const startDate = new Date()
  
  // Today calculation (same as in BusinessReportsOptimized)
  startDate.setHours(0, 0, 0, 0)
  endDate.setHours(23, 59, 59, 999)
  
  console.log('   Today Start Date:', startDate.toISOString());
  console.log('   Today End Date:', endDate.toISOString());
  console.log('   Local Today Start:', startDate.toLocaleString());
  console.log('   Local Today End:', endDate.toLocaleString());
  
  const days = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  console.log('   Days Calculation:', days);
  
  return { startDate, endDate, days };
};

const dateInfo = testDateRange();

// Test 2: Check BusinessReportsOptimized Implementation
console.log('\n📊 TEST 2: BusinessReportsOptimized Implementation Analysis');
try {
  const fs = require('fs');
  const code = fs.readFileSync('./src/components/modules/BusinessReportsOptimized.tsx', 'utf8');
  
  console.log('   ✅ File exists and readable');
  
  // Check synthetic data creation
  const hasSyntheticData = code.includes('Creating synthetic sales data from dashboard stats');
  console.log(`   ${hasSyntheticData ? '✅' : '❌'} Synthetic data creation: ${hasSyntheticData ? 'IMPLEMENTED' : 'MISSING'}`);
  
  // Check validation logic
  const hasSpecialTodayValidation = code.includes('dateRange === \'today\'') && code.includes('dashboard stats for TODAY report');
  console.log(`   ${hasSpecialTodayValidation ? '✅' : '❌'} Special today validation: ${hasSpecialTodayValidation ? 'IMPLEMENTED' : 'MISSING'}`);
  
  // Check filtering logic
  const hasFilteringDisabled = !code.includes('commonTestValues.includes(day.revenue)') || code.includes('Use all the data without aggressive filtering');
  console.log(`   ${hasFilteringDisabled ? '✅' : '❌'} Aggressive filtering disabled: ${hasFilteringDisabled ? 'YES' : 'NO - STILL ACTIVE'}`);
  
} catch (error) {
  console.log('   ❌ Error reading BusinessReportsOptimized.tsx:', error.message);
}

// Test 3: Analytics Functions Analysis
console.log('\n📈 TEST 3: Analytics Functions Analysis');
try {
  const fs = require('fs');
  const analyticsCode = fs.readFileSync('./src/lib/firebase/analytics.ts', 'utf8');
  
  // Check getDashboardStats implementation
  const hasDashboardStats = analyticsCode.includes('getDashboardStats') && analyticsCode.includes('todaysSales');
  console.log(`   ${hasDashboardStats ? '✅' : '❌'} getDashboardStats with todaysSales: ${hasDashboardStats ? 'IMPLEMENTED' : 'MISSING'}`);
  
  // Check getSalesChartData implementation
  const hasSalesChartData = analyticsCode.includes('getSalesChartData');
  console.log(`   ${hasSalesChartData ? '✅' : '❌'} getSalesChartData function: ${hasSalesChartData ? 'EXISTS' : 'MISSING'}`);
  
} catch (error) {
  console.log('   ❌ Error reading analytics.ts:', error.message);
}

// Test 4: Data Flow Trace
console.log('\n🔄 TEST 4: Expected Data Flow Analysis');
console.log('   Expected Flow:');
console.log('   1. User clicks "Generate Report" → generatePDF()');
console.log('   2. fetchReportData() → calls getDashboardStats() & getSalesChartData()');  
console.log('   3. getSalesChartData() returns empty for today → fallback to synthetic data');
console.log('   4. Dashboard stats used: todaysSales.revenue (₱675)');
console.log('   5. Validation checks both chart data AND dashboard stats');
console.log('   6. Report should proceed with synthetic data from dashboard stats');

// Test 5: Potential Issues Analysis  
console.log('\n⚠️  TEST 5: Potential Issues Analysis');
const potentialIssues = [
  {
    issue: 'getSalesChartData() not handling single-day queries',
    symptoms: ['Chart data returns empty for today', 'Multi-day reports work'],
    likelihood: 'HIGH'
  },
  {
    issue: 'Dashboard stats not reflecting real-time sales',
    symptoms: ['Shows ₱0 in dashboard stats', 'Real sales exist in orders'],
    likelihood: 'MEDIUM'
  },
  {
    issue: 'Timezone mismatch in date calculations',
    symptoms: ['Today filter excludes actual today\'s data', 'Off-by-one day'],
    likelihood: 'MEDIUM'
  },
  {
    issue: 'Validation still failing despite fixes',
    symptoms: ['Error thrown before reaching PDF generation', 'Console shows dashboard stats'],
    likelihood: 'HIGH'
  },
  {
    issue: 'Synthetic data creation not working',
    symptoms: ['finalSalesData still empty', 'Dashboard stats available but not used'],
    likelihood: 'HIGH'
  }
];

potentialIssues.forEach((item, index) => {
  console.log(`   ${index + 1}. ${item.issue}`);
  console.log(`      Likelihood: ${item.likelihood}`);
  console.log(`      Symptoms: ${item.symptoms.join(', ')}`);
  console.log('');
});

// Test 6: Console Log Pattern Analysis
console.log('\n📝 TEST 6: Expected Console Log Pattern');
console.log('   When you generate a report, you should see:');
console.log('   1. 🚀 Starting PDF Generation: {...}');
console.log('   2. Date Range Calculation Debug: {...}');  
console.log('   3. Report Data Debug: {...}');
console.log('   4. Sales Data Details: [{...}] or []');
console.log('   5. Dashboard Stats Details: {todaysSales: {...}}');
console.log('   6. 📊 Raw Data Fetched: {...}');
console.log('   7. Report Validation Debug: {...}');
console.log('   8. Either:');
console.log('      ✅ "Using dashboard stats for TODAY report..." OR');
console.log('      ❌ "No sales data found in either sales data..."');

// Test 7: Next Steps
console.log('\n🎯 TEST 7: Debugging Action Plan');
console.log('   IMMEDIATE ACTIONS:');
console.log('   1. Open browser console (F12)');
console.log('   2. Navigate to Business Reports → Today → Generate any sales report');
console.log('   3. Copy ALL console output and share');
console.log('   4. Focus on these key values:');
console.log('      - dashboardStats.todaysSales.revenue (should be 675)');
console.log('      - salesDataLength (probably 0)');
console.log('      - finalSalesDataLength (should be 1 after synthetic creation)');
console.log('      - dateRange validation path taken');

// Test 8: Quick Fix Verification
console.log('\n🔧 TEST 8: Quick Fix Verification');
try {
  const fs = require('fs');
  const code = fs.readFileSync('./src/components/modules/BusinessReportsOptimized.tsx', 'utf8');
  
  // Look for specific fixes
  const fixes = [
    { 
      name: 'Synthetic data creation', 
      pattern: /Creating synthetic sales data from dashboard stats/,
      expected: true
    },
    {
      name: 'Today-specific validation',
      pattern: /dateRange === 'today' && !hasSalesData && hasDashboardSales/,
      expected: true  
    },
    {
      name: 'Dashboard stats fallback',
      pattern: /finalSalesData = \[\{/,
      expected: true
    },
    {
      name: 'Aggressive filtering disabled',
      pattern: /Use all the data without aggressive filtering/,
      expected: true
    }
  ];
  
  fixes.forEach(fix => {
    const found = fix.pattern.test(code);
    console.log(`   ${found === fix.expected ? '✅' : '❌'} ${fix.name}: ${found ? 'FOUND' : 'NOT FOUND'}`);
  });
  
} catch (error) {
  console.log('   ❌ Error verifying fixes:', error.message);
}

console.log('\n' + '=' .repeat(80));
console.log('🎯 NEXT STEP: Generate a "Today" sales report and share the FULL console output');
console.log('Focus on the todaysSales.revenue value and validation path taken.');
console.log('=' .repeat(80));
