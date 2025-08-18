/**
 * Simple Firebase Connection Test
 */

// Just check which Firebase project is configured
console.log('🔍 FIREBASE CONNECTION TEST');
console.log('================================================================================');

const fs = require('fs');

try {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  console.log('📄 Current .env.local Firebase configuration:');
  
  const lines = envContent.split('\n');
  lines.forEach(line => {
    if (line.includes('FIREBASE')) {
      console.log(`   ${line}`);
    }
  });
  
  // Extract the project ID
  const projectIdMatch = envContent.match(/NEXT_PUBLIC_FIREBASE_PROJECT_ID=(.+)/);
  const projectId = projectIdMatch ? projectIdMatch[1].trim() : 'NOT_FOUND';
  
  console.log(`\n🎯 Configured Project ID: ${projectId}`);
  
  if (projectId === 'coretrack-inventory') {
    console.log('✅ Configuration correctly points to coretrack-inventory');
    console.log(`\n🔍 Firebase Console: https://console.firebase.google.com/project/${projectId}/firestore`);
    console.log('================================================================================');
    console.log('🚨 IMPORTANT: Check if you\'re logged into the CORRECT Google account!');
    console.log('   The coretrack-inventory project belongs to: calireese0201@gmail.com');
    console.log('   If you see no data, you might be logged into a different Google account');
    console.log('================================================================================');
  } else {
    console.log(`❌ Configuration points to wrong project: ${projectId}`);
  }
  
} catch (error) {
  console.error('❌ Error reading .env.local:', error.message);
}
