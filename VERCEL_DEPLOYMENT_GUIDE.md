# 🔐 VERCEL ENVIRONMENT VARIABLES CONFIGURATION

## Required Environment Variables for CoreTrack Deployment

**Copy these into Vercel Dashboard → Project Settings → Environment Variables:**

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyC4xvVR-nqhLNg5mM2tFMtPgFbmomqiEZw
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=coretrack-inventory.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=coretrack-inventory
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=coretrack-inventory.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=930028194991
NEXT_PUBLIC_FIREBASE_APP_ID=1:930028194991:web:9736a0b2471cbf98ced85a

# Demo Account Access
NEXT_PUBLIC_DEMO_EMAIL=demo@coretrack.dev
NEXT_PUBLIC_DEMO_PASSWORD=SecureDemo123!

# Security Settings
NEXT_PUBLIC_MAX_LOGIN_ATTEMPTS=5
NEXT_PUBLIC_LOCKOUT_DURATION=300000
NEXT_PUBLIC_SESSION_TIMEOUT=3600000

# Environment
NODE_ENV=production
NEXT_PUBLIC_APP_ENV=production
```

## 🎯 VERCEL DEPLOYMENT STEPS

### **1. Import Project**
- Go to [vercel.com](https://vercel.com)
- Sign in with GitHub
- Click "Add New" → "Project" 
- Import "Coretrack v3" repository

### **2. Configure Environment Variables**
- In Project Settings → Environment Variables
- Add each variable above (Name = Value)
- Set all to "Production" environment

### **3. Build Settings**
- Framework: Next.js
- Build Command: `npm run build`
- Output Directory: `.next` (default)
- Install Command: `npm install`

### **4. Deploy**
- Click "Deploy"
- Wait for build to complete (~3-5 minutes)

## ✅ Post-Deployment Checklist

1. **Test Authentication**: Try demo login (demo@coretrack.dev)
2. **Test Firebase**: Check if data loads properly
3. **Test Trial System**: Verify trial notifications work
4. **Test Responsive**: Check mobile/tablet layouts
5. **Test PWA**: Add to home screen functionality

## 🚨 If Build Fails

**Common issues:**
- Missing environment variables → Add all variables above
- Node version mismatch → Set Node version to 18.x in Vercel
- Build timeout → Check for infinite loops or heavy computations

## 🎉 Success!

Once deployed, you'll have:
- ✅ Production CoreTrack app
- ✅ Trial expiration system active
- ✅ Firebase authentication working
- ✅ PWA capabilities enabled
- ✅ All modules functional

**Your app will be available at: `https://your-project-name.vercel.app`**
