import { createNotification, updateNotificationSettings } from './notifications'

// Demo notification seeder for testing the smart alerts system
export const seedDemoNotifications = async (tenantId: string) => {
  try {
    // Ensure notification settings are enabled
    await updateNotificationSettings(tenantId, {
      emailNotifications: true,
      lowStockAlerts: true,
      expirationAlerts: true,
      reorderSuggestions: true,
      dailyReports: true,
      weeklyReports: true,
      criticalAlertsOnly: false,
      alertThresholds: {
        lowStock: 3,
        expiration: 7,
        criticalStock: 20
      },
      reportSchedule: {
        dailyTime: '09:00',
        weeklyDay: 1,
        weeklyTime: '09:00'
      }
    })

    // Create sample notifications
    const notifications = [
      {
        type: 'out_of_stock' as const,
        title: 'Critical: Out of Stock',
        message: 'French Fries are completely out of stock. Immediate action required!',
        priority: 'critical' as const,
        category: 'inventory' as const,
        actionRequired: true,
        actionType: 'reorder' as const,
        relatedItemName: 'French Fries'
      },
      {
        type: 'low_stock' as const,
        title: 'Low Stock Alert',
        message: 'Burger Buns are running low (15 pieces remaining). Consider reordering soon.',
        priority: 'high' as const,
        category: 'inventory' as const,
        actionRequired: true,
        actionType: 'reorder' as const,
        relatedItemName: 'Burger Buns'
      },
      {
        type: 'expiration' as const,
        title: 'Expiration Warning',
        message: 'Lettuce will expire in 2 days. Use soon or consider discount pricing.',
        priority: 'medium' as const,
        category: 'inventory' as const,
        actionRequired: true,
        actionType: 'check_expiry' as const,
        relatedItemName: 'Lettuce'
      },
      {
        type: 'reorder_suggestion' as const,
        title: 'Reorder Suggestion',
        message: 'Based on usage patterns, recommend ordering Chicken Patties (50 units) in 3 days.',
        priority: 'medium' as const,
        category: 'inventory' as const,
        actionRequired: false,
        actionType: 'reorder' as const,
        relatedItemName: 'Chicken Patties'
      },
      {
        type: 'system' as const,
        title: 'Daily Report Ready',
        message: 'Your daily inventory report for today is ready for review.',
        priority: 'low' as const,
        category: 'system' as const,
        actionRequired: false
      },
      {
        type: 'critical' as const,
        title: 'Multiple Items Critical',
        message: '3 items are critically low and need immediate attention: Tomatoes, Onions, Cheese.',
        priority: 'critical' as const,
        category: 'alert' as const,
        actionRequired: true,
        actionType: 'update_stock' as const
      }
    ]

    const notificationIds = []
    for (const notification of notifications) {
      const id = await createNotification({
        tenantId,
        ...notification
      })
      notificationIds.push(id)
    }

    console.log(`✅ Created ${notificationIds.length} demo notifications for tenant: ${tenantId}`)
    return notificationIds
  } catch (error) {
    console.error('Error seeding demo notifications:', error)
    throw error
  }
}

// Create a function to test smart alerts
export const testSmartAlerts = async (tenantId: string) => {
  try {
    // Import smart alerts module
    const { runSmartAlerts } = await import('./smartAlerts')
    
    const alerts = await runSmartAlerts(tenantId)
    console.log('Smart alerts test results:', {
      lowStockAlerts: alerts.lowStockAlerts.length,
      expirationAlerts: alerts.expirationAlerts.length,
      reorderSuggestions: alerts.reorderSuggestions.length
    })
    
    return alerts
  } catch (error) {
    console.error('Error testing smart alerts:', error)
    throw error
  }
}

// Utility function to demonstrate notification system in browser console
export const demoNotificationSystem = async (tenantId: string) => {
  console.log('🔔 Demonstrating Smart Notification System...')
  
  try {
    // Seed demo notifications
    const notificationIds = await seedDemoNotifications(tenantId)
    console.log(`✅ Created ${notificationIds.length} demo notifications`)
    
    // Test smart alerts
    const alerts = await testSmartAlerts(tenantId)
    console.log('📊 Smart alerts generated:', alerts)
    
    console.log('🎉 Demo complete! Check the Notifications tab to see the alerts.')
    console.log('💡 Features demonstrated:')
    console.log('  • Real-time notification badges in header')
    console.log('  • Critical alerts widget on dashboard')
    console.log('  • Full notifications panel with filtering')
    console.log('  • Smart alert generation')
    console.log('  • Notification settings management')
    
    return { notificationIds, alerts }
  } catch (error) {
    console.error('Error in demo:', error)
    throw error
  }
}

// Make demo function available globally for testing
if (typeof window !== 'undefined') {
  (window as any).demoNotificationSystem = demoNotificationSystem;
  (window as any).seedDemoNotifications = (tenantId: string) => seedDemoNotifications(tenantId);
  (window as any).testSmartAlerts = (tenantId: string) => testSmartAlerts(tenantId);
}
