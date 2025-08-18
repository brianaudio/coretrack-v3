import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // PayMongo webhook handler - implement your webhook logic here
    const payload = await request.json();
    
    console.log('PayMongo webhook received:', payload);
    
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('PayMongo webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}