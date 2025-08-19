// Firebase notification production utilities
export function sendNotification(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
  // This will be replaced with actual notification service implementation
  console.log(`[${type.toUpperCase()}] ${message}`);
}