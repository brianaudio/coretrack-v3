import { UserRole } from '../rbac/permissions';

// Secure credential store with hashed passwords (in production, these would be in a database)
export const secureCredentials = {
  staff: {
    email: 'staff@coretrack.dev',
    password: 'Staff123!',
    hashedPassword: 'c7f4e7b3a9f2e1d6c8a5b4f1e7c9d2a6', // In production: bcrypt hash
    role: 'staff' as UserRole,
    maxLoginAttempts: 3,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
  },
  manager: {
    email: 'manager@coretrack.dev',
    password: 'Manager123!',
    hashedPassword: 'a8e3f9c1b7d4e2f5c9a6b3e1f8d7c4a9',
    role: 'manager' as UserRole,
    maxLoginAttempts: 5,
    lockoutDuration: 10 * 60 * 1000, // 10 minutes
  },
  owner: {
    email: 'owner@coretrack.dev',
    password: 'Owner123!',
    hashedPassword: 'f9e2c8a5b1d7f3c6e9a2b8f5c1e4d7a3',
    role: 'owner' as UserRole,
    maxLoginAttempts: 5,
    lockoutDuration: 5 * 60 * 1000, // 5 minutes
  }
};

interface LoginAttempt {
  email: string;
  timestamp: number;
  success: boolean;
  ip?: string;
  userAgent?: string;
}

interface AccountLockout {
  email: string;
  lockedUntil: number;
  reason: string;
}

class SecurityManager {
  private static instance: SecurityManager;
  private loginAttempts: Map<string, LoginAttempt[]> = new Map();
  private accountLockouts: Map<string, AccountLockout> = new Map();
  private securityEvents: LoginAttempt[] = [];

  static getInstance(): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager();
    }
    return SecurityManager.instance;
  }

  // Validate credentials with security checks
  async validateCredentials(email: string, password: string, role: UserRole): Promise<{
    success: boolean;
    message: string;
    user?: any;
    securityWarnings?: string[];
  }> {
    try {
      // 1. Check if account is locked
      const lockout = this.accountLockouts.get(email);
      if (lockout && Date.now() < lockout.lockedUntil) {
        const remainingTime = Math.ceil((lockout.lockedUntil - Date.now()) / 1000 / 60);
        return {
          success: false,
          message: `Account locked. Try again in ${remainingTime} minutes.`
        };
      }

      // 2. Find matching credential
      const credential = Object.values(secureCredentials).find(
        cred => cred.email === email && cred.role === role
      );

      if (!credential) {
        this.recordLoginAttempt(email, false, 'Invalid role or email');
        return {
          success: false,
          message: 'Invalid credentials or insufficient permissions'
        };
      }

      // 3. Validate password
      const isPasswordValid = await this.verifyPassword(password, credential.password);
      
      if (!isPasswordValid) {
        this.recordLoginAttempt(email, false, 'Invalid password');
        this.checkAndLockAccount(email, credential);
        return {
          success: false,
          message: 'Invalid credentials'
        };
      }

      // 4. Clear any existing lockout
      this.accountLockouts.delete(email);

      // 5. Record successful login
      this.recordLoginAttempt(email, true, 'Successful login');

      // 6. Generate security warnings if needed
      const warnings = this.generateSecurityWarnings(email);

      return {
        success: true,
        message: 'Authentication successful',
        user: {
          email: credential.email,
          role: credential.role
        },
        securityWarnings: warnings
      };

    } catch (error) {
      console.error('Security validation error:', error);
      return {
        success: false,
        message: 'Authentication system error'
      };
    }
  }

  private async verifyPassword(provided: string, stored: string): Promise<boolean> {
    // In production, use bcrypt.compare(provided, hashedPassword)
    // For demo, simple comparison with simulated delay
    await new Promise(resolve => setTimeout(resolve, 100));
    return provided === stored;
  }

  private recordLoginAttempt(email: string, success: boolean, reason: string): void {
    const attempt: LoginAttempt = {
      email,
      timestamp: Date.now(),
      success,
      ip: this.getClientIP(),
      userAgent: this.getUserAgent()
    };

    // Store in user's attempt history
    if (!this.loginAttempts.has(email)) {
      this.loginAttempts.set(email, []);
    }
    
    const userAttempts = this.loginAttempts.get(email)!;
    userAttempts.push(attempt);
    
    // Keep only last 10 attempts
    if (userAttempts.length > 10) {
      userAttempts.shift();
    }

    // Store in global security events
    this.securityEvents.push(attempt);
    if (this.securityEvents.length > 100) {
      this.securityEvents.shift();
    }

    console.log(`🔐 Login attempt: ${email} - ${success ? 'SUCCESS' : 'FAILED'} (${reason})`);
  }

  private checkAndLockAccount(email: string, credential: any): void {
    const attempts = this.loginAttempts.get(email) || [];
    const recentFailures = attempts.filter(
      attempt => !attempt.success && 
      Date.now() - attempt.timestamp < 15 * 60 * 1000 // Last 15 minutes
    );

    if (recentFailures.length >= credential.maxLoginAttempts) {
      const lockout: AccountLockout = {
        email,
        lockedUntil: Date.now() + credential.lockoutDuration,
        reason: `Too many failed login attempts (${recentFailures.length})`
      };
      
      this.accountLockouts.set(email, lockout);
      console.log(`🔒 Account locked: ${email} until ${new Date(lockout.lockedUntil).toLocaleTimeString()}`);
    }
  }

  private generateSecurityWarnings(email: string): string[] {
    const warnings: string[] = [];
    const attempts = this.loginAttempts.get(email) || [];
    
    // Check for recent failed attempts
    const recentFailures = attempts.filter(
      attempt => !attempt.success && 
      Date.now() - attempt.timestamp < 60 * 60 * 1000 // Last hour
    );

    if (recentFailures.length > 0) {
      warnings.push(`${recentFailures.length} failed login attempts in the last hour`);
    }

    // Check for unusual activity patterns
    const recentSuccessful = attempts.filter(
      attempt => attempt.success && 
      Date.now() - attempt.timestamp < 24 * 60 * 60 * 1000 // Last 24 hours
    );

    if (recentSuccessful.length > 10) {
      warnings.push('High number of logins today');
    }

    return warnings;
  }

  private getClientIP(): string {
    // In production, get real IP from request headers
    return '127.0.0.1';
  }

  private getUserAgent(): string {
    if (typeof window !== 'undefined') {
      return window.navigator.userAgent;
    }
    return 'Unknown';
  }

  // Get security dashboard data
  getSecurityDashboard(): {
    totalAttempts: number;
    failedAttempts: number;
    lockedAccounts: number;
    recentEvents: LoginAttempt[];
  } {
    const totalAttempts = this.securityEvents.length;
    const failedAttempts = this.securityEvents.filter(e => !e.success).length;
    const lockedAccounts = this.accountLockouts.size;
    const recentEvents = this.securityEvents.slice(-10);

    return {
      totalAttempts,
      failedAttempts,
      lockedAccounts,
      recentEvents
    };
  }

  // Clear all security data (admin function)
  clearSecurityData(): void {
    this.loginAttempts.clear();
    this.accountLockouts.clear();
    this.securityEvents.length = 0;
    console.log('🧹 Security data cleared');
  }
}

export const securityManager = SecurityManager.getInstance();
