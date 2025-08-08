import React, { useState, useEffect } from 'react'
import { useAuth } from '../../lib/context/AuthContext'
import { getCurrentBranch } from '../../lib/utils/branchUtils'
import { storage } from '../../lib/firebase'
import { 
  getQRCodeSettings, 
  uploadQRCode, 
  removeQRCode, 
  saveQRCodeData,
  subscribeToQRCodeSettings,
  QRCodeSettings 
} from '../../lib/firebase/qrCodes'

interface PaymentMethod {
  id: 'cash' | 'card' | 'gcash' | 'maya' | 'bank_transfer' | 'split'
  name: string
  icon: string
  color: string
  description?: string
}

interface SplitPayment {
  cash: number
  card: number
  digital: number
}

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  cartTotal: number
  onPaymentComplete: (paymentData: any) => void
  isOnline: boolean
  isProcessing: boolean
}

const PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'cash', name: 'Cash', icon: '💵', color: 'green', description: 'Physical cash payment' },
  { id: 'card', name: 'Card', icon: '💳', color: 'blue', description: 'Credit/Debit card' },
  { id: 'gcash', name: 'GCash', icon: '📱', color: 'blue', description: 'GCash mobile wallet' },
  { id: 'maya', name: 'Maya', icon: '💙', color: 'orange', description: 'Maya digital wallet' },
  { id: 'bank_transfer', name: 'Bank Transfer', icon: '🏦', color: 'purple', description: 'Direct bank transfer' },
  { id: 'split', name: 'Split Payment', icon: '🔄', color: 'indigo', description: 'Multiple payment methods' }
]

const QUICK_CASH_AMOUNTS = [100, 200, 500, 1000, 2000, 5000]

