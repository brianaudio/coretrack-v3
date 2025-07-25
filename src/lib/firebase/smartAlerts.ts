import { Timestamp } from 'firebase/firestore';
import { 
  getInventoryItems, 
  getRecentInventoryMovements, 
  type InventoryItem 
} from './inventory';
import { 
  createNotification, 
  getNotificationSettings, 
  type CreateNotification 
} from './notifications';
import { getInventoryAnalytics } from './inventoryAnalytics';

// Enhanced inventory item interface with expiration tracking
export interface InventoryItemWithExpiration extends InventoryItem {
  expirationDate?: Timestamp;
  batchNumber?: string;
  isPerishable: boolean;
  shelfLife?: number; // days
  daysUntilExpiry?: number;
}

// Smart alert types
export interface SmartAlert {
  id: string;
  type: 'low_stock' | 'out_of_stock' | 'expiration_warning' | 'expiration_critical' | 'reorder_suggestion' | 'usage_anomaly';
  priority: 'low' | 'medium' | 'high' | 'critical';
  itemId: string;
  itemName: string;
  category: string;
  message: string;
  recommendedAction: string;
  data: Record<string, any>;
  createdAt: Date;
}

export interface ReorderSuggestion {
  itemId: string;
  itemName: string;
  currentStock: number;
  suggestedOrderQuantity: number;
  estimatedDaysUntilEmpty: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  reasoning: string;
  costImpact: number;
}

export interface ExpirationAlert {
  itemId: string;
  itemName: string;
  expirationDate: Date;
  daysUntilExpiry: number;
  currentStock: number;
  urgency: 'warning' | 'critical' | 'expired';
  estimatedLoss: number;
  suggestedAction: string;
}

// Generate low stock alerts
export const generateLowStockAlerts = async (tenantId: string): Promise<SmartAlert[]> => {
  try {
    const inventoryItems = await getInventoryItems(tenantId);
    const settings = await getNotificationSettings(tenantId);
    const alerts: SmartAlert[] = [];

    for (const item of inventoryItems) {
      const stockRatio = item.currentStock / item.minStock;
      const criticalThreshold = (settings?.alertThresholds.criticalStock || 20) / 100;

      let alertType: SmartAlert['type'];
      let priority: SmartAlert['priority'];
      let message: string;
      let recommendedAction: string;

      if (item.currentStock === 0) {
        alertType = 'out_of_stock';
        priority = 'critical';
        message = `${item.name} is completely out of stock`;
        recommendedAction = 'Immediate reorder required to prevent service disruption';
      } else if (stockRatio <= criticalThreshold) {
        alertType = 'low_stock';
        priority = 'high';
        message = `${item.name} is critically low (${item.currentStock} ${item.unit} remaining)`;
        recommendedAction = `Reorder ${item.name} immediately. Recommended quantity: ${Math.max(item.maxStock || item.minStock * 2, item.minStock)} ${item.unit}`;
      } else if (item.status === 'low') {
        alertType = 'low_stock';
        priority = 'medium';
        message = `${item.name} is running low (${item.currentStock} ${item.unit} remaining)`;
        recommendedAction = `Consider reordering ${item.name} soon. Target stock: ${item.maxStock || item.minStock * 2} ${item.unit}`;
      } else {
        continue; // No alert needed
      }

      alerts.push({
        id: `${alertType}_${item.id}_${Date.now()}`,
        type: alertType,
        priority,
        itemId: item.id,
        itemName: item.name,
        category: item.category,
        message,
        recommendedAction,
        data: {
          currentStock: item.currentStock,
          minStock: item.minStock,
          maxStock: item.maxStock,
          unit: item.unit,
          stockRatio,
          costPerUnit: item.costPerUnit
        },
        createdAt: new Date()
      });

      // Create notification
      if (settings?.lowStockAlerts) {
        await createNotification({
          tenantId,
          type: alertType,
          title: `${alertType === 'out_of_stock' ? 'Out of Stock' : 'Low Stock'} Alert`,
          message,
          priority,
          category: 'inventory',
          actionRequired: true,
          actionType: 'reorder',
          relatedItemId: item.id,
          relatedItemName: item.name,
          data: {
            currentStock: item.currentStock,
            minStock: item.minStock,
            recommendedAction
          }
        });
      }
    }

    return alerts;
  } catch (error) {
    console.error('Error generating low stock alerts:', error);
    throw new Error('Failed to generate low stock alerts');
  }
};

