# 🔍 Inventory Discrepancy & Audit System - Feature Specification

## 🎯 **Overview**
Comprehensive theft prevention and inventory accountability system for restaurant operations.

## 📊 **Core Features**

### **1. Shift-Based Auditing**
```
Daily Workflow:
1. Start Shift → Opening Count → Sales Tracking → Closing Count → Discrepancy Report
```

**Components:**
- **Shift Management**: Track who was working, when, and on what shift
- **Opening Inventory Count**: Manual count at start of shift
- **Real-time POS Integration**: Automatic calculation of expected usage
- **Closing Inventory Count**: Manual count at end of shift
- **Discrepancy Calculation**: Expected vs Actual comparison

### **2. Theft Detection Algorithms**

**Red Flags:**
- **High-Value Items**: Items with cost >₱200/unit get priority monitoring
- **Variance Thresholds**: >5% variance triggers review
- **Pattern Detection**: Repeated discrepancies on same staff shifts
- **Cost Impact**: Total loss >₱500 requires manager approval

### **3. Staff Accountability**

**Tracking:**
- Who was on duty during discrepancies
- Historical performance per staff member
- Shift handover procedures
- Manager oversight requirements

### **4. Real-Time Monitoring**

**Dashboard Features:**
- Live inventory tracking during shift
- Instant alerts for high-value discrepancies
- Mobile notifications for managers
- End-of-shift summary reports

## 🛠 **Technical Implementation**

### **Database Schema**

```typescript
interface ShiftAudit {
  id: string;
  date: string;
  shiftType: 'morning' | 'afternoon' | 'evening' | 'overnight';
  startTime: string;
  endTime: string;
  staffOnDuty: string[];
  managerId: string;
  status: 'pending' | 'in-progress' | 'completed' | 'flagged';
  createdAt: Date;
  completedAt?: Date;
}

interface InventoryAuditItem {
  id: string;
  auditId: string;
  itemId: string;
  itemName: string;
  category: string;
  
  // Counts
  openingCount: number;
  expectedUsage: number;      // From POS sales
  actualClosingCount: number;
  expectedClosingCount: number; // Opening - Expected Usage
  
  // Discrepancy Analysis
  discrepancy: number;         // Expected - Actual
  discrepancyPercentage: number;
  
  // Financial Impact
  costPerUnit: number;
  totalDiscrepancyCost: number;
  
  // Metadata
  unit: string;
  countedBy: string;
  countedAt: Date;
  notes?: string;
  isHighValue: boolean;       // Cost >₱200
  requiresReview: boolean;    // Variance >5%
}

interface AuditReport {
  id: string;
  shiftAuditId: string;
  
  // Summary Stats
  totalItems: number;
  itemsWithDiscrepancy: number;
  totalDiscrepancyCost: number;
  overallVariancePercentage: number;
  
  // Review Status
  status: 'pending' | 'under-review' | 'approved' | 'disputed';
  flaggedForReview: boolean;
  reviewedBy?: string;
  reviewDate?: Date;
  managerNotes?: string;
  
  // Timestamps
  createdAt: Date;
  completedAt: Date;
}
```

### **Key Algorithms**

#### **1. Discrepancy Calculation**
```typescript
const calculateDiscrepancy = (item: InventoryAuditItem) => {
  const expectedClosing = item.openingCount - item.expectedUsage;
  const discrepancy = expectedClosing - item.actualClosingCount;
  const discrepancyPercentage = item.openingCount > 0 
    ? (Math.abs(discrepancy) / item.openingCount) * 100 
    : 0;
  
  return {
    expectedClosingCount: expectedClosing,
    discrepancy,
    discrepancyPercentage,
    totalDiscrepancyCost: Math.abs(discrepancy) * item.costPerUnit,
    requiresReview: discrepancyPercentage > 5 || Math.abs(discrepancy * item.costPerUnit) > 200
  };
};
```

#### **2. Theft Risk Scoring**
```typescript
const calculateTheftRisk = (auditHistory: AuditReport[], staffMember: string) => {
  const staffAudits = auditHistory.filter(audit => 
    audit.shiftAudit.staffOnDuty.includes(staffMember)
  );
  
  const riskFactors = {
    highDiscrepancyCount: staffAudits.filter(a => a.overallVariancePercentage > 5).length,
    totalLossAmount: staffAudits.reduce((sum, a) => sum + a.totalDiscrepancyCost, 0),
    patternFrequency: staffAudits.length > 10 ? staffAudits.filter(a => a.flaggedForReview).length / staffAudits.length : 0
  };
  
  // Risk score 0-100
  return Math.min(100, 
    (riskFactors.highDiscrepancyCount * 10) + 
    (riskFactors.totalLossAmount / 100) + 
    (riskFactors.patternFrequency * 50)
  );
};
```

## 📱 **User Interface Features**

### **1. Audit Dashboard**
- Real-time shift status
- Quick stats (items audited, discrepancies, total loss)
- Alert notifications
- Staff performance overview

### **2. Mobile-Optimized Counting**
- Barcode scanning for quick counting
- Voice input for hands-free operation
- Photo documentation for high-value discrepancies
- Offline capability for poor network areas

### **3. Manager Review Portal**
- Flagged audits requiring approval
- Staff performance analytics
- Trend analysis and reporting
- Policy enforcement tools

### **4. Reporting & Analytics**
- Daily/Weekly/Monthly reports
- Cost impact analysis
- Staff accountability reports
- Theft pattern identification
- Inventory accuracy trends

## 🚨 **Alert System**

### **Real-Time Notifications**
- **Immediate**: High-value discrepancies (>₱500)
- **Shift End**: Summary of all discrepancies
- **Daily**: Manager summary report
- **Weekly**: Trend analysis and recommendations

### **Escalation Procedures**
1. **Minor Variance** (<3%): Log and continue
2. **Moderate Variance** (3-5%): Require double-count
3. **High Variance** (>5%): Manager review required
4. **Critical Loss** (>₱1000): Owner notification

## 🔒 **Security & Compliance**

### **Audit Trail**
- Every count logged with timestamp and user
- Photo evidence for discrepancies
- Manager approvals tracked
- Historical data preservation

### **Access Control**
- Only managers can approve high discrepancies
- Staff can only count, not modify historical data
- Audit logs are immutable
- Regular backup procedures

## 🎯 **Business Impact**

### **Theft Prevention**
- Immediate detection of inventory loss
- Staff accountability and deterrence
- Pattern recognition for systematic theft
- Evidence collection for investigations

### **Operational Efficiency**
- Streamlined counting procedures
- Automated calculations and reporting
- Mobile-first design for ease of use
- Integration with existing POS system

### **Financial Protection**
- Real-time loss monitoring
- Accurate cost accounting
- Insurance claim documentation
- Profit margin protection

---

## 🚀 **Implementation Priority**

1. **Phase 1**: Basic audit workflow (start/end shift, manual counting)
2. **Phase 2**: Discrepancy calculation and alerting
3. **Phase 3**: Manager review portal and reporting
4. **Phase 4**: Advanced analytics and pattern detection
5. **Phase 5**: Mobile app and barcode integration
