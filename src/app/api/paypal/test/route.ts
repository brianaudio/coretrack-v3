import { NextRequest, NextResponse } from 'next/server';
import paypalConfig from '@/lib/paypal/config';

// Test endpoint for PayPal integration validation
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const testType = searchParams.get('test') || 'all';

    const results = {
      timestamp: new Date().toISOString(),
      environment: paypalConfig.environment,
      tests: {} as any
    };

    // Test 1: Configuration Check
    if (testType === 'all' || testType === 'config') {
      results.tests.configuration = {
        clientIdSet: !!paypalConfig.clientId,
        clientSecretSet: !!paypalConfig.clientSecret,
        isConfigured: paypalConfig.isConfigured(),
        isLive: paypalConfig.isLive(),
        environment: paypalConfig.environment,
        currency: paypalConfig.currency,
        paypalMeEnabled: paypalConfig.paypalMe.enabled,
        webhookUrl: paypalConfig.webhook.url,
        status: paypalConfig.isConfigured() ? '✅ PASS' : '❌ FAIL'
      };
    }

    // Test 2: Environment Variables
    if (testType === 'all' || testType === 'env') {
      results.tests.environment = {
        nodeEnv: process.env.NODE_ENV,
        paypalEnv: process.env.NEXT_PUBLIC_PAYPAL_ENVIRONMENT,
        appUrl: process.env.NEXT_PUBLIC_APP_URL,
        webhookSecret: !!process.env.PAYPAL_WEBHOOK_SECRET,
        paypalMeEnabled: process.env.NEXT_PUBLIC_ENABLE_PAYPAL_ME,
        paypalMeUsername: process.env.NEXT_PUBLIC_PAYPAL_ME_USERNAME,
        status: '✅ PASS'
      };
    }

    // Test 3: API Connectivity
    if (testType === 'all' || testType === 'api') {
      try {
        const authResponse = await fetch(`${paypalConfig.baseUrl}/v1/oauth2/token`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Accept-Language': 'en_US',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${paypalConfig.clientId}:${paypalConfig.clientSecret}`).toString('base64')}`
          },
          body: 'grant_type=client_credentials'
        });

        if (authResponse.ok) {
          const authData = await authResponse.json();
          results.tests.apiConnectivity = {
            baseUrl: paypalConfig.baseUrl,
            authenticationStatus: 'SUCCESS',
            tokenReceived: !!authData.access_token,
            tokenType: authData.token_type,
            expiresIn: authData.expires_in,
            status: '✅ PASS'
          };
        } else {
          results.tests.apiConnectivity = {
            baseUrl: paypalConfig.baseUrl,
            authenticationStatus: 'FAILED',
            error: await authResponse.text(),
            status: '❌ FAIL'
          };
        }
      } catch (error) {
        results.tests.apiConnectivity = {
          baseUrl: paypalConfig.baseUrl,
          authenticationStatus: 'ERROR',
          error: error instanceof Error ? error.message : 'Unknown error',
          status: '❌ FAIL'
        };
      }
    }

    // Test 4: Subscription Plans
    if (testType === 'all' || testType === 'plans') {
      results.tests.subscriptionPlans = {
        plansConfigured: Object.keys(paypalConfig.subscriptionPlans).length,
        plans: Object.entries(paypalConfig.subscriptionPlans).map(([id, plan]) => ({
          id,
          name: plan.name,
          price: plan.price,
          currency: paypalConfig.currency,
          paypalPlanId: plan.paypalPlanId || 'NOT_SET',
          features: plan.features.length
        })),
        status: Object.keys(paypalConfig.subscriptionPlans).length > 0 ? '✅ PASS' : '❌ FAIL'
      };
    }

    // Test 5: PayPal.me Configuration
    if (testType === 'all' || testType === 'paypalme') {
      const sampleUrl = `https://paypal.me/${paypalConfig.paypalMe.username}/100PHP`;
      results.tests.paypalMe = {
        enabled: paypalConfig.paypalMe.enabled,
        username: paypalConfig.paypalMe.username,
        fallbackUrl: paypalConfig.paypalMe.fallbackUrl,
        sampleUrl,
        status: paypalConfig.paypalMe.enabled ? '✅ PASS' : '⚠️ DISABLED'
      };
    }

    // Test 6: Webhook Configuration
    if (testType === 'all' || testType === 'webhook') {
      results.tests.webhook = {
        url: paypalConfig.webhook.url,
        events: paypalConfig.webhook.events,
        eventsCount: paypalConfig.webhook.events.length,
        secretConfigured: !!process.env.PAYPAL_WEBHOOK_SECRET,
        status: paypalConfig.webhook.url ? '✅ PASS' : '❌ FAIL'
      };
    }

    // Overall Status
    const failedTests = Object.values(results.tests).filter((test: any) => 
      test.status && test.status.includes('❌')
    ).length;

    const overallStatus = failedTests === 0 ? 'ALL_TESTS_PASSED' : 'SOME_TESTS_FAILED';

    return NextResponse.json({
      ...results,
      summary: {
        overallStatus,
        totalTests: Object.keys(results.tests).length,
        passedTests: Object.keys(results.tests).length - failedTests,
        failedTests,
        readyForProduction: failedTests === 0 && paypalConfig.isConfigured()
      }
    }, { status: 200 });

  } catch (error) {
    return NextResponse.json({
      error: 'Test execution failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Quick health check
export async function POST() {
  return NextResponse.json({
    message: 'PayPal Test Suite Active',
    availableTests: [
      'config - Configuration validation',
      'env - Environment variables check',
      'api - PayPal API connectivity',
      'plans - Subscription plans validation',
      'paypalme - PayPal.me configuration',
      'webhook - Webhook setup validation',
      'all - Run all tests (default)'
    ],
    usage: 'GET /api/paypal/test?test=config',
    timestamp: new Date().toISOString()
  });
}