// Generate expiration alerts
export const generateExpirationAlerts = async (tenantId: string): Promise<ExpirationAlert[]> => {
  try {
    const inventoryItems = await getInventoryItems(tenantId);
    const settings = await getNotificationSettings(tenantId);
    const alerts: ExpirationAlert[] = [];

    const now = new Date();
    const warningDays = settings?.alertThresholds.expiration || 7;

    for (const item of inventoryItems) {
      // Cast to extended interface (this would need to be updated in the actual inventory structure)
      const itemWithExpiration = item as InventoryItemWithExpiration;
      
      if (!itemWithExpiration.isPerishable || !itemWithExpiration.expirationDate) {
        continue;
      }

      const expirationDate = itemWithExpiration.expirationDate.toDate();
      const daysUntilExpiry = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      let urgency: ExpirationAlert['urgency'];
      let suggestedAction: string;
      let notificationType: 'expiration' = 'expiration';
      let notificationPriority: 'low' | 'medium' | 'high' | 'critical';

      if (daysUntilExpiry < 0) {
        urgency = 'expired';
        suggestedAction = 'Remove expired items immediately and dispose safely';
        notificationPriority = 'critical';
      } else if (daysUntilExpiry <= 1) {
        urgency = 'critical';
        suggestedAction = 'Use immediately or mark for discount/disposal';
        notificationPriority = 'critical';
      } else if (daysUntilExpiry <= 3) {
        urgency = 'critical';
        suggestedAction = 'Priority usage or consider promotional pricing';
        notificationPriority = 'high';
      } else if (daysUntilExpiry <= warningDays) {
        urgency = 'warning';
        suggestedAction = 'Monitor usage and plan consumption accordingly';
        notificationPriority = 'medium';
      } else {
        continue; // No alert needed
      }

      const estimatedLoss = (item.costPerUnit || 0) * item.currentStock;

      alerts.push({
        itemId: item.id,
        itemName: item.name,
        expirationDate,
        daysUntilExpiry,
        currentStock: item.currentStock,
        urgency,
        estimatedLoss,
        suggestedAction
      });

      // Create notification
      if (settings?.expirationAlerts) {
        const message = daysUntilExpiry < 0 
          ? `${item.name} has expired ${Math.abs(daysUntilExpiry)} days ago`
          : `${item.name} expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}`;

        await createNotification({
          tenantId,
          type: notificationType,
          title: `${urgency === 'expired' ? 'Expired Item' : 'Expiration'} Alert`,
          message,
          priority: notificationPriority,
          category: 'inventory',
          actionRequired: true,
          actionType: 'check_expiry',
          relatedItemId: item.id,
          relatedItemName: item.name,
          data: {
            expirationDate: expirationDate.toISOString(),
            daysUntilExpiry,
            estimatedLoss,
            suggestedAction
          }
        });
      }
    }

    return alerts;
  } catch (error) {
    console.error('Error generating expiration alerts:', error);
    throw new Error('Failed to generate expiration alerts');
  }
};

