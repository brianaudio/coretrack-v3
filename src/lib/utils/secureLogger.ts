// Security-aware logging utility
const isDevelopment = process.env.NODE_ENV === 'development'
const isProduction = process.env.NODE_ENV === 'production'

export const secureLogger = {
  // Development only logs
  dev: {
    log: (...args: any[]) => {
      if (isDevelopment) console.log(...args)
    },
    info: (...args: any[]) => {
      if (isDevelopment) console.info(...args)
    },
    warn: (...args: any[]) => {
      if (isDevelopment) console.warn(...args)
    }
  },
  
  // Production safe logs (no sensitive data)
  info: (...args: any[]) => {
    console.info(...args)
  },
  
  // Always log errors (but sanitize them)
  error: (message: string, error?: any) => {
    if (isProduction) {
      // In production, log sanitized errors
      console.error(message, error?.message || 'Unknown error')
    } else {
      // In development, log full error details
      console.error(message, error)
    }
  },
  
  // Security events should always be logged
  security: (message: string, details?: any) => {
    console.warn(`🔒 SECURITY: ${message}`, details || '')
  }
}

export default secureLogger
