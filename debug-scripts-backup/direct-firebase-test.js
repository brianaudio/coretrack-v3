/**
 * Direct Firebase REST API Test
 * This bypasses the SDK and directly queries the Firestore REST API
 */

const fs = require('fs');

async function testFirestoreAPI() {
  console.log('🔍 DIRECT FIREBASE REST API TEST');
  console.log('================================================================================');

  try {
    // Read environment variables
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const projectId = envContent.match(/NEXT_PUBLIC_FIREBASE_PROJECT_ID=(.+)/)?.[1]?.trim();
    const apiKey = envContent.match(/NEXT_PUBLIC_FIREBASE_API_KEY=(.+)/)?.[1]?.trim();

    console.log(`🎯 Testing project: ${projectId}`);
    console.log(`🔑 Using API key: ${apiKey.substring(0, 10)}...`);

    // Test if we can access the project using REST API
    const testUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents?key=${apiKey}`;
    
    console.log('\n🌐 Making REST API request to Firestore...');
    console.log(`   URL: ${testUrl.substring(0, 80)}...`);

    const response = await fetch(testUrl);
    const status = response.status;
    
    console.log(`\n📊 Response Status: ${status}`);
    
    if (status === 200) {
      const data = await response.json();
      console.log('✅ SUCCESS: Can access Firestore!');
      console.log(`📄 Collections found: ${data.documents ? data.documents.length : 0}`);
      
      if (data.documents && data.documents.length > 0) {
        console.log('\n📋 Collections:');
        data.documents.forEach(doc => {
          console.log(`   - ${doc.name}`);
        });
      } else {
        console.log('   No documents found (empty database)');
      }
    } else if (status === 403) {
      console.log('❌ FORBIDDEN: API key might be invalid or project access denied');
    } else if (status === 404) {
      console.log('❌ NOT FOUND: Project might not exist');
    } else {
      const errorText = await response.text();
      console.log(`❌ ERROR: ${errorText}`);
    }

  } catch (error) {
    console.error('❌ Network Error:', error.message);
  }

  console.log('\n================================================================================');
}

// Run the test
testFirestoreAPI();
