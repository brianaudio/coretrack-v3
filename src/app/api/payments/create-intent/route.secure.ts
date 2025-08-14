import { NextRequest, NextResponse } from 'next/server';
import { createPaymentIntent } from '@/lib/stripe/service';
import { auth } from 'firebase-admin';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Initialize Firebase Admin (server-side)
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

async function verifyFirebaseToken(token: string) {
  try {
    const decodedToken = await auth().verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authorization = request.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const token = authorization.split('Bearer ')[1];
    
    // SECURE: Verify Firebase token
    const decodedToken = await verifyFirebaseToken(token);
    if (!decodedToken) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Get user data from verified token
    const user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      tenantId: decodedToken.tenantId, // Assuming custom claims
    };

    // Validate user has tenantId (multi-tenant security)
    if (!user.tenantId) {
      return NextResponse.json(
        { error: 'User not associated with any organization' },
        { status: 403 }
      );
    }

    const { amount, currency = 'php', metadata = {} } = await request.json();

    // Validate amount (prevent negative/zero amounts)
    if (!amount || amount < 50) {
      return NextResponse.json(
        { error: 'Amount must be at least ₱0.50' },
        { status: 400 }
      );
    }

    // Validate amount isn't too large (prevent abuse)
    if (amount > 10000000) { // 100,000 PHP = 1M centavos
      return NextResponse.json(
        { error: 'Amount exceeds maximum limit' },
        { status: 400 }
      );
    }

    // Create payment intent with validated user data
    const paymentIntent = await createPaymentIntent({
      amount,
      currency,
      description: `Payment for ${user.tenantId}`,
      customerData: {
        userId: user.uid,
        email: user.email,
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
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
