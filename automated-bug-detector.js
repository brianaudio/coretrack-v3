/**
 * 🚀 AUTOMATED CORETRACK BUG DETECTION
 * Runs automatically to detect issues in CoreTrack
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 AUTOMATED CORETRACK BUG DETECTION');
console.log('===================================');

const results = {
    issues: [],
    warnings: [],
    performance: [],
    info: []
};

// Test 1: Check if server is running
function checkServerRunning() {
    console.log('\n🌐 Checking if CoreTrack server is running...');
    
    try {
        const result = execSync('curl -s -o /dev/null -w "%{http_code}" http://localhost:3003', { timeout: 5000 });
        const statusCode = result.toString().trim();
        
        if (statusCode === '200') {
            console.log('✅ Server is running and responding');
            results.info.push({
                type: 'Server Status',
                status: 'Running',
                port: 3003
            });
        } else {
            results.issues.push({
                type: 'Server Not Responding',
                statusCode: statusCode,
                expected: '200'
            });
            console.log(`❌ Server returned status code: ${statusCode}`);
        }
    } catch (error) {
        results.issues.push({
            type: 'Server Connection Failed',
            error: error.message
        });
        console.log(`❌ Cannot connect to server: ${error.message}`);
    }
}

// Test 2: Check package.json dependencies
function checkDependencies() {
    console.log('\n📦 Checking package dependencies...');
    
    try {
        const packagePath = path.join(__dirname, 'package.json');
        const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        
        console.log('✅ package.json loaded successfully');
        
        const dependencies = packageData.dependencies || {};
        const devDependencies = packageData.devDependencies || {};
        const totalDeps = Object.keys(dependencies).length + Object.keys(devDependencies).length;
        
        console.log(`📊 Found ${Object.keys(dependencies).length} dependencies and ${Object.keys(devDependencies).length} dev dependencies`);
        
        // Check for potential security issues
        const potentialIssues = [];
        
        // Check for old Next.js version
        if (dependencies.next) {
            const nextVersion = dependencies.next.replace(/[^0-9.]/g, '');
            if (parseFloat(nextVersion) < 14) {
                potentialIssues.push(`Old Next.js version: ${dependencies.next}`);
            }
        }
        
        // Check for Firebase version
        if (dependencies.firebase) {
            console.log(`🔥 Firebase version: ${dependencies.firebase}`);
            results.info.push({
                type: 'Firebase Version',
                version: dependencies.firebase
            });
        }
        
        if (potentialIssues.length > 0) {
            results.warnings.push({
                type: 'Dependency Issues',
                issues: potentialIssues
            });
        }
        
        results.info.push({
            type: 'Total Dependencies',
            count: totalDeps
        });
        
    } catch (error) {
        results.issues.push({
            type: 'Package.json Error',
            error: error.message
        });
        console.log(`❌ Cannot read package.json: ${error.message}`);
    }
}

// Test 3: Check for common file issues
function checkFileStructure() {
    console.log('\n📁 Checking file structure...');
    
    const criticalFiles = [
        'package.json',
        'next.config.js',
        'tsconfig.json',
        'src/app/layout.tsx',
        'src/app/page.tsx'
    ];
    
    const missingFiles = [];
    
    criticalFiles.forEach(file => {
        const filePath = path.join(__dirname, file);
        if (!fs.existsSync(filePath)) {
            missingFiles.push(file);
        }
    });
    
    if (missingFiles.length > 0) {
        results.issues.push({
            type: 'Missing Critical Files',
            files: missingFiles
        });
        console.log(`❌ Missing files: ${missingFiles.join(', ')}`);
    } else {
        console.log('✅ All critical files present');
    }
    
    // Check for large files that might cause issues
    try {
        const srcDir = path.join(__dirname, 'src');
        if (fs.existsSync(srcDir)) {
            const files = getAllFiles(srcDir);
            const largeFiles = files.filter(file => {
                try {
                    const stats = fs.statSync(file);
                    return stats.size > 500000; // 500KB
                } catch (error) {
                    return false;
                }
            });
            
            if (largeFiles.length > 0) {
                results.warnings.push({
                    type: 'Large Files Detected',
                    files: largeFiles.map(file => ({
                        path: file.replace(__dirname, ''),
                        size: `${(fs.statSync(file).size / 1024).toFixed(2)}KB`
                    }))
                });
                console.log(`⚠️ Found ${largeFiles.length} large files`);
            }
        }
    } catch (error) {
        console.log(`⚠️ Could not analyze file sizes: ${error.message}`);
    }
}

// Helper function to get all files recursively
function getAllFiles(dir) {
    const files = [];
    
    try {
        const entries = fs.readdirSync(dir);
        
        entries.forEach(entry => {
            const fullPath = path.join(dir, entry);
            try {
                const stats = fs.statSync(fullPath);
                
                if (stats.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
                    files.push(...getAllFiles(fullPath));
                } else if (stats.isFile()) {
                    files.push(fullPath);
                }
            } catch (error) {
                // Skip files we can't access
            }
        });
    } catch (error) {
        // Skip directories we can't access
    }
    
    return files;
}

// Test 4: Check TypeScript configuration
function checkTypeScriptConfig() {
    console.log('\n🔧 Checking TypeScript configuration...');
    
    try {
        const tsconfigPath = path.join(__dirname, 'tsconfig.json');
        const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
        
        console.log('✅ tsconfig.json is valid JSON');
        
        // Check for potential issues
        const compilerOptions = tsconfig.compilerOptions || {};
        
        if (!compilerOptions.strict) {
            results.warnings.push({
                type: 'TypeScript Strict Mode Disabled',
                description: 'Consider enabling strict mode for better type safety'
            });
        }
        
        if (!compilerOptions.noUnusedLocals) {
            results.warnings.push({
                type: 'Unused Variables Not Detected',
                description: 'Consider enabling noUnusedLocals for cleaner code'
            });
        }
        
        results.info.push({
            type: 'TypeScript Target',
            target: compilerOptions.target || 'not specified'
        });
        
    } catch (error) {
        results.issues.push({
            type: 'TypeScript Configuration Error',
            error: error.message
        });
        console.log(`❌ TypeScript config error: ${error.message}`);
    }
}

// Test 5: Check for potential memory/performance issues
function checkPotentialPerformanceIssues() {
    console.log('\n⚡ Checking for potential performance issues...');
    
    try {
        // Count total files in src
        const srcDir = path.join(__dirname, 'src');
        if (fs.existsSync(srcDir)) {
            const allFiles = getAllFiles(srcDir);
            const jsFiles = allFiles.filter(f => f.endsWith('.js') || f.endsWith('.jsx') || f.endsWith('.ts') || f.endsWith('.tsx'));
            
            console.log(`📊 Found ${jsFiles.length} JavaScript/TypeScript files`);
            
            if (jsFiles.length > 500) {
                results.performance.push({
                    type: 'Large Codebase',
                    fileCount: jsFiles.length,
                    recommendation: 'Consider code splitting or lazy loading'
                });
            }
            
            // Check for very large components (basic check)
            const largeComponents = jsFiles.filter(file => {
                try {
                    const content = fs.readFileSync(file, 'utf8');
                    const lines = content.split('\n').length;
                    return lines > 500;
                } catch (error) {
                    return false;
                }
            });
            
            if (largeComponents.length > 0) {
                results.performance.push({
                    type: 'Large Components Detected',
                    count: largeComponents.length,
                    recommendation: 'Consider breaking down large components'
                });
                console.log(`⚠️ Found ${largeComponents.length} large components (>500 lines)`);
            }
        }
    } catch (error) {
        console.log(`⚠️ Performance analysis error: ${error.message}`);
    }
}

// Generate report
function generateReport() {
    console.log('\n📋 AUTOMATED BUG DETECTION REPORT');
    console.log('=================================');
    
    const totalIssues = results.issues.length;
    const totalWarnings = results.warnings.length;
    const totalPerformance = results.performance.length;
    
    console.log(`🐛 Critical Issues: ${totalIssues}`);
    console.log(`⚠️  Warnings: ${totalWarnings}`);
    console.log(`⚡ Performance Concerns: ${totalPerformance}`);
    
    if (totalIssues > 0) {
        console.log('\n🚨 CRITICAL ISSUES:');
        results.issues.forEach((issue, index) => {
            console.log(`${index + 1}. ${issue.type}`);
            if (issue.error) console.log(`   Error: ${issue.error}`);
            if (issue.description) console.log(`   ${issue.description}`);
        });
    }
    
    if (totalWarnings > 0) {
        console.log('\n⚠️ WARNINGS:');
        results.warnings.forEach((warning, index) => {
            console.log(`${index + 1}. ${warning.type}`);
            if (warning.description) console.log(`   ${warning.description}`);
        });
    }
    
    if (totalPerformance > 0) {
        console.log('\n⚡ PERFORMANCE CONCERNS:');
        results.performance.forEach((perf, index) => {
            console.log(`${index + 1}. ${perf.type}`);
            if (perf.recommendation) console.log(`   Recommendation: ${perf.recommendation}`);
        });
    }
    
    // Calculate health score
    const healthScore = Math.max(0, 100 - (totalIssues * 20) - (totalWarnings * 5) - (totalPerformance * 10));
    const health = healthScore >= 90 ? 'EXCELLENT' :
                   healthScore >= 75 ? 'GOOD' :
                   healthScore >= 60 ? 'FAIR' : 'POOR';
    
    console.log(`\n🏆 OVERALL HEALTH SCORE: ${healthScore}/100 (${health})`);
    
    // Save results to file
    const reportPath = path.join(__dirname, 'automated-bug-report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        healthScore,
        health,
        results
    }, null, 2));
    
    console.log(`\n💾 Report saved to: ${reportPath}`);
    
    return { healthScore, health, results };
}

// Run all tests
async function runAutomatedTests() {
    console.log('🚀 Starting automated CoreTrack bug detection...');
    
    checkServerRunning();
    checkDependencies();
    checkFileStructure();
    checkTypeScriptConfig();
    checkPotentialPerformanceIssues();
    
    return generateReport();
}

// Export for use in other scripts
module.exports = { runAutomatedTests, results };

// Run if called directly
if (require.main === module) {
    runAutomatedTests()
        .then(report => {
            console.log(`\n✨ Automated testing completed with health score: ${report.healthScore}/100`);
        })
        .catch(error => {
            console.error(`❌ Automated testing failed: ${error.message}`);
            process.exit(1);
        });
}
