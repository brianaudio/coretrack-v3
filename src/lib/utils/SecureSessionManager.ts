// Secure session management utility
export class SecureSessionManager {
  private static readonly STORAGE_PREFIX = 'coretrack_secure_'
  private static readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000 // 24 hours
  
  // Store sensitive data with expiration
  static setSecureItem(key: string, value: any): void {
    try {
      const item = {
        value,
        timestamp: Date.now(),
        expires: Date.now() + this.SESSION_TIMEOUT
      }
      
      // Use sessionStorage for sensitive data (cleared on tab close)
      sessionStorage.setItem(
        this.STORAGE_PREFIX + key, 
        JSON.stringify(item)
      )
    } catch (error) {
      console.error('Failed to store secure session data:', error)
    }
  }
  
  // Get secure data with expiration check
  static getSecureItem(key: string): any {
    try {
      const item = sessionStorage.getItem(this.STORAGE_PREFIX + key)
      if (!item) return null
      
      const parsed = JSON.parse(item)
      
      // Check if expired
      if (Date.now() > parsed.expires) {
        this.removeSecureItem(key)
        return null
      }
      
      return parsed.value
    } catch (error) {
      console.error('Failed to retrieve secure session data:', error)
      return null
    }
  }
  
  // Remove secure item
  static removeSecureItem(key: string): void {
    sessionStorage.removeItem(this.STORAGE_PREFIX + key)
  }
  
  // Clear all secure session data
  static clearSecureSession(): void {
    Object.keys(sessionStorage)
      .filter(key => key.startsWith(this.STORAGE_PREFIX))
      .forEach(key => sessionStorage.removeItem(key))
  }
  
  // Store non-sensitive preferences in localStorage
  static setPreference(key: string, value: any): void {
    try {
      localStorage.setItem(
        `coretrack_pref_${key}`, 
        JSON.stringify(value)
      )
    } catch (error) {
      console.error('Failed to store preference:', error)
    }
  }
  
  static getPreference(key: string): any {
    try {
      const item = localStorage.getItem(`coretrack_pref_${key}`)
      return item ? JSON.parse(item) : null
    } catch (error) {
      console.error('Failed to retrieve preference:', error)
      return null
    }
  }
  
  // Clean up expired sessions on app start
  static cleanExpiredSessions(): void {
    try {
      Object.keys(sessionStorage)
        .filter(key => key.startsWith(this.STORAGE_PREFIX))
        .forEach(key => {
          const item = sessionStorage.getItem(key)
          if (item) {
            const parsed = JSON.parse(item)
            if (Date.now() > parsed.expires) {
              sessionStorage.removeItem(key)
            }
          }
        })
    } catch (error) {
      console.error('Failed to clean expired sessions:', error)
    }
  }
}

export default SecureSessionManager
