// Input sanitization and validation utilities
export class InputSanitizer {
  // Remove potentially dangerous HTML/JavaScript
  static sanitizeString(input: string): string {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim()
  }
  
  // Validate email format
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email) && email.length <= 254
  }
  
  // Validate password strength
  static validatePassword(password: string): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long')
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter')
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter')
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number')
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character')
    }
    
    // Check for common weak passwords
    const commonPasswords = [
      'password', '123456', 'password123', 'admin', 'qwerty',
      'letmein', 'welcome', 'monkey', 'dragon', 'password1'
    ]
    
    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common and easily guessable')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
  
  // Sanitize user input for database storage
  static sanitizeForDatabase(input: any): any {
    if (typeof input === 'string') {
      return this.sanitizeString(input)
    }
    
    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeForDatabase(item))
    }
    
    if (typeof input === 'object' && input !== null) {
      const sanitized: any = {}
      for (const [key, value] of Object.entries(input)) {
        // Sanitize both key and value
        const sanitizedKey = this.sanitizeString(key)
        sanitized[sanitizedKey] = this.sanitizeForDatabase(value)
      }
      return sanitized
    }
    
    return input
  }
  
  // Validate business name
  static validateBusinessName(name: string): boolean {
    const sanitized = this.sanitizeString(name)
    return sanitized.length >= 2 && sanitized.length <= 100
  }
  
  // Validate phone number
  static validatePhoneNumber(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,15}$/
    return phoneRegex.test(phone.replace(/\s/g, ''))
  }
  
  // Prevent SQL injection (though we're using Firestore)
  static validateNoSQLInjection(input: string): boolean {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
      /(\'|(\\\')|(\'\')|(\s*;\s*)|(\s*--\s*)|(\s*\/\*.*\*\/\s*))/
    ]
    
    return !sqlPatterns.some(pattern => pattern.test(input))
  }
  
  // Rate limiting helper
  static createRateLimiter(maxAttempts: number, windowMs: number) {
    const attempts = new Map<string, number[]>()
    
    return (identifier: string): boolean => {
      const now = Date.now()
      const userAttempts = attempts.get(identifier) || []
      
      // Remove old attempts outside the window
      const recentAttempts = userAttempts.filter(
        time => now - time < windowMs
      )
      
      if (recentAttempts.length >= maxAttempts) {
        return false // Rate limited
      }
      
      recentAttempts.push(now)
      attempts.set(identifier, recentAttempts)
      return true // Allow request
    }
  }
}

export default InputSanitizer
