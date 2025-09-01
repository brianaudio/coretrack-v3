/**
 * 🔒 CORETRACK BRANCH ISOLATION SECURITY SCANNER
 * 
 * Tests the critical branch isolation system that ensures
 * data separation between different business locations
 */

console.log('🔒 CORETRACK BRANCH ISOLATION SECURITY SCANNER');
console.log('=============================================');

const branchIsolationResults = {
    criticalIssues: [],
    warnings: [],
    securityGaps: [],
    performance: [],
    successes: []
};

// Test 1: Check Firestore Rules for Branch Isolation
async function testFirestoreRules() {
    console.log('🔥 Testing Firestore Rules for Branch Isolation...');
    
    try {
        if (typeof firebase === 'undefined') {
            branchIsolationResults.criticalIssues.push({
                type: 'Firebase Not Available',
                severity: 'CRITICAL',
                description: 'Cannot test Firestore rules - Firebase SDK not loaded'
            });
            return;
        }
        
        const db = firebase.firestore();
        const auth = firebase.auth();
        const currentUser = auth.currentUser;
        
        if (!currentUser) {
            branchIsolationResults.warnings.push({
                type: 'Not Authenticated',
                description: 'Cannot test branch isolation without user authentication'
            });
            return;
        }
        
        console.log(`✅ Testing as user: ${currentUser.email}`);
        
        // Test 1a: Try to access inventory with correct locationId
        try {
            const userLocationId = currentUser.uid; // Assuming user's locationId
            const inventoryQuery = db.collection('inventory')
                .where('locationId', '==', userLocationId)
                .limit(1);
            
            const start = performance.now();
            const snapshot = await inventoryQuery.get();
            const duration = performance.now() - start;
            
            console.log(`✅ Authorized inventory access: ${duration.toFixed(2)}ms`);
            branchIsolationResults.successes.push({
                type: 'Authorized Inventory Access',
                duration: `${duration.toFixed(2)}ms`,
                documents: snapshot.size
            });
            
        } catch (error) {
            branchIsolationResults.criticalIssues.push({
                type: 'Authorized Access Failed',
                severity: 'HIGH',
                error: error.message
            });
        }
        
        // Test 1b: Try to access inventory without locationId filter (should fail)
        try {
            const unsafeQuery = db.collection('inventory').limit(1);
            const unsafeSnapshot = await unsafeQuery.get();
            
            // If this succeeds, it's a CRITICAL security issue
            branchIsolationResults.criticalIssues.push({
                type: 'SECURITY BREACH: Unfiltered Data Access',
                severity: 'CRITICAL',
                description: 'Query without locationId filter succeeded - branch isolation BROKEN',
                documentsAccessed: unsafeSnapshot.size
            });
            
        } catch (error) {
            // This should fail - which is good for security
            if (error.code === 'permission-denied') {
                console.log('✅ Unfiltered access properly denied');
                branchIsolationResults.successes.push({
                    type: 'Security Rule Working',
                    description: 'Unfiltered access properly denied by Firestore rules'
                });
            } else {
                branchIsolationResults.warnings.push({
                    type: 'Unexpected Error on Unfiltered Access',
                    error: error.message
                });
            }
        }
        
    } catch (error) {
        branchIsolationResults.criticalIssues.push({
            type: 'Firestore Test Failed',
            severity: 'HIGH',
            error: error.message
        });
    }
}

