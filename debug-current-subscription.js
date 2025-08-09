const admin = require('firebase-admin');

// Check if already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'coretrack-firebase'
  });
}

const db = admin.firestore();

async function debugCurrentSubscription() {
  try {
    console.log('🔍 Debugging current subscription status...\n');
    
    // Get all subscriptions
    const subscriptionsSnapshot = await db.collection('subscriptions').get();
    
    if (subscriptionsSnapshot.empty) {
      console.log('❌ No subscriptions found in database');
      return;
    }
    
    console.log(`📊 Found ${subscriptionsSnapshot.size} subscription(s):\n`);
    
    subscriptionsSnapshot.forEach((doc, index) => {
      const data = doc.data();
      console.log(`${index + 1}. Subscription ${doc.id}:`);
      console.log(`   📧 Tenant ID: ${data.tenantId}`);
      console.log(`   📦 Plan: ${data.planId}`);
      console.log(`   🎯 Tier: ${data.tier}`);
      console.log(`   ✅ Status: ${data.status}`);
      console.log(`   📅 Billing: ${data.billingCycle}`);
      console.log(`   ⏰ Start: ${data.startDate?.toDate()?.toISOString()}`);
      console.log(`   ⏰ End: ${data.endDate?.toDate()?.toISOString()}`);
      console.log(`   🔄 Updated: ${data.updatedAt?.toDate()?.toISOString()}`);
      console.log(`   📊 Usage:`, data.currentUsage);
      console.log(`   ${'─'.repeat(50)}\n`);
    });
    
    // Get all users
    console.log('👥 User accounts:');
    const usersSnapshot = await db.collection('users').limit(10).get();
    
    usersSnapshot.forEach((doc, index) => {
      const data = doc.data();
      console.log(`${index + 1}. User ${doc.id}:`);
      console.log(`   📧 Email: ${data.email}`);
      console.log(`   👤 Name: ${data.displayName}`);
      console.log(`   🎭 Role: ${data.role}`);
      console.log(`   🏢 Tenant: ${data.tenantId}`);
      console.log(`   ✅ Status: ${data.status}`);
      console.log(`   ${'─'.repeat(30)}`);
    });
    
  } catch (error) {
    console.error('💥 Error debugging subscription:', error);
  }
}

// Run the debug
debugCurrentSubscription()
  .then(() => {
    console.log('🎉 Debug complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Debug failed:', error);
    process.exit(1);
  });
