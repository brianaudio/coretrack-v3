#!/bin/bash

# Deploy updated Firebase Security Rules
# This script deploys the enhanced Firestore rules with branch-level security

echo "🔧 Deploying Firebase Security Rules..."
echo "📋 This will deploy the updated rules with branch-level access controls"

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI is not installed"
    echo "📦 Install with: npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in
if ! firebase projects:list &> /dev/null; then
    echo "🔐 Please login to Firebase first:"
    echo "   firebase login"
    exit 1
fi

# Deploy only Firestore rules
echo "🚀 Deploying Firestore security rules..."
firebase deploy --only firestore:rules

if [ $? -eq 0 ]; then
    echo "✅ Firebase security rules deployed successfully!"
    echo ""
    echo "🛡️ New security features:"
    echo "   - Branch-level access control"
    echo "   - User role-based permissions"
    echo "   - Server-side data filtering"
    echo ""
    echo "⚠️  Note: Changes may take a few minutes to propagate globally"
else
    echo "❌ Failed to deploy Firebase security rules"
    echo "🔍 Check your Firebase project configuration and try again"
    exit 1
fi
