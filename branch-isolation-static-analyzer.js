/**
 * 🔍 CORETRACK BRANCH ISOLATION STATIC CODE ANALYZER
 * 
 * Analyzes the codebase for branch isolation vulnerabilities
 * and implementation consistency across all modules
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 CORETRACK BRANCH ISOLATION STATIC CODE ANALYZER');
console.log('================================================');

const analysisResults = {
    criticalVulnerabilities: [],
    securityWarnings: [],
    implementationIssues: [],
    bestPractices: [],
    statistics: {
        totalFiles: 0,
        queriesAnalyzed: 0,
        branchFilteredQueries: 0,
        unfilteratedQueries: 0,
        locationIdReferences: 0
    }
};

// Patterns to search for
const vulnerabilityPatterns = [
    // Dangerous query patterns
    {
        pattern: /collection\([^)]+\)\.get\(\)/g,
        type: 'CRITICAL',
        description: 'Unfiltered collection query - potential data leak',
        category: 'unfiltered_query'
    },
    {
        pattern: /getDocs\(collection\([^)]+\)\)/g,
        type: 'CRITICAL', 
        description: 'Unfiltered getDocs query - potential data leak',
        category: 'unfiltered_query'
    },
    {
        pattern: /query\([^)]+\)(?!.*where.*locationId)/g,
        type: 'HIGH',
        description: 'Query without locationId filter - potential branch isolation bypass',
        category: 'missing_branch_filter'
    },
    {
        pattern: /where\(['"]tenantId['"][^)]*\)(?!.*where.*locationId)/g,
        type: 'MEDIUM',
        description: 'Query with only tenantId filter - missing locationId for branch isolation',
        category: 'incomplete_isolation'
    },
    {
        pattern: /localStorage\.setItem\([^)]*locationId/g,
        type: 'MEDIUM',
        description: 'LocationId stored in localStorage - potential security risk',
        category: 'data_exposure'
    },
    {
        pattern: /console\.log\([^)]*locationId/g,
        type: 'LOW',
        description: 'LocationId logged to console - potential information disclosure',
        category: 'information_disclosure'
    }
];

// Good patterns to look for
const bestPracticePatterns = [
    {
        pattern: /where\(['"]locationId['"], '==', [^)]+\)/g,
        description: 'Proper locationId filtering implemented',
        category: 'proper_filtering'
    },
    {
        pattern: /createBranchQuery|getBranchData|validateBranchData/g,
        description: 'Using branch isolation utility functions',
        category: 'utility_usage'
    },
    {
        pattern: /branchDataIsolation/g,
        description: 'Importing branch isolation module',
        category: 'proper_imports'
    }
];

// File extensions to analyze
const codeExtensions = ['.ts', '.tsx', '.js', '.jsx'];

// Get all files recursively
function getAllFiles(dir, files = []) {
    try {
        const entries = fs.readdirSync(dir);
        
        for (const entry of entries) {
            const fullPath = path.join(dir, entry);
            
            try {
                const stats = fs.statSync(fullPath);
                
                if (stats.isDirectory()) {
                    // Skip certain directories
                    if (!entry.startsWith('.') && 
                        entry !== 'node_modules' && 
                        entry !== 'build' && 
                        entry !== 'dist' &&
                        entry !== '.next') {
                        getAllFiles(fullPath, files);
                    }
                } else if (stats.isFile() && codeExtensions.includes(path.extname(entry))) {
                    files.push(fullPath);
                }
            } catch (error) {
                // Skip files we can't access
            }
        }
    } catch (error) {
        // Skip directories we can't access
    }
    
    return files;
}

// Analyze file content
function analyzeFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const relativePath = path.relative(process.cwd(), filePath);
        
        analysisResults.statistics.totalFiles++;
        
        const fileResults = {
            file: relativePath,
            vulnerabilities: [],
            bestPractices: [],
            statistics: {
                queries: 0,
                filteredQueries: 0,
                locationIdRefs: 0
            }
        };
        
        // Check for vulnerabilities
        vulnerabilityPatterns.forEach(pattern => {
            const matches = Array.from(content.matchAll(pattern.pattern));
            
            matches.forEach(match => {
                const lines = content.substring(0, match.index).split('\n');
                const lineNumber = lines.length;
                const lineContent = lines[lines.length - 1] + match[0];
                
                const vulnerability = {
                    type: pattern.type,
                    description: pattern.description,
                    category: pattern.category,
                    file: relativePath,
                    line: lineNumber,
                    code: lineContent.trim(),
                    match: match[0]
                };
                
                fileResults.vulnerabilities.push(vulnerability);
                
                if (pattern.type === 'CRITICAL') {
                    analysisResults.criticalVulnerabilities.push(vulnerability);
                } else if (pattern.type === 'HIGH' || pattern.type === 'MEDIUM') {
                    analysisResults.securityWarnings.push(vulnerability);
                } else {
                    analysisResults.implementationIssues.push(vulnerability);
                }
                
                // Update statistics
                if (pattern.category === 'unfiltered_query' || pattern.category === 'missing_branch_filter') {
                    analysisResults.statistics.unfilteratedQueries++;
                }
            });
        });
        
        // Check for best practices
        bestPracticePatterns.forEach(pattern => {
            const matches = Array.from(content.matchAll(pattern.pattern));
            
            matches.forEach(match => {
                const lines = content.substring(0, match.index).split('\n');
                const lineNumber = lines.length;
                
                const bestPractice = {
                    description: pattern.description,
                    category: pattern.category,
                    file: relativePath,
                    line: lineNumber,
                    match: match[0]
                };
                
                fileResults.bestPractices.push(bestPractice);
                analysisResults.bestPractices.push(bestPractice);
                
                if (pattern.category === 'proper_filtering') {
                    analysisResults.statistics.branchFilteredQueries++;
                }
            });
        });
        
        // Count queries and locationId references
        const queryMatches = content.match(/query\(/g) || [];
        const locationIdMatches = content.match(/locationId/g) || [];
        
        fileResults.statistics.queries = queryMatches.length;
        fileResults.statistics.locationIdRefs = locationIdMatches.length;
        
        analysisResults.statistics.queriesAnalyzed += queryMatches.length;
        analysisResults.statistics.locationIdReferences += locationIdMatches.length;
        
        return fileResults;
        
    } catch (error) {
        console.log(`⚠️ Could not analyze file: ${filePath} - ${error.message}`);
        return null;
    }
}

// Analyze specific high-risk areas
function analyzeHighRiskAreas() {
    console.log('\n🎯 ANALYZING HIGH-RISK AREAS...');
    
    const highRiskPaths = [
        'src/lib/firebase',
        'src/components/modules',
        'src/context',
        'src/hooks'
    ];
    
    const highRiskIssues = [];
    
    highRiskPaths.forEach(riskPath => {
        const fullPath = path.join(process.cwd(), riskPath);
        
        if (fs.existsSync(fullPath)) {
            const files = getAllFiles(fullPath);
            console.log(`📁 Analyzing ${files.length} files in ${riskPath}...`);
            
            files.forEach(file => {
                const results = analyzeFile(file);
                if (results && results.vulnerabilities.length > 0) {
                    highRiskIssues.push({
                        area: riskPath,
                        file: results.file,
                        vulnerabilities: results.vulnerabilities
                    });
                }
            });
        }
    });
    
    return highRiskIssues;
}

// Check Firestore rules
function analyzeFirestoreRules() {
    console.log('\n🔥 ANALYZING FIRESTORE RULES...');
    
    const rulesFiles = [
        'firestore.rules',
        'firestore.rules.secure',
        'firestore.rules.enhanced'
    ];
    
    const rulesAnalysis = [];
    
    rulesFiles.forEach(rulesFile => {
        const rulesPath = path.join(process.cwd(), rulesFile);
        
        if (fs.existsSync(rulesPath)) {
            try {
                const content = fs.readFileSync(rulesPath, 'utf8');
                
                const analysis = {
                    file: rulesFile,
                    hasLocationIdRules: content.includes('locationId'),
                    hasTenantIsolation: content.includes('tenantId'),
                    hasWildcardAccess: content.includes('document=**') && content.includes('allow'),
                    isSecure: false
                };
                
                // Check for security issues in rules
                if (analysis.hasWildcardAccess) {
                    analysisResults.securityWarnings.push({
                        type: 'HIGH',
                        description: 'Firestore rules contain wildcard access patterns',
                        category: 'rules_security',
                        file: rulesFile,
                        code: 'match /{document=**} { allow ... }'
                    });
                }
                
                if (!analysis.hasLocationIdRules) {
                    analysisResults.criticalVulnerabilities.push({
                        type: 'CRITICAL',
                        description: 'Firestore rules do not enforce locationId filtering',
                        category: 'rules_missing_isolation',
                        file: rulesFile
                    });
                }
                
                // Determine if rules are secure
                analysis.isSecure = analysis.hasLocationIdRules && 
                                   analysis.hasTenantIsolation && 
                                   !analysis.hasWildcardAccess;
                
                rulesAnalysis.push(analysis);
                
            } catch (error) {
                console.log(`⚠️ Could not read rules file: ${rulesFile}`);
            }
        }
    });
    
    return rulesAnalysis;
}

// Generate comprehensive report
function generateStaticAnalysisReport() {
    console.log('\n📋 BRANCH ISOLATION STATIC ANALYSIS REPORT');
    console.log('==========================================');
    
    const criticalCount = analysisResults.criticalVulnerabilities.length;
    const warningCount = analysisResults.securityWarnings.length;
    const issueCount = analysisResults.implementationIssues.length;
    const bestPracticeCount = analysisResults.bestPractices.length;
    
    console.log('\n📊 ANALYSIS STATISTICS:');
    console.log(`Files Analyzed: ${analysisResults.statistics.totalFiles}`);
    console.log(`Queries Found: ${analysisResults.statistics.queriesAnalyzed}`);
    console.log(`Branch-Filtered Queries: ${analysisResults.statistics.branchFilteredQueries}`);
    console.log(`Unfiltered/Risky Queries: ${analysisResults.statistics.unfilteratedQueries}`);
    console.log(`LocationId References: ${analysisResults.statistics.locationIdReferences}`);
    
    console.log('\n🚨 SECURITY ANALYSIS:');
    console.log(`🔴 CRITICAL Vulnerabilities: ${criticalCount}`);
    console.log(`🟡 HIGH/MEDIUM Warnings: ${warningCount}`);
    console.log(`🔵 Implementation Issues: ${issueCount}`);
    console.log(`✅ Best Practices Found: ${bestPracticeCount}`);
    
    if (criticalCount > 0) {
        console.log('\n🚨 CRITICAL VULNERABILITIES:');
        analysisResults.criticalVulnerabilities.forEach((vuln, index) => {
            console.log(`${index + 1}. [${vuln.type}] ${vuln.description}`);
            console.log(`   📁 File: ${vuln.file}:${vuln.line || 'unknown'}`);
            if (vuln.code) console.log(`   💻 Code: ${vuln.code}`);
        });
    }
    
    if (warningCount > 0) {
        console.log('\n⚠️ SECURITY WARNINGS:');
        analysisResults.securityWarnings.slice(0, 10).forEach((warning, index) => {
            console.log(`${index + 1}. [${warning.type}] ${warning.description}`);
            console.log(`   📁 File: ${warning.file}:${warning.line || 'unknown'}`);
        });
        
        if (warningCount > 10) {
            console.log(`   ... and ${warningCount - 10} more warnings`);
        }
    }
    
    if (bestPracticeCount > 0) {
        console.log('\n✅ BEST PRACTICES IMPLEMENTED:');
        const practiceCategories = {};
        analysisResults.bestPractices.forEach(practice => {
            if (!practiceCategories[practice.category]) {
                practiceCategories[practice.category] = 0;
            }
            practiceCategories[practice.category]++;
        });
        
        Object.entries(practiceCategories).forEach(([category, count]) => {
            console.log(`   ${category}: ${count} implementations`);
        });
    }
    
    // Calculate security score
    const filteringRatio = analysisResults.statistics.queriesAnalyzed > 0 ? 
        (analysisResults.statistics.branchFilteredQueries / analysisResults.statistics.queriesAnalyzed) * 100 : 0;
    
    const securityScore = Math.max(0, 100 - (criticalCount * 25) - (warningCount * 5) - (issueCount * 2) + (filteringRatio * 0.2));
    const securityLevel = securityScore >= 90 ? 'EXCELLENT' :
                         securityScore >= 75 ? 'GOOD' :
                         securityScore >= 60 ? 'ACCEPTABLE' :
                         securityScore >= 40 ? 'POOR' : 'CRITICAL';
    
    console.log(`\n🏆 BRANCH ISOLATION SECURITY SCORE: ${securityScore.toFixed(1)}/100 (${securityLevel})`);
    console.log(`📊 Query Filtering Ratio: ${filteringRatio.toFixed(1)}%`);
    
    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    
    if (criticalCount > 0) {
        console.log('🚨 IMMEDIATE: Fix critical vulnerabilities to prevent data leaks');
    }
    
    if (filteringRatio < 80) {
        console.log('🔒 IMPORTANT: Increase branch filtering in database queries');
    }
    
    if (analysisResults.statistics.unfilteratedQueries > 5) {
        console.log('🎯 IMPROVE: Implement locationId filtering in unfiltered queries');
    }
    
    if (bestPracticeCount < 10) {
        console.log('📚 ENHANCE: Adopt more branch isolation utility functions');
    }
    
    // Save detailed report
    const reportPath = path.join(process.cwd(), 'branch-isolation-static-analysis.json');
    fs.writeFileSync(reportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        securityScore: securityScore,
        securityLevel: securityLevel,
        statistics: analysisResults.statistics,
        criticalVulnerabilities: analysisResults.criticalVulnerabilities,
        securityWarnings: analysisResults.securityWarnings,
        implementationIssues: analysisResults.implementationIssues,
        bestPractices: analysisResults.bestPractices,
        recommendations: [
            criticalCount > 0 ? 'Fix critical vulnerabilities immediately' : null,
            filteringRatio < 80 ? 'Improve query filtering ratio' : null,
            analysisResults.statistics.unfilteratedQueries > 5 ? 'Add locationId filters' : null,
            bestPracticeCount < 10 ? 'Use more utility functions' : null
        ].filter(Boolean)
    }, null, 2));
    
    console.log(`\n💾 Detailed report saved to: ${reportPath}`);
    
    return { securityScore, securityLevel, analysisResults };
}

// Main analysis function
async function runStaticAnalysis() {
    console.log('🔍 Starting CoreTrack Branch Isolation Static Analysis...\n');
    
    // Analyze Firestore rules
    const rulesAnalysis = analyzeFirestoreRules();
    
    // Analyze high-risk areas
    const highRiskIssues = analyzeHighRiskAreas();
    
    // Analyze all source files
    console.log('\n📁 ANALYZING ALL SOURCE FILES...');
    const srcPath = path.join(process.cwd(), 'src');
    if (fs.existsSync(srcPath)) {
        const allFiles = getAllFiles(srcPath);
        console.log(`📊 Found ${allFiles.length} source files to analyze`);
        
        allFiles.forEach(file => {
            analyzeFile(file);
        });
    }
    
    // Generate report
    return generateStaticAnalysisReport();
}

// Export for use
module.exports = { runStaticAnalysis, analysisResults };

// Run if called directly
if (require.main === module) {
    runStaticAnalysis()
        .then(result => {
            console.log(`\n✨ Static analysis completed with security score: ${result.securityScore.toFixed(1)}/100`);
            
            if (result.analysisResults.criticalVulnerabilities.length > 0) {
                console.log('🚨 CRITICAL ISSUES FOUND - Immediate action required!');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error(`❌ Static analysis failed: ${error.message}`);
            process.exit(1);
        });
}
