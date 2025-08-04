// Enhanced localStorage with data persistence and recovery
export class DataPersistenceManager {
  private static instance: DataPersistenceManager;
  private readonly storagePrefix = 'coretrack_';

  static getInstance(): DataPersistenceManager {
    if (!DataPersistenceManager.instance) {
      DataPersistenceManager.instance = new DataPersistenceManager();
    }
    return DataPersistenceManager.instance;
  }

  // Enhanced localStorage with error handling and data recovery
  setItem<T>(key: string, value: T): boolean {
    try {
      const serializedValue = JSON.stringify({
        data: value,
        timestamp: Date.now(),
        version: '1.0'
      });
      localStorage.setItem(`${this.storagePrefix}${key}`, serializedValue);
      return true;
    } catch (error) {
      console.error(`Failed to save ${key} to localStorage:`, error);
      return false;
    }
  }

  getItem<T>(key: string, defaultValue?: T): T | null {
    try {
      const item = localStorage.getItem(`${this.storagePrefix}${key}`);
      if (!item) return defaultValue || null;
      
      const parsed = JSON.parse(item);
      return parsed.data;
    } catch (error) {
      console.error(`Failed to load ${key} from localStorage:`, error);
      return defaultValue || null;
    }
  }

  removeItem(key: string): void {
    localStorage.removeItem(`${this.storagePrefix}${key}`);
  }

  // Backup all CoreTrack data
  createBackup(): string {
    const backup: any = {};
    const keys = Object.keys(localStorage).filter(key => key.startsWith(this.storagePrefix));
    
    keys.forEach(key => {
      backup[key] = localStorage.getItem(key);
    });

    return JSON.stringify({
      backup,
      created: new Date().toISOString(),
      version: '1.0'
    });
  }

  // Restore from backup
  restoreFromBackup(backupString: string): boolean {
    try {
      const backupData = JSON.parse(backupString);
      Object.entries(backupData.backup).forEach(([key, value]) => {
        localStorage.setItem(key, value as string);
      });
      return true;
    } catch (error) {
      console.error('Failed to restore backup:', error);
      return false;
    }
  }

  // Initialize default data if none exists
  initializeDefaultData(): void {
    // Default menu items - start with empty array
    if (!this.getItem('menu_items')) {
      this.setItem('menu_items', []);
    }

    // Default inventory items
    if (!this.getItem('inventory_items')) {
      this.setItem('inventory_items', this.getDefaultInventoryItems());
    }

    // Default POS settings
    if (!this.getItem('pos_settings')) {
      this.setItem('pos_settings', this.getDefaultPOSSettings());
    }
  }

  private getDefaultInventoryItems() {
    return [
      {
        id: '1',
        name: 'Beef Patty',
        category: 'Meat',
        currentStock: 50,
        minStock: 10,
        maxStock: 100,
        unit: 'pieces',
        costPerUnit: 80,
        supplier: 'Local Meat Supplier',
        lastUpdated: new Date().toISOString(),
        reorderPoint: 15
      },
      {
        id: '2',
        name: 'Chicken Breast',
        category: 'Meat',
        currentStock: 25,
        minStock: 5,
        maxStock: 50,
        unit: 'kg',
        costPerUnit: 280,
        supplier: 'Fresh Poultry Co.',
        lastUpdated: new Date().toISOString(),
        reorderPoint: 8
      },
      {
        id: '3',
        name: 'Fish Fillet',
        category: 'Seafood',
        currentStock: 15,
        minStock: 3,
        maxStock: 30,
        unit: 'kg',
        costPerUnit: 450,
        supplier: 'Ocean Fresh Seafood',
        lastUpdated: new Date().toISOString(),
        reorderPoint: 5
      },
      {
        id: '4',
        name: 'Burger Buns',
        category: 'Bakery',
        currentStock: 80,
        minStock: 20,
        maxStock: 150,
        unit: 'pieces',
        costPerUnit: 15,
        supplier: 'Daily Bread Bakery',
        lastUpdated: new Date().toISOString(),
        reorderPoint: 25
      },
      {
        id: '5',
        name: 'Cheese Slices',
        category: 'Dairy',
        currentStock: 100,
        minStock: 20,
        maxStock: 200,
        unit: 'slices',
        costPerUnit: 20,
        supplier: 'Dairy Fresh Ltd.',
        lastUpdated: new Date().toISOString(),
        reorderPoint: 30
      },
      {
        id: '6',
        name: 'Mixed Greens',
        category: 'Vegetables',
        currentStock: 12,
        minStock: 2,
        maxStock: 25,
        unit: 'kg',
        costPerUnit: 85,
        supplier: 'Green Valley Farms',
        lastUpdated: new Date().toISOString(),
        reorderPoint: 4
      },
      {
        id: '7',
        name: 'Rice',
        category: 'Grains',
        currentStock: 45,
        minStock: 10,
        maxStock: 100,
        unit: 'kg',
        costPerUnit: 45,
        supplier: 'Golden Rice Mills',
        lastUpdated: new Date().toISOString(),
        reorderPoint: 15
      },
      {
        id: '8',
        name: 'Cooking Oil',
        category: 'Condiments',
        currentStock: 8,
        minStock: 2,
        maxStock: 20,
        unit: 'L',
        costPerUnit: 85,
        supplier: 'Quality Oil Co.',
        lastUpdated: new Date().toISOString(),
        reorderPoint: 3
      }
    ];
  }

  private getDefaultPOSSettings() {
    return {
      tax_rate: 0,
      currency: 'PHP',
      receipt_footer: 'Thank you for your business!',
      payment_methods: ['Cash', 'Card', 'GCash', 'PayMaya'],
      default_payment_method: 'Cash'
    };
  }
}

export const dataManager = DataPersistenceManager.getInstance();
