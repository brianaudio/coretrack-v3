import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import crypto from 'crypto';
import { db } from '@/lib/firebase';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';

// PayPal webhook events we handle
const WEBHOOK_EVENTS = {
  SUBSCRIPTION_ACTIVATED: 'BILLING.SUBSCRIPTION.ACTIVATED',
  SUBSCRIPTION_CANCELLED: 'BILLING.SUBSCRIPTION.CANCELLED', 
  SUBSCRIPTION_SUSPENDED: 'BILLING.SUBSCRIPTION.SUSPENDED',
  PAYMENT_FAILED: 'BILLING.SUBSCRIPTION.PAYMENT.FAILED',
  PAYMENT_COMPLETED: 'PAYMENT.SALE.COMPLETED'
} as const;

interface WebhookPayload {
  id: string;
  event_type: string;
  resource_type: string;
  summary: string;
  resource: {
    id: string;
    status?: string;
    subscriber?: {
      email_address: string;
    };
    billing_info?: {
      next_billing_time?: string;
    };
    custom_id?: string; // Our tenant ID
  };
  create_time: string;
}

// Verify PayPal webhook signature
async function verifyWebhookSignature(
  payload: string,
  signature: string,
  webhookId: string
): Promise<boolean> {
  try {
    // In production, you should verify the webhook signature
    // For now, we'll implement basic verification
    const expectedSignature = crypto
      .createHmac('sha256', process.env.PAYPAL_WEBHOOK_SECRET || '')
      .update(payload)
      .digest('base64');
    
    return signature === expectedSignature;
  } catch (error) {
    console.error('❌ Webhook signature verification failed:', error);
    return false;
  }
}

// Log webhook event for debugging
async function logWebhookEvent(event: WebhookPayload, processed: boolean = true) {
  try {
    await addDoc(collection(db, 'webhookLogs'), {
      eventId: event.id,
      eventType: event.event_type,
      resourceType: event.resource_type,
      resourceId: event.resource.id,
      summary: event.summary,
      processed,
      timestamp: new Date(),
      createTime: event.create_time,
      customerEmail: event.resource.subscriber?.email_address || 'unknown'
    });
  } catch (error) {
    console.error('❌ Failed to log webhook event:', error);
  }
}

// Handle subscription activation
async function handleSubscriptionActivated(event: WebhookPayload) {
  const { resource } = event;
  const customerId = resource.custom_id; // Our tenant ID
  
  if (!customerId) {
    console.warn('⚠️ No custom_id found in subscription activation');
    return;
  }

  try {
    // Update tenant subscription status
    const tenantRef = doc(db, 'tenants', customerId);
    await updateDoc(tenantRef, {
      subscription: {
        status: 'active',
        paypalSubscriptionId: resource.id,
        activatedAt: new Date(),
        nextBillingDate: resource.billing_info?.next_billing_time 
          ? new Date(resource.billing_info.next_billing_time)
          : null,
        updatedAt: new Date()
      }
    });

    console.log('✅ Subscription activated for tenant:', customerId);
  } catch (error) {
    console.error('❌ Failed to activate subscription:', error);
    throw error;
  }
}

// Handle subscription cancellation
async function handleSubscriptionCancelled(event: WebhookPayload) {
  const { resource } = event;
  const customerId = resource.custom_id;
  
  if (!customerId) {
    console.warn('⚠️ No custom_id found in subscription cancellation');
    return;
  }

  try {
    const tenantRef = doc(db, 'tenants', customerId);
    await updateDoc(tenantRef, {
      subscription: {
        status: 'cancelled',
        paypalSubscriptionId: resource.id,
        cancelledAt: new Date(),
        updatedAt: new Date()
      }
    });

    console.log('✅ Subscription cancelled for tenant:', customerId);
  } catch (error) {
    console.error('❌ Failed to cancel subscription:', error);
    throw error;
  }
}

// Handle payment failure
async function handlePaymentFailed(event: WebhookPayload) {
  const { resource } = event;
  const customerId = resource.custom_id;
  
  if (!customerId) {
    console.warn('⚠️ No custom_id found in payment failure');
    return;
  }

  try {
    const tenantRef = doc(db, 'tenants', customerId);
    await updateDoc(tenantRef, {
      subscription: {
        status: 'payment_failed',
        paypalSubscriptionId: resource.id,
        lastPaymentFailedAt: new Date(),
        updatedAt: new Date()
      }
    });

    console.log('⚠️ Payment failed for tenant:', customerId);
  } catch (error) {
    console.error('❌ Failed to handle payment failure:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('PayPal-Transmission-Sig');
    const webhookId = headersList.get('PayPal-Webhook-Id');

    if (!signature || !webhookId) {
      console.error('❌ Missing PayPal webhook headers');
      return NextResponse.json(
        { error: 'Missing required headers' },
        { status: 400 }
      );
    }

    // Parse webhook payload
    let event: WebhookPayload;
    try {
      event = JSON.parse(body);
    } catch (parseError) {
      console.error('❌ Invalid JSON payload:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    console.log('🔔 PayPal Webhook received:', {
      eventType: event.event_type,
      resourceId: event.resource.id,
      summary: event.summary
    });

    // Verify signature (in production)
    if (process.env.NODE_ENV === 'production') {
      const isValid = await verifyWebhookSignature(body, signature, webhookId);
      if (!isValid) {
        console.error('❌ Invalid webhook signature');
        await logWebhookEvent(event, false);
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }

    // Process webhook based on event type
    let processed = true;
    
    try {
      switch (event.event_type) {
        case WEBHOOK_EVENTS.SUBSCRIPTION_ACTIVATED:
          await handleSubscriptionActivated(event);
          break;
          
        case WEBHOOK_EVENTS.SUBSCRIPTION_CANCELLED:
          await handleSubscriptionCancelled(event);
          break;
          
        case WEBHOOK_EVENTS.SUBSCRIPTION_SUSPENDED:
          await handleSubscriptionCancelled(event); // Treat as cancellation
          break;
          
        case WEBHOOK_EVENTS.PAYMENT_FAILED:
          await handlePaymentFailed(event);
          break;
          
        case WEBHOOK_EVENTS.PAYMENT_COMPLETED:
          console.log('💰 Payment completed for subscription:', event.resource.id);
          // Could add payment tracking here
          break;
          
        default:
          console.log('ℹ️ Unhandled webhook event:', event.event_type);
          processed = false;
      }
    } catch (processingError) {
      console.error('❌ Error processing webhook:', processingError);
      processed = false;
    }

    // Log the event
    await logWebhookEvent(event, processed);

    return NextResponse.json({ 
      success: true, 
      processed,
      eventType: event.event_type 
    });

  } catch (error) {
    console.error('❌ PayPal webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle GET for webhook validation
export async function GET() {
  return NextResponse.json({ 
    message: 'PayPal webhook endpoint active',
    timestamp: new Date().toISOString()
  });
}
