const admin = require('firebase-admin');

// Check if already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'coretrack-firebase'
  });
}

const db = admin.firestore();

async function setupProfessionalSubscription() {
  try {
    console.log('🔍 Setting up Professional tier subscription...');
    
    // Find the professional tenant (adjust email as needed)
    const usersQuery = await db.collection('users')
      .where('email', '==', 'professional@test.com')
      .limit(1)
      .get();
    
    if (usersQuery.empty) {
      console.log('❌ Professional test user not found. Please create user first.');
      return;
    }
    
    const userDoc = usersQuery.docs[0];
    const userData = userDoc.data();
    const tenantId = userData.tenantId;
    
    if (!tenantId) {
      console.log('❌ No tenant ID found for professional user');
      return;
    }
    
    console.log('🏢 Found tenant ID:', tenantId);
    
    // Create Professional subscription
    const now = admin.firestore.Timestamp.now();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1); // 1 month from now
    
    const professionalSubscription = {
      tenantId: tenantId,
      planId: 'professional',
      tier: 'professional',
      status: 'active',
      billingCycle: 'monthly',
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
    
    // Set subscription document
    await db.collection('subscriptions').doc(tenantId).set(professionalSubscription);
    
    console.log('✅ Professional subscription created successfully!');
    console.log('📊 Subscription details:', {
      planId: professionalSubscription.planId,
      tier: professionalSubscription.tier,
      status: professionalSubscription.status,
      endDate: endDate.toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error setting up subscription:', error);
  }
}

// Run the setup
setupProfessionalSubscription()
  .then(() => {
    console.log('🎉 Setup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Setup failed:', error);
    process.exit(1);
  });
