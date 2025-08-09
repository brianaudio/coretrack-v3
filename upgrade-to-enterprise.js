// Upgrade any user to Enterprise tier for testing
// Usage: node upgrade-to-enterprise.js EMAIL_ADDRESS

const admin = require('firebase-admin');

// Check if already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'coretrack-firebase'
  });
}

const db = admin.firestore();

async function upgradeToEnterprise(email) {
  try {
    console.log(`🔍 Upgrading ${email} to Enterprise tier...`);
    
    // Find the user
    const usersQuery = await db.collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();
    
    if (usersQuery.empty) {
      console.log(`❌ User ${email} not found.`);
      return;
    }
    
    const userDoc = usersQuery.docs[0];
    const userData = userDoc.data();
    const tenantId = userData.tenantId;
    
    if (!tenantId) {
      console.log('❌ No tenant ID found for user');
      return;
    }
    
    console.log('🏢 Found tenant ID:', tenantId);
    
    // Create Enterprise subscription
    const now = admin.firestore.Timestamp.now();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1); // 1 year from now
    
    const enterpriseSubscription = {
      tenantId: tenantId,
      planId: 'enterprise',
      tier: 'enterprise',
      status: 'active',
      billingCycle: 'yearly',
      startDate: now,
      endDate: admin.firestore.Timestamp.fromDate(endDate),
      trialEndDate: admin.firestore.Timestamp.fromDate(endDate),
      currentUsage: {
        users: 1,
        locations: 1,
        products: 0,
        ordersThisMonth: 0,
        suppliers: 0,
        storageUsed: 0,
        apiCallsThisMonth: 0
      },
      createdAt: now,
      updatedAt: now
    };
    
    // Set subscription document (overwrites existing)
    await db.collection('subscriptions').doc(tenantId).set(enterpriseSubscription);
    
    console.log('✅ Enterprise subscription created successfully!');
    console.log('📊 Subscription details:', {
      planId: enterpriseSubscription.planId,
      tier: enterpriseSubscription.tier,
      status: enterpriseSubscription.status,
      endDate: endDate.toISOString()
    });
    
    console.log('\n🚀 Enterprise Features Available:');
    console.log('- All POS features');
    console.log('- Unlimited inventory management');
    console.log('- Purchase orders');
    console.log('- Complete team management');
    console.log('- Advanced analytics');
    console.log('- Custom reports');
    console.log('- Multi-location management');
    console.log('- API access');
    console.log('- All integrations');
    console.log('- Priority support');
    
  } catch (error) {
    console.error('💥 Error upgrading to Enterprise:', error);
  }
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.log('Usage: node upgrade-to-enterprise.js EMAIL_ADDRESS');
  console.log('Example: node upgrade-to-enterprise.js user@example.com');
  process.exit(1);
}

// Run the upgrade
upgradeToEnterprise(email)
  .then(() => {
    console.log('🎉 Upgrade complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Upgrade failed:', error);
    process.exit(1);
  });
