/**
 * 🚀 RUNTIME CORETRACK STRESS TEST
 * Tests actual application behavior and catches runtime bugs
 */

console.log('🚀 RUNTIME CORETRACK STRESS TEST');
console.log('================================');

const runtimeResults = {
    issues: [],
    warnings: [],
    performance: [],
    successes: []
};

// Test 1: Check for global variables and memory leaks
function checkGlobalScope() {
    console.log('🌍 Checking global scope...');
    
    const globalVars = Object.keys(window).filter(key => 
        !key.startsWith('webkit') && 
        !key.startsWith('chrome') && 
        !['console', 'navigator', 'document', 'window', 'location', 'history'].includes(key)
    );
    
    console.log(`📊 Found ${globalVars.length} global variables`);
    
    if (globalVars.length > 50) {
        runtimeResults.warnings.push({
            type: 'Many Global Variables',
            count: globalVars.length,
            sample: globalVars.slice(0, 5)
        });
    }
    
    // Check for potential memory leaks
    const suspiciousVars = globalVars.filter(key => 
        typeof window[key] === 'object' && 
        window[key] !== null && 
        key.toLowerCase().includes('cache') ||
        key.toLowerCase().includes('store') ||
        key.toLowerCase().includes('data')
    );
    
    if (suspiciousVars.length > 0) {
        runtimeResults.warnings.push({
            type: 'Potential Memory Leak Variables',
            variables: suspiciousVars
        });
    }
}

// Test 2: Check React/Next.js specific issues
function checkReactNext() {
    console.log('⚛️ Checking React/Next.js...');
    
    // Check for hydration issues
    const hydrationErrors = document.querySelectorAll('[data-reactroot] .hydration-error');
    if (hydrationErrors.length > 0) {
        runtimeResults.issues.push({
            type: 'Hydration Errors',
            count: hydrationErrors.length
        });
    }
    
    // Check if Next.js router is working
    if (typeof window !== 'undefined' && window.next) {
        console.log('✅ Next.js router available');
        runtimeResults.successes.push({
            type: 'Next.js Router',
            status: 'Available'
        });
    }
    
    // Check for unhandled React errors
    let reactErrors = 0;
    const originalError = console.error;
    
    console.error = function(...args) {
        const message = args.join(' ');
        if (message.includes('React') || message.includes('Component')) {
            reactErrors++;
        }
        originalError.apply(console, args);
    };
    
    setTimeout(() => {
        console.error = originalError;
        if (reactErrors > 0) {
            runtimeResults.issues.push({
                type: 'React Errors in Console',
                count: reactErrors
            });
        }
    }, 5000);
}

// Test 3: Test Firebase connectivity
async function testFirebaseConnectivity() {
    console.log('🔥 Testing Firebase connectivity...');
    
    try {
        // Check if Firebase is loaded
        if (typeof window.firebase === 'undefined') {
            runtimeResults.warnings.push({
                type: 'Firebase Not Loaded',
                description: 'Firebase SDK not available'
            });
            return;
        }
        
        console.log('✅ Firebase SDK loaded');
        
        // Test Firestore connectivity
        const db = window.firebase.firestore();
        const start = performance.now();
        
        try {
            await db.collection('test').limit(1).get();
            const end = performance.now();
            const duration = end - start;
            
            console.log(`🔥 Firestore connection: ${duration.toFixed(2)}ms`);
            
            if (duration > 3000) {
                runtimeResults.performance.push({
                    type: 'Slow Firestore Connection',
                    duration: `${duration.toFixed(2)}ms`
                });
            } else {
                runtimeResults.successes.push({
                    type: 'Firestore Connection',
                    duration: `${duration.toFixed(2)}ms`
                });
            }
        } catch (firestoreError) {
            runtimeResults.issues.push({
                type: 'Firestore Connection Failed',
                error: firestoreError.message
            });
        }
        
        // Test Auth
        const auth = window.firebase.auth();
        if (auth.currentUser) {
            console.log('✅ User is authenticated');
            runtimeResults.successes.push({
                type: 'Firebase Auth',
                status: 'User authenticated'
            });
        } else {
            runtimeResults.warnings.push({
                type: 'No Authentication',
                description: 'User not logged in'
            });
        }
        
    } catch (error) {
        runtimeResults.issues.push({
            type: 'Firebase Test Failed',
            error: error.message
        });
    }
}

// Test 4: Test UI responsiveness
function testUIResponsiveness() {
    console.log('🖱️ Testing UI responsiveness...');
    
    const testElements = [
        'button',
        'input',
        'select',
        '.btn',
        '[role="button"]'
    ];
    
    let totalElements = 0;
    let slowElements = 0;
    
    testElements.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        totalElements += elements.length;
        
        elements.forEach(element => {
            const start = performance.now();
            
            // Simulate hover
            element.style.transition = 'transform 0.1s';
            element.style.transform = 'scale(1.01)';
            
            setTimeout(() => {
                const end = performance.now();
                const duration = end - start;
                
                if (duration > 100) {
                    slowElements++;
                }
                
                element.style.transform = '';
            }, 50);
        });
    });
    
    console.log(`🖱️ Tested ${totalElements} interactive elements`);
    
    if (slowElements > 0) {
        runtimeResults.performance.push({
            type: 'Slow UI Elements',
            count: slowElements,
            total: totalElements
        });
    } else {
        runtimeResults.successes.push({
            type: 'UI Responsiveness',
            elementsChecked: totalElements
        });
    }
}

