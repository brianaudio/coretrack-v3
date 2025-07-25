import { addInventoryItem } from './inventory';

// Sample inventory items
const sampleInventoryItems = [
  {
    name: 'Burger Patties',
    category: 'Proteins',
    currentStock: 50,
    minStock: 20,
    unit: 'lbs',
    tenantId: ''
  },
  {
    name: 'French Fries',
    category: 'Sides', 
    currentStock: 8,
    minStock: 15,
    unit: 'lbs',
    tenantId: ''
  },
  {
    name: 'Burger Buns',
    category: 'Bread',
    currentStock: 5,
    minStock: 10,
    unit: 'packs',
    tenantId: ''
  },
  {
    name: 'Lettuce',
    category: 'Vegetables',
    currentStock: 25,
    minStock: 10,
    unit: 'heads',
    tenantId: ''
  },
  {
    name: 'Tomatoes',
    category: 'Vegetables',
    currentStock: 12,
    minStock: 8,
    unit: 'lbs',
    tenantId: ''
  },
  {
    name: 'Cheese Slices',
    category: 'Dairy',
    currentStock: 15,
    minStock: 10,
    unit: 'packs',
    tenantId: ''
  }
];

export const seedInventoryData = async (tenantId: string) => {
  console.log('Seeding inventory data for tenant:', tenantId);
  
  try {
    const promises = sampleInventoryItems.map(item => 
      addInventoryItem({
        ...item,
        tenantId
      })
    );
    
    await Promise.all(promises);
    console.log('Successfully seeded inventory data');
  } catch (error) {
    console.error('Error seeding inventory data:', error);
    throw error;
  }
};
