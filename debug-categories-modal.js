// Debug Categories in Modal Script
const admin = require('firebase-admin');
const readline = require('readline');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      "type": "service_account",
      "project_id": "coretrack-v3",
      "private_key_id": "b7c4d8a9e5f2a1b3c4d5e6f7g8h9i0j1k2l3m4n5",
      "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCyVsJ7vW3mK8xL\n3qR5nM9pQ2sT8vU1yX4zA7bC3dE5fF6gH7iI9jJ0kL1mN2oO3pP4qQ5rR6sS7tT8\nuU9vV0wW1xX2yY3zA4bB5cC6dD7eE8fF9gG0hH1iI2jJ3kK4lL5mM6nN7oO8pP9q\nQ0rR1sS2tT3uU4vV5wW6xX7yY8zA9bA0cB1dC2eD3fE4gF5hG6iH7jI8kJ9lK0m\nL1nM2oN3pO4qP5rQ6sR7tS8uT9vU0wV1xW2yX3zA4bB5cC6dD7eE8fF9gG0hH1i\nI2jJ3kK4lL5mM6nN7oO8pP9qQ0rR1sS2tT3uU4vV5wW6xX7yY8zA9bA0cB1dC2e\nD3fE4gF5hG6iH7jI8kJ9lK0mL1nM2oN3pO4qP5rQ6sR7tS8uT9vU0wV1xW2yX3z\nAgMBAAECggEAQR5pZ8w7yR2oB1tQ6sN5mL8xK9vU3wV0yX1zA2bB3cC4dD5eE6f\nF7gG8hH9iI0jJ1kK2lL3mM4nN5oO6pP7qQ8rR9sS0tT1uU2vV3wW4xX5yY6zA7b\nA8cB9dC0eD1fE2gF3hG4iH5jI6kJ7lK8mL9nM0oN1pO2qP3rQ4sR5tS6uT7vU8w\nV9xW0yX1zA2bB3cC4dD5eE6fF7gG8hH9iI0jJ1kK2lL3mM4nN5oO6pP7qQ8rR9s\nS0tT1uU2vV3wW4xX5yY6zA7bA8cB9dC0eD1fE2gF3hG4iH5jI6kJ7lK8mL9nM0o\nN1pO2qP3rQ4sR5tS6uT7vU8wV9xW0yX1zA2bB3cC4dD5eE6fF7gG8hH9iI0jJ1k\nQKBgQDjR5vU8wV9xW0yX1zA2bB3cC4dD5eE6fF7gG8hH9iI0jJ1kK2lL3mM4nN\n5oO6pP7qQ8rR9sS0tT1uU2vV3wW4xX5yY6zA7bA8cB9dC0eD1fE2gF3hG4iH5j\nI6kJ7lK8mL9nM0oN1pO2qP3rQ4sR5tS6uT7vU8wV9xW0yX1zA2bB3cC4dD5eE6f\nF7gG8hH9iI0jJ1kK2lL3mM4nN5oO6pP7qQ8rR9sS0tT1uU2vV3wW4xX5yY6zA7b\nA8cB9dC0eD1fE2gF3hG4iH5jI6kJ7lK8mL9nM0oN1pO2qP3rQ4sR5tS6uT7vU8w\nV9xW0yX1zA2bB3cC4dD5eE6fF7gG8hH9iI0jJ1kK2lL3mM4nN5oO6pP7qQ8rR9s\nS0tT1uU2vV3wW4xX5yY6zA7bA8cB9dC0eD1fE2gF3hG4iH5jI6kJ7lK8mL9nM0o\nN1pO2qP3rQ4sR5tS6uT7vU8wV9xW0yX1zA2bB3cC4dD5eE6fF7gG8hH9iI0jJ1k\nQKBgEwV9xW0yX1zA2bB3cC4dD5eE6fF7gG8hH9iI0jJ1kK2lL3mM4nN5oO6pP7\n-----END PRIVATE KEY-----\n",
      "client_email": "firebase-adminsdk-h9p8q@coretrack-v3.iam.gserviceaccount.com",
      "client_id": "123456789012345678901",
      "auth_uri": "https://accounts.google.com/o/oauth2/auth",
      "token_uri": "https://oauth2.googleapis.com/token"
    })
  });
}

const db = admin.firestore();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function debugCategoriesForModal() {
  try {
    console.log('🔍 Debugging Categories in Modal');
    
    rl.question('Enter tenantId: ', async (tenantId) => {
      rl.question('Enter branchId (e.g., branch_1): ', async (branchId) => {
        try {
          const locationId = `location_${branchId}`;
          console.log(`\n📍 Checking categories for: ${locationId}`);
          
          // Get categories directly from Firestore
          const categoriesRef = db.collection('menuCategories');
          const categoriesSnapshot = await categoriesRef
            .where('tenantId', '==', tenantId)
            .where('locationId', '==', locationId)
            .get();
          
          console.log(`📊 Found ${categoriesSnapshot.docs.length} categories in database`);
          
          const allCategories = [];
          categoriesSnapshot.docs.forEach(doc => {
            const data = doc.data();
            allCategories.push({
              id: doc.id,
              name: data.name,
              isActive: data.isActive,
              locationId: data.locationId,
              tenantId: data.tenantId
            });
          });
          
          console.log('\n📋 All Categories:');
          allCategories.forEach((cat, index) => {
            console.log(`  ${index + 1}. ${cat.name}`);
            console.log(`     - Active: ${cat.isActive}`);
            console.log(`     - Location: ${cat.locationId}`);
            console.log(`     - Tenant: ${cat.tenantId}`);
            console.log();
          });
          
          // Filter active categories (what modal should show)
          const activeCategories = allCategories.filter(cat => cat.isActive);
          console.log(`🟢 Active Categories (${activeCategories.length}):`);
          activeCategories.forEach((cat, index) => {
            console.log(`  ${index + 1}. ${cat.name} (ID: ${cat.id})`);
          });
          
          if (activeCategories.length === 0) {
            console.log('\n⚠️  NO ACTIVE CATEGORIES FOUND!');
            console.log('This is why the dropdown is empty.');
            
            // Check if there are inactive categories
            const inactiveCategories = allCategories.filter(cat => !cat.isActive);
            if (inactiveCategories.length > 0) {
              console.log(`\n❌ Found ${inactiveCategories.length} INACTIVE categories:`);
              inactiveCategories.forEach((cat, index) => {
                console.log(`  ${index + 1}. ${cat.name} (INACTIVE)`);
              });
              
              console.log('\n🔧 FIX: Activate some categories or create default ones');
            }
          }
          
        } catch (error) {
          console.error('❌ Error:', error);
        }
        
        rl.close();
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    rl.close();
    process.exit(1);
  }
}

debugCategoriesForModal();
