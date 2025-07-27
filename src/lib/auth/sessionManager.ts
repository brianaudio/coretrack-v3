import { UserRole } from '../rbac/permissions';

interface SessionData {
  userId: string;
  email: string;
  role: UserRole;
  loginTime: number;
  lastActivity: number;
  sessionId: string;
}

class SessionManager {
  private static instance: SessionManager;
  private sessions: Map<string, SessionData> = new Map();
  private sessionTimeout = 8 * 60 * 60 * 1000; // 8 hours
  private activityTimeout = 30 * 60 * 1000; // 30 minutes

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  createSession(userId: string, email: string, role: UserRole): string {
    const sessionId = this.generateSessionId();
    const now = Date.now();
    
    const sessionData: SessionData = {
      userId,
      email,
      role,
      loginTime: now,
      lastActivity: now,
      sessionId
    };

    this.sessions.set(sessionId, sessionData);
    
    // Store in localStorage for persistence across tabs
    if (typeof window !== 'undefined') {
      localStorage.setItem('coretrack_session', sessionId);
      localStorage.setItem('coretrack_session_data', JSON.stringify(sessionData));
    }

    console.log(`✅ Session created for ${email} (${role})`);
    return sessionId;
  }

  validateSession(sessionId: string): SessionData | null {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      // Try to restore from localStorage
      if (typeof window !== 'undefined') {
        const storedSessionId = localStorage.getItem('coretrack_session');
        const storedSessionData = localStorage.getItem('coretrack_session_data');
        
        if (storedSessionId === sessionId && storedSessionData) {
          try {
            const parsedData = JSON.parse(storedSessionData) as SessionData;
            this.sessions.set(sessionId, parsedData);
            return this.validateSession(sessionId); // Recursive call to validate
          } catch (e) {
            this.clearSession(sessionId);
            return null;
          }
        }
      }
      return null;
    }

    const now = Date.now();
    
    // Check session timeout
    if (now - session.loginTime > this.sessionTimeout) {
      console.log('❌ Session expired (timeout)');
      this.clearSession(sessionId);
      return null;
    }

    // Check activity timeout
    if (now - session.lastActivity > this.activityTimeout) {
      console.log('❌ Session expired (inactivity)');
      this.clearSession(sessionId);
      return null;
    }

    // Update last activity
    session.lastActivity = now;
    this.sessions.set(sessionId, session);
    
    // Update localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('coretrack_session_data', JSON.stringify(session));
    }

    return session;
  }

  updateActivity(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = Date.now();
      this.sessions.set(sessionId, session);
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('coretrack_session_data', JSON.stringify(session));
      }
    }
  }

  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('coretrack_session');
      localStorage.removeItem('coretrack_session_data');
    }
    
    console.log('🗑️ Session cleared');
  }

  clearAllSessions(): void {
    this.sessions.clear();
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('coretrack_session');
      localStorage.removeItem('coretrack_session_data');
    }
    
    console.log('🗑️ All sessions cleared');
  }

  getActiveSession(): SessionData | null {
    if (typeof window !== 'undefined') {
      const sessionId = localStorage.getItem('coretrack_session');
      if (sessionId) {
        return this.validateSession(sessionId);
      }
    }
    return null;
  }

  getRemainingTime(sessionId: string): { sessionTime: number; activityTime: number } | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const now = Date.now();
    const sessionTime = Math.max(0, this.sessionTimeout - (now - session.loginTime));
    const activityTime = Math.max(0, this.activityTimeout - (now - session.lastActivity));

    return { sessionTime, activityTime };
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Security: Get session info for logging
  getSessionInfo(sessionId: string): Partial<SessionData> | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    return {
      userId: session.userId,
      email: session.email,
      role: session.role,
      loginTime: session.loginTime,
      lastActivity: session.lastActivity
    };
  }
}

export const sessionManager = SessionManager.getInstance();

// Auto-cleanup inactive sessions every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    const activeSession = sessionManager.getActiveSession();
    if (!activeSession) {
      sessionManager.clearAllSessions();
    }
  }, 5 * 60 * 1000);
}
