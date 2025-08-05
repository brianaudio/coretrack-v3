// Debug Subscription Plans - CommonJS version
const fs = require('fs');
const path = require('path');

// Read and parse the TypeScript file
const subscriptionFilePath = path.join(__dirname, 'src/lib/types/subscription.ts');
const fileContent = fs.readFileSync(subscriptionFilePath, 'utf8');

console.log('📊 ANALYZING SUBSCRIPTION PLANS FROM FILE:');
console.log('='.repeat(50));

// Extract pricing information using regex
const monthlyPriceRegex = /monthlyPrice:\s*(\d+)/g;
const yearlyPriceRegex = /yearlyPrice:\s*(\d+)/g;
const tierRegex = /tier:\s*'(\w+)'/g;
const planIdRegex = /id:\s*'(\w+)'/g;

let matches;
const plans = [];

// Extract plan information
const planBlocks = fileContent.split(/{\s*id:/);
planBlocks.slice(1).forEach((block, index) => {
  const fullBlock = 'id:' + block;
  
  const idMatch = fullBlock.match(/id:\s*'(\w+)'/);
  const nameMatch = fullBlock.match(/name:\s*'([^']+)'/);
  const tierMatch = fullBlock.match(/tier:\s*'(\w+)'/);
  const monthlyMatch = fullBlock.match(/monthlyPrice:\s*(\d+)/);
  const yearlyMatch = fullBlock.match(/yearlyPrice:\s*(\d+)/);
  const popularMatch = fullBlock.match(/popular:\s*true/);
  
  if (idMatch && nameMatch && tierMatch && monthlyMatch) {
    plans.push({
      id: idMatch[1],
      name: nameMatch[1],
      tier: tierMatch[1],
      monthlyPrice: parseInt(monthlyMatch[1]),
      yearlyPrice: yearlyMatch ? parseInt(yearlyMatch[1]) : null,
      popular: !!popularMatch
    });
  }
});

console.log(`Found ${plans.length} subscription plans:\n`);

plans.forEach((plan, index) => {
  console.log(`${index + 1}. ${plan.name.toUpperCase()} (${plan.tier})`);
  console.log(`   � Price: ₱${plan.monthlyPrice}/month`);
  if (plan.yearlyPrice) {
    console.log(`   📅 Yearly: ₱${plan.yearlyPrice}/year`);
  }
  console.log(`   🎯 Popular: ${plan.popular ? 'YES' : 'NO'}`);
  console.log(`   ${'─'.repeat(30)}`);
});

// Check if Professional tier has unlimited features
const professionalSection = fileContent.match(/tier:\s*'professional'[\s\S]*?limits:\s*{[\s\S]*?}/);
if (professionalSection) {
  console.log('\n� PROFESSIONAL TIER LIMITS:');
  console.log('='.repeat(30));
  
  const limitsSection = professionalSection[0].match(/limits:\s*{[\s\S]*}/);
  if (limitsSection) {
    const limits = limitsSection[0];
    
    const maxUsersMatch = limits.match(/maxUsers:\s*(-?\d+)/);
    const maxLocationsMatch = limits.match(/maxLocations:\s*(-?\d+)/);
    const maxProductsMatch = limits.match(/maxProducts:\s*(-?\d+)/);
    
    if (maxUsersMatch) {
      const users = maxUsersMatch[1] === '-1' ? 'UNLIMITED' : maxUsersMatch[1];
      console.log(`👥 Max Users: ${users}`);
    }
    
    if (maxLocationsMatch) {
      const locations = maxLocationsMatch[1] === '-1' ? 'UNLIMITED' : maxLocationsMatch[1];
      console.log(`📍 Max Locations: ${locations}`);
    }
    
    if (maxProductsMatch) {
      const products = maxProductsMatch[1] === '-1' ? 'UNLIMITED' : maxProductsMatch[1];
      console.log(`� Max Products: ${products}`);
    }
  }
}

console.log('\n✅ Analysis complete!');
