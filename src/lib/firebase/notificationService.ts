import { runSmartAlerts, sendAutomatedReports } from './smartAlerts'
import { cleanupExpiredNotifications } from './notifications'

// Background service for running automated tasks
export class NotificationService {
  private intervals: NodeJS.Timeout[] = []

  // Start the notification service
  start(tenantId: string) {
    // Run smart alerts every 15 minutes
    const alertInterval = setInterval(async () => {
      try {
        await runSmartAlerts(tenantId, 'main') // Use default location
        console.log(`Smart alerts processed for tenant: ${tenantId}`)
      } catch (error) {
        console.error('Error running smart alerts:', error)
      }
    }, 15 * 60 * 1000) // 15 minutes

    // Clean up expired notifications every hour
    const cleanupInterval = setInterval(async () => {
      try {
        await cleanupExpiredNotifications(tenantId)
        console.log(`Expired notifications cleaned up for tenant: ${tenantId}`)
      } catch (error) {
        console.error('Error cleaning up notifications:', error)
      }
    }, 60 * 60 * 1000) // 1 hour

    // Send daily reports at 9 AM
    const dailyReportInterval = setInterval(async () => {
      const now = new Date()
      if (now.getHours() === 9 && now.getMinutes() === 0) {
        try {
          await sendAutomatedReports(tenantId, 'main', 'daily')
          console.log(`Daily report sent for tenant: ${tenantId}`)
        } catch (error) {
          console.error('Error sending daily report:', error)
        }
      }
    }, 60 * 1000) // Check every minute

    // Send weekly reports on Monday at 9 AM
    const weeklyReportInterval = setInterval(async () => {
      const now = new Date()
      if (now.getDay() === 1 && now.getHours() === 9 && now.getMinutes() === 0) { // Monday
        try {
          await sendAutomatedReports(tenantId, 'main', 'weekly')
          console.log(`Weekly report sent for tenant: ${tenantId}`)
        } catch (error) {
          console.error('Error sending weekly report:', error)
        }
      }
    }, 60 * 1000) // Check every minute

    this.intervals.push(alertInterval, cleanupInterval, dailyReportInterval, weeklyReportInterval)
  }

  // Stop the notification service
  stop() {
    this.intervals.forEach(interval => clearInterval(interval))
    this.intervals = []
  }
}

// Global notification service instance
export const notificationService = new NotificationService()

// Production notification service initialization
// Managed by the application lifecycle and authentication state
if (typeof window !== 'undefined') {
  // Client-side initialization
  const startServiceForUser = (tenantId: string) => {
    notificationService.start(tenantId)
  }

  // Export for manual initialization
  (window as any).startNotificationService = startServiceForUser
}
