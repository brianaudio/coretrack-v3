/**
 * Server-side Permission Middleware
 * Protect API routes with permission validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    })
  });
}

const auth = getAuth();
const db = getFirestore();

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  tenantId: string;
  branchId?: string;
}

/**
 * Extract and verify Firebase ID token from request
 */
export async function verifyAuthToken(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(idToken);
    
    // Get user's tenant information
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    if (!userDoc.exists) {
      return null;
    }

    const userData = userDoc.data();
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      tenantId: userData?.tenantId,
      branchId: userData?.branchId
    };
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Check if user has required permission
 */
export async function checkPermission(
  user: AuthenticatedUser,
  action: string,
  resource: string,
  additionalContext?: Record<string, any>
): Promise<boolean> {
  try {
    // Get user roles
    const userRolesQuery = db
      .collection('tenants')
      .doc(user.tenantId)
      .collection('userRoles')
      .where('userId', '==', user.uid);

    const userRoleSnapshot = await userRolesQuery.get();
    const roleIds = userRoleSnapshot.docs
      .filter(doc => {
        const data = doc.data();
        // Check if role has expired
        if (data.expiresAt && data.expiresAt.toDate() < new Date()) {
          return false;
        }
        return true;
      })
      .map(doc => doc.data().roleId);

    if (roleIds.length === 0) {
      return false;
    }

    // Get role permissions
    const rolesQuery = db
      .collection('tenants')
      .doc(user.tenantId)
      .collection('roles')
      .where('id', 'in', roleIds);

    const rolesSnapshot = await rolesQuery.get();
    const allPermissions: any[] = [];

    // Collect all permissions from roles
    for (const roleDoc of rolesSnapshot.docs) {
      const roleData = roleDoc.data();
      allPermissions.push(...(roleData.permissions || []));
      
      // Handle role inheritance
      if (roleData.inheritFrom) {
        const inheritedQuery = db
          .collection('tenants')
          .doc(user.tenantId)
          .collection('roles')
          .where('id', 'in', roleData.inheritFrom);
        
        const inheritedSnapshot = await inheritedQuery.get();
        inheritedSnapshot.docs.forEach(doc => {
          const inheritedData = doc.data();
          allPermissions.push(...(inheritedData.permissions || []));
        });
      }
    }

    // Check for wildcard permissions (super admin)
    if (allPermissions.some(p => p.action === '*' && p.resource === '*')) {
      return true;
    }

    // Check for resource wildcard
    if (allPermissions.some(p => p.action === '*' && p.resource === resource)) {
      return true;
    }

    // Check for action wildcard on specific resource
    if (allPermissions.some(p => p.action === action && p.resource === '*')) {
      return true;
    }

    // Check exact permission match
    const matchingPermissions = allPermissions.filter(p => 
      p.action === action && p.resource === resource
    );

    if (matchingPermissions.length === 0) {
      return false;
    }

    // Check conditions if present
    for (const permission of matchingPermissions) {
      if (!permission.conditions) {
        return true; // No conditions, permission granted
      }

      if (checkPermissionConditions(permission.conditions, user, additionalContext)) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Permission check failed:', error);
    return false;
  }
}

/**
 * Check permission conditions
 */
function checkPermissionConditions(
  conditions: Record<string, any>,
  user: AuthenticatedUser,
  additionalContext?: Record<string, any>
): boolean {
  // Branch restriction check
  if (conditions.branchRestricted && user.branchId) {
    const contextBranchId = additionalContext?.branchId || user.branchId;
    if (contextBranchId !== user.branchId) {
      return false;
    }
  }

  // Own resources only
  if (conditions.ownOnly && additionalContext?.ownerId) {
    if (additionalContext.ownerId !== user.uid) {
      return false;
    }
  }

  // Basic access only (limited features)
  if (conditions.basicOnly && additionalContext?.requiresAdvanced) {
    return false;
  }

  // Stock updates only (for inventory)
  if (conditions.stockUpdatesOnly && additionalContext?.operationType) {
    const allowedOperations = ['stock_adjustment', 'stock_count', 'stock_receive'];
    if (!allowedOperations.includes(additionalContext.operationType)) {
      return false;
    }
  }

  return true;
}

/**
 * Middleware wrapper for permission-protected API routes
 */
export function withPermissions(
  requiredAction: string,
  requiredResource: string,
  handler: (request: NextRequest, user: AuthenticatedUser) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // Verify authentication
      const user = await verifyAuthToken(request);
      if (!user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      // Check permissions
      const hasPermission = await checkPermission(user, requiredAction, requiredResource);
      if (!hasPermission) {
        return NextResponse.json(
          { 
            error: 'Forbidden',
            message: `Missing permission: ${requiredAction}:${requiredResource}`
          },
          { status: 403 }
        );
      }

      // Call the actual handler
      return await handler(request, user);
    } catch (error) {
      console.error('Permission middleware error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

/**
 * Admin-only middleware wrapper
 */
export function withAdminPermissions(
  handler: (request: NextRequest, user: AuthenticatedUser) => Promise<NextResponse>
) {
  return withPermissions('*', '*', handler);
}

/**
 * Tenant admin middleware wrapper
 */
export function withTenantAdminPermissions(
  handler: (request: NextRequest, user: AuthenticatedUser) => Promise<NextResponse>
) {
  return withPermissions('manage', 'users', handler);
}

/**
 * Validate tenant access (ensure user belongs to the tenant in the request)
 */
export async function validateTenantAccess(
  request: NextRequest,
  user: AuthenticatedUser,
  tenantIdFromPath?: string
): Promise<boolean> {
  const tenantId = tenantIdFromPath || request.nextUrl.searchParams.get('tenantId');
  
  if (!tenantId) {
    return false;
  }

  // User can only access their own tenant's data
  return user.tenantId === tenantId;
}

/**
 * Extract tenant ID from URL path
 */
export function extractTenantId(pathname: string): string | null {
  const tenantMatch = pathname.match(/\/api\/tenants\/([^\/]+)/);
  return tenantMatch ? tenantMatch[1] : null;
}

/**
 * Rate limiting for sensitive operations
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(identifier);

  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (limit.count >= maxRequests) {
    return false;
  }

  limit.count++;
  return true;
}
