import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  onSnapshot,
  Unsubscribe 
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { db, storage } from '../firebase';

export interface QRCodeSettings {
  gcash: {
    url: string;
    fileName: string;
    uploadedAt: Date;
  } | null;
  maya: {
    url: string;
    fileName: string;
    uploadedAt: Date;
  } | null;
  updatedAt: Date;
  updatedBy: string;
}

const DEFAULT_QR_SETTINGS: QRCodeSettings = {
  gcash: null,
  maya: null,
  updatedAt: new Date(),
  updatedBy: ''
};

/**
 * Get QR code settings for a specific tenant and branch
 */
export const getQRCodeSettings = async (tenantId: string, branchId?: string): Promise<QRCodeSettings> => {
  try {
    const branch = branchId || 'main'
    const qrRef = doc(db, 'tenants', tenantId, 'branches', branch, 'settings', 'qrCodes');
    const qrSnap = await getDoc(qrRef);
    
    if (qrSnap.exists()) {
      const data = qrSnap.data();
      return {
        ...data,
        updatedAt: data.updatedAt?.toDate() || new Date(),
        gcash: data.gcash ? {
          ...data.gcash,
          uploadedAt: data.gcash.uploadedAt?.toDate() || new Date()
        } : null,
        maya: data.maya ? {
          ...data.maya,
          uploadedAt: data.maya.uploadedAt?.toDate() || new Date()
        } : null
      } as QRCodeSettings;
    } else {
      return DEFAULT_QR_SETTINGS;
    }
  } catch (error) {
    console.error('Error getting QR code settings:', error);
    return DEFAULT_QR_SETTINGS;
  }
};

/**
 * Upload QR code image and save settings for specific branch
 */
export const uploadQRCode = async (
  tenantId: string,
  type: 'gcash' | 'maya',
  file: File,
  userId: string,
  branchId?: string
): Promise<string> => {
  try {
    const branch = branchId || 'main'
    console.log(`🔄 Starting QR upload process...`)
    console.log(`📋 Upload details:`, {
      tenantId,
      type,
      fileName: file.name,
      fileSize: file.size,
      userId,
      branch
    })
    
    // Create a unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `qr-${type}-${branch}-${timestamp}.${fileExtension}`;
    const storagePath = `tenants/${tenantId}/branches/${branch}/qr-codes/${fileName}`;
    
    console.log(`📁 Storage path: ${storagePath}`)
    
    const storageRef = ref(storage, storagePath);
    
    console.log(`📤 Uploading file to Firebase Storage...`)
    // Upload file to Firebase Storage
    const uploadResult = await uploadBytes(storageRef, file);
    console.log(`✅ File uploaded successfully to storage`)
    
    console.log(`🔗 Getting download URL...`)
    const downloadURL = await getDownloadURL(uploadResult.ref);
    console.log(`✅ Download URL obtained: ${downloadURL}`)
    
    // Update Firestore with new QR code info
    const firestorePath = `tenants/${tenantId}/branches/${branch}/settings/qrCodes`
    console.log(`💾 Updating Firestore at path: ${firestorePath}`)
    
    const qrRef = doc(db, 'tenants', tenantId, 'branches', branch, 'settings', 'qrCodes');
    const currentSettings = await getQRCodeSettings(tenantId, branch);
    
    // Delete old QR code file if it exists
    if (currentSettings[type]?.fileName) {
      try {
        console.log(`🗑️ Deleting old QR file: ${currentSettings[type]!.fileName}`)
        const oldFileRef = ref(storage, `tenants/${tenantId}/branches/${branch}/qr-codes/${currentSettings[type]!.fileName}`);
        await deleteObject(oldFileRef);
        console.log(`✅ Old QR file deleted successfully`)
      } catch (deleteError) {
        console.warn('⚠️ Could not delete old QR file:', deleteError);
      }
    }
    
    const updatedSettings: QRCodeSettings = {
      ...currentSettings,
      [type]: {
        url: downloadURL,
        fileName: fileName,
        uploadedAt: new Date()
      },
      updatedAt: new Date(),
      updatedBy: userId
    };
    
    await setDoc(qrRef, updatedSettings);
    console.log(`✅ Firestore updated successfully`)
    
    console.log(`🎉 ${type.toUpperCase()} QR code upload process completed successfully for branch: ${branch}`);
    return downloadURL;
    
  } catch (error: any) {
    console.error(`❌ Error uploading ${type} QR code:`, error);
    
    // Provide more specific error information
    if (error?.code) {
      console.error(`🔴 Firebase Error Code: ${error.code}`);
    }
    
    if (error?.message) {
      console.error(`📝 Error Message: ${error.message}`);
    }
    
    // Re-throw with additional context
    const enhancedError = new Error(`Failed to upload ${type.toUpperCase()} QR code: ${error?.message || 'Unknown error'}`);
    enhancedError.name = 'QRUploadError';
    (enhancedError as any).originalError = error;
    (enhancedError as any).code = error?.code;
    
    throw enhancedError;
  }
};

