/**
 * Frontend & UI Bug Detection for CoreTrack
 * Analyzes React components, hooks, and UI logic for potential issues
 */

const fs = require('fs');
const path = require('path');

class UIBugDetector {
  constructor() {
    this.bugs = [];
    this.bugCounter = 1;
    this.srcPath = path.join(__dirname, 'src');
  }

  log(message) {
    console.log(message);
  }

  addBug(type, severity, title, description, file, impact, suggestion) {
    this.bugs.push({
      id: `UI-BUG-${this.bugCounter++}`,
      type,
      severity,
      title,
      description,
      file,
      impact,
      suggestion
    });
  }

  readFile(filePath) {
    try {
      return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
      return null;
    }
  }

  scanDirectory(dirPath, extensions = ['.tsx', '.ts', '.jsx', '.js']) {
    const files = [];
    
    try {
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          files.push(...this.scanDirectory(fullPath, extensions));
        } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory might not exist or be accessible
    }
    
    return files;
  }

  detectReactHookBugs(filePath, content) {
    const fileName = path.basename(filePath);
    
    // Check for missing dependency arrays in useEffect
    const useEffectRegex = /useEffect\s*\(\s*\(\s*\)\s*=>\s*{[\s\S]*?}\s*\)/g;
    const matches = content.match(useEffectRegex);
    
    if (matches) {
      matches.forEach(match => {
        if (!match.includes('], [') && !match.includes('], []')) {
          this.addBug(
            'React Hooks',
            'Medium',
            'useEffect missing dependency array',
            'useEffect without dependency array causes infinite re-renders',
            fileName,
            'Performance issues and infinite loops',
            'Add dependency array to useEffect'
          );
        }
      });
    }

    // Check for setState in render
    if (content.includes('setState') && content.includes('return (')) {
      const lines = content.split('\n');
      let inRenderReturn = false;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('return (')) {
          inRenderReturn = true;
        }
        if (inRenderReturn && line.includes('setState')) {
          this.addBug(
            'React Hooks',
            'High',
            'setState called during render',
            'setState should not be called during component render',
            fileName,
            'Infinite re-render loops and app crashes',
            'Move setState to useEffect or event handlers'
          );
          break;
        }
        if (line.includes('};') || line.includes('}')) {
          inRenderReturn = false;
        }
      }
    }

    // Check for async functions in useEffect without cleanup
    if (content.includes('useEffect') && content.includes('async')) {
      const asyncEffectRegex = /useEffect\s*\(\s*async\s*\(/g;
      if (asyncEffectRegex.test(content)) {
        this.addBug(
          'React Hooks',
          'Medium',
          'Async function directly in useEffect',
          'useEffect should not be async directly - use async function inside',
          fileName,
          'Memory leaks and cleanup issues',
          'Create async function inside useEffect or use proper cleanup'
        );
      }
    }
  }

  detectTypescriptBugs(filePath, content) {
    const fileName = path.basename(filePath);
    
    // Check for any types
    if (content.includes(': any')) {
      const anyCount = (content.match(/:\s*any/g) || []).length;
      this.addBug(
        'TypeScript',
        'Low',
        `${anyCount} usage(s) of 'any' type`,
        'Using "any" type defeats TypeScript safety',
        fileName,
        'Loss of type safety and potential runtime errors',
        'Replace any with specific types or unknown'
      );
    }

    // Check for @ts-ignore
    if (content.includes('@ts-ignore')) {
      const ignoreCount = (content.match(/@ts-ignore/g) || []).length;
      this.addBug(
        'TypeScript',
        'Medium',
        `${ignoreCount} usage(s) of @ts-ignore`,
        'TypeScript errors are being suppressed without fixing',
        fileName,
        'Hidden type errors that could cause runtime issues',
        'Fix the underlying TypeScript errors instead of ignoring'
      );
    }

    // Check for console.log in production code
    if (content.includes('console.log') && !fileName.includes('debug') && !fileName.includes('test')) {
      const logCount = (content.match(/console\.log/g) || []).length;
      this.addBug(
        'Code Quality',
        'Low',
        `${logCount} console.log statement(s) in production code`,
        'Console logs should not be in production code',
        fileName,
        'Performance overhead and information leakage',
        'Remove console.log or use proper logging system'
      );
    }
  }

  detectAccessibilityBugs(filePath, content) {
    const fileName = path.basename(filePath);
    
    // Check for buttons without aria-label or text
    const buttonRegex = /<button[^>]*>/g;
    const buttons = content.match(buttonRegex) || [];
    
    for (const button of buttons) {
      if (!button.includes('aria-label') && !button.includes('>')) {
        // Check if button has children with text
        const nextContent = content.substring(content.indexOf(button) + button.length, content.indexOf(button) + button.length + 100);
        if (!nextContent.includes('</button>') || nextContent.trim().startsWith('</button>')) {
          this.addBug(
            'Accessibility',
            'Medium',
            'Button without accessible text',
            'Button elements need accessible text or aria-label',
            fileName,
            'Screen readers cannot understand button purpose',
            'Add aria-label or text content to button'
          );
        }
      }
    }

    // Check for images without alt text
    const imgRegex = /<img[^>]*>/g;
    const images = content.match(imgRegex) || [];
    
    for (const img of images) {
      if (!img.includes('alt=')) {
        this.addBug(
          'Accessibility',
          'Medium',
          'Image without alt text',
          'Images need alt text for accessibility',
          fileName,
          'Screen readers cannot describe image content',
          'Add meaningful alt text to images'
        );
      }
    }
  }

  detectFirebaseBugs(filePath, content) {
    const fileName = path.basename(filePath);
    
    // Check for unhandled Firebase promises
    if (content.includes('firebase') || content.includes('firestore')) {
      // Look for Firebase calls without .catch()
      const firebaseCallRegex = /(?:getDocs|getDoc|addDoc|updateDoc|deleteDoc|setDoc)\s*\([^)]*\)(?!\s*\.catch)/g;
      const uncaughtCalls = content.match(firebaseCallRegex) || [];
      
      if (uncaughtCalls.length > 0) {
        this.addBug(
          'Firebase',
          'High',
          `${uncaughtCalls.length} unhandled Firebase promise(s)`,
          'Firebase operations should have error handling',
          fileName,
          'Unhandled promise rejections and user confusion',
          'Add .catch() handlers to Firebase operations'
        );
      }
    }

    // Check for hardcoded collection names
    if (content.includes('collection(') && content.includes('"')) {
      const hardcodedCollections = content.match(/collection\([^)]*"[^"]*"/g) || [];
      if (hardcodedCollections.length > 0) {
        this.addBug(
          'Firebase',
          'Low',
          'Hardcoded collection names',
          'Collection names should be constants for maintainability',
          fileName,
          'Difficult to maintain and prone to typos',
          'Define collection names as constants'
        );
      }
    }
  }

  detectPerformanceBugs(filePath, content) {
    const fileName = path.basename(filePath);
    
    // Check for unnecessary re-renders (object/array creation in render)
    const renderObjectRegex = /return\s*\([^)]*\{[^}]*\}/g;
    if (renderObjectRegex.test(content)) {
      this.addBug(
        'Performance',
        'Medium',
        'Object creation in render method',
        'Creating objects in render causes unnecessary re-renders',
        fileName,
        'Performance degradation',
        'Move object creation outside render or use useMemo'
      );
    }

    // Check for large useEffect dependency arrays
    const depArrayRegex = /\],\s*\[([^\]]*)\]/g;
    const depMatches = content.match(depArrayRegex) || [];
    
    for (const match of depMatches) {
      const deps = match.split(',').filter(d => d.trim().length > 0);
      if (deps.length > 5) {
        this.addBug(
          'Performance',
          'Low',
          'useEffect with many dependencies',
          'useEffect with too many dependencies may run too often',
          fileName,
          'Performance issues from frequent re-runs',
          'Split into multiple useEffects or use useCallback/useMemo'
        );
      }
    }
  }

  async analyzeUIBugs() {
    this.log('🔍 CORETRACK UI & FRONTEND BUG DETECTION');
    this.log('================================================================================');
    this.log('🎯 Scanning: React components, hooks, TypeScript, accessibility, performance');
    this.log('================================================================================\n');

    const files = this.scanDirectory(this.srcPath);
    this.log(`📁 Found ${files.length} files to analyze\n`);

    let filesAnalyzed = 0;
    
    for (const filePath of files) {
      const content = this.readFile(filePath);
      if (!content) continue;

      const relativePath = path.relative(this.srcPath, filePath);
      
      // Skip certain files
      if (relativePath.includes('node_modules') || 
          relativePath.includes('.git') ||
          relativePath.includes('dist') ||
          relativePath.includes('build')) {
        continue;
      }

      filesAnalyzed++;
      
      // Run different bug detection methods
      this.detectReactHookBugs(filePath, content);
      this.detectTypescriptBugs(filePath, content);
      this.detectAccessibilityBugs(filePath, content);
      this.detectFirebaseBugs(filePath, content);
      this.detectPerformanceBugs(filePath, content);
    }

    this.log(`📊 Analyzed ${filesAnalyzed} files\n`);

    // Report findings
    this.log('📋 UI BUG DETECTION RESULTS');
    this.log('================================================================================');

    if (this.bugs.length === 0) {
      this.log('🎉 EXCELLENT! No UI bugs detected in the codebase.');
      this.log('✅ Your React components follow best practices');
      this.log('✅ TypeScript usage is clean');
      this.log('✅ Accessibility considerations are in place');
      this.log('✅ Firebase operations are properly handled');
    } else {
      this.log(`📋 TOTAL UI BUGS FOUND: ${this.bugs.length}\n`);

      // Group by severity
      const highSeverity = this.bugs.filter(bug => bug.severity === 'High');
      const mediumSeverity = this.bugs.filter(bug => bug.severity === 'Medium');
      const lowSeverity = this.bugs.filter(bug => bug.severity === 'Low');

      this.log(`🚨 HIGH PRIORITY: ${highSeverity.length} bugs`);
      this.log(`⚠️ MEDIUM PRIORITY: ${mediumSeverity.length} bugs`);
      this.log(`📝 LOW PRIORITY: ${lowSeverity.length} bugs\n`);

      // Group by type
      const bugsByType = {};
      this.bugs.forEach(bug => {
        if (!bugsByType[bug.type]) {
          bugsByType[bug.type] = [];
        }
        bugsByType[bug.type].push(bug);
      });

      for (const [type, typeBugs] of Object.entries(bugsByType)) {
        this.log(`🔧 ${type.toUpperCase()} ISSUES (${typeBugs.length}):`);
        
        typeBugs.forEach(bug => {
          const priorityIcon = bug.severity === 'High' ? '🚨' : bug.severity === 'Medium' ? '⚠️' : '📝';
          this.log(`   ${priorityIcon} ${bug.title}`);
          this.log(`      File: ${bug.file}`);
          this.log(`      Impact: ${bug.impact}`);
          this.log(`      Fix: ${bug.suggestion}\n`);
        });
      }

      this.log('💡 RECOMMENDED ACTIONS:');
      this.log('1. Fix HIGH priority bugs immediately (crashes/security)');
      this.log('2. Address MEDIUM priority bugs (UX/performance impact)');
      this.log('3. Schedule LOW priority bugs for code quality improvement');
      this.log('4. Set up ESLint rules to prevent these issues');
    }

    this.log('\n✨ UI BUG DETECTION COMPLETE');
    this.log('================================================================================');

    return this.bugs;
  }
}

// Run the UI bug detection
const detector = new UIBugDetector();
detector.analyzeUIBugs().then(bugs => {
  process.exit(0);
}).catch(error => {
  console.error('❌ UI bug detection failed:', error);
  process.exit(1);
});
