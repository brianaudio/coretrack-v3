/**
 * Enterprise Menu Builder Demo Data Seeder
 * Seeds comprehensive test data for all 3 phases of enterprise features
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, collection, addDoc, Timestamp } = require('firebase/firestore');

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyA6dJkX1aA3Uf8p3t3MlGhMZFBMLAgM7D8",
  authDomain: "inventory-system-latest.firebaseapp.com",
  projectId: "inventory-system-latest",
  storageBucket: "inventory-system-latest.firebasestorage.app",
  messagingSenderId: "909005851749",
  appId: "1:909005851749:web:50e5003949dd78e2f53a35"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const TENANT_ID = 'your-tenant-id'; // Replace with actual tenant ID

// 📊 PHASE 1: COMPREHENSIVE NUTRITION DATABASE
const nutritionDatabase = [
  {
    name: "Chicken Breast",
    category: "ingredient",
    nutritionPer100g: {
      calories: 165,
      protein: 31,
      carbs: 0,
      fat: 3.6,
      fiber: 0,
      sugar: 0,
      sodium: 74,
      cholesterol: 85,
      vitaminC: 0,
      calcium: 15,
      iron: 1
    },
    allergens: {
      contains: [],
      mayContain: [],
      processingFacility: ["soy"]
    },
    dietary: {
      isVegan: false,
      isVegetarian: false,
      isGlutenFree: true,
      isKeto: true,
      isPaleo: true,
      isDairyFree: true,
      isNutFree: true,
      isOrganic: false,
      isHalal: true,
      isKosher: true
    },
    costPer100g: 12.50,
    supplier: "Premium Poultry Co."
  },
  {
    name: "Quinoa",
    category: "ingredient",
    nutritionPer100g: {
      calories: 368,
      protein: 14.1,
      carbs: 64.2,
      fat: 6.1,
      fiber: 7,
      sugar: 4.9,
      sodium: 5,
      cholesterol: 0,
      vitaminC: 0,
      calcium: 47,
      iron: 4.6
    },
    allergens: {
      contains: [],
      mayContain: [],
      processingFacility: ["wheat", "soy"]
    },
    dietary: {
      isVegan: true,
      isVegetarian: true,
      isGlutenFree: true,
      isKeto: false,
      isPaleo: true,
      isDairyFree: true,
      isNutFree: true,
      isOrganic: true,
      isHalal: true,
      isKosher: true
    },
    costPer100g: 8.75,
    supplier: "Organic Grains Inc."
  },
  {
    name: "Avocado",
    category: "ingredient",
    nutritionPer100g: {
      calories: 160,
      protein: 2,
      carbs: 8.5,
      fat: 14.7,
      fiber: 6.7,
      sugar: 0.7,
      sodium: 7,
      cholesterol: 0,
      vitaminC: 10,
      calcium: 12,
      iron: 0.6
    },
    allergens: {
      contains: [],
      mayContain: [],
      processingFacility: []
    },
    dietary: {
      isVegan: true,
      isVegetarian: true,
      isGlutenFree: true,
      isKeto: true,
      isPaleo: true,
      isDairyFree: true,
      isNutFree: true,
      isOrganic: false,
      isHalal: true,
      isKosher: true
    },
    costPer100g: 15.00,
    supplier: "Fresh Produce LLC"
  },
  {
    name: "Almond Flour",
    category: "ingredient",
    nutritionPer100g: {
      calories: 571,
      protein: 21.2,
      carbs: 21.6,
      fat: 50,
      fiber: 11.8,
      sugar: 4.4,
      sodium: 1,
      cholesterol: 0,
      vitaminC: 0,
      calcium: 269,
      iron: 3.7
    },
    allergens: {
      contains: ["tree_nuts"],
      mayContain: ["peanuts"],
      processingFacility: ["peanuts", "soy"]
    },
    dietary: {
      isVegan: true,
      isVegetarian: true,
      isGlutenFree: true,
      isKeto: true,
      isPaleo: true,
      isDairyFree: true,
      isNutFree: false,
      isOrganic: true,
      isHalal: true,
      isKosher: true
    },
    costPer100g: 28.50,
    supplier: "Nutty Goodness Co."
  },
  {
    name: "Salmon Fillet",
    category: "ingredient",
    nutritionPer100g: {
      calories: 208,
      protein: 25.4,
      carbs: 0,
      fat: 12.4,
      fiber: 0,
      sugar: 0,
      sodium: 59,
      cholesterol: 55,
      vitaminC: 0,
      calcium: 9,
      iron: 0.3
    },
    allergens: {
      contains: ["fish"],
      mayContain: [],
      processingFacility: ["shellfish"]
    },
    dietary: {
      isVegan: false,
      isVegetarian: false,
      isGlutenFree: true,
      isKeto: true,
      isPaleo: true,
      isDairyFree: true,
      isNutFree: true,
      isOrganic: false,
      isHalal: false,
      isKosher: false
    },
    costPer100g: 35.00,
    supplier: "Ocean Fresh Seafood"
  }
];

// 🏷️ PHASE 3: HIERARCHICAL CATEGORIES
const menuCategories = [
  // Main Categories (Level 1)
  {
    name: "Mains",
    description: "Main course dishes",
    displayOrder: 1,
    isActive: true,
    hierarchy: {
      level: 1,
      childCategories: [],
      fullPath: "Mains"
    },
    styling: {
      color: "#3B82F6",
      icon: "🍽️",
      backgroundColor: "#EFF6FF",
      textColor: "#1E40AF"
    },
    rules: {
      maxItems: 50,
      requiresApproval: false,
      autoSort: true,
      defaultPreparationTime: 15
    },
    availability: {
      schedule: {
        monday: { start: "11:00", end: "22:00", available: true },
        tuesday: { start: "11:00", end: "22:00", available: true },
        wednesday: { start: "11:00", end: "22:00", available: true },
        thursday: { start: "11:00", end: "22:00", available: true },
        friday: { start: "11:00", end: "23:00", available: true },
        saturday: { start: "10:00", end: "23:00", available: true },
        sunday: { start: "10:00", end: "22:00", available: true }
      },
      seasonalAvailability: {
        seasons: ["spring", "summer", "fall", "winter"],
        autoActivate: true
      }
    }
  },
  {
    name: "Beverages",
    description: "Hot and cold beverages",
    displayOrder: 2,
    isActive: true,
    hierarchy: {
      level: 1,
      childCategories: [],
      fullPath: "Beverages"
    },
    styling: {
      color: "#10B981",
      icon: "🥤",
      backgroundColor: "#ECFDF5",
      textColor: "#047857"
    },
    rules: {
      maxItems: 30,
      requiresApproval: false,
      autoSort: false,
      defaultPreparationTime: 5
    }
  },
  
  // Sub Categories (Level 2)
  {
    name: "Grilled",
    description: "Grilled main dishes",
    displayOrder: 1,
    isActive: true,
    hierarchy: {
      level: 2,
      parentId: "", // Will be set after main category creation
      fullPath: "Mains > Grilled"
    },
    styling: {
      color: "#F59E0B",
      icon: "🔥",
      backgroundColor: "#FFFBEB",
      textColor: "#D97706"
    }
  },
  {
    name: "Salads",
    description: "Fresh salad options",
    displayOrder: 2,
    isActive: true,
    hierarchy: {
      level: 2,
      parentId: "", // Will be set after main category creation
      fullPath: "Mains > Salads"
    },
    styling: {
      color: "#22C55E",
      icon: "🥗",
      backgroundColor: "#F0FDF4",
      textColor: "#15803D"
    }
  },
  {
    name: "Hot Drinks",
    description: "Coffee, tea, and hot beverages",
    displayOrder: 1,
    isActive: true,
    hierarchy: {
      level: 2,
      parentId: "", // Will be set after beverage category creation
      fullPath: "Beverages > Hot Drinks"
    },
    styling: {
      color: "#8B5CF6",
      icon: "☕",
      backgroundColor: "#F5F3FF",
      textColor: "#7C3AED"
    }
  }
];

// 💰 ENTERPRISE MENU ITEMS WITH ALL PHASES
const enterpriseMenuItems = [
  {
    name: "Grilled Quinoa Power Bowl",
    description: "Nutrient-dense quinoa bowl with grilled chicken, avocado, and seasonal vegetables",
    category: "Mains",
    price: 285,
    ingredients: [
      { inventoryItemId: "quinoa-001", inventoryItemName: "Quinoa", quantity: 80, unit: "g", cost: 7.00 },
      { inventoryItemId: "chicken-001", inventoryItemName: "Chicken Breast", quantity: 120, unit: "g", cost: 15.00 },
      { inventoryItemId: "avocado-001", inventoryItemName: "Avocado", quantity: 50, unit: "g", cost: 7.50 }
    ],
    preparationTime: 12,
    allergens: [],
    emoji: "🥗",
    
    // 📊 PHASE 1: COMPREHENSIVE NUTRITION
    nutrition: {
      calories: 445,
      protein: 42.5,
      carbs: 31.4,
      fat: 16.85,
      fiber: 8.35,
      sugar: 2.32,
      sodium: 43,
      cholesterol: 85,
      vitaminC: 5,
      calcium: 66.5,
      iron: 3.28
    },
    allergenInfo: {
      contains: [],
      mayContain: ["soy"],
      freeFrom: ["milk", "eggs", "peanuts", "tree_nuts", "wheat", "fish", "shellfish", "sesame"],
      severity: "mild"
    },
    dietaryLabels: {
      isVegan: false,
      isVegetarian: false,
      isGlutenFree: true,
      isKeto: false,
      isPaleo: true,
      isDairyFree: true,
      isNutFree: true,
      isLowCarb: false,
      isLowSodium: true,
      isOrganic: true,
      isHalal: true,
      isKosher: true
    },
    portionSizes: [
      { id: "small", name: "Small", size: 0.8, priceMultiplier: 0.85, nutritionMultiplier: 0.8, description: "Lighter portion" },
      { id: "regular", name: "Regular", size: 1.0, priceMultiplier: 1.0, nutritionMultiplier: 1.0, description: "Standard portion" },
      { id: "large", name: "Large", size: 1.3, priceMultiplier: 1.25, nutritionMultiplier: 1.3, description: "Hearty portion" }
    ],
    
    // 💰 PHASE 2: ADVANCED PRICING
    pricing: {
      baseCost: 29.50,
      laborCost: 4.00,
      overheadCost: 4.43,
      totalCost: 37.93,
      targetMargin: 67,
      suggestedPrice: 285,
      competitorPrice: 320,
      dynamicPricing: {
        enabled: true,
        peakHours: { start: "12:00", end: "14:00", multiplier: 1.1 },
        offPeakDiscount: { start: "15:00", end: "17:00", multiplier: 0.95 },
        demandBased: { enabled: true, highDemandMultiplier: 1.15, lowDemandMultiplier: 0.9 }
      },
      locationPricing: {
        "main-location": { price: 285, cost: 37.93, margin: 67, reason: "Base location pricing" },
        "premium-location": { price: 320, cost: 40.85, margin: 69, reason: "Premium location with higher rent" }
      }
    },
    profitAnalysis: {
      dailyVolume: 8,
      weeklyRevenue: 15960,
      monthlyRevenue: 69120,
      profitPerItem: 247.07,
      contribution: 12.5,
      lastUpdated: Timestamp.now()
    },
    
    // 🏷️ PHASE 3: ENHANCED CATEGORIZATION
    categoryHierarchy: {
      mainCategory: "Mains",
      subCategory: "Salads",
      subSubCategory: "Power Bowls",
      tags: ["healthy", "protein-rich", "gluten-free", "signature"]
    },
    menuScheduling: {
      availability: {
        monday: { start: "11:00", end: "21:00", available: true },
        tuesday: { start: "11:00", end: "21:00", available: true },
        wednesday: { start: "11:00", end: "21:00", available: true },
        thursday: { start: "11:00", end: "21:00", available: true },
        friday: { start: "11:00", end: "22:00", available: true },
        saturday: { start: "10:00", end: "22:00", available: true },
        sunday: { start: "10:00", end: "21:00", available: true }
      },
      seasonalAvailability: {
        seasons: ["spring", "summer", "fall", "winter"],
        autoActivate: true
      },
      specialEvents: [
        {
          eventName: "Healthy Eating Week",
          startDate: Timestamp.fromDate(new Date('2024-03-01')),
          endDate: Timestamp.fromDate(new Date('2024-03-07')),
          specialPrice: 255
        }
      ]
    },
    templateInfo: {
      isTemplateItem: false,
      templatePriority: 0
    },
    
    // Standard fields
    status: "active",
    isPopular: true,
    displayOrder: 1,
    tenantId: TENANT_ID
  },
  
  {
    name: "Keto Almond Crusted Salmon",
    description: "Premium salmon fillet with almond crust, served with cauliflower rice",
    category: "Mains",
    price: 450,
    ingredients: [
      { inventoryItemId: "salmon-001", inventoryItemName: "Salmon Fillet", quantity: 150, unit: "g", cost: 52.50 },
      { inventoryItemId: "almond-flour-001", inventoryItemName: "Almond Flour", quantity: 25, unit: "g", cost: 7.13 }
    ],
    preparationTime: 18,
    allergens: ["fish", "tree_nuts"],
    emoji: "🐟",
    
    // 📊 PHASE 1: NUTRITION
    nutrition: {
      calories: 454,
      protein: 43.4,
      carbs: 5.4,
      fat: 31.1,
      fiber: 2.95,
      sugar: 1.1,
      sodium: 89,
      cholesterol: 82,
      vitaminC: 0,
      calcium: 80.5,
      iron: 1.4
    },
    allergenInfo: {
      contains: ["fish", "tree_nuts"],
      mayContain: ["peanuts"],
      freeFrom: ["milk", "eggs", "soy", "wheat", "shellfish", "sesame"],
      severity: "moderate"
    },
    dietaryLabels: {
      isVegan: false,
      isVegetarian: false,
      isGlutenFree: true,
      isKeto: true,
      isPaleo: true,
      isDairyFree: true,
      isNutFree: false,
      isLowCarb: true,
      isLowSodium: false,
      isOrganic: true,
      isHalal: false,
      isKosher: false
    },
    
    // 💰 PHASE 2: PREMIUM PRICING
    pricing: {
      baseCost: 59.63,
      laborCost: 6.00,
      overheadCost: 8.94,
      totalCost: 74.57,
      targetMargin: 72,
      suggestedPrice: 450,
      competitorPrice: 520,
      dynamicPricing: {
        enabled: true,
        peakHours: { start: "19:00", end: "21:00", multiplier: 1.15 },
        demandBased: { enabled: true, highDemandMultiplier: 1.2, lowDemandMultiplier: 0.95 }
      }
    },
    
    // 🏷️ PHASE 3: PREMIUM CATEGORIZATION
    categoryHierarchy: {
      mainCategory: "Mains",
      subCategory: "Grilled",
      subSubCategory: "Premium Seafood",
      tags: ["keto", "premium", "low-carb", "signature", "chef-special"]
    },
    
    status: "active",
    isPopular: true,
    displayOrder: 2,
    tenantId: TENANT_ID
  }
];

// 🏷️ PHASE 3: MENU TEMPLATES
const menuTemplates = [
  {
    name: "Healthy Lunch Special",
    description: "Nutritious lunch options for health-conscious customers",
    config: {
      type: "scheduled",
      isActive: false,
      priority: 1
    },
    schedule: {
      dailySchedule: {
        monday: { start: "11:00", end: "15:00", enabled: true },
        tuesday: { start: "11:00", end: "15:00", enabled: true },
        wednesday: { start: "11:00", end: "15:00", enabled: true },
        thursday: { start: "11:00", end: "15:00", enabled: true },
        friday: { start: "11:00", end: "15:00", enabled: true },
        saturday: { start: "11:00", end: "15:00", enabled: false },
        sunday: { start: "11:00", end: "15:00", enabled: false }
      },
      autoActivation: true
    },
    locations: ["main-location"],
    items: [
      {
        categoryId: "mains-salads",
        menuItemIds: ["quinoa-power-bowl"],
        displayOrder: 1,
        specialPricing: {
          discountPercentage: 10,
          specialPrice: 256
        }
      }
    ],
    analytics: {
      timesUsed: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      popularItems: [],
      lastUsed: Timestamp.now()
    },
    tenantId: TENANT_ID
  },
  
  {
    name: "Weekend Premium Menu",
    description: "Premium dishes for weekend dining experience",
    config: {
      type: "scheduled",
      isActive: false,
      priority: 2
    },
    schedule: {
      dailySchedule: {
        monday: { start: "00:00", end: "23:59", enabled: false },
        tuesday: { start: "00:00", end: "23:59", enabled: false },
        wednesday: { start: "00:00", end: "23:59", enabled: false },
        thursday: { start: "00:00", end: "23:59", enabled: false },
        friday: { start: "18:00", end: "23:00", enabled: true },
        saturday: { start: "12:00", end: "23:00", enabled: true },
        sunday: { start: "12:00", end: "22:00", enabled: true }
      },
      autoActivation: true
    },
    locations: ["main-location", "premium-location"],
    items: [
      {
        categoryId: "mains-grilled",
        menuItemIds: ["keto-salmon"],
        displayOrder: 1,
        specialPricing: {
          discountPercentage: 0,
          specialPrice: 480
        }
      }
    ],
    analytics: {
      timesUsed: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      popularItems: [],
      lastUsed: Timestamp.now()
    },
    tenantId: TENANT_ID
  }
];

async function seedEnterpriseData() {
  console.log('🌱 Starting Enterprise Menu Builder data seeding...');
  
  try {
    // 📊 PHASE 1: Seed Nutrition Database
    console.log('📊 Seeding nutrition database...');
    for (const nutrition of nutritionDatabase) {
      const nutritionRef = collection(db, `tenants/${TENANT_ID}/nutritionDatabase`);
      await addDoc(nutritionRef, {
        ...nutrition,
        lastUpdated: Timestamp.now()
      });
    }
    console.log(`✅ Created ${nutritionDatabase.length} nutrition entries`);
    
    // 🏷️ PHASE 3: Seed Hierarchical Categories
    console.log('🏷️ Seeding hierarchical categories...');
    const categoryIds = {};
    
    // First create main categories
    for (const category of menuCategories.filter(c => c.hierarchy?.level === 1)) {
      const categoryRef = collection(db, `tenants/${TENANT_ID}/menuCategories`);
      const docRef = await addDoc(categoryRef, {
        ...category,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      categoryIds[category.name.toLowerCase()] = docRef.id;
    }
    
    // Then create subcategories with parent references
    for (const category of menuCategories.filter(c => c.hierarchy?.level === 2)) {
      const parentName = category.hierarchy.fullPath.split(' > ')[0].toLowerCase();
      const parentId = categoryIds[parentName];
      
      if (parentId) {
        const categoryRef = collection(db, `tenants/${TENANT_ID}/menuCategories`);
        const docRef = await addDoc(categoryRef, {
          ...category,
          hierarchy: {
            ...category.hierarchy,
            parentId: parentId
          },
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
        categoryIds[category.name.toLowerCase()] = docRef.id;
      }
    }
    console.log(`✅ Created ${menuCategories.length} hierarchical categories`);
    
    // 💰 Seed Enterprise Menu Items
    console.log('💰 Seeding enterprise menu items...');
    const menuItemIds = {};
    
    for (const item of enterpriseMenuItems) {
      const itemRef = collection(db, `tenants/${TENANT_ID}/menuItems`);
      const docRef = await addDoc(itemRef, {
        ...item,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      menuItemIds[item.name.toLowerCase().replace(/\\s+/g, '-')] = docRef.id;
    }
    console.log(`✅ Created ${enterpriseMenuItems.length} enterprise menu items`);
    
    // 🏷️ PHASE 3: Seed Menu Templates
    console.log('🏷️ Seeding menu templates...');
    for (const template of menuTemplates) {
      const templateRef = collection(db, `tenants/${TENANT_ID}/menuTemplates`);
      await addDoc(templateRef, {
        ...template,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
    }
    console.log(`✅ Created ${menuTemplates.length} menu templates`);
    
    console.log('🎉 Enterprise Menu Builder data seeding completed successfully!');
    console.log('');
    console.log('📋 Summary:');
    console.log(`   📊 Nutrition entries: ${nutritionDatabase.length}`);
    console.log(`   🏷️ Hierarchical categories: ${menuCategories.length}`);
    console.log(`   💰 Enterprise menu items: ${enterpriseMenuItems.length}`);
    console.log(`   🏷️ Menu templates: ${menuTemplates.length}`);
    console.log('');
    console.log('🔧 Next steps:');
    console.log('   1. Update TENANT_ID in this script with your actual tenant ID');
    console.log('   2. Run: node enterprise-menu-seeder.js');
    console.log('   3. Open Enterprise Menu Builder to see all features');
    console.log('   4. Test nutrition auto-calculation, dynamic pricing, and templates');
    
  } catch (error) {
    console.error('❌ Error seeding enterprise data:', error);
  }
}

// Run the seeder
if (require.main === module) {
  seedEnterpriseData().then(() => process.exit(0));
}

module.exports = { seedEnterpriseData };
