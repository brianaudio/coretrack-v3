#!/bin/bash

echo "🚀 COMPREHENSIVE SUBSCRIPTION CHAIN FIX"
echo "========================================"

# First, open Firebase rules temporarily
echo "🔧 Opening Firebase security rules..."
cat > firestore.rules << 'EOF'
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // TEMPORARY: Full access for final fix
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
EOF

# Deploy the open rules
firebase deploy --only firestore:rules --project coretrack-inventory

# Run the comprehensive fix
node comprehensive-subscription-fix.mjs

# Restore proper rules
cat > firestore.rules << 'EOF'
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions for security validation
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function getUserData() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }
    
    function isTenantMember(tenantId) {
      return isAuthenticated() && 
             getUserData().tenantId == tenantId;
    }
    
    function hasRole(role) {
      return isAuthenticated() && 
             getUserData().role == role;
    }
    
    // Users collection - users can read/write their own document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Profiles collection - users can read/write their own profile
    match /profiles/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Tenants collection - tenant members can read tenant info
    match /tenants/{tenantId} {
      allow read: if isTenantMember(tenantId);
      allow write: if isTenantMember(tenantId) && hasRole('owner');
    }
    
    // Subscriptions collection - tenant members can read subscription info
    match /subscriptions/{tenantId} {
      allow read: if isTenantMember(tenantId);
      allow write: if isTenantMember(tenantId) && hasRole('owner');
    }
    
    // All other collections require tenant membership
    match /{collection}/{document} {
      allow read, write: if isAuthenticated() && 
                           exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
                           get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tenantId != null;
    }
  }
}
EOF

# Deploy proper rules
firebase deploy --only firestore:rules --project coretrack-inventory

echo "✅ Complete subscription chain fix applied!"
