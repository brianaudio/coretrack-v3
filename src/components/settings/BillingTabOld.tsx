'use client'

import React, { useState } from 'react'
import { useNotifications } from '../NotificationSystem'
import { useSubscription } from '../../lib/context/SubscriptionContext'
import { SUBSCRIPTION_PLANS } from '../../lib/types/subscription'
import PayPalCreditCardFields from '../billing/PayPalCreditCardFields'

export default function BillingTab() {
  const { showSuccess, showError } = useNotifications()
  const { subscription, features, limits, loading: subscriptionLoading, isActive, isTrial, trialDaysRemaining } = useSubscription()
  const [loading, setLoading] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)

  // Get current plan details
  const currentPlan = subscription ? SUBSCRIPTION_PLANS.find(plan => plan.id === subscription.planId) : null
  
  // Format price helper
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount)
  }

  // Format date helper
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const handleUpgrade = async (planId: string) => {
    setSelectedPlanId(planId)
    setShowUpgradeModal(true)
  }

  const handlePaymentSuccess = async (subscriptionId: string) => {
    try {
      setLoading(true)
      showSuccess('Subscription Activated', 'Your subscription has been activated successfully!')
      setShowUpgradeModal(false)
      setSelectedPlanId(null)
      // Subscription context will auto-refresh
    } catch (error) {
      console.error('Payment success handling error:', error)
      showError('Processing Error', 'There was an issue processing your subscription. Please contact support.')
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentError = (error: any) => {
    console.error('Payment error:', error)
    showError('Payment Failed', 'Payment failed. Please try again or contact support.')
    setShowUpgradeModal(false)
    setSelectedPlanId(null)
  }

  const handleAddPaymentMethod = async (method: string) => {
    try {
      setLoading(true)
      // Handle payment method addition
      await new Promise(resolve => setTimeout(resolve, 2000))
      showSuccess('Payment Method Added', `${method} has been added to your account`)
    } catch (err) {
      showError('Error', `Failed to add ${method} payment method`)
    } finally {
      setLoading(false)
    }
  }

  const handleRemovePaymentMethod = async (methodId: string) => {
    if (!confirm('Are you sure you want to remove this payment method?')) {
      return
    }

    try {
      setLoading(true)
      await new Promise(resolve => setTimeout(resolve, 1000))
      showSuccess('Payment Method Removed', 'Payment method has been removed from your account')
    } catch (err) {
      showError('Error', 'Failed to remove payment method')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Billing & Subscription</h1>
        <p className="text-gray-600">Manage your subscription, billing information, and payment methods</p>
      </div>

      <div className="grid gap-8">
        {/* Current Subscription */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Subscription</h2>
          
          {subscriptionLoading ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Subscription...</h3>
              <p className="text-gray-600">Checking your current plan status</p>
            </div>
          ) : subscription && currentPlan && isActive ? (
            // Active Subscription Display
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900">{currentPlan.name} Plan</h3>
                  <p className="text-2xl font-bold text-green-600">
                    {formatPrice(currentPlan.monthlyPrice)}
                    <span className="text-sm font-normal text-gray-600">/month</span>
                  </p>
                  {isTrial && (
                    <p className="text-sm text-orange-600 font-medium">
                      Trial: {trialDaysRemaining} days remaining
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Status</span>
                    <span className={`text-sm font-medium capitalize ${
                      subscription.status === 'active' ? 'text-green-600' : 
                      subscription.status === 'trial' ? 'text-orange-600' : 'text-red-600'
                    }`}>
                      {subscription.status === 'trial' ? `Trial (${trialDaysRemaining} days left)` : subscription.status}
                    </span>
                  </div>
                  {subscription.nextPaymentDate && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Next billing</span>
                      <span className="text-sm font-medium">{formatDate(subscription.nextPaymentDate)}</span>
                    </div>
                  )}
                  {subscription.paymentProviderId && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Payment ID</span>
                      <span className="text-xs font-mono text-gray-500">
                        {subscription.paymentProviderId.substring(0, 12)}...
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Plan Features</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {features && (
                      <>
                        <div className={`flex items-center space-x-1 ${features.inventory ? 'text-green-600' : 'text-gray-400'}`}>
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span>Inventory</span>
                        </div>
                        <div className={`flex items-center space-x-1 ${features.pos ? 'text-green-600' : 'text-gray-400'}`}>
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span>Point of Sale</span>
                        </div>
                        <div className={`flex items-center space-x-1 ${features.purchaseOrders ? 'text-green-600' : 'text-gray-400'}`}>
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span>Purchase Orders</span>
                        </div>
                        <div className={`flex items-center space-x-1 ${features.advancedAnalytics ? 'text-green-600' : 'text-gray-400'}`}>
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span>Analytics</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Current Usage</h4>
                  <div className="space-y-2 text-sm">
                    {limits && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Users</span>
                          <span className="font-medium">
                            {subscription.currentUsage?.users || 1} / {limits.maxUsers === -1 ? 'Unlimited' : limits.maxUsers}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Locations</span>
                          <span className="font-medium">
                            {subscription.currentUsage?.locations || 1} / {limits.maxLocations === -1 ? 'Unlimited' : limits.maxLocations}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Products</span>
                          <span className="font-medium">
                            {subscription.currentUsage?.products || 0} / {limits.maxProducts === -1 ? 'Unlimited' : limits.maxProducts}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <button className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    Manage PayPal Subscription
                  </button>
                  <button className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
                    Change Plan
                  </button>
                  <p className="text-xs text-gray-600 text-center">
                    Cancel anytime. No long-term contracts.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            // No Active Subscription
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Subscription</h3>
              <p className="text-gray-600 mb-4">
                {subscription && subscription.status === 'canceled' 
                  ? 'Your subscription has been cancelled. Reactivate to continue using premium features.'
                  : 'You\'re currently using the free version of CoreTrack'
                }
              </p>
              <button 
                onClick={() => handleUpgrade('professional')}
                className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors"
              >
                {subscription && subscription.status === 'canceled' ? 'Reactivate Subscription' : 'Choose a Plan'}
              </button>
            </div>
          )}
        </div>

        {/* Payment Methods */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Subscription Billing</h2>
              <p className="text-sm text-gray-600 mt-1">Automated PayPal subscription billing for Philippine businesses</p>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500 mb-1">Philippines-Optimized</div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-4 bg-blue-600 rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">PP</span>
                </div>
                <span className="text-sm font-medium text-gray-700">PayPal Only</span>
              </div>
            </div>
          </div>

          {/* PayPal Subscription Billing */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200 mb-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-8 bg-blue-600 rounded flex items-center justify-center">
                <span className="text-white text-xs font-bold">PayPal</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">PayPal Subscription Billing</h3>
                <p className="text-sm text-gray-600">Automated monthly payments with 7-day grace period</p>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Automatic monthly billing</span>
                </div>
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Secure international payments</span>
                </div>
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">No BIR/DTI compliance required</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">7-day grace period for failed payments</span>
                </div>
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Manual invoice backup available</span>
                </div>
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">Easy cancellation anytime</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-blue-200">
              <button
                onClick={() => handleAddPaymentMethod('PayPal')}
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                Connect PayPal Subscription
              </button>
            </div>
          </div>
        </div>

        {/* Subscription Plans */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Available Plans</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            {SUBSCRIPTION_PLANS.map((plan) => {
              const isCurrentPlan = subscription?.planId === plan.id
              const isPlanActive = subscription && isActive && isCurrentPlan
              
              return (
                <div 
                  key={plan.id}
                  className={`rounded-lg p-6 transition-colors relative ${
                    isCurrentPlan 
                      ? 'border-2 border-green-500 bg-green-50' 
                      : plan.id === 'professional' && !isCurrentPlan
                        ? 'border-2 border-blue-500 bg-blue-50'
                        : 'border border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {isCurrentPlan && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                        Current Plan
                      </span>
                    </div>
                  )}
                  {plan.id === 'professional' && !isCurrentPlan && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                        Most Popular
                      </span>
                    </div>
                  )}
                  
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                    <div className="mt-2">
                      <span className="text-3xl font-bold text-gray-900">{formatPrice(plan.monthlyPrice)}</span>
                      <span className="text-gray-600">/month</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      {plan.id === 'starter' && 'Perfect for solo coffee shop owners'}
                      {plan.id === 'professional' && 'For growing coffee shop teams'}
                      {plan.id === 'enterprise' && 'For multiple locations & chains'}
                    </p>
                  </div>

                  <ul className="space-y-2 mb-6 text-sm">
                    <li className="flex items-center space-x-2">
                      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>
                        {plan.limits.maxUsers === -1 ? 'Unlimited' : plan.limits.maxUsers} Users, {' '}
                        {plan.limits.maxLocations === -1 ? 'Unlimited' : plan.limits.maxLocations} Location{plan.limits.maxLocations !== 1 ? 's' : ''}
                      </span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>
                        {plan.limits.maxProducts === -1 ? 'Unlimited' : plan.limits.maxProducts} Products, {' '}
                        {plan.limits.maxOrders === -1 ? 'Unlimited' : plan.limits.maxOrders} Orders
                      </span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>
                        {plan.features.inventory && plan.features.pos ? 'Inventory & POS' : ''}
                        {plan.features.purchaseOrders ? ', Purchase Orders' : ''}
                        {plan.features.expenses ? ', Expenses' : ''}
                      </span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>
                        {plan.features.basicAnalytics ? 'Advanced Analytics' : ''}
                        {plan.features.customReports ? ', Custom Reports' : ''}
                        {plan.features.apiAccess ? ', API Access' : ''}
                        {!plan.features.basicAnalytics && plan.features.emailSupport ? 'Email Support' : ''}
                      </span>
                    </li>
                  </ul>

                  <button 
                    disabled={isCurrentPlan}
                    onClick={() => !isCurrentPlan && handleUpgrade(plan.id)}
                    className={`w-full py-2 px-4 rounded-lg transition-colors font-medium ${
                      isCurrentPlan
                        ? 'bg-green-100 text-green-800 cursor-default'
                        : plan.id === 'professional'
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : plan.id === 'enterprise'
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-gray-600 text-white hover:bg-gray-700'
                    }`}
                  >
                    {isCurrentPlan ? 'Current Plan' : 'Subscribe with PayPal'}
                  </button>
                </div>
              )
            })}
          </div>

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <h4 className="font-medium text-yellow-800">Philippine Business Optimized</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  All plans include 7-day grace period for late payments. No BIR/DTI registration required. 
                  PayPal handles all tax compliance automatically.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Billing History */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Billing History</h2>
          
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Billing History</h3>
            <p className="text-gray-600">Your billing history will appear here once you start a subscription</p>
          </div>
        </div>

        {/* Billing Information */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Billing Information</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Name
              </label>
              <input
                type="text"
                placeholder="Enter your business name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tax ID
              </label>
              <input
                type="text"
                placeholder="Enter your tax ID"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Billing Address
              </label>
              <textarea
                rows={3}
                placeholder="Enter your complete billing address"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-200">
            <button className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors">
              Save Billing Information
            </button>
          </div>
        </div>
      </div>

      {/* PayPal Subscription Upgrade Modal */}
      {showUpgradeModal && selectedPlanId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Subscribe to Plan</h2>
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Secure payment processing by PayPal. Cancel anytime, no long-term contracts.
              </p>
            </div>
            
            <div className="p-6">
              <PayPalCreditCardFields
                planId={selectedPlanId}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                onCancel={() => setShowUpgradeModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
