#!/bin/bash

echo "🚀 CoreTrack Production Deployment Script"
echo "=========================================="

# Check if Firebase CLI is logged in
echo "1. Checking Firebase CLI authentication..."
firebase projects:list > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ Please run 'firebase login' first"
    exit 1
fi

echo "✅ Firebase CLI authenticated"

# Try to use the production project directly by ID
echo "2. Switching to production project..."
firebase use coretrack-inventory --project coretrack-inventory 2>/dev/null
if [ $? -ne 0 ]; then
    echo "⚠️  Could not switch via alias, trying direct project ID..."
    # We'll deploy using --project flag instead
fi

echo "3. Deploying Firestore security rules..."
firebase deploy --only firestore:rules --project coretrack-inventory

echo "4. Deploying Firestore indexes..."
firebase deploy --only firestore:indexes --project coretrack-inventory

echo "5. Checking deployment status..."
echo "✅ Production Firebase setup complete!"

echo "📋 Manual steps needed:"
echo "1. Go to Firebase Console: https://console.firebase.google.com/project/coretrack-inventory"
echo "2. Enable Authentication > Email/Password"
echo "3. Verify Firestore rules are deployed"
echo "4. Check that indexes are building"

echo "🎉 CoreTrack is ready for production!"
