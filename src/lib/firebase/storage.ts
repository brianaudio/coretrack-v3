import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject,
  uploadBytesResumable,
  UploadTaskSnapshot 
} from 'firebase/storage';
import { storage } from '../firebase';

export interface UploadProgress {
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  downloadURL?: string;
  error?: string;
}

// Upload product image with progress tracking
export const uploadProductImage = async (
  file: File,
  tenantId: string,
  productId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<string> => {
  try {
    // Validate file
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error('Image size must be less than 5MB');
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Only JPEG, PNG, and WebP images are allowed');
    }

    // Create unique filename
    const timestamp = Date.now();
    const fileName = `${productId}_${timestamp}.${file.type.split('/')[1]}`;
    const imagePath = `tenants/${tenantId}/products/${fileName}`;
    const imageRef = ref(storage, imagePath);

    // Upload with progress tracking
    const uploadTask = uploadBytesResumable(imageRef, file);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot: UploadTaskSnapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress?.({
            progress,
            status: 'uploading'
          });
        },
        (error) => {
          console.error('Upload error:', error);
          
          // Provide helpful error messages for common issues
          let errorMessage = error.message;
          if (error.message.includes('CORS') || error.code === 'storage/cors-not-allowed') {
            if (window.location.hostname === 'localhost') {
              errorMessage = 'Development Mode: Image upload blocked by CORS policy. This is normal in development and will work in production.';
            } else {
              errorMessage = 'Upload failed: CORS restrictions. Please contact support.';
            }
          } else if (error.code === 'storage/unauthorized') {
            errorMessage = 'Upload failed: You do not have permission to upload files.';
          } else if (error.code === 'storage/quota-exceeded') {
            errorMessage = 'Upload failed: Storage quota exceeded.';
          } else if (error.code === 'storage/network-request-failed') {
            if (window.location.hostname === 'localhost') {
              errorMessage = 'Development Mode: Network request failed. CORS restrictions prevent image uploads in development.';
            } else {
              errorMessage = 'Upload failed: Network error. Please check your connection and try again.';
            }
          }
          
          onProgress?.({
            progress: 0,
            status: 'error',
            error: errorMessage
          });
          reject(new Error(errorMessage));
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            onProgress?.({
              progress: 100,
              status: 'completed',
              downloadURL
            });
            resolve(downloadURL);
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  } catch (error) {
    throw error;
  }
};

// Delete product image
export const deleteProductImage = async (imageUrl: string): Promise<void> => {
  try {
    const imageRef = ref(storage, imageUrl);
    await deleteObject(imageRef);
  } catch (error) {
    console.error('Error deleting image:', error);
    // Don't throw error, just log it
  }
};

// Resize image before upload (client-side)
export const resizeImage = (file: File, maxWidth: number = 800, maxHeight: number = 600, quality: number = 0.8): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const resizedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            });
            resolve(resizedFile);
          } else {
            resolve(file);
          }
        },
        file.type,
        quality
      );
    };

    img.src = URL.createObjectURL(file);
  });
};
