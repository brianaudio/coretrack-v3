/**
 * 🔧 Debug Helper Utility
 * Centralized debugging functions following our debugging principles
 */

interface DebugOptions {
  component?: string;
  action?: string;
  level?: 'info' | 'warn' | 'error' | 'success';
  sensitive?: boolean; // Mark if data contains sensitive information
}

interface DebugData {
  [key: string]: any;
}

class DebugHelper {
  private static isDevelopment = process.env.NODE_ENV === 'development';
  
  /**
   * 🔍 STEP 1: Trace function entry
   */
  static traceEntry(functionName: string, params?: DebugData, options?: DebugOptions) {
    if (!DebugHelper.isDevelopment) return;
    
    const timestamp = new Date().toISOString();
    const component = options?.component || 'Unknown';
    
    console.log(`🚀 [${component}] ${functionName} started:`, {
      timestamp,
      parameters: DebugHelper.sanitizeData(params, options?.sensitive),
      ...params
    });
  }
  
  /**
   * 🔍 STEP 2: Log process steps
   */
  static logStep(step: string, data?: DebugData, options?: DebugOptions) {
    if (!DebugHelper.isDevelopment) return;
    
    const emoji = DebugHelper.getEmojiForLevel(options?.level || 'info');
    const component = options?.component || 'Unknown';
    
    console.log(`${emoji} [${component}] ${step}:`, {
      timestamp: new Date().toISOString(),
      data: DebugHelper.sanitizeData(data, options?.sensitive)
    });
  }
  
  /**
   * 🔍 STEP 3: Log validation checks
   */
  static logValidation(check: string, result: boolean, data?: DebugData, options?: DebugOptions) {
    if (!DebugHelper.isDevelopment) return;
    
    const emoji = result ? '✅' : '❌';
    const component = options?.component || 'Unknown';
    
    console.log(`${emoji} [${component}] Validation ${result ? 'passed' : 'failed'}:`, {
      timestamp: new Date().toISOString(),
      check,
      result,
      details: DebugHelper.sanitizeData(data, options?.sensitive)
    });
  }
  
  /**
   * 🔍 STEP 4: Log errors with context
   */
  static logError(error: Error | string, context?: DebugData, options?: DebugOptions) {
    if (!DebugHelper.isDevelopment) return;
    
    const component = options?.component || 'Unknown';
    const errorMessage = typeof error === 'string' ? error : error.message;
    const stack = typeof error === 'object' ? error.stack : undefined;
    
    console.error(`❌ [${component}] ${errorMessage}:`, {
      timestamp: new Date().toISOString(),
      error: errorMessage,
      stack: stack?.split('\n')[0], // First line only for brevity
      context: DebugHelper.sanitizeData(context, options?.sensitive)
    });
  }
  
  /**
   * 🔍 STEP 5: Log success with results
   */
  static logSuccess(message: string, data?: DebugData, options?: DebugOptions) {
    if (!DebugHelper.isDevelopment) return;
    
    const component = options?.component || 'Unknown';
    
    console.log(`✅ [${component}] ${message}:`, {
      timestamp: new Date().toISOString(),
      data: DebugHelper.sanitizeData(data, options?.sensitive)
    });
  }
  
  /**
   * 🔍 Performance tracking
   */
  static startTimer(label: string): () => void {
    if (!DebugHelper.isDevelopment) return () => {};
    
    const start = performance.now();
    console.time(label);
    
    return () => {
      const end = performance.now();
      console.timeEnd(label);
      console.log(`⏱️ [Performance] ${label} took ${(end - start).toFixed(2)}ms`);
    };
  }
  
  /**
   * 🛡️ Sanitize sensitive data
   */
  private static sanitizeData(data?: DebugData, isSensitive?: boolean): DebugData | undefined {
    if (!data) return undefined;
    
    if (isSensitive) {
      // Remove or mask sensitive fields
      const sanitized: DebugData = {};
      Object.keys(data).forEach(key => {
        if (key.toLowerCase().includes('password')) {
          sanitized[key] = '***MASKED***';
        } else if (key.toLowerCase().includes('token')) {
          sanitized[key] = data[key] ? `${String(data[key]).substring(0, 8)}...` : undefined;
        } else if (key.toLowerCase().includes('email')) {
          const email = String(data[key]);
          const [username, domain] = email.split('@');
          sanitized[key] = `${username.substring(0, 2)}***@${domain}`;
        } else {
          sanitized[key] = data[key];
        }
      });
      return sanitized;
    }
    
    return data;
  }
  
  /**
   * 🎨 Get emoji for log level
   */
  private static getEmojiForLevel(level: string): string {
    const emojis = {
      info: '📋',
      warn: '⚠️',
      error: '❌',
      success: '✅'
    };
    return emojis[level as keyof typeof emojis] || '📋';
  }
  
  /**
   * 🔍 Debug object properties
   */
  static inspectObject(obj: any, label?: string, options?: DebugOptions) {
    if (!DebugHelper.isDevelopment) return;
    
    const component = options?.component || 'Unknown';
    const objectInfo = {
      type: typeof obj,
      isArray: Array.isArray(obj),
      isNull: obj === null,
      isUndefined: obj === undefined,
      length: obj?.length,
      keys: obj && typeof obj === 'object' ? Object.keys(obj) : undefined,
      value: DebugHelper.sanitizeData(obj, options?.sensitive)
    };
    
    console.log(`🔍 [${component}] Object inspection${label ? ` (${label})` : ''}:`, objectInfo);
  }
}

// Export commonly used methods for easier access
export const debugTrace = DebugHelper.traceEntry;
export const debugStep = DebugHelper.logStep;
export const debugValidation = DebugHelper.logValidation;
export const debugError = DebugHelper.logError;
export const debugSuccess = DebugHelper.logSuccess;
export const debugTimer = DebugHelper.startTimer;
export const debugInspect = DebugHelper.inspectObject;

export default DebugHelper;
