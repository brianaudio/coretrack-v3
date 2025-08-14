import { NextRequest, NextResponse } from 'next/server';
import { createPaymentIntent } from '@/lib/stripe/service';

export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authorization = request.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authorization.split('Bearer ')[1];
    
    // For now, let's skip auth verification 
    // In production, you'd verify the Firebase token here
    const user = { uid: 'temp-user', tenantId: 'temp-tenant' };

    const { amount, currency = 'php', metadata = {} } = await request.json();

    // Validate amount
    if (!amount || amount < 50) { // Minimum 50 centavos
      return NextResponse.json(
        { error: 'Amount must be at least ₱0.50' },
        { status: 400 }
      );
    }

    // Create payment intent
    const paymentIntent = await createPaymentIntent({
      amount,
      currency,
      description: `Payment for ${user.tenantId}`,
      customerData: {
        userId: user.uid,
        tenantId: user.tenantId,
        ...metadata,
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.clientSecret,
      paymentIntentId: paymentIntent.id,
    });

  } catch (error) {
    console.error('Create payment intent error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}
