# Split Payment System with Change Calculation

## Overview
Implemented comprehensive split payment functionality for the POS system, allowing customers to pay with multiple payment methods and automatic change calculation for cash transactions.

## Features Implemented

### 🔄 **Split Payment Modal**
- **Multi-Method Payment**: Accept multiple payment methods for a single order
- **Real-time Balance Tracking**: Shows total, paid amount, and remaining balance
- **Visual Payment Summary**: Clear display of all added payment methods
- **Easy Payment Removal**: Remove individual payments with one click

### 💰 **Change Calculation System**
- **Automatic Calculation**: Real-time change calculation for cash payments
- **Input Validation**: Ensures cash given is sufficient for amount due
- **Visual Feedback**: Green/red indicators for valid/invalid cash amounts
- **Change Display**: Shows exact change amount in receipt and PDF

### 🎯 **User Interface**
- **Dual Payment Options**: Regular payment or split payment buttons
- **Payment Method Grid**: Easy selection from available payment methods
- **Amount Input Controls**: Precise amount entry with "Pay Remaining" shortcut
- **Progress Tracking**: Clear indication of payment completion status

### 📄 **Enhanced Receipts**
- **Split Payment Details**: PDF and printed receipts show all payment methods
- **Change Information**: Cash given and change amounts clearly displayed
- **Payment Breakdown**: Itemized list of each payment method used

## Technical Implementation

### State Management
```typescript
// Split Payment State
const [showSplitPaymentModal, setShowSplitPaymentModal] = useState(false)
const [splitPayments, setSplitPayments] = useState<Array<{
  id: string
  paymentMethod: PaymentMethod
  amount: number
  cashGiven?: number
  change?: number
}>>([])
```

### Core Functions
1. **`getTotalPaidAmount()`**: Calculates total amount paid across all methods
2. **`getRemainingAmount()`**: Determines outstanding balance
3. **`addSplitPayment()`**: Adds new payment with change calculation
4. **`processSplitPaymentOrder()`**: Completes order with split payment data

### Change Calculation Logic
```typescript
// For cash payments, calculate change
if (currentSplitPayment.paymentMethod.type === 'cash') {
  if (cashGiven < currentSplitPayment.amount) {
    alert(`Cash given ($${cashGiven.toFixed(2)}) is less than the amount due`)
    return
  }
  change = cashGiven - currentSplitPayment.amount
}
```

## Usage Workflow

### 1. **Initiate Split Payment**
- Add items to cart
- Click "Split Payment" button
- Split payment modal opens

### 2. **Add Payment Methods**
- Select payment method (Cash, Card, Digital Wallet, etc.)
- Enter payment amount
- For cash: Enter cash given amount
- System calculates change automatically
- Click "Add Payment" to confirm

### 3. **Complete Order**
- Add multiple payments until total is covered
- Review payment summary
- Click "Complete Order"
- Automatic PDF receipt generation

## Payment Scenarios

### Scenario 1: Cash + Card
- **Order Total**: $45.00
- **Payment 1**: Cash $30.00 (Given: $30.00, Change: $0.00)
- **Payment 2**: Credit Card $15.00
- **Result**: Order completed successfully

### Scenario 2: Multiple Cash Payments
- **Order Total**: $28.50
- **Payment 1**: Cash $20.00 (Given: $20.00, Change: $0.00)
- **Payment 2**: Cash $8.50 (Given: $10.00, Change: $1.50)
- **Result**: Total change: $1.50

### Scenario 3: Digital Wallet Split
- **Order Total**: $67.80
- **Payment 1**: GCash $40.00
- **Payment 2**: Maya $20.00
- **Payment 3**: Cash $7.80 (Given: $10.00, Change: $2.20)
- **Result**: Mixed digital and cash payment

## Validation Features

### **Amount Validation**
- Cannot exceed remaining balance
- Must be positive amounts
- Validates cash given vs amount due

### **Payment Method Validation**
- Only active payment methods available
- Proper change calculation for cash only
- Prevents duplicate payment method IDs

### **Order Completion Validation**
- Ensures full payment before processing
- Validates order type requirements
- Confirms tenant and location data

## Receipt Integration

### **PDF Receipts**
```
PAYMENT METHODS
Cash:           $30.00
  Cash Given:   $30.00
  Change:       $0.00
Credit Card:    $15.00
```

### **HTML Receipts**
- Split payment breakdown section
- Individual payment method details
- Change calculations clearly shown

## Benefits

### **For Customers**
- **Flexibility**: Pay with preferred methods
- **Convenience**: Use multiple cards/wallets
- **Accuracy**: Precise change calculation
- **Transparency**: Clear payment breakdown

### **For Business**
- **Payment Options**: Accept any combination of payments
- **Audit Trail**: Complete payment method tracking
- **Reconciliation**: Detailed payment breakdowns
- **Customer Service**: Flexible payment acceptance

## Future Enhancements
- **Tip Splitting**: Distribute tips across payment methods
- **Currency Support**: Multiple currency split payments
- **Payment Limits**: Set maximum amounts per method
- **Receipt Customization**: Business-specific payment formats
- **Integration**: External payment processor support

## Error Handling
- **Insufficient Cash**: Clear warnings for underpayment
- **Network Issues**: Graceful failure for payment processing
- **Validation Errors**: User-friendly error messages
- **Recovery**: Ability to modify/remove payments

The split payment system provides enterprise-level flexibility while maintaining simplicity and accuracy for all payment scenarios.
