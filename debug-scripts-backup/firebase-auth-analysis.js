// Firebase Auth Cleanup Script
// This script helps identify and clean up Firebase Auth accounts that are causing "email already in use" errors

import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

// Your Firebase config (same as in your main app)
const firebaseConfig = {
  apiKey: "AIzaSyDO1JilPcCm2-p6smKxVhXa_7rcI4VDKK0",
  authDomain: "inventory-system-latest.firebaseapp.com",
  projectId: "inventory-system-latest",
  storageBucket: "inventory-system-latest.firebasestorage.app",
  messagingSenderId: "893699470433",
  appId: "1:893699470433:web:a5dcf242201b75c7eea620"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

console.log('🔍 FIREBASE AUTH CLEANUP ANALYSIS');
console.log('=' .repeat(50));
console.log('Project ID:', firebaseConfig.projectId);
console.log('Auth Domain:', firebaseConfig.authDomain);
console.log('');

async function analyzeAuthVsFirestore() {
  try {
    console.log('📊 ANALYZING TEAM MEMBER DATA...');
    
    // Get all tenants
    const tenantsSnapshot = await getDocs(collection(db, 'tenants'));
    console.log(`Found ${tenantsSnapshot.size} tenants`);
    
    const allTeamMembers = [];
    
    for (const tenantDoc of tenantsSnapshot.docs) {
      const tenantId = tenantDoc.id;
      const tenantData = tenantDoc.data();
      const tenantName = tenantData.name || tenantData.businessName || 'Unknown';
      
      console.log(`\n🏢 Tenant: ${tenantName} (${tenantId})`);
      
      try {
        const teamMembersSnapshot = await getDocs(collection(db, `tenants/${tenantId}/teamMembers`));
        console.log(`  Team Members: ${teamMembersSnapshot.size}`);
        
        teamMembersSnapshot.docs.forEach(memberDoc => {
          const memberData = memberDoc.data();
          allTeamMembers.push({
            id: memberDoc.id,
            tenantId,
            tenantName,
            email: memberData.email,
            name: memberData.name,
            hasAuthAccount: memberData.hasAuthAccount,
            authUserId: memberData.authUserId,
            status: memberData.status
          });
          
          console.log(`    - ${memberData.name} (${memberData.email})`);
          console.log(`      Auth Account: ${memberData.hasAuthAccount ? '✅' : '❌'}`);
          console.log(`      Auth UID: ${memberData.authUserId || 'None'}`);
          console.log(`      Status: ${memberData.status}`);
        });
      } catch (error) {
        console.log(`  ❌ Error loading team members: ${error.message}`);
      }
    }
    
    console.log('\n' + '=' .repeat(50));
    console.log('📋 SUMMARY');
    console.log('=' .repeat(50));
    console.log(`Total Team Members: ${allTeamMembers.length}`);
    console.log(`Members with Auth Accounts: ${allTeamMembers.filter(m => m.hasAuthAccount).length}`);
    console.log(`Members with Auth UIDs: ${allTeamMembers.filter(m => m.authUserId).length}`);
    
    // Group by email to find potential duplicates
    const emailGroups = {};
    allTeamMembers.forEach(member => {
      const email = member.email.toLowerCase();
      if (!emailGroups[email]) {
        emailGroups[email] = [];
      }
      emailGroups[email].push(member);
    });
    
    console.log('\n📧 EMAIL ANALYSIS:');
    Object.entries(emailGroups).forEach(([email, members]) => {
      if (members.length > 1) {
        console.log(`❗ DUPLICATE: ${email} appears ${members.length} times`);
        members.forEach(member => {
          console.log(`   - ${member.tenantName}: ${member.name} (${member.status})`);
        });
      }
    });
    
    console.log('\n🔧 RECOMMENDED ACTIONS:');
    console.log('1. The "email already in use" errors occur because Firebase Auth accounts persist');
    console.log('2. Even after deleting Firestore data, the Auth accounts remain');
    console.log('3. You need to either:');
    console.log('   a) Delete the Firebase Auth accounts manually in Firebase Console');
    console.log('   b) Use different email addresses for testing');
    console.log('   c) Handle the "email already in use" error gracefully (which we already did)');
    
    console.log('\n🌐 FIREBASE CONSOLE LINKS:');
    console.log(`Authentication: https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/users`);
    console.log(`Firestore: https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore`);
    
    console.log('\n✅ SOLUTION STATUS:');
    console.log('The team management system already handles "email already in use" gracefully');
    console.log('This is the expected behavior for a production system');
    
  } catch (error) {
    console.error('❌ Analysis error:', error);
  }
}

// Run the analysis
analyzeAuthVsFirestore();