// Generate reorder suggestions
export const generateReorderSuggestions = async (tenantId: string): Promise<ReorderSuggestion[]> => {
  try {
    const analytics = await getInventoryAnalytics(tenantId, 30);
    const settings = await getNotificationSettings(tenantId);
    const suggestions: ReorderSuggestion[] = [];

    for (const prediction of analytics.stockPredictions) {
      if (prediction.status === 'good' || prediction.daysUntilEmpty === Infinity) {
        continue;
      }

      let urgency: ReorderSuggestion['urgency'];
      let suggestedOrderQuantity: number;
      let reasoning: string;

      if (prediction.daysUntilEmpty <= 3) {
        urgency = 'critical';
        suggestedOrderQuantity = Math.ceil(prediction.dailyUsageRate * 14); // 2 weeks supply
        reasoning = 'Critical: Stock will run out in 3 days or less';
      } else if (prediction.daysUntilEmpty <= 7) {
        urgency = 'high';
        suggestedOrderQuantity = Math.ceil(prediction.dailyUsageRate * 21); // 3 weeks supply
        reasoning = 'High priority: Stock will run out within a week';
      } else if (prediction.daysUntilEmpty <= 14) {
        urgency = 'medium';
        suggestedOrderQuantity = Math.ceil(prediction.dailyUsageRate * 30); // 1 month supply
        reasoning = 'Medium priority: Stock will run out within 2 weeks';
      } else {
        urgency = 'low';
        suggestedOrderQuantity = Math.ceil(prediction.dailyUsageRate * 30); // 1 month supply
        reasoning = 'Low priority: Proactive reordering recommended';
      }

      // Find the original inventory item to get cost information
      const inventoryItems = await getInventoryItems(tenantId);
      const item = inventoryItems.find(i => i.id === prediction.itemId);
      const costImpact = (item?.costPerUnit || 0) * suggestedOrderQuantity;

      suggestions.push({
        itemId: prediction.itemId,
        itemName: prediction.itemName,
        currentStock: prediction.currentStock,
        suggestedOrderQuantity,
        estimatedDaysUntilEmpty: prediction.daysUntilEmpty,
        urgency,
        reasoning,
        costImpact
      });

      // Create notification for reorder suggestions
      if (settings?.reorderSuggestions && urgency !== 'low') {
        await createNotification({
          tenantId,
          type: 'reorder_suggestion',
          title: 'Reorder Suggestion',
          message: `${reasoning}: ${prediction.itemName} (${Math.round(prediction.daysUntilEmpty)} days remaining)`,
          priority: urgency === 'critical' ? 'critical' : urgency === 'high' ? 'high' : 'medium',
          category: 'inventory',
          actionRequired: true,
          actionType: 'reorder',
          relatedItemId: prediction.itemId,
          relatedItemName: prediction.itemName,
          data: {
            suggestedOrderQuantity,
            estimatedDaysUntilEmpty: prediction.daysUntilEmpty,
            costImpact,
            reasoning
          }
        });
      }
    }

    return suggestions.sort((a, b) => {
      const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    });
  } catch (error) {
    console.error('Error generating reorder suggestions:', error);
    throw new Error('Failed to generate reorder suggestions');
  }
};

