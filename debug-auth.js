// Simple script to test Firebase auth initialization
const { initializeApp } = require('firebase/app');
const { getAuth, connectAuthEmulator } = require('firebase/auth');

const firebaseConfig = {
  apiKey: "AIzaSyDO1JilPcCm2-p6smKxVhXa_7rcI4VDKK0",
  authDomain: "inventory-system-latest.firebaseapp.com",
  projectId: "inventory-system-latest",
  storageBucket: "inventory-system-latest.firebasestorage.app",
  messagingSenderId: "893699470433",
  appId: "1:893699470433:web:a5dcf242201b75c7eea620"
};

console.log('Testing Firebase Auth initialization...');

try {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  console.log('✅ Firebase Auth initialized successfully');
  console.log('Auth object:', auth);
} catch (error) {
  console.error('❌ Firebase Auth initialization failed:', error);
}