export default function EnhancedPaymentModal({ 
  isOpen, 
  onClose, 
  cartTotal, 
  onPaymentComplete, 
  isOnline, 
  isProcessing 
}: PaymentModalProps) {
  // Auth context
  const { user, profile } = useAuth()
  
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod['id']>('cash')
  const [cashReceived, setCashReceived] = useState('')
  const [cardAmount, setCardAmount] = useState('')
  const [digitalWalletAmount, setDigitalWalletAmount] = useState('')
  
  // Enhanced features
  const [tipAmount, setTipAmount] = useState(0)
  const [discountAmount, setDiscountAmount] = useState(0)
  const [discountType, setDiscountType] = useState<'amount' | 'percentage'>('amount')
  const [serviceCharge, setServiceCharge] = useState(0)
  const [notes, setNotes] = useState('')
  
  // Card payment specific states
  const [cardPaymentStatus, setCardPaymentStatus] = useState<'waiting' | 'processing' | 'completed' | 'failed'>('waiting')
  const [cardType, setCardType] = useState<'visa' | 'mastercard' | 'amex' | 'unknown'>('unknown')
  const [cardLast4, setCardLast4] = useState('')
  const [transactionId, setTransactionId] = useState('')
  
  // Split payment
  const [splitPayment, setSplitPayment] = useState<SplitPayment>({
    cash: 0,
    card: 0,
    digital: 0
  })
  
  // Receipt options
  const [receiptOptions, setReceiptOptions] = useState({
    print: false, // Changed from true to false to prevent auto-redirect
    email: false,
    sms: false
  })
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')

  // QR Code states
  const [showQRModal, setShowQRModal] = useState(false)
  const [qrCodeData, setQrCodeData] = useState('')
  const [qrPaymentStatus, setQrPaymentStatus] = useState<'waiting' | 'paid' | 'timeout'>('waiting')
  const [qrTimer, setQrTimer] = useState(300) // 5 minutes countdown
  const [showQRSettings, setShowQRSettings] = useState(false)
  const [isUploadingQR, setIsUploadingQR] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')

  // Firebase QR code settings
  const [qrSettings, setQrSettings] = useState<QRCodeSettings>({
    gcash: null,
    maya: null,
    updatedAt: new Date(),
    updatedBy: ''
  })

  const finalTotal = cartTotal + tipAmount + serviceCharge - discountAmount

  // Load QR settings from Firebase for current branch
  useEffect(() => {
    if (!profile?.tenantId) return

    const currentBranch = getCurrentBranch()
    
    // Debug: Check Firebase Storage configuration
    console.log('🔍 Firebase Storage Debug Info:', {
      storageAvailable: !!storage,
      storageBucket: storage?.app?.options?.storageBucket,
      currentBranch,
      tenantId: profile.tenantId
    })
    
    const loadQRSettings = async () => {
      try {
        const settings = await getQRCodeSettings(profile.tenantId, currentBranch)
        setQrSettings(settings)
      } catch (error) {
        console.error('Error loading QR settings:', error)
      }
    }

    loadQRSettings()

    // Subscribe to real-time updates for current branch
    const unsubscribe = subscribeToQRCodeSettings(profile.tenantId, (settings) => {
      setQrSettings(settings)
    }, currentBranch)

    return unsubscribe
  }, [profile?.tenantId])

  // Handle QR code file upload for current branch
  const handleQRUpload = async (type: 'gcash' | 'maya', file: File) => {
    if (!profile?.tenantId || !user?.uid) {
      console.error('Missing tenant ID or user ID')
      // Use non-blocking notification instead of alert
      if (typeof window !== 'undefined') {
        const notification = document.createElement('div')
        notification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: #ef4444;
          color: white;
          padding: 16px 24px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 9999;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 14px;
          font-weight: 500;
        `
        notification.textContent = '❌ Error: Missing authentication data. Please refresh and try again.'
        document.body.appendChild(notification)
        
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification)
          }
        }, 4000)
      }
      return
    }

    // Validate file type and size
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    const maxSize = 2 * 1024 * 1024 // 2MB (reduced for base64 storage)

    if (!allowedTypes.includes(file.type)) {
      // Use non-blocking notification instead of alert
      if (typeof window !== 'undefined') {
        const notification = document.createElement('div')
        notification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: #ef4444;
          color: white;
          padding: 16px 24px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 9999;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 14px;
          font-weight: 500;
        `
        notification.textContent = '❌ Please upload a valid image file (JPEG, PNG, WebP)'
        document.body.appendChild(notification)
        
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification)
          }
        }, 4000)
      }
      return
    }

    if (file.size > maxSize) {
      // Use non-blocking notification instead of alert
      if (typeof window !== 'undefined') {
        const notification = document.createElement('div')
        notification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: #ef4444;
          color: white;
          padding: 16px 24px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 9999;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 14px;
          font-weight: 500;
        `
        notification.textContent = '❌ File size must be less than 2MB for QR codes'
        document.body.appendChild(notification)
        
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification)
          }
        }, 4000)
      }
      return
    }

    const currentBranch = getCurrentBranch()
    
    // Reset states
    setIsUploadingQR(true)
    setUploadProgress(0)
    setUploadStatus('uploading')
    
    try {
      console.log(`🔄 Starting ${type.toUpperCase()} QR code upload for branch: ${currentBranch}`)
      console.log(`📁 File details:`, {
        name: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
        type: file.type
      })
      
      // Update progress
      setUploadProgress(20)
      
      // Convert file to base64 as fallback for Firebase Storage CORS issues
      const base64String = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          resolve(result)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      
      setUploadProgress(60)
      
      // Store QR data directly in Firestore instead of Firebase Storage
      const qrCodeData = {
        url: base64String,
        uploadedAt: new Date(),
        uploadedBy: user.uid,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      }
      
      setUploadProgress(80)
      
      // Save to Firestore using the existing qrCodes functions (modified approach)
      await handleQRDataSave(type, base64String)
      
      setUploadProgress(100)
      setUploadStatus('success')
      
      console.log(`✅ ${type.toUpperCase()} QR code saved successfully as base64!`)
      
      // Show success message
      setTimeout(() => {
        // Use non-blocking notification instead of alert
        if (typeof window !== 'undefined') {
          const notification = document.createElement('div')
          notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 9999;
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 14px;
            font-weight: 500;
          `
          notification.textContent = `✅ ${type.toUpperCase()} QR code uploaded successfully! You can now use it for payments.`
          document.body.appendChild(notification)
          
          setTimeout(() => {
            if (notification.parentNode) {
              notification.parentNode.removeChild(notification)
            }
          }, 4000)
        }
        setUploadStatus('idle')
        setUploadProgress(0)
      }, 1000)
      
    } catch (error: any) {
      console.error(`❌ Error uploading ${type} QR code:`, error)
      setUploadStatus('error')
      
      // Provide detailed error messages
      let errorMessage = `Failed to upload ${type.toUpperCase()} QR code. `
      
      if (error?.message?.includes('FileReader')) {
        errorMessage += 'Error reading the image file. Please try a different image.'
      } else if (error?.message?.includes('network')) {
        errorMessage += 'Network error. Please check your internet connection.'
      } else if (error?.message) {
        errorMessage += error.message
      } else {
        errorMessage += 'Please try again or contact support.'
      }
      
      // Use non-blocking notification instead of alert
      if (typeof window !== 'undefined') {
        const notification = document.createElement('div')
        notification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: #ef4444;
          color: white;
          padding: 16px 24px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 9999;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 14px;
          font-weight: 500;
        `
        notification.textContent = `❌ ${errorMessage}`
        document.body.appendChild(notification)
        
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification)
          }
        }, 4000)
      }
      
      // Reset states after error
      setTimeout(() => {
        setUploadStatus('idle')
        setUploadProgress(0)
      }, 2000)
      
    } finally {
      setIsUploadingQR(false)
    }
  }

  // Handle QR code removal for current branch
  const handleQRRemove = async (type: 'gcash' | 'maya') => {
    if (!profile?.tenantId || !user?.uid) {
      console.error('Missing tenant ID or user ID')
      return
    }

    const currentBranch = getCurrentBranch()
    try {
      await removeQRCode(profile.tenantId, type, user.uid, currentBranch)
      console.log(`✅ ${type.toUpperCase()} QR code removed successfully for branch: ${currentBranch}`)
    } catch (error) {
      console.error(`Error removing ${type} QR code:`, error)
    }
  }

  // Handle manual QR code data entry for current branch
  const handleQRDataSave = async (type: 'gcash' | 'maya', qrData: string) => {
    if (!profile?.tenantId || !user?.uid) {
      console.error('Missing tenant ID or user ID')
      return
    }

    const currentBranch = getCurrentBranch()
    try {
      await saveQRCodeData(profile.tenantId, type, qrData, user.uid, currentBranch)
      console.log(`✅ ${type.toUpperCase()} QR code data saved successfully for branch: ${currentBranch}`)
    } catch (error) {
      console.error(`Error saving ${type} QR code data:`, error)
    }
  }

  // Calculate change for cash payments
  const calculateChange = () => {
    if (selectedPaymentMethod === 'cash') {
      const received = parseFloat(cashReceived) || 0
      return Math.max(0, received - finalTotal)
    } else if (selectedPaymentMethod === 'split') {
      const totalReceived = splitPayment.cash + splitPayment.card + splitPayment.digital
      return Math.max(0, splitPayment.cash - (finalTotal - splitPayment.card - splitPayment.digital))
    }
    return 0
  }

  // Validate payment
  const isPaymentValid = () => {
    if (selectedPaymentMethod === 'cash') {
      const received = parseFloat(cashReceived) || 0
      return received >= finalTotal
    } else if (selectedPaymentMethod === 'card') {
      return cardPaymentStatus === 'completed'
    } else if (selectedPaymentMethod === 'split') {
      const totalReceived = splitPayment.cash + splitPayment.card + splitPayment.digital
      return Math.abs(totalReceived - finalTotal) < 0.01 // Allow for small rounding differences
    } else if (selectedPaymentMethod === 'gcash' || selectedPaymentMethod === 'maya') {
      return qrPaymentStatus === 'paid'
    }
    return true // For bank transfer, assume always valid when selected
  }

  // Quick cash amount buttons
  const setQuickCashAmount = (amount: number) => {
    setCashReceived(amount.toString())
  }

  // Simulate card payment processing
  const simulateCardPayment = () => {
    setCardPaymentStatus('processing')
    
    // Simulate card processing time (2-5 seconds)
    setTimeout(() => {
      const success = Math.random() > 0.1 // 90% success rate for demo
      
      if (success) {
        setCardPaymentStatus('completed')
        setCardType(['visa', 'mastercard', 'amex'][Math.floor(Math.random() * 3)] as any)
        setCardLast4(Math.floor(1000 + Math.random() * 9000).toString())
        setTransactionId(`TXN${Date.now().toString().slice(-8)}`)
      } else {
        setCardPaymentStatus('failed')
      }
    }, Math.random() * 3000 + 2000) // 2-5 seconds
  }

  // Handle card payment retry
  const retryCardPayment = () => {
    setCardPaymentStatus('waiting')
    setCardType('unknown')
    setCardLast4('')
    setTransactionId('')
  }

  // Handle discount application
  const applyDiscount = () => {
    if (discountType === 'percentage') {
      const discountValue = (cartTotal * discountAmount) / 100
      setDiscountAmount(discountValue)
      setDiscountType('amount')
    }
  }

  // Auto-calculate split payment remainder
  const updateSplitPayment = (type: keyof SplitPayment, value: number) => {
    const newSplitPayment = { ...splitPayment, [type]: value }
    
    // Auto-adjust remaining amount to card if cash is entered
    if (type === 'cash') {
      const remaining = Math.max(0, finalTotal - value - newSplitPayment.digital)
      newSplitPayment.card = remaining
    }
    
    setSplitPayment(newSplitPayment)
  }

  // Generate QR Code for digital payments
  const generateQRCode = (paymentMethod: 'gcash' | 'maya') => {
    const savedQR = qrSettings[paymentMethod]
    
    if (!savedQR?.url) {
      // Show settings modal if no QR code is configured
      setShowQRSettings(true)
      return
    }
    
    // Use saved QR code data
    setQrCodeData(savedQR.url)
    setShowQRModal(true)
    setQrPaymentStatus('waiting')
    setQrTimer(300) // Reset to 5 minutes
    
    // Start countdown timer
    const interval = setInterval(() => {
      setQrTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          setQrPaymentStatus('timeout')
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // Simulate QR payment completion (in real app, this would come from webhook)
  const simulateQRPayment = () => {
    setQrPaymentStatus('paid')
    // Auto-close QR modal after 2 seconds
    setTimeout(() => {
      setShowQRModal(false)
      // Auto-submit payment only if not already processing
      if (!isProcessing) {
        handlePaymentSubmit()
      }
    }, 2000)
  }

  // Close QR Modal
  const closeQRModal = () => {
    setShowQRModal(false)
    setQrPaymentStatus('waiting')
    setQrTimer(300)
  }

  // Handle payment submission
  const handlePaymentSubmit = () => {
    // Prevent double submissions
    if (isProcessing) {
      console.log('Payment already processing, ignoring duplicate submission')
      return
    }

    const paymentData = {
      method: selectedPaymentMethod,
      total: finalTotal,
      originalTotal: cartTotal,
      cashReceived: selectedPaymentMethod === 'cash' ? parseFloat(cashReceived) : 0,
      change: calculateChange(),
      tipAmount,
      serviceCharge,
      discountAmount,
      splitPayment: selectedPaymentMethod === 'split' ? splitPayment : null,
      cardDetails: selectedPaymentMethod === 'card' ? {
        cardType,
        last4: cardLast4,
        transactionId,
        status: cardPaymentStatus
      } : null,
      receiptOptions,
      customerEmail: receiptOptions.email ? customerEmail : null,
      customerPhone: receiptOptions.sms ? customerPhone : null,
      notes: notes.trim() || null,
      timestamp: new Date()
    }
    
    console.log('🎯 Submitting payment data:', paymentData)
    
    // Close modal immediately to prevent navigation issues
    setTimeout(() => {
      onClose()
    }, 0)
    
    // Process payment after modal closes
    setTimeout(() => {
      try {
        onPaymentComplete(paymentData)
      } catch (error) {
        console.error('Payment processing error:', error)
        // Re-open modal if there was an error
        // Note: We don't re-open here to avoid navigation issues
      }
    }, 100)
  }

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setCashReceived('')
      setCardAmount('')
      setDigitalWalletAmount('')
      setTipAmount(0)
      setDiscountAmount(0)
      setServiceCharge(0)
      setNotes('')
      setSplitPayment({ cash: 0, card: 0, digital: 0 })
      setCustomerEmail('')
      setCustomerPhone('')
      // Reset card payment states
      setCardPaymentStatus('waiting')
      setCardType('unknown')
      setCardLast4('')
      setTransactionId('')
      // Reset QR states
      setShowQRModal(false)
      setQrPaymentStatus('waiting')
      setQrTimer(300)
    }
  }, [isOpen])

  // Auto-open QR modal when GCash or Maya is selected (streamlined workflow)
  useEffect(() => {
    if (selectedPaymentMethod === 'gcash' || selectedPaymentMethod === 'maya') {
      // Small delay to let the UI update first
      const timer = setTimeout(() => {
        generateQRCode(selectedPaymentMethod as 'gcash' | 'maya')
      }, 300)
      
      return () => clearTimeout(timer)
    }
  }, [selectedPaymentMethod])

  // Also auto-open QR modal when modal opens with GCash/Maya already selected
  useEffect(() => {
    if (isOpen && (selectedPaymentMethod === 'gcash' || selectedPaymentMethod === 'maya')) {
      // Small delay to let the modal and form reset first
      const timer = setTimeout(() => {
        generateQRCode(selectedPaymentMethod as 'gcash' | 'maya')
      }, 500)
      
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Process Payment</h3>
              <p className="text-sm text-slate-500 mt-1">{isOnline ? 'Online order' : 'Offline order - will sync later'}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowQRSettings(true)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600 hover:text-slate-900"
                title="QR Code Settings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
          {/* Order Total */}
          <div className="text-center">
            <div className="text-3xl font-bold text-slate-900 mb-2">₱{finalTotal.toFixed(2)}</div>
            <div className="text-sm text-slate-500">
              {tipAmount > 0 || serviceCharge > 0 || discountAmount > 0 ? (
                <div className="space-y-1">
                  <div>Subtotal: ₱{cartTotal.toFixed(2)}</div>
                  {tipAmount > 0 && <div className="text-green-600">+ Tip: ₱{tipAmount.toFixed(2)}</div>}
                  {serviceCharge > 0 && <div className="text-blue-600">+ Service: ₱{serviceCharge.toFixed(2)}</div>}
                  {discountAmount > 0 && <div className="text-red-600">- Discount: ₱{discountAmount.toFixed(2)}</div>}
                </div>
              ) : (
                'Total amount to pay'
              )}
            </div>
          </div>

          {/* Payment Methods */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">Payment Method</label>
            <div className="grid grid-cols-2 gap-3">
              {PAYMENT_METHODS.slice(0, 4).map(method => (
                <button
                  key={method.id}
                  onClick={() => {
                    setSelectedPaymentMethod(method.id)
                    // For GCash/Maya, force open QR modal even if already selected
                    if (method.id === 'gcash' || method.id === 'maya') {
                      setTimeout(() => {
                        generateQRCode(method.id as 'gcash' | 'maya')
                      }, 200)
                    }
                  }}
                  className={`p-4 border-2 rounded-xl text-center transition-all ${
                    selectedPaymentMethod === method.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-2xl mb-2">{method.icon}</div>
                  <div className="text-sm font-medium">{method.name}</div>
                </button>
              ))}
            </div>
            
            {/* Split Payment Option */}
            <button
              onClick={() => setSelectedPaymentMethod('split')}
              className={`w-full mt-3 p-3 border-2 rounded-xl text-center transition-all ${
                selectedPaymentMethod === 'split'
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-lg">🔄</span>
                <span className="text-sm font-medium">Split Payment</span>
              </div>
            </button>
          </div>

          {/* Payment Input */}
          {selectedPaymentMethod === 'cash' && (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-slate-700">Cash Received</label>
              
              {/* Quick Amount Buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setQuickCashAmount(finalTotal)}
                  className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm font-medium"
                >
                  Exact
                </button>
                {[500, 1000].map(amount => (
                  <button
                    key={amount}
                    onClick={() => setQuickCashAmount(amount)}
                    className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm font-medium"
                  >
                    ₱{amount}
                  </button>
                ))}
              </div>

              <input
                type="number"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                placeholder="Enter amount"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                step="0.01"
              />
              
              {parseFloat(cashReceived) >= finalTotal && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-green-700 font-medium">Change:</span>
                    <span className="text-xl font-bold text-green-600">₱{calculateChange().toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Card Payment */}
          {selectedPaymentMethod === 'card' && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-4 text-center">
                <div className="text-4xl mb-3">💳</div>
                <h4 className="font-medium text-slate-900 mb-2">Card Terminal</h4>
                <p className="text-sm text-slate-600 mb-4">Amount: ₱{finalTotal.toFixed(2)}</p>
                
                {cardPaymentStatus === 'waiting' && (
                  <button
                    onClick={simulateCardPayment}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    Process Card Payment
                  </button>
                )}

                {cardPaymentStatus === 'processing' && (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-blue-600 font-medium">Processing...</span>
                  </div>
                )}

                {cardPaymentStatus === 'completed' && (
                  <div className="text-green-600">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="font-medium">Payment Approved</span>
                    </div>
                    <div className="text-xs text-slate-600">
                      {cardType.charAt(0).toUpperCase() + cardType.slice(1)} ****{cardLast4}
                    </div>
                  </div>
                )}

                {cardPaymentStatus === 'failed' && (
                  <div>
                    <div className="text-red-600 font-medium mb-2">Payment Failed</div>
                    <button
                      onClick={retryCardPayment}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                    >
                      Try Again
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Split Payment */}
          {selectedPaymentMethod === 'split' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Cash</label>
                  <input
                    type="number"
                    value={splitPayment.cash}
                    onChange={(e) => updateSplitPayment('cash', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Card</label>
                  <input
                    type="number"
                    value={splitPayment.card}
                    onChange={(e) => updateSplitPayment('card', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Digital</label>
                  <input
                    type="number"
                    value={splitPayment.digital}
                    onChange={(e) => updateSplitPayment('digital', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    step="0.01"
                  />
                </div>
              </div>
              
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="flex justify-between text-sm">
                  <span>Total Paid:</span>
                  <span className={`font-medium ${
                    Math.abs((splitPayment.cash + splitPayment.card + splitPayment.digital) - finalTotal) < 0.01 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    ₱{(splitPayment.cash + splitPayment.card + splitPayment.digital).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Digital Payments */}
          {(selectedPaymentMethod === 'gcash' || selectedPaymentMethod === 'maya' || selectedPaymentMethod === 'bank_transfer') && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-6 text-center">
                <div className="text-4xl mb-3">
                  {PAYMENT_METHODS.find(m => m.id === selectedPaymentMethod)?.icon}
                </div>
                <h4 className="font-medium text-slate-900 mb-2">
                  {PAYMENT_METHODS.find(m => m.id === selectedPaymentMethod)?.name}
                </h4>
                <p className="text-sm text-slate-600 mb-4">
                  Amount: ₱{finalTotal.toFixed(2)}
                </p>
                
                {/* Auto-show QR Code for GCash/Maya */}
                {(selectedPaymentMethod === 'gcash' || selectedPaymentMethod === 'maya') && (
                  <div className="space-y-3">
                    <div className="text-sm text-slate-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
                      🚀 <strong>Streamlined Payment:</strong> QR code automatically opens when you select {selectedPaymentMethod === 'gcash' ? 'GCash' : 'Maya'}
                    </div>
                  </div>
                )}
                
                {/* Bank Transfer - Manual */}
                {selectedPaymentMethod === 'bank_transfer' && (
                  <div className="space-y-3">
                    <div className="text-sm text-slate-600 bg-slate-100 rounded-lg p-4">
                      <div className="font-medium mb-2">Bank Details:</div>
                      <div className="space-y-1 text-left">
                        <div>Account Name: CoreTrack Restaurant</div>
                        <div>Account Number: 1234-5678-9012</div>
                        <div>Bank: BDO</div>
                        <div className="font-medium text-blue-600">Amount: ₱{finalTotal.toFixed(2)}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        // Mark as paid for bank transfer (manual verification)
                        console.log('Bank transfer marked as received')
                      }}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                    >
                      Mark as Received
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Additional Options */}
          <details className="group">
            <summary className="flex items-center justify-between cursor-pointer text-sm font-medium text-slate-700 hover:text-slate-900">
              <span>Additional Options</span>
              <svg className="w-4 h-4 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            
            <div className="mt-3 space-y-3 border-t border-slate-200 pt-3">
              {/* Tip */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">Tip</label>
                <div className="flex gap-2">
                  {[10, 20, 50].map(amount => (
                    <button
                      key={amount}
                      onClick={() => setTipAmount(amount)}
                      className={`px-3 py-1 text-xs rounded-lg ${tipAmount === amount ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}
                    >
                      ₱{amount}
                    </button>
                  ))}
                </div>
              </div>

              {/* Discount */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">Discount</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                    placeholder="Amount"
                    className="flex-1 px-3 py-1 border border-slate-300 rounded-lg text-sm"
                    step="0.01"
                  />
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as 'amount' | 'percentage')}
                    className="px-3 py-1 border border-slate-300 rounded-lg text-sm"
                  >
                    <option value="amount">₱</option>
                    <option value="percentage">%</option>
                  </select>
                </div>
              </div>

              {/* Receipt Options */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">Receipt</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={receiptOptions.print}
                      onChange={(e) => setReceiptOptions(prev => ({ ...prev, print: e.target.checked }))}
                      className="rounded text-blue-600"
                    />
                    <span className="text-xs">Print</span>
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={receiptOptions.email}
                      onChange={(e) => setReceiptOptions(prev => ({ ...prev, email: e.target.checked }))}
                      className="rounded text-blue-600"
                    />
                    <span className="text-xs">Email</span>
                  </label>
                </div>
              </div>
            </div>
          </details>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex gap-3 flex-shrink-0">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
        >
          Cancel
        </button>
        <button
          onClick={handlePaymentSubmit}
          disabled={!isPaymentValid() || isProcessing}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
            isPaymentValid() && !isProcessing
              ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
              : 'bg-slate-300 text-slate-500 cursor-not-allowed'
          }`}
        >
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></div>
              Processing...
            </>
          ) : (
            `Pay ₱${finalTotal.toFixed(2)}`
          )}
        </button>
      </div>
    </div>

    {/* QR Code Modal */}
    {showQRModal && (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          {/* QR Modal Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">
                    {selectedPaymentMethod === 'gcash' ? '📱' : '💙'}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">
                    {selectedPaymentMethod === 'gcash' ? 'GCash' : 'Maya'} Payment
                  </h3>
                  <p className="text-blue-100 text-sm">₱{finalTotal.toFixed(2)}</p>
                </div>
              </div>
              <button
                onClick={closeQRModal}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* QR Code Content */}
          <div className="p-6 text-center">
            {qrPaymentStatus === 'waiting' && (
              <div className="space-y-6">
                {/* QR Code Placeholder - In real app, use a QR library like 'qrcode' */}
                <div className="mx-auto w-48 h-48 bg-slate-100 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center overflow-hidden">
                  {qrCodeData ? (
                    <img 
                      src={qrCodeData} 
                      alt={`${selectedPaymentMethod} QR Code`}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-center">
                      <div className="text-6xl mb-2">📱</div>
                      <div className="text-sm text-slate-600 max-w-[200px]">
                        QR Code would appear here
                        <br />
                        <span className="text-xs text-slate-500 mt-1 block">
                          Amount: ₱{finalTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Timer */}
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <div className="flex items-center justify-center gap-2 text-orange-700">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium">
                      Expires in {Math.floor(qrTimer / 60)}:{(qrTimer % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                </div>

                {/* Instructions */}
                <div className="text-left space-y-3">
                  <h4 className="font-semibold text-slate-900">Instructions for Customer:</h4>
                  <ol className="text-sm text-slate-600 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                      Open your {selectedPaymentMethod === 'gcash' ? 'GCash' : 'Maya'} app
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                      Tap "Scan QR" or "Pay QR"
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
                      Scan this QR code
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">4</span>
                      Confirm payment of ₱{finalTotal.toFixed(2)}
                    </li>
                  </ol>
                </div>

                {/* Demo: Simulate Payment Button */}
                <div className="pt-4 border-t border-slate-200">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={simulateQRPayment}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm flex items-center justify-center gap-2"
                    >
                      ✅ Payment Received
                    </button>
                    <button
                      onClick={closeQRModal}
                      className="flex-1 px-4 py-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400 font-medium text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="text-xs text-slate-500 mt-2 text-center">
                    🚀 <strong>Quick workflow:</strong> Just click "Payment Received" when customer confirms payment
                  </div>
                </div>
              </div>
            )}

            {qrPaymentStatus === 'paid' && (
              <div className="space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-green-600 mb-1">Payment Received!</h4>
                  <p className="text-sm text-slate-600">₱{finalTotal.toFixed(2)} paid via {selectedPaymentMethod === 'gcash' ? 'GCash' : 'Maya'}</p>
                </div>
              </div>
            )}

            {qrPaymentStatus === 'timeout' && (
              <div className="space-y-4">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-red-600 mb-1">QR Code Expired</h4>
                  <p className="text-sm text-slate-600 mb-4">Please generate a new QR code</p>
                  <button
                    onClick={() => generateQRCode(selectedPaymentMethod as 'gcash' | 'maya')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    Generate New QR Code
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )}

    {/* QR Settings Modal */}
    {showQRSettings && (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
          {/* Settings Header */}
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">QR Code Settings</h3>
                  <p className="text-purple-100 text-sm">Configure your business payment QR codes</p>
                </div>
              </div>
              <button
                onClick={() => setShowQRSettings(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Settings Content */}
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            <div className="space-y-6">
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">📱 How to get your business QR codes:</h4>
                <ol className="text-sm text-blue-800 space-y-1">
                  <li><strong>GCash:</strong> Open GCash → Register as Merchant → Get your QR Code → Download/Screenshot</li>
                  <li><strong>Maya:</strong> Open Maya → Business Account → QR Code → Download/Screenshot</li>
                  <li><strong>Upload:</strong> Use the upload buttons below to add your business QR code images</li>
                  <li><strong>Share:</strong> QR codes will be accessible on all devices in your restaurant</li>
                </ol>
              </div>

              {/* GCash QR Upload */}
              <div className="border border-slate-200 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">📱</span>
                  <div>
                    <h4 className="font-semibold text-slate-900">GCash QR Code</h4>
                    <p className="text-sm text-slate-600">Upload your GCash merchant QR code</p>
                  </div>
                </div>

                {qrSettings.gcash ? (
                  <div className="space-y-3">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-green-700">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm font-medium">GCash QR Code Configured</span>
                      </div>
                      <div className="text-xs text-green-600 mt-1">
                        Updated: {qrSettings.gcash.uploadedAt.toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={() => handleQRRemove('gcash')}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium"
                    >
                      Remove GCash QR
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          handleQRUpload('gcash', file)
                        }
                      }}
                      className="hidden"
                      id="gcash-upload"
                      disabled={isUploadingQR}
                    />
                    <label
                      htmlFor="gcash-upload"
                      className={`w-full px-4 py-3 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors block ${
                        isUploadingQR 
                          ? 'opacity-75 cursor-not-allowed border-blue-400 bg-blue-50' 
                          : uploadStatus === 'success'
                          ? 'border-green-400 bg-green-50'
                          : uploadStatus === 'error'
                          ? 'border-red-400 bg-red-50'
                          : 'border-slate-300 hover:border-blue-500 hover:bg-blue-50'
                      }`}
                    >
                      <div className="text-slate-600">
                        {isUploadingQR ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-center gap-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                              <span className="text-sm font-medium">Uploading GCash QR...</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                              ></div>
                            </div>
                            <div className="text-xs text-slate-500">
                              {Math.round(uploadProgress)}% complete
                            </div>
                          </div>
                        ) : uploadStatus === 'success' ? (
                          <div className="text-green-700">
                            <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-sm font-medium">Upload Complete!</span>
                            <div className="text-xs text-green-600 mt-1">Click to upload a new QR code</div>
                          </div>
                        ) : uploadStatus === 'error' ? (
                          <div className="text-red-700">
                            <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            <span className="text-sm font-medium">Upload Failed</span>
                            <div className="text-xs text-red-600 mt-1">Click to try again</div>
                          </div>
                        ) : (
                          <>
                            <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <span className="text-sm font-medium">Click to upload GCash QR image</span>
                            <div className="text-xs text-slate-500 mt-1">PNG, JPG up to 5MB</div>
                          </>
                        )}
                      </div>
                    </label>
                  </div>
                )}
              </div>

              {/* Maya QR Upload */}
              <div className="border border-slate-200 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">💙</span>
                  <div>
                    <h4 className="font-semibold text-slate-900">Maya QR Code</h4>
                    <p className="text-sm text-slate-600">Upload your Maya merchant QR code</p>
                  </div>
                </div>

                {qrSettings.maya ? (
                  <div className="space-y-3">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-green-700">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm font-medium">Maya QR Code Configured</span>
                      </div>
                      <div className="text-xs text-green-600 mt-1">
                        Updated: {qrSettings.maya.uploadedAt.toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={() => handleQRRemove('maya')}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium"
                    >
                      Remove Maya QR
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          handleQRUpload('maya', file)
                        }
                      }}
                      className="hidden"
                      id="maya-upload"
                      disabled={isUploadingQR}
                    />
                    <label
                      htmlFor="maya-upload"
                      className={`w-full px-4 py-3 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors block ${
                        isUploadingQR 
                          ? 'opacity-75 cursor-not-allowed border-orange-400 bg-orange-50' 
                          : uploadStatus === 'success'
                          ? 'border-green-400 bg-green-50'
                          : uploadStatus === 'error'
                          ? 'border-red-400 bg-red-50'
                          : 'border-slate-300 hover:border-orange-500 hover:bg-orange-50'
                      }`}
                    >
                      <div className="text-slate-600">
                        {isUploadingQR ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-center gap-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
                              <span className="text-sm font-medium">Uploading Maya QR...</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-orange-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                              ></div>
                            </div>
                            <div className="text-xs text-slate-500">
                              {Math.round(uploadProgress)}% complete
                            </div>
                          </div>
                        ) : uploadStatus === 'success' ? (
                          <div className="text-green-700">
                            <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-sm font-medium">Upload Complete!</span>
                            <div className="text-xs text-green-600 mt-1">Click to upload a new QR code</div>
                          </div>
                        ) : uploadStatus === 'error' ? (
                          <div className="text-red-700">
                            <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            <span className="text-sm font-medium">Upload Failed</span>
                            <div className="text-xs text-red-600 mt-1">Click to try again</div>
                          </div>
                        ) : (
                          <>
                            <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <span className="text-sm font-medium">Click to upload Maya QR image</span>
                            <div className="text-xs text-slate-500 mt-1">PNG, JPG up to 5MB</div>
                          </>
                        )}
                      </div>
                    </label>
                  </div>
                )}
              </div>

              {/* Alternative: Manual QR Data Entry */}
              <details className="border border-slate-200 rounded-lg">
                <summary className="px-4 py-3 cursor-pointer font-medium text-slate-700 hover:text-slate-900">
                  Advanced: Manual QR Data Entry
                </summary>
                <div className="px-4 pb-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">GCash QR Data</label>
                    <textarea
                      value={qrSettings.gcash?.url || ''}
                      onChange={(e) => handleQRDataSave('gcash', e.target.value)}
                      placeholder="Paste GCash QR data or URL here..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Maya QR Data</label>
                    <textarea
                      value={qrSettings.maya?.url || ''}
                      onChange={(e) => handleQRDataSave('maya', e.target.value)}
                      placeholder="Paste Maya QR data or URL here..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      rows={3}
                    />
                  </div>
                </div>
              </details>
            </div>
          </div>

          {/* Settings Footer */}
          <div className="bg-slate-50 px-6 py-4 border-t border-slate-200">
            <div className="flex justify-between items-center">
              <div className="text-sm text-slate-600">
                QR codes are stored securely in Firebase and shared across all devices
              </div>
              <button
                onClick={() => setShowQRSettings(false)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
  )
}