// Test 5: Check for JavaScript errors
function monitorJavaScriptErrors() {
    console.log('🐛 Monitoring JavaScript errors...');
    
    const errors = [];
    
    window.addEventListener('error', (event) => {
        errors.push({
            message: event.message,
            filename: event.filename,
            line: event.lineno,
            column: event.colno
        });
    });
    
    window.addEventListener('unhandledrejection', (event) => {
        errors.push({
            type: 'Promise Rejection',
            reason: event.reason
        });
    });
    
    setTimeout(() => {
        if (errors.length > 0) {
            runtimeResults.issues.push({
                type: 'JavaScript Runtime Errors',
                count: errors.length,
                errors: errors.slice(0, 3)
            });
            console.log(`❌ Found ${errors.length} JavaScript errors`);
        } else {
            console.log('✅ No JavaScript errors detected');
            runtimeResults.successes.push({
                type: 'JavaScript Error Monitoring',
                status: 'No errors detected'
            });
        }
    }, 8000);
}

// Test 6: Performance metrics
function checkPerformanceMetrics() {
    console.log('⚡ Checking performance metrics...');
    
    if (performance.getEntriesByType) {
        const navigation = performance.getEntriesByType('navigation')[0];
        
        if (navigation) {
            const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
            const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart;
            
            console.log(`📊 Page load time: ${loadTime.toFixed(2)}ms`);
            console.log(`📊 DOM content loaded: ${domContentLoaded.toFixed(2)}ms`);
            
            if (loadTime > 3000) {
                runtimeResults.performance.push({
                    type: 'Slow Page Load',
                    duration: `${loadTime.toFixed(2)}ms`
                });
            }
            
            if (domContentLoaded > 1500) {
                runtimeResults.performance.push({
                    type: 'Slow DOM Loading',
                    duration: `${domContentLoaded.toFixed(2)}ms`
                });
            }
        }
    }
    
    // Check Largest Contentful Paint
    if (window.PerformanceObserver) {
        try {
            new PerformanceObserver((list) => {
                const entries = list.getEntries();
                const lastEntry = entries[entries.length - 1];
                
                if (lastEntry && lastEntry.startTime > 2500) {
                    runtimeResults.performance.push({
                        type: 'Slow Largest Contentful Paint',
                        duration: `${lastEntry.startTime.toFixed(2)}ms`
                    });
                }
            }).observe({ entryTypes: ['largest-contentful-paint'] });
        } catch (error) {
            console.log('⚠️ Could not monitor LCP');
        }
    }
}

// Generate comprehensive runtime report
function generateRuntimeReport() {
    console.log('\n📋 RUNTIME STRESS TEST REPORT');
    console.log('=============================');
    
    const totalIssues = runtimeResults.issues.length;
    const totalWarnings = runtimeResults.warnings.length;
    const totalPerformance = runtimeResults.performance.length;
    const totalSuccesses = runtimeResults.successes.length;
    
    console.log(`🐛 Runtime Issues: ${totalIssues}`);
    console.log(`⚠️  Warnings: ${totalWarnings}`);
    console.log(`⚡ Performance Issues: ${totalPerformance}`);
    console.log(`✅ Successful Tests: ${totalSuccesses}`);
    
    if (totalIssues > 0) {
        console.log('\n🚨 RUNTIME ISSUES:');
        runtimeResults.issues.forEach((issue, index) => {
            console.log(`${index + 1}. ${issue.type}`, issue);
        });
    }
    
    if (totalWarnings > 0) {
        console.log('\n⚠️ WARNINGS:');
        runtimeResults.warnings.forEach((warning, index) => {
            console.log(`${index + 1}. ${warning.type}`, warning);
        });
    }
    
    if (totalPerformance > 0) {
        console.log('\n⚡ PERFORMANCE ISSUES:');
        runtimeResults.performance.forEach((perf, index) => {
            console.log(`${index + 1}. ${perf.type}`, perf);
        });
    }
    
    if (totalSuccesses > 0) {
        console.log('\n✅ SUCCESSFUL TESTS:');
        runtimeResults.successes.forEach((success, index) => {
            console.log(`${index + 1}. ${success.type}`, success);
        });
    }
    
    // Calculate runtime health score
    const healthScore = Math.max(0, 100 - (totalIssues * 15) - (totalWarnings * 5) - (totalPerformance * 8) + (totalSuccesses * 2));
    const health = healthScore >= 90 ? 'EXCELLENT' :
                   healthScore >= 75 ? 'GOOD' :
                   healthScore >= 60 ? 'FAIR' : 'POOR';
    
    console.log(`\n🏆 RUNTIME HEALTH SCORE: ${healthScore}/100 (${health})`);
    
    // Store results globally
    window.runtimeCoreTrackReport = runtimeResults;
    
    return { healthScore, health, results: runtimeResults };
}

// Run all runtime tests
async function runRuntimeStressTest() {
    console.log('🚀 Starting CoreTrack runtime stress test...\n');
    
    checkGlobalScope();
    checkReactNext();
    await testFirebaseConnectivity();
    testUIResponsiveness();
    monitorJavaScriptErrors();
    checkPerformanceMetrics();
    
    // Generate report after all tests
    setTimeout(() => {
        generateRuntimeReport();
    }, 10000);
}

// Auto-run
runRuntimeStressTest();
