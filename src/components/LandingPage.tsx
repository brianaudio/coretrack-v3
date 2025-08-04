'use client'

import { useState, useEffect } from 'react'
import CoreTrackLogo from './CoreTrackLogo'
import { trackButtonClick, trackPageView, trackScrollDepth } from '../lib/analytics'

interface LandingPageProps {
  onGetStarted: () => void
  onSignIn: () => void
}

export default function LandingPage({ onGetStarted, onSignIn }: LandingPageProps) {
  const [showVideo, setShowVideo] = useState(false)

  // Track page view and scroll depth on mount
  useEffect(() => {
    trackPageView()
    const cleanup = trackScrollDepth()
    return cleanup
  }, [])

  // Enhanced onGetStarted with analytics
  const handleGetStarted = (location: string, buttonText: string = 'Start Free Trial') => {
    trackButtonClick(location, buttonText)
    onGetStarted()
  }

  // Enhanced onSignIn with analytics
  const handleSignIn = (location: string = 'Navigation') => {
    trackButtonClick(location, 'Sign In')
    onSignIn()
  }

  const features = [
    {
      icon: '🏪',
      title: 'Point of Sale',
      description: 'iPad-optimized POS system with touch-friendly interface and quick order processing',
      benefits: ['Fast checkout', 'Multiple payment methods', 'Receipt printing', 'Order modifications']
    },
    {
      icon: '📦',
      title: 'Inventory Management',
      description: 'Real-time inventory tracking with automated alerts and reorder suggestions',
      benefits: ['Live stock monitoring', 'Low stock alerts', 'Usage analytics', 'Cost tracking']
    },
    {
      icon: '📊',
      title: 'Analytics & Reports',
      description: 'Comprehensive business insights with sales trends and performance metrics',
      benefits: ['Sales dashboards', 'Profit analysis', 'Trend forecasting', 'Export reports']
    },
    {
      icon: '👥',
      title: 'Team Management',
      description: 'Role-based access control with shift management and staff accountability',
      benefits: ['User roles', 'Shift tracking', 'Performance monitoring', 'Security controls']
    },
    {
      icon: '🍽️',
      title: 'Menu Builder',
      description: 'Create and manage your menu items with recipe tracking and cost calculation',
      benefits: ['Recipe management', 'Cost calculation', 'Menu optimization', 'Ingredient tracking']
    },
    {
      icon: '💰',
      title: 'Financial Tracking',
      description: 'Complete financial oversight with expense tracking and profit monitoring',
      benefits: ['Expense management', 'Profit tracking', 'Budget monitoring', 'Financial reports']
    }
  ]

  const testimonials = [
    {
      name: 'Maria Santos',
      business: 'Café Luna, Manila',
      avatar: '👩‍💼',
      quote: 'CoreTrack transformed our café operations. We reduced inventory waste by 40% and increased profits by ₱35,000 per month. The ROI was incredible!',
      rating: 5,
      results: { metric: 'Profit Increase', value: '₱35K/month', period: '3 months' }
    },
    {
      name: 'John Rivera',
      business: 'Rivera\'s Food Truck',
      avatar: '👨‍🍳',
      quote: 'The mobile-first design is perfect for our food truck. Easy to use even during busy lunch rushes. Sales tracking helped us identify our best locations.',
      rating: 5,
      results: { metric: 'Sales Growth', value: '+60%', period: '6 months' }
    },
    {
      name: 'Anna Dela Cruz',
      business: 'Bistro Delights',
      avatar: '👩‍🍳',
      quote: 'Staff management and shift tracking helped us identify and prevent inventory theft. We saved ₱25,000 in the first month alone. Excellent ROI!',
      rating: 5,
      results: { metric: 'Cost Savings', value: '₱25K/month', period: '1 month' }
    }
  ]

  // Pricing toggle state
  const [isAnnual, setIsAnnual] = useState(false);

  const pricingPlans = [
    {
      name: 'Starter',
      monthlyPrice: 69,
      annualPrice: 59, // 14% discount
      period: isAnnual ? '/month (billed annually)' : '/month',
      description: 'Basic POS for single-location cafés',
      targetRevenue: 'For small cafés earning ₱200K-500K/month',
      annualSavings: '₱120/year',
      features: [
        'iPad POS System (1 device only)',
        'Basic Inventory (80 items max)',
        'Simple Menu (30 items max)',
        'Daily Sales Reports',
        'Cash & Basic Payment Processing',
        '1 User Account (owner only)',
        '1 Location Only',
        'Email Support Only',
        'No Team Management'
      ],
      popular: false,
      cta: 'Start Free Trial',
      savings: 'Basic solution for getting started',
      upgradePrompt: 'Limited features - most businesses need more'
    },
    {
      name: 'Professional',
      monthlyPrice: 179,
      annualPrice: 149, // 17% discount
      period: isAnnual ? '/month (billed annually)' : '/month',
      description: 'Complete solution for growing restaurants',
      targetRevenue: 'For businesses earning ₱500K-3M/month',
      annualSavings: '₱360/year',
      features: [
        'Everything in Starter PLUS:',
        'Unlimited POS Devices',
        'Unlimited Menu Items',
        'Unlimited Inventory Management',
        'Advanced Analytics & Forecasting',
        'Multi-Location Dashboard (up to 5)',
        'Recipe & Cost Management',
        'Team Management (unlimited users)',
        'Employee Scheduling & Time Tracking',
        'Customer Database & Loyalty Programs',
        'Purchase Orders & Supplier Management',
        'Priority Phone & Chat Support'
      ],
      popular: true,
      cta: 'Start Free Trial - Most Popular',
      savings: 'ROI: ₱35,000+ monthly profit increase',
      upgradePrompt: 'Complete restaurant management solution'
    },
    {
      name: 'Enterprise',
      monthlyPrice: 399,
      annualPrice: 329, // 18% discount
      period: isAnnual ? '/month (billed annually)' : '/month',
      description: 'Advanced features for restaurant chains',
      targetRevenue: 'For businesses earning ₱3M+ monthly',
      annualSavings: '₱840/year',
      features: [
        'Everything in Professional PLUS:',
        'Unlimited Locations',
        'Full API Access & Webhooks',
        'White-Label Branding Options',
        'Advanced Security & SSO Integration',
        'Custom Integrations & Reports',
        'Dedicated Account Manager',
        'Franchise Management Tools',
        'Advanced Analytics & AI Insights',
        'Custom Training & Onboarding',
        '24/7 Priority Support',
        'SLA Guarantees & Custom Features'
      ],
      popular: false,
      cta: 'Contact Sales',
      savings: 'Enterprise ROI: ₱100,000+ monthly optimization',
      upgradePrompt: 'Full-scale enterprise solution'
    }
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <CoreTrackLogo size="sm" />
              <span className="text-xl font-bold text-gray-900">CoreTrack</span>
            </div>
            <div className="flex items-center space-x-4">
              <a href="#features" className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium">
                Features
              </a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium">
                Pricing
              </a>
              <a href="#testimonials" className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium">
                Reviews
              </a>
              <button
                onClick={() => handleSignIn('Navigation')}
                className="text-primary-600 hover:text-primary-700 px-3 py-2 text-sm font-medium"
              >
                Sign In
              </button>
              <button
                onClick={() => handleGetStarted('Navigation Header', 'Get Started Free')}
                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Get Started Free
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-50 to-blue-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 mb-6">
                <span className="w-2 h-2 bg-green-600 rounded-full mr-2 animate-pulse"></span>
                Join 500+ Philippine businesses increasing profits by 25%
              </div>
              
              <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
                Increase Restaurant Profits by 25%
                <span className="text-primary-600 block">in Just 30 Days</span>
              </h1>
              
              <p className="text-xl text-gray-600 mb-6">
                Stop losing money on inventory waste and inefficient operations. CoreTrack&apos;s AI-powered 
                system helps Philippine food businesses reduce costs and maximize profits automatically.
              </p>
              
              <div className="flex items-center space-x-6 mb-8">
                <div className="flex items-center text-green-600">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <span className="font-semibold">No Credit Card Required</span>
                </div>
                <div className="flex items-center text-green-600">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <span className="font-semibold">Setup in 5 Minutes</span>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <button
                  onClick={() => handleGetStarted('Hero Section', 'Start Free Trial - No Credit Card Required')}
                  className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center group"
                  aria-label="Start your 14-day free trial of CoreTrack"
                >
                  Start Free Trial - No Credit Card Required
                  <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </button>
                <button
                  onClick={() => setShowVideo(true)}
                  className="bg-white hover:bg-gray-50 text-gray-900 px-8 py-4 rounded-lg font-semibold text-lg border border-gray-200 transition-all duration-200 flex items-center justify-center group hover:shadow-md"
                >
                  <svg className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                  Watch Demo
                </button>
              </div>
              
              <div className="flex items-center text-sm text-gray-500">
                <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                No credit card required • Cancel anytime • Full access during trial
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl p-6 transform rotate-2 hover:rotate-0 transition-transform duration-300">
                <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Live Dashboard</h3>
                    <p className="text-gray-600">Real-time business insights</p>
                  </div>
                </div>
              </div>
              
              {/* Floating Stats Cards */}
              <div className="absolute -top-4 -left-4 bg-white rounded-lg shadow-lg p-4 z-10">
                <div className="flex items-center text-green-600">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M2 12l3-3 4 4 6-6 7 7v-4h4v12H4v-12z"/>
                  </svg>
                  <span className="text-sm font-semibold">+25% Profit</span>
                </div>
              </div>
              
              <div className="absolute -bottom-4 -right-4 bg-white rounded-lg shadow-lg p-4 z-10">
                <div className="flex items-center text-blue-600">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  <span className="text-sm font-semibold">5-Star Rating</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Run Your Business
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From point-of-sale to inventory management, CoreTrack provides all the tools 
              you need to streamline operations and boost profitability.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow h-full flex flex-col">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 mb-4 flex-grow">{feature.description}</p>
                <ul className="space-y-2 mt-auto">
                  {feature.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-start text-sm text-gray-600">
                      <svg className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      <span className="break-words">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gradient-to-r from-primary-600 to-blue-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          {/* Trust Badges */}
          <div className="flex justify-center items-center space-x-8 mb-12 opacity-80">
            <div className="flex items-center text-white">
              <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1M10 17L6 13L7.41 11.59L10 14.17L16.59 7.58L18 9L10 17Z"/>
              </svg>
              <span className="text-sm font-medium">SSL Secured</span>
            </div>
            <div className="flex items-center text-white">
              <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 12L11 14L15 10M21 12C21 16.97 16.97 21 12 21C7.03 21 3 16.97 3 12C3 7.03 7.03 3 12 3C16.97 3 21 7.03 21 12Z"/>
              </svg>
              <span className="text-sm font-medium">BSP Compliant</span>
            </div>
            <div className="flex items-center text-white">
              <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12,17A2,2 0 0,0 14,15C14,13.89 13.1,13 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10C4,8.89 4.9,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z"/>
              </svg>
              <span className="text-sm font-medium">Data Protected</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div className="group">
              <div className="text-4xl font-bold text-white mb-2 group-hover:scale-110 transition-transform">500+</div>
              <div className="text-primary-100">Active Businesses</div>
              <div className="text-xs text-primary-200 mt-1">Growing daily</div>
            </div>
            <div className="group">
              <div className="text-4xl font-bold text-white mb-2 group-hover:scale-110 transition-transform">₱50M+</div>
              <div className="text-primary-100">Transactions Processed</div>
              <div className="text-xs text-primary-200 mt-1">Monthly volume</div>
            </div>
            <div className="group">
              <div className="text-4xl font-bold text-white mb-2 group-hover:scale-110 transition-transform">25%</div>
              <div className="text-primary-100">Average Profit Increase</div>
              <div className="text-xs text-primary-200 mt-1">Within 90 days</div>
            </div>
            <div className="group">
              <div className="text-4xl font-bold text-white mb-2 group-hover:scale-110 transition-transform">99.9%</div>
              <div className="text-primary-100">Uptime Guarantee</div>
              <div className="text-xs text-primary-200 mt-1">24/7 reliability</div>
            </div>
          </div>
          
          {/* Real-time Activity Feed */}
          <div className="mt-12 text-center">
            <div className="inline-flex items-center bg-white bg-opacity-20 backdrop-blur-sm rounded-full px-6 py-3 text-white">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-3 animate-pulse"></div>
              <span className="text-sm font-medium">124 businesses joined CoreTrack this week</span>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Loved by Philippine Businesses
            </h2>
            <p className="text-xl text-gray-600">
              See how CoreTrack is transforming businesses across the Philippines
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-lg h-full flex flex-col border-l-4 border-primary-500 hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="text-3xl mr-3 flex-shrink-0">{testimonial.avatar}</div>
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 truncate">{testimonial.name}</div>
                      <div className="text-sm text-gray-600 break-words">{testimonial.business}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">{testimonial.results.value}</div>
                    <div className="text-xs text-gray-500">{testimonial.results.metric}</div>
                  </div>
                </div>
                
                <div className="flex mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  ))}
                  <span className="ml-2 text-sm text-gray-600">Verified Customer</span>
                </div>
                
                <p className="text-gray-700 italic flex-grow leading-relaxed mb-4">&ldquo;{testimonial.quote}&rdquo;</p>
                
                <div className="mt-auto pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Results in {testimonial.results.period}</span>
                    <div className="flex items-center text-green-600">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      <span className="font-medium">Verified Results</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Additional Social Proof */}
          <div className="mt-16 text-center">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">4.9/5</div>
                  <div className="text-sm text-gray-600">Average Rating</div>
                  <div className="flex justify-center mt-1">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">95%</div>
                  <div className="text-sm text-gray-600">Customer Retention</div>
                  <div className="text-xs text-gray-500 mt-1">Stay with us long-term</div>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">24/7</div>
                  <div className="text-sm text-gray-600">Support Available</div>
                  <div className="text-xs text-gray-500 mt-1">Always here to help</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600 mb-6">
              Choose the plan that fits your business size. All plans include a 14-day free trial.
            </p>
            <div className="inline-flex items-center bg-green-50 border border-green-200 rounded-full px-6 py-2 text-green-800">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span className="text-sm font-medium">All plans include 14-day free trial • No credit card required</span>
            </div>
          </div>
          
          {/* Pricing Toggle */}
          <div className="flex justify-center mb-12">
            <div className="bg-gray-100 p-1 rounded-lg flex items-center">
              <button
                onClick={() => setIsAnnual(false)}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                  !isAnnual 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Monthly Billing
              </button>
              <button
                onClick={() => setIsAnnual(true)}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all relative ${
                  isAnnual 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Annual Billing
                <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                  Save up to 18%
                </span>
              </button>
            </div>
          </div>
          
          {/* 3-Tier Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <div 
                key={index} 
                className={`rounded-2xl p-8 h-full flex flex-col relative transform transition-all duration-200 ${
                  plan.popular 
                    ? 'bg-primary-600 text-white ring-4 ring-primary-200 scale-105 shadow-2xl' 
                    : 'bg-white border border-gray-200 hover:shadow-xl hover:scale-102 transition-all'
                }`}
              >
                {plan.popular && (
                  <div className="text-center mb-4">
                    <span className="bg-white text-primary-600 px-3 py-1 rounded-full text-sm font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <div className="text-center mb-6">
                  <h3 className={`text-2xl font-bold mb-2 ${plan.popular ? 'text-white' : 'text-gray-900'}`}>
                    {plan.name}
                  </h3>
                  <div className={`text-4xl font-bold mb-2 ${plan.popular ? 'text-white' : 'text-gray-900'}`}>
                    ₱{isAnnual ? plan.annualPrice : plan.monthlyPrice}
                    <span className={`text-lg font-normal ${plan.popular ? 'text-primary-100' : 'text-gray-500'}`}>
                      {plan.period}
                    </span>
                  </div>
                  {isAnnual && (
                    <div className={`text-sm font-medium ${plan.popular ? 'text-green-200' : 'text-green-600'} mb-2`}>
                      Save {plan.annualSavings} vs monthly
                    </div>
                  )}
                  <p className={`${plan.popular ? 'text-primary-100' : 'text-gray-600'} mb-2`}>
                    {plan.description}
                  </p>
                  <div className={`text-xs font-medium ${plan.popular ? 'text-primary-200' : 'text-gray-500'} mb-2`}>
                    {plan.targetRevenue}
                  </div>
                  <div className={`text-sm font-medium ${plan.popular ? 'text-green-200' : 'text-green-600'}`}>
                    {plan.savings}
                  </div>
                </div>
                
                <ul className="space-y-3 mb-8 flex-grow">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start">
                      <svg 
                        className={`w-5 h-5 mr-3 mt-0.5 flex-shrink-0 ${plan.popular ? 'text-primary-200' : 'text-green-500'}`} 
                        fill="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      <span className={`${plan.popular ? 'text-primary-100' : 'text-gray-600'} break-words`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                
                <button
                  onClick={() => handleGetStarted(`Pricing ${plan.name}`, plan.cta)}
                  className={`w-full py-4 px-6 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 ${
                    plan.popular
                      ? 'bg-white text-primary-600 hover:bg-gray-100 shadow-lg'
                      : 'bg-primary-600 text-white hover:bg-primary-700 shadow-lg hover:shadow-xl'
                  }`}
                  aria-label={`Choose ${plan.name} plan and start free trial`}
                >
                  {plan.cta}
                </button>
                
                {plan.popular && (
                  <div className="mt-3 text-center">
                    <span className="text-xs text-primary-200">Most businesses choose this plan</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary-600 to-blue-600 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-black opacity-20"></div>
          <div className="absolute top-0 left-0 w-full h-full">
            <div className="w-96 h-96 bg-white opacity-10 rounded-full absolute -top-48 -left-48"></div>
            <div className="w-96 h-96 bg-white opacity-10 rounded-full absolute -bottom-48 -right-48"></div>
          </div>
        </div>
        
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8 relative">
          <div className="inline-flex items-center bg-white bg-opacity-20 backdrop-blur-sm rounded-full px-6 py-2 text-white mb-6">
            <span className="w-2 h-2 bg-green-400 rounded-full mr-3 animate-pulse"></span>
            <span className="text-sm font-medium">Limited Time: Free Setup Assistance (₱5,000 value)</span>
          </div>
          
          <h2 className="text-3xl lg:text-5xl font-bold text-white mb-6">
            Stop Losing Money on Manual Operations
          </h2>
          <p className="text-xl text-primary-100 mb-4">
            Join 500+ Philippine businesses already using CoreTrack to increase profits by 25%.
            Start your 14-day free trial today - no credit card required.
          </p>
          
          <div className="flex items-center justify-center space-x-8 mb-8 text-primary-100">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span className="text-sm">5-minute setup</span>
            </div>
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span className="text-sm">Cancel anytime</span>
            </div>
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span className="text-sm">24/7 support</span>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <button
              onClick={() => handleGetStarted('Final CTA', 'Start Free Trial - Increase Profits Today')}
              className="bg-white text-primary-600 px-10 py-5 rounded-lg font-bold text-xl hover:bg-gray-100 transition-all duration-200 shadow-2xl hover:shadow-3xl transform hover:-translate-y-1 flex items-center justify-center group"
              aria-label="Start your free trial of CoreTrack"
            >
              Start Free Trial - Increase Profits Today
              <svg className="w-6 h-6 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
            <button
              onClick={() => handleSignIn('Final CTA')}
              className="bg-transparent border-2 border-white text-white px-8 py-5 rounded-lg font-semibold text-lg hover:bg-white hover:text-primary-600 transition-all duration-200"
            >
              Sign In to Your Account
            </button>
          </div>
          
          <div className="text-center">
            <p className="text-primary-200 text-sm mb-2">
              14-day free trial • No credit card required • Setup assistance included
            </p>
            <div className="flex items-center justify-center text-xs text-primary-300">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1M10 17L6 13L7.41 11.59L10 14.17L16.59 7.58L18 9L10 17Z"/>
              </svg>
              <span>Trusted by 500+ businesses • BSP compliant • SSL secured</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <CoreTrackLogo size="sm" />
                <span className="text-xl font-bold text-white">CoreTrack</span>
              </div>
              <p className="text-gray-400">
                Complete business management solution for Philippine restaurants, cafés, and food businesses.
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#features" className="hover:text-white">Features</a></li>
                <li><a href="#pricing" className="hover:text-white">Pricing</a></li>
                <li><a href="#" className="hover:text-white">Security</a></li>
                <li><a href="#" className="hover:text-white">Integrations</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Help Center</a></li>
                <li><a href="#" className="hover:text-white">Contact Us</a></li>
                <li><a href="#" className="hover:text-white">Training</a></li>
                <li><a href="#" className="hover:text-white">API Docs</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">About Us</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Careers</a></li>
                <li><a href="#" className="hover:text-white">Privacy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 mt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-400">
                © 2025 CoreTrack. All rights reserved.
              </p>
              <div className="flex space-x-6 mt-4 md:mt-0">
                <a href="#" className="text-gray-400 hover:text-white">
                  <span className="sr-only">Facebook</span>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/>
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white">
                  <span className="sr-only">Twitter</span>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"/>
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white">
                  <span className="sr-only">LinkedIn</span>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Video Modal */}
      {showVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">CoreTrack Demo</h3>
              <button
                onClick={() => setShowVideo(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-primary-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
                <p className="text-gray-600">Demo video coming soon!</p>
                <p className="text-sm text-gray-500 mt-2">
                  In the meantime, start your free trial to explore all features.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
