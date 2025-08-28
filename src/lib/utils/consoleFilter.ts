'use client'

/**
 * Firebase Offline Console Filter
 * Filters out expected offline connection warnings that are not actually errors
 * but normal behavior when operating in offline mode.
 */

// Store original console methods
const originalError = console.error;
const originalWarn = console.warn;

// List of expected offline messages to filter out
const expectedOfflineMessages = [
  'Could not reach Cloud Firestore backend',
  'Connection failed',
  'The operation could not be completed',
  'your device does not have a healthy Internet connection',
  'The client will operate in offline mode',
  'FirebaseError: [code=unavailable]'
];

// Check if a message is an expected offline warning
const isExpectedOfflineMessage = (message: string): boolean => {
  return expectedOfflineMessages.some(pattern => 
    message.toLowerCase().includes(pattern.toLowerCase())
  );
};

// Enhanced console.error that filters expected offline messages
console.error = (...args: any[]) => {
  const message = args.join(' ');
  
  if (isExpectedOfflineMessage(message)) {
    // Convert to a more friendly log message
    console.log('📱 Operating in offline mode - Firebase persistence active');
    return;
  }
  
  // Call original error method for genuine errors
  originalError.apply(console, args);
};

// Enhanced console.warn that provides context for Firebase warnings
console.warn = (...args: any[]) => {
  const message = args.join(' ');
  
  if (isExpectedOfflineMessage(message)) {
    // Convert to a more friendly log message
    console.log('🌐 Network connectivity restored - syncing with Firebase');
    return;
  }
  
  // Call original warn method for other warnings
  originalWarn.apply(console, args);
};

// Restore original console methods when needed
export const restoreConsole = () => {
  console.error = originalError;
  console.warn = originalWarn;
};

export default {
  restoreConsole
};