/**
 * Remove QR code for specific branch
 */
export const removeQRCode = async (
  tenantId: string,
  type: 'gcash' | 'maya',
  userId: string,
  branchId?: string
): Promise<void> => {
  try {
    const branch = branchId || 'main'
    const qrRef = doc(db, 'tenants', tenantId, 'branches', branch, 'settings', 'qrCodes');
    const currentSettings = await getQRCodeSettings(tenantId, branch);
    
    // Delete file from storage if it exists
    if (currentSettings[type]?.fileName) {
      try {
        const fileRef = ref(storage, `tenants/${tenantId}/branches/${branch}/qr-codes/${currentSettings[type]!.fileName}`);
        await deleteObject(fileRef);
      } catch (deleteError) {
        console.warn('Could not delete QR file:', deleteError);
      }
    }
    
    // Update Firestore
    const updatedSettings: QRCodeSettings = {
      ...currentSettings,
      [type]: null,
      updatedAt: new Date(),
      updatedBy: userId
    };
    
    await setDoc(qrRef, updatedSettings);
    
    console.log(`✅ ${type.toUpperCase()} QR code removed successfully for branch: ${branch}`);
    
  } catch (error) {
    console.error(`Error removing ${type} QR code:`, error);
    throw error;
  }
};

/**
 * Subscribe to QR code settings changes for specific branch
 */
export const subscribeToQRCodeSettings = (
  tenantId: string,
  callback: (settings: QRCodeSettings) => void,
  branchId?: string
): Unsubscribe => {
  const branch = branchId || 'main'
  const qrRef = doc(db, 'tenants', tenantId, 'branches', branch, 'settings', 'qrCodes');
  
  return onSnapshot(qrRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      const settings: QRCodeSettings = {
        ...data,
        updatedAt: data.updatedAt?.toDate() || new Date(),
        gcash: data.gcash ? {
          ...data.gcash,
          uploadedAt: data.gcash.uploadedAt?.toDate() || new Date()
        } : null,
        maya: data.maya ? {
          ...data.maya,
          uploadedAt: data.maya.uploadedAt?.toDate() || new Date()
        } : null
      } as QRCodeSettings;
      callback(settings);
    } else {
      callback(DEFAULT_QR_SETTINGS);
    }
  }, (error) => {
    console.error('Error listening to QR code settings:', error);
    callback(DEFAULT_QR_SETTINGS);
  });
};

/**
 * Save QR code data directly (for manual entry) for specific branch
 */
export const saveQRCodeData = async (
  tenantId: string,
  type: 'gcash' | 'maya',
  qrData: string,
  userId: string,
  branchId?: string
): Promise<void> => {
  try {
    const branch = branchId || 'main'
    const qrRef = doc(db, 'tenants', tenantId, 'branches', branch, 'settings', 'qrCodes');
    const currentSettings = await getQRCodeSettings(tenantId, branch);
    
    const updatedSettings: QRCodeSettings = {
      ...currentSettings,
      [type]: {
        url: qrData,
        fileName: 'manual-entry',
        uploadedAt: new Date()
      },
      updatedAt: new Date(),
      updatedBy: userId
    };
    
    await setDoc(qrRef, updatedSettings);
    
    console.log(`✅ ${type.toUpperCase()} QR code data saved successfully for branch: ${branch}`);
    
  } catch (error) {
    console.error(`Error saving ${type} QR code data:`, error);
    throw error;
  }
};
