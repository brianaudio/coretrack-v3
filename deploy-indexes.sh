#!/bin/bash

# Deploy Firebase Firestore indexes
echo "🔥 Deploying Firebase Firestore indexes..."

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI is not installed. Please install it first:"
    echo "npm install -g firebase-tools"
    exit 1
fi

# Check if logged in
if ! firebase projects:list &> /dev/null; then
    echo "❌ Not logged in to Firebase. Please run: firebase login"
    exit 1
fi

# Deploy indexes
echo "📋 Deploying Firestore indexes..."
firebase deploy --only firestore:indexes

if [ $? -eq 0 ]; then
    echo "✅ Firebase indexes deployed successfully!"
    echo "📊 Analytics dashboard will be available in 2-5 minutes."
    echo ""
    echo "You can monitor the index creation progress at:"
    echo "https://console.firebase.google.com/v1/r/project/inventory-system-latest/firestore/indexes"
else
    echo "❌ Failed to deploy Firebase indexes."
    echo "Please check your Firebase configuration and try again."
    exit 1
fi
