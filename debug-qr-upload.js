// Debug script to test QR upload functionality
// Run this in browser console on the POS page

console.log('🔍 QR Upload Debug Script Started');

// Check if Firebase is initialized
console.log('📦 Firebase services check:');
console.log('- Auth:', typeof firebase !== 'undefined' ? '✅' : '❌');
console.log('- Storage:', typeof firebase?.storage !== 'undefined' ? '✅' : '❌');
console.log('- Firestore:', typeof firebase?.firestore !== 'undefined' ? '✅' : '❌');

// Check authentication status
console.log('🔐 Authentication status:');
if (typeof firebase !== 'undefined' && firebase.auth().currentUser) {
  const user = firebase.auth().currentUser;
  console.log('- User ID:', user.uid);
  console.log('- Email:', user.email);
  console.log('- Verified:', user.emailVerified);
} else {
  console.log('❌ No authenticated user found');
}

// Test file upload function
async function testQRUpload() {
  console.log('🧪 Testing QR Upload Process...');
  
  try {
    // Create a small test file
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 100, 100);
    
    // Convert to blob
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const testFile = new File([blob], 'test-qr.png', { type: 'image/png' });
    
    console.log('📁 Test file created:', {
      name: testFile.name,
      size: testFile.size,
      type: testFile.type
    });
    
    // Try to access storage reference
    if (typeof firebase !== 'undefined') {
      const storageRef = firebase.storage().ref();
      const testRef = storageRef.child('test-upload.png');
      
      console.log('📤 Attempting test upload...');
      const uploadTask = testRef.put(testFile);
      
      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`📊 Upload progress: ${progress.toFixed(1)}%`);
        },
        (error) => {
          console.error('❌ Upload error:', error);
          console.log('🔍 Error details:', {
            code: error.code,
            message: error.message,
            name: error.name
          });
        },
        async () => {
          console.log('✅ Test upload completed successfully');
          try {
            const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
            console.log('🔗 Download URL:', downloadURL);
            
            // Clean up test file
            await testRef.delete();
            console.log('🗑️ Test file cleaned up');
          } catch (cleanupError) {
            console.warn('⚠️ Cleanup error:', cleanupError);
          }
        }
      );
    } else {
      console.error('❌ Firebase not available for testing');
    }
    
  } catch (error) {
    console.error('❌ Test setup error:', error);
  }
}

// Check network connectivity
console.log('🌐 Network connectivity check:');
console.log('- Online:', navigator.onLine ? '✅' : '❌');

// Check storage bucket configuration
console.log('🪣 Storage bucket check:');
if (typeof firebase !== 'undefined') {
  const app = firebase.app();
  const config = app.options;
  console.log('- Storage Bucket:', config.storageBucket || '❌ Not configured');
  console.log('- Project ID:', config.projectId || '❌ Not configured');
} else {
  console.log('❌ Firebase app not available');
}

// Run the test
console.log('🚀 Ready to run test. Execute testQRUpload() to start.');

// Export function to global scope for manual testing
window.testQRUpload = testQRUpload;
window.debugQRUpload = true;

console.log('✅ Debug script loaded. Run testQRUpload() to test upload functionality.');