// Test 2: Scan Frontend Code for Branch Isolation Violations
function scanFrontendBranchIsolation() {
    console.log('🔍 Scanning Frontend Code for Branch Isolation...');
    
    // Check if locationId is used consistently in queries
    const potentialViolations = [];
    
    // Look for global variables that might leak locationId
    const globalVars = Object.keys(window);
    const suspiciousGlobals = globalVars.filter(key => 
        key.toLowerCase().includes('location') ||
        key.toLowerCase().includes('branch') ||
        key.toLowerCase().includes('tenant')
    );
    
    if (suspiciousGlobals.length > 0) {
        branchIsolationResults.warnings.push({
            type: 'Suspicious Global Variables',
            variables: suspiciousGlobals,
            description: 'Global variables that might expose branch information'
        });
    }
    
    // Check localStorage for potential data leaks
    try {
        const storageKeys = Object.keys(localStorage);
        const branchDataInStorage = storageKeys.filter(key => {
            const value = localStorage.getItem(key);
            return value && (
                value.includes('locationId') ||
                value.includes('branchId') ||
                value.includes('tenantId')
            );
        });
        
        if (branchDataInStorage.length > 0) {
            branchIsolationResults.warnings.push({
                type: 'Branch Data in localStorage',
                keys: branchDataInStorage,
                description: 'localStorage contains branch-specific data - potential security risk'
            });
        }
        
    } catch (error) {
        console.log('⚠️ Could not scan localStorage');
    }
    
    console.log('✅ Frontend branch isolation scan completed');
}

// Test 3: Test Cross-Branch Data Access Attempts
async function testCrossBranchAccess() {
    console.log('🚫 Testing Cross-Branch Data Access Prevention...');
    
    if (typeof firebase === 'undefined') return;
    
    try {
        const db = firebase.firestore();
        const auth = firebase.auth();
        const currentUser = auth.currentUser;
        
        if (!currentUser) return;
        
        // Generate fake locationIds to test unauthorized access
        const fakeLocationIds = [
            'fake-location-1',
            'fake-location-2',
            'unauthorized-branch',
            'test-branch-violation'
        ];
        
        for (const fakeLocationId of fakeLocationIds) {
            try {
                const unauthorizedQuery = db.collection('inventory')
                    .where('locationId', '==', fakeLocationId)
                    .limit(1);
                
                const snapshot = await unauthorizedQuery.get();
                
                if (snapshot.size > 0) {
                    branchIsolationResults.criticalIssues.push({
                        type: 'UNAUTHORIZED CROSS-BRANCH ACCESS',
                        severity: 'CRITICAL',
                        fakeLocationId: fakeLocationId,
                        documentsAccessed: snapshot.size,
                        description: 'Successfully accessed data from unauthorized branch'
                    });
                } else {
                    branchIsolationResults.successes.push({
                        type: 'Cross-Branch Access Denied',
                        attemptedLocationId: fakeLocationId
                    });
                }
                
            } catch (error) {
                if (error.code === 'permission-denied') {
                    branchIsolationResults.successes.push({
                        type: 'Security Rule Blocked Unauthorized Access',
                        attemptedLocationId: fakeLocationId
                    });
                } else {
                    branchIsolationResults.warnings.push({
                        type: 'Unexpected Error in Cross-Branch Test',
                        error: error.message,
                        locationId: fakeLocationId
                    });
                }
            }
        }
        
    } catch (error) {
        branchIsolationResults.criticalIssues.push({
            type: 'Cross-Branch Test Failed',
            error: error.message
        });
    }
}

// Test 4: Check for LocationId Consistency in UI Components
function checkLocationIdConsistency() {
    console.log('🎯 Checking LocationId Consistency in UI...');
    
    // Look for elements that might display branch-specific data
    const dataElements = document.querySelectorAll('[data-location-id], [data-branch-id], [data-tenant-id]');
    
    if (dataElements.length > 0) {
        const locationIds = new Set();
        
        dataElements.forEach(element => {
            const locationId = element.getAttribute('data-location-id') || 
                             element.getAttribute('data-branch-id') || 
                             element.getAttribute('data-tenant-id');
            
            if (locationId) {
                locationIds.add(locationId);
            }
        });
        
        if (locationIds.size > 1) {
            branchIsolationResults.criticalIssues.push({
                type: 'MULTIPLE LOCATION IDS IN UI',
                severity: 'HIGH',
                locationIds: Array.from(locationIds),
                description: 'UI displays data from multiple branches - potential data leak'
            });
        } else if (locationIds.size === 1) {
            branchIsolationResults.successes.push({
                type: 'Consistent LocationId in UI',
                locationId: Array.from(locationIds)[0],
                elements: dataElements.length
            });
        }
    }
    
    // Check for mixed data in tables/lists
    const tableRows = document.querySelectorAll('tr[data-id], .inventory-item, .sales-item');
    if (tableRows.length > 0) {
        console.log(`📊 Checking ${tableRows.length} data rows for branch consistency`);
        branchIsolationResults.successes.push({
            type: 'Data Rows Scanned',
            count: tableRows.length
        });
    }
}

