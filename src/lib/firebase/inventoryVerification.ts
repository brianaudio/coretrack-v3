import { collection, addDoc, getDocs, doc, getDoc, Timestamp, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { InventoryVerificationRecord } from '../types/inventoryVerification';

// Collection path: tenants/{tenantId}/inventoryVerification
export const addInventoryVerificationRecord = async (tenantId: string, record: Omit<InventoryVerificationRecord, 'id'>) => {
  const colRef = collection(db, 'tenants', tenantId, 'inventoryVerification');
  const docRef = await addDoc(colRef, record);
  return docRef.id;
};

export const getInventoryVerificationRecords = async (tenantId: string, locationId?: string) => {
  const colRef = collection(db, 'tenants', tenantId, 'inventoryVerification');
  let q = colRef as any;
  if (locationId) {
    q = query(colRef, where('locationId', '==', locationId));
  }
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) })) as InventoryVerificationRecord[];
};

export const getInventoryVerificationRecord = async (tenantId: string, recordId: string) => {
  const docRef = doc(db, 'tenants', tenantId, 'inventoryVerification', recordId);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as InventoryVerificationRecord;
};

export const updateInventoryVerificationRecord = async (tenantId: string, recordId: string, updates: Partial<InventoryVerificationRecord>) => {
  const docRef = doc(db, 'tenants', tenantId, 'inventoryVerification', recordId);
  await updateDoc(docRef, updates);
};

export const deleteInventoryVerificationRecord = async (tenantId: string, recordId: string) => {
  const docRef = doc(db, 'tenants', tenantId, 'inventoryVerification', recordId);
  await deleteDoc(docRef);
};
