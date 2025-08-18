import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { planId, billingCycle, tenantId, customerId, customerEmail } = await request.json();

    // PayPal credentials
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    const baseUrl = 'https://api.sandbox.paypal.com';

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'PayPal not configured' },
        { status: 500 }
      );
    }

    // Plan pricing
    const planPricing = {
      starter: 89,
      professional: 199,
      enterprise: 349
    };

    const basePrice = planPricing[planId as keyof typeof planPricing];
    if (!basePrice) {
      return NextResponse.json(
        { error: 'Invalid plan ID' },
        { status: 400 }
      );
    }

    let amount = basePrice;
    if (billingCycle === 'annual') {
      amount = Math.floor(basePrice * 12 * 0.8); // 20% discount
    }

    console.log('🔑 PayPal Request - Getting access token...');
    
    // Step 1: Get PayPal access token
    const authResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'en_US',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      },
      body: 'grant_type=client_credentials'
    });

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      console.error('❌ PayPal auth failed:', authResponse.status, errorText);
      return NextResponse.json(
        { 
          error: 'PayPal authentication failed', 
          details: 'Invalid PayPal credentials. Please check your PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET environment variables.',
          paypalError: errorText 
        },
        { status: 401 }
      );
    }

    const authData = await authResponse.json();
    console.log('✅ PayPal access token obtained');

    // Step 2: Create PayPal payment (single payment, not subscription for now)
    const orderRequest = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: 'PHP',
            value: amount.toFixed(2)
          },
          description: `CoreTrack ${planId.charAt(0).toUpperCase() + planId.slice(1)} Plan - ${billingCycle} billing`
        }
      ],
      application_context: {
        return_url: `${process.env.NODE_ENV === 'production' ? 'https://your-domain.com' : 'http://localhost:3002'}/subscription/success?plan=${planId}&billing=${billingCycle}`,
        cancel_url: `${process.env.NODE_ENV === 'production' ? 'https://your-domain.com' : 'http://localhost:3002'}/subscription/cancel`,
        brand_name: 'CoreTrack Inventory',
        landing_page: 'BILLING',
        user_action: 'PAY_NOW'
      }
    };

    console.log('🛒 Creating PayPal order...', JSON.stringify(orderRequest, null, 2));

    const orderResponse = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.access_token}`,
        'PayPal-Request-Id': `coretrack-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      },
      body: JSON.stringify(orderRequest)
    });

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      console.error('❌ PayPal order creation failed:', orderResponse.status, errorText);
      return NextResponse.json(
        { 
          error: 'PayPal order creation failed', 
          details: errorText 
        },
        { status: 400 }
      );
    }

    const orderData = await orderResponse.json();
    console.log('✅ PayPal order created:', orderData.id);

    return NextResponse.json({
      id: orderData.id,
      status: orderData.status,
      links: orderData.links
    });

  } catch (error) {
    console.error('❌ PayPal API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
