'use client'

import React, { useState, useEffect } from 'react'
import { useNotifications } from '../NotificationSystem'
import { useSubscription } from '../../lib/context/SubscriptionContext'
import { SUBSCRIPTION_PLANS } from '../../lib/types/subscription'
import paypalConfig from '../../lib/paypal/config'
import { loadScript } from '@paypal/paypal-js'
import PayPalMeFallback from '../billing/PayPalMeFallback'

export default function BillingTab() {
  const { showSuccess, showError, showWarning } = useNotifications()
  const { subscription, loading: subscriptionLoading, isActive } = useSubscription()
  const [loading, setLoading] = useState(false)

  // Format price for Philippine peso
  const formatPrice = (price: number) => `₱${price.toLocaleString()}`

  // Format date
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('en-PH', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  // Handle direct PayPal subscription
  const handleDirectPayPalSubscription = async (planId: string) => {
    const paypalPlanId = paypalConfig.subscriptionPlans[planId as keyof typeof paypalConfig.subscriptionPlans]
    
    if (!paypalPlanId) {
      showError('PayPal plan configuration missing', planId)
      return
    }

    setLoading(true)
    try {
      // Redirect to PayPal subscription page
      const paypalUrl = `https://www.paypal.com/webapps/billing/plans/subscribe?plan_id=${paypalPlanId}`
      window.open(paypalUrl, '_blank')
      
      showSuccess('Redirecting to PayPal', 'Opening subscription page...')
    } catch (error: any) {
      console.error('Subscription error:', error)
      showError('Failed to start subscription', error.message)
    } finally {
      setLoading(false)
    }
  }

  // Handle subscription management
  const handleManageSubscription = () => {
    window.open('https://www.paypal.com/myaccount/autopay/', '_blank')
  }

  // Initialize PayPal buttons for each plan
  useEffect(() => {
    if (subscription && isActive) return

    const initializePayPalButtons = async () => {
      try {
        const paypal = await loadScript({
          clientId: paypalConfig.clientId,
          currency: 'PHP',
          intent: 'subscription',
          vault: true
        })

        if (!paypal?.Buttons) return

        SUBSCRIPTION_PLANS.forEach((plan) => {
          const isCurrentPlan = subscription?.planId === plan.id
          if (isCurrentPlan) return

          const containerId = `paypal-button-${plan.id}`
          const container = document.getElementById(containerId)
          if (!container) return

          const paypalPlanId = paypalConfig.subscriptionPlans[plan.id as keyof typeof paypalConfig.subscriptionPlans]
          if (!paypalPlanId) return

          paypal?.Buttons({
            style: {
              layout: 'vertical',
              color: plan.id === 'professional' ? 'blue' : 'black',
              shape: 'rect',
              label: 'subscribe',
              height: 45
            },
            createSubscription: (data: any, actions: any) => {
              return actions.subscription.create({
                plan_id: paypalPlanId,
                application_context: {
                  brand_name: 'CoreTrack',
                  locale: 'en-PH',
                  shipping_preference: 'NO_SHIPPING',
                  user_action: 'SUBSCRIBE_NOW'
                }
              })
            },
            onApprove: async (data: any) => {
              showSuccess('Subscription activated successfully!', 'Welcome to CoreTrack Pro')
              window.location.reload()
            },
            onError: (err: any) => {
              console.error('PayPal error:', err)
              showError('PayPal subscription failed', 'Please try again')
            },
            onCancel: () => {
              showWarning('Subscription cancelled', 'You can try again anytime')
            }
          }).render(`#${containerId}`)
        })
      } catch (error) {
        console.error('PayPal initialization error:', error)
      }
    }

    initializePayPalButtons()
  }, [subscription, isActive])

  if (subscriptionLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Billing & Subscription</h1>
        <p className="text-gray-600">Simple PayPal subscription billing for Philippine businesses</p>
      </div>

      {/* Current Subscription Status */}
      {subscription && isActive ? (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Current Subscription</h2>
              <p className="text-sm text-gray-600">Your active plan and billing information</p>
            </div>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              ✓ Active
            </span>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                {SUBSCRIPTION_PLANS.find(p => p.id === subscription.planId)?.name || 'Unknown Plan'}
              </h3>
              <p className="text-2xl font-bold text-gray-900 mb-1">
                {formatPrice(SUBSCRIPTION_PLANS.find(p => p.id === subscription.planId)?.monthlyPrice || 0)}/month
              </p>
              {subscription.nextPaymentDate && (
                <p className="text-sm text-gray-600">
                  Next billing: {formatDate(subscription.nextPaymentDate)}
                </p>
              )}
            </div>
            
            <div className="text-right">
              <button
                onClick={handleManageSubscription}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Manage via PayPal
              </button>
              <p className="text-xs text-gray-500 mt-2">
                Cancel, update payment methods, or view invoices
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl p-6 border border-gray-200 text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Subscription</h3>
          <p className="text-gray-600 mb-4">
            Choose a plan below to get started with CoreTrack Pro features.
          </p>
        </div>
      )}

      {/* Simplified Plan Selection */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Choose Your Plan</h2>
          <p className="text-gray-600">All plans include 7-day grace period and easy cancellation</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          {SUBSCRIPTION_PLANS.map((plan) => {
            const isCurrentPlan = subscription?.planId === plan.id
            
            return (
              <div 
                key={plan.id}
                className={`rounded-lg p-6 transition-all duration-200 relative ${
                  isCurrentPlan 
                    ? 'border-2 border-green-500 bg-green-50 shadow-lg' 
                    : plan.id === 'professional' && !isCurrentPlan
                      ? 'border-2 border-blue-500 bg-blue-50 shadow-md hover:shadow-lg'
                      : 'border border-gray-200 hover:border-gray-300 hover:shadow-md'
                }`}
              >
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                      ✓ Current Plan
                    </span>
                  </div>
                )}
                {plan.id === 'professional' && !isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                      🔥 Most Popular
                    </span>
                  </div>
                )}
                
                {/* Plan Header */}
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <div className="mb-3">
                    <span className="text-4xl font-bold text-gray-900">{formatPrice(plan.monthlyPrice)}</span>
                    <span className="text-gray-600 text-lg">/month</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {plan.id === 'starter' && 'Perfect for solo coffee shop owners'}
                    {plan.id === 'professional' && 'For growing coffee shop teams'}
                    {plan.id === 'enterprise' && 'For multiple locations & chains'}
                  </p>
                </div>

                {/* Key Features */}
                <div className="space-y-3 mb-8">
                  <div className="flex items-center space-x-2 text-sm">
                    <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>{plan.limits.maxLocations} Location{plan.limits.maxLocations > 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>{plan.limits.maxUsers} User{plan.limits.maxUsers > 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>{plan.limits.maxOrders.toLocaleString()} Orders/Month</span>
                  </div>
                  {plan.features.pos && (
                    <div className="flex items-center space-x-2 text-sm">
                      <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>Point of Sale</span>
                    </div>
                  )}
                  {plan.features.advancedAnalytics && (
                    <div className="flex items-center space-x-2 text-sm">
                      <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>Advanced Analytics</span>
                    </div>
                  )}
                </div>

                {/* Single Subscription Button */}
                {isCurrentPlan ? (
                  <div className="text-center">
                    <div className="bg-green-100 border border-green-300 rounded-lg py-3 px-4 mb-3">
                      <span className="text-green-800 font-medium">✓ Active Subscription</span>
                    </div>
                    <button
                      onClick={handleManageSubscription}
                      className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                    >
                      Manage Subscription
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* PayPal Button Container */}
                    <div id={`paypal-button-${plan.id}`} className="min-h-[45px]"></div>
                    
                    {/* Simple Subscribe Button */}
                    <button
                      onClick={() => handleDirectPayPalSubscription(plan.id)}
                      disabled={loading}
                      className={`w-full py-3 px-4 rounded-lg transition-colors font-semibold disabled:opacity-50 ${
                        plan.id === 'professional' 
                          ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                          : 'bg-gray-900 hover:bg-black text-white'
                      }`}
                    >
                      {loading ? 'Loading...' : 'Subscribe via PayPal'}
                    </button>
                    
                    {/* PayPal.me Fallback */}
                    <PayPalMeFallback 
                      planId={plan.id as 'starter' | 'professional' | 'enterprise'}
                      billingCycle="monthly"
                      onSuccess={() => {
                        showSuccess(
                          'Payment Instructions Sent!', 
                          'We\'ll activate your account within 24 hours after payment confirmation.'
                        );
                      }}
                    />
                    
                    <p className="text-xs text-gray-500 text-center">
                      Secure payment • Cancel anytime • No setup fees
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* PayPal Benefits */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-6 bg-blue-600 rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">PP</span>
            </div>
            <h4 className="font-semibold text-blue-900">Why PayPal for Philippine Businesses?</h4>
          </div>
          <div className="grid md:grid-cols-3 gap-4 text-sm text-blue-800">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>No BIR/DTI registration required</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Supports Visa, Mastercard, JCB</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Easy cancellation anytime</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