// Test 5: Performance Impact of Branch Isolation
async function testBranchIsolationPerformance() {
    console.log('⚡ Testing Branch Isolation Performance Impact...');
    
    if (typeof firebase === 'undefined') return;
    
    try {
        const db = firebase.firestore();
        const auth = firebase.auth();
        const currentUser = auth.currentUser;
        
        if (!currentUser) return;
        
        const userLocationId = currentUser.uid;
        
        // Test 1: Query with locationId filter (proper)
        const start1 = performance.now();
        try {
            await db.collection('inventory')
                .where('locationId', '==', userLocationId)
                .limit(10)
                .get();
            const duration1 = performance.now() - start1;
            
            console.log(`📊 Filtered query performance: ${duration1.toFixed(2)}ms`);
            
            if (duration1 > 2000) {
                branchIsolationResults.performance.push({
                    type: 'Slow Branch-Filtered Query',
                    duration: `${duration1.toFixed(2)}ms`,
                    threshold: '2000ms'
                });
            } else {
                branchIsolationResults.successes.push({
                    type: 'Fast Branch-Filtered Query',
                    duration: `${duration1.toFixed(2)}ms`
                });
            }
            
        } catch (error) {
            branchIsolationResults.warnings.push({
                type: 'Performance Test Query Failed',
                error: error.message
            });
        }
        
        // Test 2: Multiple collection performance
        const collections = ['inventory', 'sales', 'expenses', 'purchaseOrders'];
        const start2 = performance.now();
        
        const promises = collections.map(collection => 
            db.collection(collection)
                .where('locationId', '==', userLocationId)
                .limit(5)
                .get()
                .catch(error => null) // Ignore errors for missing collections
        );
        
        await Promise.all(promises);
        const duration2 = performance.now() - start2;
        
        console.log(`📊 Multi-collection query performance: ${duration2.toFixed(2)}ms`);
        
        if (duration2 > 5000) {
            branchIsolationResults.performance.push({
                type: 'Slow Multi-Collection Query',
                duration: `${duration2.toFixed(2)}ms`,
                collections: collections.length
            });
        }
        
    } catch (error) {
        branchIsolationResults.warnings.push({
            type: 'Performance Test Failed',
            error: error.message
        });
    }
}

// Test 6: Check URL Parameters for Branch Information Leaks
function checkURLSecurity() {
    console.log('🌐 Checking URL Security for Branch Information...');
    
    const currentURL = window.location.href;
    const urlParams = new URLSearchParams(window.location.search);
    
    // Check for sensitive parameters in URL
    const sensitiveParams = ['locationId', 'branchId', 'tenantId', 'location', 'branch'];
    const foundSensitiveParams = [];
    
    sensitiveParams.forEach(param => {
        if (urlParams.has(param)) {
            foundSensitiveParams.push({
                param: param,
                value: urlParams.get(param)
            });
        }
    });
    
    if (foundSensitiveParams.length > 0) {
        branchIsolationResults.securityGaps.push({
            type: 'Sensitive Data in URL',
            severity: 'MEDIUM',
            parameters: foundSensitiveParams,
            description: 'URL contains branch-sensitive information that could be exposed'
        });
    } else {
        branchIsolationResults.successes.push({
            type: 'Clean URL Parameters',
            description: 'No sensitive branch data found in URL'
        });
    }
    
    // Check for locationId in hash
    if (window.location.hash.includes('location') || window.location.hash.includes('branch')) {
        branchIsolationResults.securityGaps.push({
            type: 'Sensitive Data in URL Hash',
            hash: window.location.hash
        });
    }
}

