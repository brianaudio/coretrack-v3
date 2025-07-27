import { collection, doc, setDoc, updateDoc, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

export type UserRole = 'owner' | 'manager' | 'staff' | 'viewer';

export interface TenantUser {
  uid: string;
  email: string;
  role: UserRole;
  status: 'active' | 'invited';
  invitedAt?: Timestamp;
  activatedAt?: Timestamp;
}

export const inviteUserToTenant = async (
  tenantId: string,
  email: string,
  role: UserRole
): Promise<void> => {
  const userRef = doc(collection(db, 'tenants', tenantId, 'users'));
  await setDoc(userRef, {
    email,
    role,
    status: 'invited',
    invitedAt: Timestamp.now()
  });
};

export const activateUser = async (
  tenantId: string,
  uid: string
): Promise<void> => {
  const userRef = doc(db, 'tenants', tenantId, 'users', uid);
  await updateDoc(userRef, {
    status: 'active',
    activatedAt: Timestamp.now()
  });
};

export const getTenantUsers = async (
  tenantId: string
): Promise<TenantUser[]> => {
  const usersCol = collection(db, 'tenants', tenantId, 'users');
  const usersSnap = await getDocs(usersCol);
  return usersSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as TenantUser));
};
