import { dataManager } from './DataPersistenceManager';

export interface AppData {
  menuItems: any[];
  inventoryItems: any[];
  posSettings: any;
  favorites: any[];
  modifiers: any[];
  orders: any[];
  customers: any[];
}

export class DataRestorationService {
  static restoreAllData(): void {
    console.log('🔄 Restoring CoreTrack data...');
    
    try {
      // Clean up any old backup data to prevent quota issues
      DataRestorationService.cleanupOldBackups();
      
      // Initialize default data if none exists
      dataManager.initializeDefaultData();
      
      // Create a backup of current state (but don't store it to avoid quota issues)
      const backup = dataManager.createBackup();
      console.log('✅ Data backup created');
      
      // Skip storing backup to localStorage to avoid quota exceeded error
      // const backupKey = `backup_${Date.now()}`;
      // localStorage.setItem(`coretrack_${backupKey}`, backup);
      
      console.log('✅ CoreTrack data restored successfully');
    } catch (error) {
      console.warn('⚠️ Data restoration encountered an issue:', error);
      // Continue without throwing to prevent app crash
    }
  }

  static cleanupOldBackups(): void {
    try {
      // Remove any existing backup keys to free up localStorage space
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('coretrack_backup_')) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log(`🗑️ Removed old backup: ${key}`);
      });
    } catch (error) {
      console.warn('⚠️ Error cleaning up old backups:', error);
    }
  }

  static exportData(): string {
    return dataManager.createBackup();
  }

  static importData(backupString: string): boolean {
    return dataManager.restoreFromBackup(backupString);
  }

  static getAllData(): AppData {
    return {
      menuItems: dataManager.getItem('menu_items', []) || [],
      inventoryItems: dataManager.getItem('inventory_items', []) || [],
      posSettings: dataManager.getItem('pos_settings', {}) || {},
      favorites: dataManager.getItem('favorites', []) || [],
      modifiers: dataManager.getItem('modifiers', []) || [],
      orders: dataManager.getItem('orders', []) || [],
      customers: dataManager.getItem('customers', []) || []
    };
  }

  static clearAllData(): void {
    const keys = Object.keys(localStorage).filter(key => key.startsWith('coretrack_'));
    keys.forEach(key => localStorage.removeItem(key));
    console.log('🗑️ All CoreTrack data cleared');
  }

  static getDataSummary(): any {
    const data = this.getAllData();
    return {
      menuItems: data.menuItems.length,
      inventoryItems: data.inventoryItems.length,
      favorites: data.favorites.length,
      orders: data.orders.length,
      customers: data.customers.length,
      lastBackup: localStorage.getItem('coretrack_last_backup_time')
    };
  }
}

// Auto-restore data on app load
if (typeof window !== 'undefined') {
  // Check if data exists, if not restore defaults
  const hasData = localStorage.getItem('coretrack_menu_items');
  if (!hasData) {
    DataRestorationService.restoreAllData();
  }
}