// Generate daily inventory report
export const generateDailyReport = async (tenantId: string): Promise<string> => {
  try {
    const [lowStockAlerts, expirationAlerts, reorderSuggestions, analytics] = await Promise.all([
      generateLowStockAlerts(tenantId),
      generateExpirationAlerts(tenantId),
      generateReorderSuggestions(tenantId),
      getInventoryAnalytics(tenantId, 1) // Last 24 hours
    ]);

    const today = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    let report = `📊 Daily Inventory Report - ${today}\n\n`;

    // Summary
    report += `📈 SUMMARY\n`;
    report += `• Total Items: ${analytics.totalItems}\n`;
    report += `• Total Value: ₱${analytics.totalValue.toLocaleString()}\n`;
    report += `• Low Stock Items: ${analytics.lowStockItems}\n`;
    report += `• Out of Stock Items: ${analytics.outOfStockItems}\n\n`;

    // Alerts
    if (lowStockAlerts.length > 0) {
      report += `🚨 STOCK ALERTS (${lowStockAlerts.length})\n`;
      lowStockAlerts.slice(0, 5).forEach(alert => {
        report += `• ${alert.priority.toUpperCase()}: ${alert.message}\n`;
      });
      if (lowStockAlerts.length > 5) {
        report += `• ... and ${lowStockAlerts.length - 5} more alerts\n`;
      }
      report += '\n';
    }

    // Expiration alerts
    if (expirationAlerts.length > 0) {
      report += `⏰ EXPIRATION ALERTS (${expirationAlerts.length})\n`;
      expirationAlerts.slice(0, 5).forEach(alert => {
        report += `• ${alert.urgency.toUpperCase()}: ${alert.itemName} (${alert.daysUntilExpiry} days)\n`;
      });
      if (expirationAlerts.length > 5) {
        report += `• ... and ${expirationAlerts.length - 5} more expiration alerts\n`;
      }
      report += '\n';
    }

    // Reorder suggestions
    if (reorderSuggestions.length > 0) {
      report += `🔄 REORDER SUGGESTIONS (${reorderSuggestions.length})\n`;
      reorderSuggestions.slice(0, 5).forEach(suggestion => {
        report += `• ${suggestion.urgency.toUpperCase()}: ${suggestion.itemName} - Order ${suggestion.suggestedOrderQuantity} units (₱${suggestion.costImpact.toLocaleString()})\n`;
      });
      if (reorderSuggestions.length > 5) {
        report += `• ... and ${reorderSuggestions.length - 5} more suggestions\n`;
      }
      report += '\n';
    }

    // Top movements
    if (analytics.stockMovements.length > 0) {
      const todayMovements = analytics.stockMovements[analytics.stockMovements.length - 1];
      report += `📦 TODAY'S ACTIVITY\n`;
      report += `• Stock Movements: ${todayMovements.movements}\n`;
      report += `• Items Affected: ${todayMovements.itemsAffected}\n`;
      report += `• Total Quantity Changed: ${todayMovements.totalQuantityChanged}\n\n`;
    }

    // Top value items
    if (analytics.topValueItems.length > 0) {
      report += `💰 TOP VALUE ITEMS\n`;
      analytics.topValueItems.slice(0, 3).forEach((item, index) => {
        report += `${index + 1}. ${item.name}: ₱${item.totalValue.toLocaleString()} (${item.currentStock} ${item.unit})\n`;
      });
      report += '\n';
    }

    report += `Generated at ${new Date().toLocaleString()}\n`;
    report += `CoreTrack Inventory Management System`;

    return report;
  } catch (error) {
    console.error('Error generating daily report:', error);
    throw new Error('Failed to generate daily report');
  }
};

// Run all smart alerts
export const runSmartAlerts = async (tenantId: string): Promise<{
  lowStockAlerts: SmartAlert[];
  expirationAlerts: ExpirationAlert[];
  reorderSuggestions: ReorderSuggestion[];
}> => {
  try {
    const [lowStockAlerts, expirationAlerts, reorderSuggestions] = await Promise.all([
      generateLowStockAlerts(tenantId),
      generateExpirationAlerts(tenantId),
      generateReorderSuggestions(tenantId)
    ]);

    return {
      lowStockAlerts,
      expirationAlerts,
      reorderSuggestions
    };
  } catch (error) {
    console.error('Error running smart alerts:', error);
    throw new Error('Failed to run smart alerts');
  }
};

// Send automated reports
export const sendAutomatedReports = async (tenantId: string, reportType: 'daily' | 'weekly'): Promise<void> => {
  try {
    const settings = await getNotificationSettings(tenantId);
    
    if (!settings || 
        (reportType === 'daily' && !settings.dailyReports) || 
        (reportType === 'weekly' && !settings.weeklyReports)) {
      return;
    }

    const report = await generateDailyReport(tenantId);
    
    await createNotification({
      tenantId,
      type: 'system',
      title: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Inventory Report`,
      message: `Your ${reportType} inventory report is ready`,
      priority: 'low',
      category: 'system',
      actionRequired: false,
      data: {
        reportType,
        reportContent: report,
        generatedAt: new Date().toISOString()
      }
    });

    // Here you would integrate with email service to send the report
    // For now, we're just creating a notification
    
  } catch (error) {
    console.error('Error sending automated reports:', error);
    throw new Error('Failed to send automated reports');
  }
};
