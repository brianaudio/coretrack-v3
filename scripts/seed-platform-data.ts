import { 
  createSupportTicket, 
  updateSystemMetrics, 
  createBillingTransaction, 
  logAuditEvent,
  createSystemAlert
} from '../src/lib/firebase/platformAdmin';

// This script seeds the Firebase collections with sample data for testing

async function seedPlatformAdminData() {
  console.log('🌱 Seeding platform admin data...');

  try {
    // 1. Create sample support tickets
    console.log('📧 Creating support tickets...');
    await createSupportTicket({
      tenantId: 'demo-tenant-1',
      tenantName: 'Demo Restaurant',
      subject: 'POS System Not Loading',
      description: 'The POS system is showing a white screen when trying to process orders.',
      priority: 'high',
      status: 'open',
      customerEmail: 'owner@demo-restaurant.com',
      assignedTo: null
    });

    await createSupportTicket({
      tenantId: 'demo-tenant-2', 
      tenantName: 'Coffee Shop Plus',
      subject: 'Inventory Count Discrepancy',
      description: 'There is a mismatch between physical inventory and system counts.',
      priority: 'medium',
      status: 'in-progress',
      customerEmail: 'manager@coffeeshop.com',
      assignedTo: 'support@coretrack.com'
    });

    // 2. Update system metrics
    console.log('📊 Updating system metrics...');
    await updateSystemMetrics({
      systemHealth: {
        uptime: 99.97,
        responseTime: 145,
        errorRate: 0.03,
        activeUsers: 1247,
        totalTenants: 12,
        lastUpdated: new Date()
      },
      serverMetrics: {
        cpu: 25,
        memory: 65,
        disk: 45,
        network: 15
      },
      databaseMetrics: {
        connections: 150,
        queryTime: 45,
        cacheHitRate: 92.5
      },
      alerts: []
    });

    // 3. Create some system alerts
    console.log('🚨 Creating system alerts...');
    await createSystemAlert({
      type: 'warning',
      message: 'High memory usage detected on server cluster',
      severity: 'medium',
      resolved: false
    });

    await createSystemAlert({
      type: 'info',
      message: 'Database backup completed successfully',
      severity: 'low',
      resolved: true
    });

    // 4. Create billing transactions
    console.log('💳 Creating billing transactions...');
    await createBillingTransaction({
      tenantId: 'demo-tenant-1',
      amount: 79.99,
      currency: 'USD',
      type: 'subscription',
      status: 'completed',
      description: 'Monthly subscription - Professional Plan'
    });

    await createBillingTransaction({
      tenantId: 'demo-tenant-2',
      amount: 29.99,
      currency: 'USD', 
      type: 'subscription',
      status: 'completed',
      description: 'Monthly subscription - Starter Plan'
    });

    // 5. Create audit log entries
    console.log('📋 Creating audit logs...');
    await logAuditEvent({
      tenantId: 'demo-tenant-1',
      userId: 'owner@demo-restaurant.com',
      userEmail: 'owner@demo-restaurant.com',
      action: 'pos_transaction_created',
      resource: 'pos_transaction',
      resourceId: 'txn_123',
      details: { amount: 45.50, items: 3 },
      category: 'data',
      severity: 'low'
    });

    await logAuditEvent({
      tenantId: 'demo-tenant-2',
      userId: 'manager@coffeeshop.com',
      userEmail: 'manager@coffeeshop.com',
      action: 'inventory_item_updated',
      resource: 'inventory_item',
      resourceId: 'inv_456',
      details: { field: 'currentStock', oldValue: 50, newValue: 45 },
      category: 'data',
      severity: 'low'
    });

    await logAuditEvent({
      tenantId: 'system',
      userId: 'system',
      userEmail: 'system@coretrack.com',
      action: 'backup_completed',
      resource: 'system',
      details: { duration: '5m 30s', size: '2.3GB' },
      category: 'system',
      severity: 'low'
    });

    console.log('✅ Platform admin data seeded successfully!');
    console.log('📝 Data includes:');
    console.log('   - 2 Support tickets');
    console.log('   - System metrics and alerts');
    console.log('   - 2 Billing transactions');
    console.log('   - 3 Audit log entries');

  } catch (error) {
    console.error('❌ Error seeding platform admin data:', error);
    throw error;
  }
}

export { seedPlatformAdminData };

// Allow running directly
if (typeof window === 'undefined' && require.main === module) {
  seedPlatformAdminData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
