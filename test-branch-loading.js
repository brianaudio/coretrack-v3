// Test script to check branch loading behavior
// Run this in the browser console after logging in

async function testBranchLoading() {
  console.log('🔍 TESTING BRANCH LOADING BEHAVIOR');
  console.log('=' .repeat(50));
  
  try {
    // Get current user info
    const { auth } = await import('./src/lib/firebase.js');
    const { onAuthStateChanged } = await import('firebase/auth');
    
    return new Promise((resolve) => {
      onAuthStateChanged(auth, async (user) => {
        if (!user) {
          console.log('❌ No user logged in');
          resolve(null);
          return;
        }
        
        console.log('👤 User:', user.email);
        
        // Get tenant ID from user profile
        const { doc, getDoc, db } = await import('firebase/firestore');
        const { getDocument } = await import('./src/lib/firebase.js');
        
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const userData = userDoc.data();
          
          if (!userData?.tenantId) {
            console.log('❌ No tenantId found in user profile');
            resolve(null);
            return;
          }
          
          console.log('🏢 Tenant ID:', userData.tenantId);
          
          // Check for existing branches
          const { collection, getDocs } = await import('firebase/firestore');
          const branchesRef = collection(db, `tenants/${userData.tenantId}/branches`);
          const branchSnapshot = await getDocs(branchesRef);
          
          console.log('📊 BRANCH LOADING RESULTS:');
          console.log(`   Found ${branchSnapshot.size} branches in Firebase`);
          
          if (branchSnapshot.size === 0) {
            console.log('   ✅ NO FICTITIOUS BRANCHES');
            console.log('   💡 This means the system will create a default branch');
            console.log('   🔧 The branch dropdown should show your actual business branch');
          } else {
            console.log('   📋 Existing branches:');
            branchSnapshot.docs.forEach((doc, index) => {
              const data = doc.data();
              console.log(`   ${index + 1}. ${data.name} (${doc.id})`);
              console.log(`      Address: ${data.address || 'Not set'}`);
              console.log(`      Status: ${data.status || 'Unknown'}`);
            });
          }
          
          resolve({
            userEmail: user.email,
            tenantId: userData.tenantId,
            branchCount: branchSnapshot.size
          });
          
        } catch (error) {
          console.error('❌ Error checking branches:', error);
          resolve(null);
        }
      });
    });
    
  } catch (error) {
    console.error('❌ Error in test:', error);
    return null;
  }
}

// Auto-run the test
console.log('🚀 Running branch loading test...');
testBranchLoading().then(result => {
  if (result) {
    console.log('✅ Test completed successfully');
  } else {
    console.log('❌ Test failed or no user logged in');
  }
});
