import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  limit
} from 'firebase/firestore';
import { db } from '../firebase';
import { UserInvitation, TeamMember, UserRole, UserStatus, DEFAULT_ROLE_PERMISSIONS } from '../types/user';

// Send team invitation
export const inviteTeamMember = async (
  tenantId: string,
  email: string,
  role: UserRole,
  locationIds: string[] = [],
  invitedBy: string,
  invitedByName: string
): Promise<string> => {
  const invitationId = `${tenantId}_${email}_${Date.now()}`;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days to accept

  const invitation: UserInvitation = {
    id: invitationId,
    tenantId,
    email,
    role,
    locationIds,
    invitedBy,
    invitedByName,
    status: 'pending',
    expiresAt: Timestamp.fromDate(expiresAt),
    createdAt: Timestamp.now(),
  };

  await setDoc(doc(db, 'invitations', invitationId), invitation);
  
  // TODO: Send email invitation
  console.log(`Invitation sent to ${email} for role ${role}`);
  
  return invitationId;
};

// Get pending invitations for a tenant
export const getPendingInvitations = async (tenantId: string): Promise<UserInvitation[]> => {
  try {
    // Simple query without composite index
    const q = query(
      collection(db, 'invitations'),
      where('tenantId', '==', tenantId),
      where('status', '==', 'pending')
    );

    const snapshot = await getDocs(q);
    const invitations = snapshot.docs.map(doc => ({ ...doc.data() } as UserInvitation));
    
    // Sort by createdAt on the client side
    return invitations.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
  } catch (error) {
    console.error('Error fetching pending invitations:', error);
    return [];
  }
};

// Accept invitation (called during user signup/signin)
export const acceptInvitation = async (email: string, userId: string): Promise<UserInvitation | null> => {
  try {
    // Simple query without composite index
    const q = query(
      collection(db, 'invitations'),
      where('email', '==', email),
      where('status', '==', 'pending'),
      limit(1)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    const invitationDoc = snapshot.docs[0];
    const invitation = { ...invitationDoc.data() } as UserInvitation;

    // Check if invitation is expired
    if (invitation.expiresAt.toDate() < new Date()) {
      await updateDoc(doc(db, 'invitations', invitation.id), {
        status: 'expired'
      });
      return null;
    }

    // Mark invitation as accepted
    await updateDoc(doc(db, 'invitations', invitation.id), {
      status: 'accepted'
    });

    // Add user to team members
    await addTeamMember(invitation.tenantId, userId, {
      email: invitation.email,
      role: invitation.role,
      locationIds: invitation.locationIds || [],
      invitedBy: invitation.invitedBy
    });

    return invitation;
  } catch (error) {
    console.error('Error accepting invitation:', error);
    return null;
  }
};

// Add team member
export const addTeamMember = async (
  tenantId: string,
  userId: string,
  memberData: {
    email: string;
    role: UserRole;
    locationIds: string[];
    invitedBy?: string;
    displayName?: string;
  }
): Promise<void> => {
  const rolePermissions = DEFAULT_ROLE_PERMISSIONS[memberData.role];
  
  const teamMember: TeamMember = {
    uid: userId,
    email: memberData.email,
    displayName: memberData.displayName || memberData.email.split('@')[0],
    role: memberData.role,
    status: 'active',
    locationIds: memberData.locationIds,
    permissions: rolePermissions.permissions,
    invitedBy: memberData.invitedBy,
    joinedAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  await setDoc(doc(db, 'tenants', tenantId, 'members', userId), teamMember);
};

// Get team members for a tenant
export const getTeamMembers = async (tenantId: string): Promise<TeamMember[]> => {
  const snapshot = await getDocs(collection(db, 'tenants', tenantId, 'members'));
  return snapshot.docs.map(doc => ({ ...doc.data() } as TeamMember));
};

// Update team member
export const updateTeamMember = async (
  tenantId: string,
  userId: string,
  updates: Partial<TeamMember>
): Promise<void> => {
  await updateDoc(doc(db, 'tenants', tenantId, 'members', userId), {
    ...updates,
    updatedAt: Timestamp.now(),
  });
};

// Remove team member
export const removeTeamMember = async (tenantId: string, userId: string): Promise<void> => {
  await deleteDoc(doc(db, 'tenants', tenantId, 'members', userId));
};

// Get team member by ID
export const getTeamMember = async (tenantId: string, userId: string): Promise<TeamMember | null> => {
  const docRef = doc(db, 'tenants', tenantId, 'members', userId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) return null;
  
  return { ...docSnap.data() } as TeamMember;
};

// Check if user has permission
export const hasPermission = (
  member: TeamMember,
  permission: string,
  locationId?: string
): boolean => {
  // Owner has all permissions
  if (member.role === 'owner') return true;
  
  // Check if user has access to the location
  if (locationId && !member.locationIds.includes(locationId)) {
    return false;
  }
  
  // Check if user has the specific permission
  return member.permissions.includes(permission) || member.permissions.includes('*');
};

// Check if user can manage other users
export const canManageUsers = (member: TeamMember): boolean => {
  return member.role === 'owner' || DEFAULT_ROLE_PERMISSIONS[member.role].canManageUsers;
};

// Check if user can manage settings
export const canManageSettings = (member: TeamMember): boolean => {
  return member.role === 'owner' || DEFAULT_ROLE_PERMISSIONS[member.role].canManageSettings;
};

// Update user's last login
export const updateLastLogin = async (tenantId: string, userId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'tenants', tenantId, 'members', userId), {
      lastLogin: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating last login:', error);
  }
};