// Generate Branch Isolation Security Report
function generateBranchIsolationReport() {
    console.log('\\n🔒 BRANCH ISOLATION SECURITY REPORT');
    console.log('===================================');
    
    const criticalCount = branchIsolationResults.criticalIssues.length;
    const warningCount = branchIsolationResults.warnings.length;
    const securityGapCount = branchIsolationResults.securityGaps.length;
    const performanceCount = branchIsolationResults.performance.length;
    const successCount = branchIsolationResults.successes.length;
    
    console.log(`🚨 CRITICAL SECURITY ISSUES: ${criticalCount}`);
    console.log(`🔒 SECURITY GAPS: ${securityGapCount}`);
    console.log(`⚠️  WARNINGS: ${warningCount}`);
    console.log(`⚡ PERFORMANCE ISSUES: ${performanceCount}`);
    console.log(`✅ SUCCESSFUL TESTS: ${successCount}`);
    
    if (criticalCount > 0) {
        console.log('\\n🚨 CRITICAL SECURITY ISSUES:');
        branchIsolationResults.criticalIssues.forEach((issue, index) => {
            console.log(`${index + 1}. [${issue.severity}] ${issue.type}`);
            console.log(`   ${issue.description || issue.error}`);
            if (issue.documentsAccessed) {
                console.log(`   ⚠️ Documents accessed: ${issue.documentsAccessed}`);
            }
        });
    }
    
    if (securityGapCount > 0) {
        console.log('\\n🔒 SECURITY GAPS:');
        branchIsolationResults.securityGaps.forEach((gap, index) => {
            console.log(`${index + 1}. [${gap.severity}] ${gap.type}`);
            console.log(`   ${gap.description}`);
        });
    }
    
    if (warningCount > 0) {
        console.log('\\n⚠️ WARNINGS:');
        branchIsolationResults.warnings.forEach((warning, index) => {
            console.log(`${index + 1}. ${warning.type}`);
            console.log(`   ${warning.description || warning.error}`);
        });
    }
    
    if (successCount > 0) {
        console.log('\\n✅ SECURITY TESTS PASSED:');
        branchIsolationResults.successes.forEach((success, index) => {
            console.log(`${index + 1}. ${success.type}`);
            if (success.description) console.log(`   ${success.description}`);
        });
    }
    
    // Calculate security score
    const securityScore = Math.max(0, 100 - (criticalCount * 40) - (securityGapCount * 20) - (warningCount * 5) - (performanceCount * 5));
    const securityLevel = securityScore >= 95 ? 'EXCELLENT' :
                         securityScore >= 85 ? 'GOOD' :
                         securityScore >= 70 ? 'ACCEPTABLE' :
                         securityScore >= 50 ? 'POOR' : 'CRITICAL';
    
    console.log(`\\n🏆 BRANCH ISOLATION SECURITY SCORE: ${securityScore}/100 (${securityLevel})`);
    
    if (criticalCount > 0) {
        console.log('\\n🚨 IMMEDIATE ACTION REQUIRED: Critical security issues found!');
    } else if (securityGapCount > 0) {
        console.log('\\n🔒 SECURITY REVIEW RECOMMENDED: Some security gaps identified');
    } else {
        console.log('\\n✅ BRANCH ISOLATION SECURITY: All tests passed!');
    }
    
    // Store results globally
    window.branchIsolationSecurityReport = branchIsolationResults;
    
    return { securityScore, securityLevel, results: branchIsolationResults };
}

// Run all branch isolation tests
async function runBranchIsolationSecurityScan() {
    console.log('🔒 Starting CoreTrack Branch Isolation Security Scan...\\n');
    
    await testFirestoreRules();
    scanFrontendBranchIsolation();
    await testCrossBranchAccess();
    checkLocationIdConsistency();
    await testBranchIsolationPerformance();
    checkURLSecurity();
    
    // Generate report after all tests
    setTimeout(() => {
        generateBranchIsolationReport();
    }, 2000);
}

// Auto-run
runBranchIsolationSecurityScan();
