// Production security configuration and helpers
const isProduction = process.env.NODE_ENV === 'production'
const isDevelopment = process.env.NODE_ENV === 'development'

export const SecurityConfig = {
  // Force HTTPS in production
  FORCE_HTTPS: isProduction || process.env.NEXT_PUBLIC_FORCE_HTTPS === 'true',
  
  // Demo mode (disable in production)
  DEMO_MODE_ENABLED: isDevelopment && process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE !== 'false',
  
  // Debug logging (disable in production)
  DEBUG_LOGS_ENABLED: isDevelopment && process.env.NEXT_PUBLIC_ENABLE_DEBUG_LOGS !== 'false',
  
  // Rate limiting
  MAX_LOGIN_ATTEMPTS: parseInt(process.env.NEXT_PUBLIC_MAX_LOGIN_ATTEMPTS || '5'),
  LOCKOUT_DURATION: parseInt(process.env.NEXT_PUBLIC_LOCKOUT_DURATION || '300000'), // 5 minutes
  SESSION_TIMEOUT: parseInt(process.env.NEXT_PUBLIC_SESSION_TIMEOUT || '3600000'), // 1 hour
  
  // CSRF Protection
  CSRF_TOKEN_LENGTH: 32,
  
  // Content Security Policy
  CSP_ENABLED: true,
  
  // Headers
  SECURITY_HEADERS: {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
  }
}

// Security validation helpers
export const SecurityHelpers = {
  // Check if we're in a secure context
  isSecureContext(): boolean {
    if (typeof window === 'undefined') return true // Server-side
    return window.location.protocol === 'https:' || window.location.hostname === 'localhost'
  },
  
  // Validate environment configuration
  validateEnvironment(): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    
    // Check Firebase configuration
    const requiredFirebaseVars = [
      'NEXT_PUBLIC_FIREBASE_API_KEY',
      'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID'
    ]
    
    requiredFirebaseVars.forEach(varName => {
      if (!process.env[varName] || process.env[varName] === 'your_api_key_here') {
        errors.push(`Missing or invalid ${varName}`)
      }
    })
    
    // Production-specific checks
    if (isProduction) {
      if (SecurityConfig.DEMO_MODE_ENABLED) {
        errors.push('Demo mode should be disabled in production')
      }
      
      if (SecurityConfig.DEBUG_LOGS_ENABLED) {
        errors.push('Debug logs should be disabled in production')
      }
      
      if (!SecurityConfig.FORCE_HTTPS) {
        errors.push('HTTPS should be enforced in production')
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  },
  
  // Generate CSRF token
  generateCSRFToken(): string {
    const array = new Uint8Array(SecurityConfig.CSRF_TOKEN_LENGTH)
    if (typeof window !== 'undefined' && window.crypto) {
      window.crypto.getRandomValues(array)
    } else {
      // Fallback for server-side
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256)
      }
    }
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  },
  
  // Sanitize error messages for production
  sanitizeError(error: any): string {
    if (isProduction) {
      // In production, return generic error messages
      return 'An error occurred. Please try again later.'
    } else {
      // In development, return detailed error messages
      return error?.message || 'Unknown error'
    }
  },
  
  // Check for development-only features
  isDevelopmentFeature(feature: string): boolean {
    const devFeatures = ['debug-panel', 'mock-data', 'test-mode']
    return isDevelopment && devFeatures.includes(feature)
  }
}

// Content Security Policy configuration
export const getCSPHeader = (): string => {
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.gstatic.com https://www.googleapis.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://*.firebaseio.com https://*.googleapis.com wss://*.firebaseio.com",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ]
  
  return csp.join('; ')
}

export default SecurityConfig
