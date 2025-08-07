#!/usr/bin/env node

/**
 * Firebase Configuration Cleanup Script
 * 
 * This script:
 * 1. Finds all .js files using old Firebase projects
 * 2. Updates them to use the correct 'inventory-system-latest' project
 * 3. Creates a backup before making changes
 * 4. Reports what was changed
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Correct Firebase configuration for inventory-system-latest
const CORRECT_CONFIG = {
  apiKey: "AIzaSyDO1JilPcCm2-p6smKxVhXa_7rcI4VDKK0",
  authDomain: "inventory-system-latest.firebaseapp.com",
  projectId: "inventory-system-latest",
  storageBucket: "inventory-system-latest.firebasestorage.app",
  messagingSenderId: "893699470433",
  appId: "1:893699470433:web:a5dcf242201b75c7eea620"
};

// Old project IDs to replace
const OLD_PROJECTS = [
  'coretrack-b2a3e',
  'coretrack-71c1e',
  'cfc-inventory-v1',
  'cfc-inventory-v2',
  'cfc-inventory-v3',
  'cfc-inventory-final',
  'cfc-inventory-final-3135f',
  'cfc-inventory-multi-tenant',
  'cfc-inventory-sms',
  'cfc-inventory-aistudio',
  'autopilot-inventory-systemhtml'
];

function findJSFiles() {
  try {
    const result = execSync('find . -name "*.js" -type f -not -path "./node_modules/*" -not -path "./.git/*"', { encoding: 'utf8' });
    return result.trim().split('\n').filter(file => file);
  } catch (error) {
    console.error('❌ Error finding JS files:', error.message);
    return [];
  }
}

function analyzeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check if file contains Firebase config
    const hasFirebaseConfig = /firebaseConfig|initializeApp|getFirestore/.test(content);
    if (!hasFirebaseConfig) return null;
    
    // Check for old project IDs
    const usesOldProject = OLD_PROJECTS.some(projectId => content.includes(projectId));
    
    return {
      filePath,
      content,
      usesOldProject,
      hasFirebaseConfig
    };
  } catch (error) {
    console.warn(`⚠️  Could not read file ${filePath}:`, error.message);
    return null;
  }
}

function updateFirebaseConfig(content) {
  let updatedContent = content;
  
  // Replace old project IDs with correct one
  OLD_PROJECTS.forEach(oldProject => {
    const patterns = [
      new RegExp(`projectId: ["']${oldProject}["']`, 'g'),
      new RegExp(`authDomain: ["']${oldProject}\\.firebaseapp\\.com["']`, 'g'),
      new RegExp(`storageBucket: ["']${oldProject}\\.firebasestorage\\.app["']`, 'g'),
      new RegExp(`storageBucket: ["']${oldProject}\\.appspot\\.com["']`, 'g'),
    ];
    
    patterns.forEach(pattern => {
      if (pattern.source.includes('projectId')) {
        updatedContent = updatedContent.replace(pattern, `projectId: "${CORRECT_CONFIG.projectId}"`);
      } else if (pattern.source.includes('authDomain')) {
        updatedContent = updatedContent.replace(pattern, `authDomain: "${CORRECT_CONFIG.authDomain}"`);
      } else if (pattern.source.includes('storageBucket')) {
        updatedContent = updatedContent.replace(pattern, `storageBucket: "${CORRECT_CONFIG.storageBucket}"`);
      }
    });
  });
  
  return updatedContent;
}

function createBackup(filePath) {
  const backupPath = `${filePath}.backup.${Date.now()}`;
  fs.copyFileSync(filePath, backupPath);
  return backupPath;
}

async function main() {
  console.log('🧹 Firebase Configuration Cleanup Script\n');
  console.log('🔍 Scanning for JavaScript files with Firebase configurations...\n');
  
  const jsFiles = findJSFiles();
  console.log(`📁 Found ${jsFiles.length} JavaScript files\n`);
  
  const filesToUpdate = [];
  const correctFiles = [];
  
  for (const filePath of jsFiles) {
    const analysis = analyzeFile(filePath);
    if (!analysis) continue;
    
    if (analysis.hasFirebaseConfig) {
      if (analysis.usesOldProject) {
        filesToUpdate.push(analysis);
      } else {
        correctFiles.push(analysis);
      }
    }
  }
  
  console.log(`✅ Files already using correct config: ${correctFiles.length}`);
  correctFiles.forEach(file => console.log(`   - ${file.filePath}`));
  
  console.log(`\n🔧 Files needing updates: ${filesToUpdate.length}`);
  filesToUpdate.forEach(file => console.log(`   - ${file.filePath}`));
  
  if (filesToUpdate.length === 0) {
    console.log('\n🎉 All files are already using the correct Firebase configuration!');
    return;
  }
  
  console.log('\n📝 Creating backups and updating files...\n');
  
  let updatedCount = 0;
  for (const file of filesToUpdate) {
    try {
      // Create backup
      const backupPath = createBackup(file.filePath);
      console.log(`💾 Backup created: ${backupPath}`);
      
      // Update content
      const updatedContent = updateFirebaseConfig(file.content);
      
      // Write updated file
      fs.writeFileSync(file.filePath, updatedContent, 'utf8');
      console.log(`✅ Updated: ${file.filePath}`);
      
      updatedCount++;
    } catch (error) {
      console.error(`❌ Failed to update ${file.filePath}:`, error.message);
    }
  }
  
  console.log(`\n🎉 Cleanup complete! Updated ${updatedCount} files.`);
  console.log('\n📋 Summary:');
  console.log(`   • Files using correct config: ${correctFiles.length}`);
  console.log(`   • Files updated: ${updatedCount}`);
  console.log(`   • Target project: ${CORRECT_CONFIG.projectId}`);
  
  console.log('\n🗑️  Old Firebase Projects to Delete:');
  OLD_PROJECTS.forEach(project => {
    console.log(`   • ${project}`);
  });
  
  console.log('\n💡 Next Steps:');
  console.log('   1. Test your application to ensure everything works');
  console.log('   2. Delete old Firebase projects from Firebase Console');
  console.log('   3. Remove backup files once satisfied with changes');
  console.log('   4. Consider removing unused debug/test files');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, analyzeFile, updateFirebaseConfig };
