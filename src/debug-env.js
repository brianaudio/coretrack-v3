/**
 * Environment Variables Debug - Check what Firebase config is actually loaded
 */

console.log('🔍 ENVIRONMENT VARIABLES DEBUG');
console.log('================================================================================');

console.log('📋 Next.js Environment Loading Order:');
console.log('   1. .env.local (highest priority)');
console.log('   2. .env.production, .env.development');
console.log('   3. .env');

console.log('\n📄 Current Firebase Environment Variables:');
console.log(`   PROJECT_ID: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'NOT SET'}`);
console.log(`   API_KEY: ${process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.substring(0, 10) || 'NOT SET'}...`);
console.log(`   AUTH_DOMAIN: ${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'NOT SET'}`);

console.log('\n🎯 Node Environment:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'NOT SET'}`);
console.log(`   APP_ENV: ${process.env.NEXT_PUBLIC_APP_ENV || 'NOT SET'}`);

if (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID === 'coretrack-inventory') {
  console.log('\n✅ Environment correctly configured for coretrack-inventory');
} else if (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID === 'coretrack-beta') {
  console.log('\n⚠️  Environment configured for BETA, not production!');
} else {
  console.log('\n❌ Environment configured for unknown project:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
}

console.log('\n================================================================================');
