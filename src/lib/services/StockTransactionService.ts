'use client';

import { 
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  updateDoc,
  increment,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { inventoryCalculationService, InventoryItem, StockMovement, CalculationResult } from './InventoryCalculationService';
import { preciseAdd, preciseSubtract } from '../utils/precisionMath';

export interface TransactionResult {
  success: boolean;
  transactionId?: string;
  movements: StockMovement[];
  errors: string[];
  warnings: string[];
  rollbackData?: any;
}

export interface AuditLog {
  id?: string;
  transactionId: string;
  action: string;
  targetType: 'inventory' | 'stock_movement' | 'transaction';
  targetId: string;
  beforeData?: any;
  afterData?: any;
  userId: string;
  userEmail?: string;
  tenantId: string;
  locationId: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Stock Transaction Service
 * 
 * Provides atomic transactions for stock operations with
 * comprehensive audit logging and rollback capabilities.
 */
export class StockTransactionService {
  private static instance: StockTransactionService;
  
  static getInstance(): StockTransactionService {
    if (!this.instance) {
      this.instance = new StockTransactionService();
    }
    return this.instance;
  }

  /**
   * Generates a unique transaction ID
   */
  private generateTransactionId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Creates an audit log entry
   */
  private async createAuditLog(auditData: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
    try {
      await addDoc(collection(db, 'auditLogs'), {
        ...auditData,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
      // Don't fail the transaction for audit log errors
    }
  }

  /**
   * Executes a single stock movement with transaction safety
   */
  async executeSingleStockMovement(
    inventoryItemId: string,
    quantityChange: number,
    movementType: StockMovement['type'],
    userId: string,
    tenantId: string,
    locationId: string,
    options: {
      unitCost?: number;
      reason?: string;
      referenceId?: string;
      skipValidation?: boolean;
    } = {}
  ): Promise<TransactionResult> {
    const transactionId = this.generateTransactionId();
    const movements: StockMovement[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      return await runTransaction(db, async (transaction) => {
        // Get current inventory item
        const inventoryRef = doc(db, 'inventory', inventoryItemId);
        const inventorySnap = await transaction.get(inventoryRef);
        
        if (!inventorySnap.exists()) {
          throw new Error(`Inventory item not found: ${inventoryItemId}`);
        }
        
        const currentItem = {
          id: inventorySnap.id,
          ...inventorySnap.data()
        } as InventoryItem;
        
        // Validate tenant/location access
        if (currentItem.tenantId !== tenantId) {
          throw new Error('Access denied: Inventory item belongs to different tenant');
        }
        
        if (currentItem.locationId !== locationId) {
          throw new Error('Access denied: Inventory item belongs to different location');
        }
        
        // Calculate stock change
        const calculation = inventoryCalculationService.calculateStockChange(
          currentItem,
          quantityChange,
          movementType,
          options.unitCost,
          options.reason
        );
        
        if (!calculation.success && !options.skipValidation) {
          throw new Error(calculation.errors.join(', '));
        }
        
        warnings.push(...calculation.warnings);
        
        // Update inventory
        const updateData: any = {
          currentStock: calculation.newStock,
          lastUpdated: serverTimestamp()
        };
        
        // Update weighted average cost for purchases
        if (movementType === 'purchase' && options.unitCost && quantityChange > 0) {
          const { newCost } = inventoryCalculationService.calculateWeightedAverageCost(
            currentItem,
            quantityChange,
            options.unitCost
          );
          updateData.costPerUnit = newCost;
        }
        
        transaction.update(inventoryRef, updateData);
        
        // Create stock movement record
        if (calculation.movement) {
          const movementData = {
            ...calculation.movement,
            id: undefined, // Let Firestore generate ID
            transactionId,
            userId,
            referenceId: options.referenceId,
            timestamp: serverTimestamp()
          };
          
          const movementRef = doc(collection(db, 'stockMovements'));
          transaction.set(movementRef, movementData);
          
          movements.push({
            ...calculation.movement,
            id: movementRef.id,
            transactionId,
            userId,
            referenceId: options.referenceId
          });
        }
        
        // Create audit log
        await this.createAuditLog({
          transactionId,
          action: `stock_${movementType}`,
          targetType: 'inventory',
          targetId: inventoryItemId,
          beforeData: {
            currentStock: currentItem.currentStock,
            costPerUnit: currentItem.costPerUnit
          },
          afterData: {
            currentStock: calculation.newStock,
            costPerUnit: updateData.costPerUnit || currentItem.costPerUnit
          },
          userId,
          tenantId,
          locationId
        });
        
        return {
          success: true,
          transactionId,
          movements,
          errors,
          warnings
        };
      });
    } catch (error) {
      console.error('Stock transaction failed:', error);
      return {
        success: false,
        transactionId,
        movements: [],
        errors: [error instanceof Error ? error.message : 'Unknown transaction error'],
        warnings
      };
    }
  }

  /**
   * Executes multiple stock movements atomically
   */
  async executeBulkStockMovements(
    operations: Array<{
      inventoryItemId: string;
      quantityChange: number;
      movementType: StockMovement['type'];
      unitCost?: number;
      reason?: string;
      referenceId?: string;
    }>,
    userId: string,
    tenantId: string,
    locationId: string,
    options: {
      skipValidation?: boolean;
      continueOnWarnings?: boolean;
    } = {}
  ): Promise<TransactionResult> {
    const transactionId = this.generateTransactionId();
    const movements: StockMovement[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      return await runTransaction(db, async (transaction) => {
        const inventoryItems: InventoryItem[] = [];
        const calculations: CalculationResult[] = [];
        
        // Get all inventory items
        for (const operation of operations) {
          const inventoryRef = doc(db, 'inventory', operation.inventoryItemId);
          const inventorySnap = await transaction.get(inventoryRef);
          
          if (!inventorySnap.exists()) {
            throw new Error(`Inventory item not found: ${operation.inventoryItemId}`);
          }
          
          const currentItem = {
            id: inventorySnap.id,
            ...inventorySnap.data()
          } as InventoryItem;
          
          // Validate access
          if (currentItem.tenantId !== tenantId) {
            throw new Error(`Access denied: Item ${operation.inventoryItemId} belongs to different tenant`);
          }
          
          if (currentItem.locationId !== locationId) {
            throw new Error(`Access denied: Item ${operation.inventoryItemId} belongs to different location`);
          }
          
          inventoryItems.push(currentItem);
        }
        
        // Calculate all changes
        for (let i = 0; i < operations.length; i++) {
          const operation = operations[i];
          const currentItem = inventoryItems[i];
          
          const calculation = inventoryCalculationService.calculateStockChange(
            currentItem,
            operation.quantityChange,
            operation.movementType,
            operation.unitCost,
            operation.reason
          );
          
          calculations.push(calculation);
          warnings.push(...calculation.warnings);
          
          if (!calculation.success && !options.skipValidation) {
            errors.push(`${currentItem.name}: ${calculation.errors.join(', ')}`);
          }
        }
        
        // Check if we should proceed
        if (errors.length > 0) {
          throw new Error(errors.join('; '));
        }
        
        if (warnings.length > 0 && !options.continueOnWarnings) {
          throw new Error(`Validation warnings: ${warnings.join('; ')}`);
        }
        
        // Execute all updates
        for (let i = 0; i < operations.length; i++) {
          const operation = operations[i];
          const currentItem = inventoryItems[i];
          const calculation = calculations[i];
          
          // Update inventory
          const inventoryRef = doc(db, 'inventory', operation.inventoryItemId);
          const updateData: any = {
            currentStock: calculation.newStock,
            lastUpdated: serverTimestamp()
          };
          
          // Update weighted average cost for purchases
          if (operation.movementType === 'purchase' && operation.unitCost && operation.quantityChange > 0) {
            const { newCost } = inventoryCalculationService.calculateWeightedAverageCost(
              currentItem,
              operation.quantityChange,
              operation.unitCost
            );
            updateData.costPerUnit = newCost;
          }
          
          transaction.update(inventoryRef, updateData);
          
          // Create stock movement record
          if (calculation.movement) {
            const movementData = {
              ...calculation.movement,
              id: undefined,
              transactionId,
              userId,
              referenceId: operation.referenceId,
              timestamp: serverTimestamp()
            };
            
            const movementRef = doc(collection(db, 'stockMovements'));
            transaction.set(movementRef, movementData);
            
            movements.push({
              ...calculation.movement,
              id: movementRef.id,
              transactionId,
              userId,
              referenceId: operation.referenceId
            });
          }
          
          // Create audit log
          await this.createAuditLog({
            transactionId,
            action: `bulk_stock_${operation.movementType}`,
            targetType: 'inventory',
            targetId: operation.inventoryItemId,
            beforeData: {
              currentStock: currentItem.currentStock,
              costPerUnit: currentItem.costPerUnit
            },
            afterData: {
              currentStock: calculation.newStock,
              costPerUnit: updateData.costPerUnit || currentItem.costPerUnit
            },
            userId,
            tenantId,
            locationId
          });
        }
        
        return {
          success: true,
          transactionId,
          movements,
          errors,
          warnings
        };
      });
    } catch (error) {
      console.error('Bulk stock transaction failed:', error);
      return {
        success: false,
        transactionId,
        movements: [],
        errors: [error instanceof Error ? error.message : 'Unknown bulk transaction error'],
        warnings
      };
    }
  }

  /**
   * Processes POS order with inventory deductions
   */
  async processPOSOrder(
    orderId: string,
    orderItems: Array<{
      menuItemId: string;
      menuItemName: string;
      quantity: number;
      ingredients: Array<{
        inventoryItemId: string;
        inventoryItemName: string;
        quantity: number;
        unit: string;
      }>;
    }>,
    userId: string,
    tenantId: string,
    locationId: string
  ): Promise<TransactionResult> {
    const operations: Array<{
      inventoryItemId: string;
      quantityChange: number;
      movementType: StockMovement['type'];
      reason?: string;
      referenceId?: string;
    }> = [];
    
    // Convert order items to stock operations
    orderItems.forEach(orderItem => {
      orderItem.ingredients.forEach(ingredient => {
        const totalDeduction = preciseSubtract(0, ingredient.quantity * orderItem.quantity, 3);
        
        operations.push({
          inventoryItemId: ingredient.inventoryItemId,
          quantityChange: totalDeduction,
          movementType: 'sale',
          reason: `POS Sale: ${orderItem.menuItemName} (${orderItem.quantity}x)`,
          referenceId: orderId
        });
      });
    });
    
    return this.executeBulkStockMovements(
      operations,
      userId,
      tenantId,
      locationId,
      { skipValidation: false, continueOnWarnings: false }
    );
  }

  /**
   * Reverses a transaction (rollback)
   */
  async reverseTransaction(
    originalTransactionId: string,
    userId: string,
    reason: string
  ): Promise<TransactionResult> {
    try {
      // Get original movements
      const movementsQuery = query(
        collection(db, 'stockMovements'),
        where('transactionId', '==', originalTransactionId),
        orderBy('timestamp', 'asc')
      );
      
      const movementsSnap = await getDocs(movementsQuery);
      
      if (movementsSnap.empty) {
        return {
          success: false,
          movements: [],
          errors: ['Original transaction not found'],
          warnings: []
        };
      }
      
      const originalMovements = movementsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as StockMovement[];
      
      // Create reverse operations
      const reverseOperations = originalMovements.map(movement => ({
        inventoryItemId: movement.inventoryItemId,
        quantityChange: -movement.quantityChanged, // Reverse the change
        movementType: 'adjustment' as const,
        reason: `Reversal of transaction ${originalTransactionId}: ${reason}`,
        referenceId: originalTransactionId
      }));
      
      // Execute reverse transaction
      return this.executeBulkStockMovements(
        reverseOperations,
        userId,
        originalMovements[0].tenantId,
        originalMovements[0].locationId,
        { skipValidation: true, continueOnWarnings: true }
      );
    } catch (error) {
      console.error('Transaction reversal failed:', error);
      return {
        success: false,
        movements: [],
        errors: [error instanceof Error ? error.message : 'Unknown reversal error'],
        warnings: []
      };
    }
  }

  /**
   * Gets audit log for a transaction
   */
  async getTransactionAuditLog(transactionId: string): Promise<AuditLog[]> {
    try {
      const auditQuery = query(
        collection(db, 'auditLogs'),
        where('transactionId', '==', transactionId),
        orderBy('timestamp', 'asc')
      );
      
      const auditSnap = await getDocs(auditQuery);
      
      return auditSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: (doc.data().timestamp as Timestamp).toDate()
      })) as AuditLog[];
    } catch (error) {
      console.error('Failed to get audit log:', error);
      return [];
    }
  }

  /**
   * Gets recent stock movements for an item
   */
  async getRecentStockMovements(
    inventoryItemId: string,
    limitCount: number = 50
  ): Promise<StockMovement[]> {
    try {
      const movementsQuery = query(
        collection(db, 'stockMovements'),
        where('inventoryItemId', '==', inventoryItemId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      
      const movementsSnap = await getDocs(movementsQuery);
      
      return movementsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: (doc.data().timestamp as Timestamp).toDate()
      })) as StockMovement[];
    } catch (error) {
      console.error('Failed to get stock movements:', error);
      return [];
    }
  }
}

// Export singleton instance
export const stockTransactionService = StockTransactionService.getInstance();
