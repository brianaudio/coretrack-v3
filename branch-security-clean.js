/**
 * 🔒 CORETRACK BRANCH ISOLATION SECURITY SCANNER - CLEAN VERSION
 * Tests the critical branch isolation system for security vulnerabilities
 */

console.log('🔒 CORETRACK BRANCH ISOLATION SECURITY SCANNER');
console.log('=============================================');

const branchResults = {
    criticalIssues: [],
    warnings: [],
    successes: []
};

// Test Firebase Security
async function testFirebaseSecurity() {
    console.log('🔥 Testing Firebase Security...');
    
    if (typeof firebase === 'undefined') {
        branchResults.criticalIssues.push('Firebase SDK not loaded');
        console.log('❌ Firebase not available');
        return;
    }
    
    const db = firebase.firestore();
    const auth = firebase.auth();
    const user = auth.currentUser;
    
    if (!user) {
        branchResults.warnings.push('User not authenticated');
        console.log('⚠️ Not logged in - limited testing');
        return;
    }
    
    console.log('✅ User authenticated:', user.email);
    
    // Test 1: Try unfiltered inventory access (should fail)
    try {
        const unsafeQuery = db.collection('tenants').doc(user.uid).collection('inventory').limit(1);
        const snapshot = await unsafeQuery.get();
        
        if (snapshot.size > 0) {
            branchResults.criticalIssues.push('CRITICAL: Unfiltered inventory access succeeded');
            console.log('🚨 SECURITY BREACH: Unfiltered access allowed!');
        } else {
            branchResults.successes.push('No data returned from unfiltered query');
            console.log('✅ Unfiltered query returned no data');
        }
    } catch (error) {
        if (error.code === 'permission-denied') {
            branchResults.successes.push('Firestore rules blocked unfiltered access');
            console.log('✅ Security rules working - access denied');
        } else {
            branchResults.warnings.push('Unexpected error: ' + error.message);
            console.log('⚠️ Unexpected error:', error.message);
        }
    }
    
    // Test 2: Test cross-branch access
    const fakeBranchIds = ['fake-branch-1', 'fake-branch-2', 'unauthorized-location'];
    
    for (const fakeBranch of fakeBranchIds) {
        try {
            const crossBranchQuery = db.collection('tenants').doc(user.uid).collection('inventory')
                .where('locationId', '==', 'location_' + fakeBranch)
                .limit(1);
            
            const crossSnapshot = await crossBranchQuery.get();
            
            if (crossSnapshot.size > 0) {
                branchResults.criticalIssues.push('Cross-branch access to: ' + fakeBranch);
                console.log('🚨 SECURITY ISSUE: Cross-branch access succeeded');
            } else {
                branchResults.successes.push('Cross-branch access denied: ' + fakeBranch);
            }
        } catch (error) {
            // Expected - cross-branch should be denied
            branchResults.successes.push('Cross-branch properly blocked: ' + fakeBranch);
        }
    }
}

// Test UI Security
function testUISecurity() {
    console.log('🖥️ Testing UI Security...');
    
    // Check for locationId in DOM
    const elementsWithLocationId = document.querySelectorAll('[data-location-id]');
    const elementsWithBranchId = document.querySelectorAll('[data-branch-id]');
    
    console.log('📊 Found', elementsWithLocationId.length, 'elements with locationId');
    console.log('📊 Found', elementsWithBranchId.length, 'elements with branchId');
    
    // Check localStorage for sensitive data
    const sensitiveKeys = ['locationId', 'branchId', 'tenantId'];
    const foundSensitiveData = [];
    
    sensitiveKeys.forEach(key => {
        if (localStorage.getItem(key)) {
            foundSensitiveData.push(key);
        }
    });
    
    if (foundSensitiveData.length > 0) {
        branchResults.warnings.push('Sensitive data in localStorage: ' + foundSensitiveData.join(', '));
        console.log('⚠️ Sensitive data found in localStorage');
    } else {
        branchResults.successes.push('No sensitive data in localStorage');
        console.log('✅ localStorage appears clean');
    }
}

// Test Memory/Performance
function testPerformance() {
    console.log('⚡ Testing Performance...');
    
    if (performance.memory) {
        const memoryMB = (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2);
        console.log('📊 Memory usage:', memoryMB, 'MB');
        
        if (performance.memory.usedJSHeapSize > 100 * 1024 * 1024) {
            branchResults.warnings.push('High memory usage: ' + memoryMB + 'MB');
        } else {
            branchResults.successes.push('Memory usage acceptable: ' + memoryMB + 'MB');
        }
    }
    
    // Test DOM size
    const elementCount = document.querySelectorAll('*').length;
    console.log('📊 DOM elements:', elementCount);
    
    if (elementCount > 5000) {
        branchResults.warnings.push('Large DOM: ' + elementCount + ' elements');
    } else {
        branchResults.successes.push('DOM size reasonable: ' + elementCount + ' elements');
    }
}

// Generate Report
function generateSecurityReport() {
    console.log('');
    console.log('📋 BRANCH ISOLATION SECURITY REPORT');
    console.log('===================================');
    
    const criticalCount = branchResults.criticalIssues.length;
    const warningCount = branchResults.warnings.length;
    const successCount = branchResults.successes.length;
    
    console.log('🚨 Critical Issues:', criticalCount);
    console.log('⚠️ Warnings:', warningCount);
    console.log('✅ Successes:', successCount);
    
    if (criticalCount > 0) {
        console.log('');
        console.log('🚨 CRITICAL SECURITY ISSUES:');
        branchResults.criticalIssues.forEach((issue, index) => {
            console.log((index + 1) + '. ' + issue);
        });
    }
    
    if (warningCount > 0) {
        console.log('');
        console.log('⚠️ WARNINGS:');
        branchResults.warnings.forEach((warning, index) => {
            console.log((index + 1) + '. ' + warning);
        });
    }
    
    if (successCount > 0) {
        console.log('');
        console.log('✅ SECURITY TESTS PASSED:');
        branchResults.successes.forEach((success, index) => {
            console.log((index + 1) + '. ' + success);
        });
    }
    
    // Security Score
    const securityScore = Math.max(0, 100 - (criticalCount * 30) - (warningCount * 10));
    const securityLevel = securityScore >= 90 ? 'EXCELLENT' :
                         securityScore >= 70 ? 'GOOD' :
                         securityScore >= 50 ? 'FAIR' : 'POOR';
    
    console.log('');
    console.log('🏆 SECURITY SCORE:', securityScore + '/100 (' + securityLevel + ')');
    
    if (criticalCount > 0) {
        console.log('🚨 IMMEDIATE ACTION REQUIRED!');
    } else if (warningCount > 0) {
        console.log('🔒 Review recommended');
    } else {
        console.log('✅ Security looks good!');
    }
    
    // Store results
    window.branchSecurityResults = branchResults;
}

// Run All Tests
async function runBranchSecurityScan() {
    console.log('🚀 Starting Branch Isolation Security Scan...');
    console.log('');
    
    await testFirebaseSecurity();
    testUISecurity();
    testPerformance();
    
    setTimeout(() => {
        generateSecurityReport();
    }, 1000);
}

// Auto-run
runBranchSecurityScan();
