// Gemini Pro AI Chat Service for CoreTrack
// Enterprise-grade AI assistant with context awareness and learning capabilities

import { AIDataService } from './dataService'

interface ChatContext {
  userRole?: string
  businessType?: string
  currentPage?: string
  tenantId?: string
  subscriptionPlan?: string
}

interface ChatMessage {
  content: string
  context: ChatContext
}

interface AIResponse {
  response: string
  confidence: number
  suggestions?: string[]
}

interface RateLimitInfo {
  requestCount: number
  lastReset: number
  dailyCount: number
  lastDayReset: number
  isBlocked: boolean
  blockUntil?: number
}

interface PerTenantRateLimit {
  [tenantId: string]: RateLimitInfo
}

class ChatService {
  private readonly geminiApiKey: string
  private readonly primaryModel = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'
  private readonly fallbackModel = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent'
  private knowledgeBase = new Map<string, string>()
  private conversationHistory: Array<{ user: string, ai: string }> = []
  
  // Per-tenant rate limiting
  private tenantRateLimits: PerTenantRateLimit = {}
  private readonly MAX_REQUESTS_PER_MINUTE = 12  // Per tenant
  private readonly MAX_REQUESTS_PER_DAY = 400    // Per tenant
  private readonly ENTERPRISE_DAILY_LIMIT = 1000 // Higher limit for Enterprise
  private requestQueue: Array<() => Promise<void>> = []
  private isProcessingQueue = false
  
  // Automatic cleanup schedule
  private cleanupInterval: NodeJS.Timeout | null = null
  private readonly CLEANUP_INTERVAL_MS = 3600000 // 1 hour
  private readonly TENANT_INACTIVE_THRESHOLD = 86400000 * 7 // 7 days

  constructor() {
    // In production, this would come from environment variables
    this.geminiApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''
    this.initializeKnowledgeBase()
    this.startAutomaticCleanup()
  }

  // Automatic cleanup and reset schedule
  private startAutomaticCleanup(): void {
    // Start cleanup interval for inactive tenants
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveTenants()
    }, this.CLEANUP_INTERVAL_MS)
    
    console.log('🔄 Automatic rate limit cleanup scheduled (every hour)')
  }

  private cleanupInactiveTenants(): void {
    const now = Date.now()
    let cleanedCount = 0
    
    Object.keys(this.tenantRateLimits).forEach(tenantId => {
      const rateLimit = this.tenantRateLimits[tenantId]
      
      // Check if tenant has been inactive for more than threshold
      const lastActivity = Math.max(rateLimit.lastReset, rateLimit.lastDayReset)
      if (now - lastActivity > this.TENANT_INACTIVE_THRESHOLD) {
        delete this.tenantRateLimits[tenantId]
        cleanedCount++
      }
    })
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} inactive tenant rate limits`)
    }
  }

  // Cleanup on instance destruction
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
      console.log('🔄 Automatic cleanup stopped')
    }
  }

  // Rate limiting methods - Per Tenant
  private getTenantRateLimit(tenantId: string, subscriptionPlan?: string): RateLimitInfo {
    if (!this.tenantRateLimits[tenantId]) {
      this.tenantRateLimits[tenantId] = {
        requestCount: 0,
        lastReset: Date.now(),
        dailyCount: 0,
        lastDayReset: Date.now(),
        isBlocked: false
      }
    }
    return this.tenantRateLimits[tenantId]
  }

  private getTenantDailyLimit(subscriptionPlan?: string): number {
    // Enterprise subscribers get higher limits
    if (subscriptionPlan === 'enterprise') {
      return this.ENTERPRISE_DAILY_LIMIT
    }
    return this.MAX_REQUESTS_PER_DAY
  }

  private checkRateLimit(tenantId: string, subscriptionPlan?: string): { canProceed: boolean; waitTime?: number } {
    const now = Date.now()
    const rateLimit = this.getTenantRateLimit(tenantId, subscriptionPlan)
    const dailyLimit = this.getTenantDailyLimit(subscriptionPlan)
    
    // Reset counters if needed
    if (now - rateLimit.lastReset > 60000) { // 1 minute
      rateLimit.requestCount = 0
      rateLimit.lastReset = now
    }
    
    if (now - rateLimit.lastDayReset > 86400000) { // 24 hours
      rateLimit.dailyCount = 0
      rateLimit.lastDayReset = now
    }
    
    // Check if blocked
    if (rateLimit.isBlocked && rateLimit.blockUntil) {
      if (now < rateLimit.blockUntil) {
        return { canProceed: false, waitTime: rateLimit.blockUntil - now }
      } else {
        rateLimit.isBlocked = false
        rateLimit.blockUntil = undefined
      }
    }
    
    // Check limits
    if (rateLimit.requestCount >= this.MAX_REQUESTS_PER_MINUTE) {
      rateLimit.isBlocked = true
      rateLimit.blockUntil = now + (60000 - (now - rateLimit.lastReset))
      return { canProceed: false, waitTime: rateLimit.blockUntil - now }
    }
    
    if (rateLimit.dailyCount >= dailyLimit) {
      rateLimit.isBlocked = true
      rateLimit.blockUntil = now + (86400000 - (now - rateLimit.lastDayReset))
      return { canProceed: false, waitTime: rateLimit.blockUntil - now }
    }
    
    return { canProceed: true }
  }
  
  private incrementRateLimit(tenantId: string): void {
    const rateLimit = this.getTenantRateLimit(tenantId)
    rateLimit.requestCount++
    rateLimit.dailyCount++
  }
  
  private async processRequestQueue(): Promise<void> {
    if (this.isProcessingQueue) return
    
    this.isProcessingQueue = true
    
    while (this.requestQueue.length > 0) {
      // Note: For queue processing, we'd need tenant context
      // This is more complex in a per-tenant system
      const request = this.requestQueue.shift()
      if (request) {
        try {
          await request()
          // Small delay between requests to be respectful
          await new Promise(resolve => setTimeout(resolve, 500))
        } catch (error) {
          console.error('Request queue processing error:', error)
        }
      }
    }
    
    this.isProcessingQueue = false
  }

  private initializeKnowledgeBase() {
    this.knowledgeBase = new Map([
      // INVENTORY MANAGEMENT - Professional & Comprehensive
      ['add inventory', '📦 **Adding Inventory Items - Professional Guide:**\n\n1. Navigate to **Inventory Center** from the sidebar\n2. Click **"Add Item"** button (top-right)\n3. **Essential Information:**\n   - Item Name & Description\n   - Category (for organization)\n   - Unit of Measure (pcs, kg, liters)\n   - Cost Price & Selling Price\n   - Current Stock Quantity\n   - Minimum Stock Threshold\n\n**💡 Pro Tips:**\n- Use consistent naming conventions\n- Set realistic reorder points to avoid stockouts\n- Add supplier information for easy reordering\n- Upload clear product images for POS identification'],
      
      // POS SYSTEM
      ['pos order', '🛒 **Processing POS Orders - Step by Step:**\n\n1. **Start New Order:**\n   - Navigate to POS from sidebar\n   - Click "New Order" or tap items directly\n\n2. **Add Items:**\n   - Search by name or scan barcode\n   - Adjust quantities as needed\n   - Apply discounts if required\n\n3. **Payment Processing:**\n   - Select payment method (Cash, Card, Digital)\n   - Enter amount received\n   - Generate receipt automatically\n\n**🎯 Best Practices:**\n- Always verify order details before payment\n- Use quick-add buttons for frequent items\n- Enable receipt printing/email for customers'],
      
      // CAPITAL INTELLIGENCE
      ['analytics', '📊 **Capital Intelligence Dashboard:**\n\n**Key Metrics Available:**\n- Daily/Weekly/Monthly sales velocity\n- Inventory turnover rates\n- Profit margin analysis\n- Cash flow insights\n- Top-performing products\n\n**How to Read Your Analytics:**\n- Green indicators = Good performance\n- Yellow = Needs attention\n- Red = Requires immediate action\n\n**💰 Money Flow Analysis:**\nTracks how efficiently your capital moves through inventory to sales. Higher velocity = better cash flow.'],
      
      // TEAM MANAGEMENT
      ['team management', '👥 **Team Member Management:**\n\n1. **Adding Staff:**\n   - Go to Settings → Team\n   - Click "Add Member"\n   - Set role (Manager, Cashier, Staff)\n   - Define permissions\n\n2. **Role Permissions:**\n   - **Manager:** Full access to all features\n   - **Cashier:** POS + basic inventory viewing\n   - **Staff:** Limited inventory access\n\n3. **Performance Tracking:**\n   - View individual sales performance\n   - Monitor login times and activity\n   - Track POS transactions by user'],
      
      // BILLING & SUBSCRIPTION
      ['billing', '💳 **Subscription & Billing:**\n\n**Available Plans:**\n- **Starter (₱89/month):** Solo coffee shops, up to 100 products\n- **Professional (₱199/month):** Growing teams, advanced analytics\n- **Enterprise (₱349/month):** Multiple locations, full features\n\n**Payment Methods:**\n- PayPal (primary) - No BIR/DTI required\n- PayPal.me (backup option)\n- All major credit cards supported\n\n**Manage Subscription:**\n- Upgrade/downgrade anytime\n- Cancel through PayPal dashboard\n- 7-day grace period for failed payments'],
      
      // TROUBLESHOOTING
      ['sync issues', '🔄 **Data Sync Troubleshooting:**\n\n**Common Issues & Solutions:**\n1. **Inventory not updating:** Refresh page, check internet connection\n2. **POS orders missing:** Verify user permissions, check sync status\n3. **Analytics delayed:** Data updates every 5 minutes\n\n**Force Sync:**\n- Click refresh icon in top bar\n- Log out and back in\n- Check browser developer console for errors'],
      
      // CORETRACK FEATURES
      ['features', '🚀 **CoreTrack Feature Overview:**\n\n**📦 Inventory Center:**\n- Real-time stock tracking\n- Automatic reorder alerts\n- Supplier management\n- Cost analysis\n\n**🛒 Point of Sale:**\n- iPad-optimized interface\n- Quick payment processing\n- Receipt generation\n- Sales reporting\n\n**📊 Capital Intelligence:**\n- Advanced business analytics\n- Money flow tracking\n- Performance insights\n- Trend forecasting\n\n**⚙️ Business Management:**\n- Team member controls\n- Multi-location support\n- Security settings'],
      
      // GETTING STARTED
      ['getting started', '🎯 **Getting Started with CoreTrack:**\n\n**Quick Setup (15 minutes):**\n1. **Add Your First Products** (5 min)\n   - Go to Inventory → Add Item\n   - Start with 5-10 main products\n\n2. **Set Up POS** (5 min)\n   - Navigate to POS system\n   - Test with sample transactions\n   - Configure payment methods\n\n3. **Add Team Members** (5 min)\n   - Settings → Team → Add Member\n   - Assign appropriate roles\n\n**🎓 Next Steps:**\n- Explore Capital Intelligence for insights\n- Set up supplier information\n- Customize receipt templates'],

      ['low stock', '⚠️ **Low Stock Management Strategy:**\n\n**Immediate Actions:**\n1. Go to **Inventory Center** → Filter by "Low Stock"\n2. Review items with red warning indicators\n3. Check sales velocity to prioritize reorders\n4. Contact suppliers for urgent restocking\n\n**Prevention Strategy:**\n- Set appropriate minimum stock thresholds\n- Monitor sales patterns for seasonal adjustments\n- Establish reliable supplier relationships\n- Consider automated reorder points\n\n**💰 Business Impact:** Preventing stockouts can increase revenue by 15-25% by avoiding lost sales.'],

      ['inventory reports', '📊 **Inventory Analytics & Reports:**\n\n**Key Reports Available:**\n1. **Stock Levels** - Current inventory status\n2. **Movement Report** - Fast/slow-moving items\n3. **Valuation Report** - Total inventory value\n4. **Low Stock Alert** - Items needing reorder\n5. **Supplier Analysis** - Performance by supplier\n\n**Business Intelligence:**\n- Identify top-performing products\n- Calculate inventory turnover ratio\n- Optimize purchasing decisions\n- Track seasonal demand patterns\n\n**Access:** Dashboard → Business Reports → Inventory Analytics'],

      // POS OPERATIONS - Filipino Business Context
      ['process order', '🛒 **Professional POS Order Processing:**\n\n**Step-by-Step Workflow:**\n1. **Item Selection:** Browse menu/inventory or use search\n2. **Cart Management:** Add items, adjust quantities, apply discounts\n3. **Customer Details:** Optional customer information for loyalty tracking\n4. **Payment Processing:** Select method (Cash, Card, GCash, Maya)\n5. **Receipt Generation:** Print or send digital receipt\n6. **Automatic Updates:** Inventory levels update in real-time\n\n**Filipino Payment Preferences:**\n- Cash: 65% of transactions\n- GCash: 20% and growing\n- Cards: 15% (higher in urban areas)\n\n**⚡ Efficiency Tips:** Use keyboard shortcuts and train staff on quick order processing.'],

      ['payment methods', '💳 **Philippine Payment Method Optimization:**\n\n**Supported Methods:**\n- **Cash** - Universal acceptance, instant settlement\n- **Credit/Debit Cards** - Professional image, secure transactions\n- **GCash** - Popular e-wallet, instant notifications\n- **Maya (PayMaya)** - Growing digital payment option\n- **Bank Transfer** - For larger B2B transactions\n\n**Cost Analysis:**\n- Cash: 0% fees, but cash handling costs\n- Cards: 2.5-3.5% processing fee\n- GCash: 1.5-2.5% fee, faster settlement\n- Maya: Similar to GCash, competitive rates\n\n**Configuration:** Settings → Payment Methods → Enable/Disable as needed'],

      ['gcash payment', '📱 **GCash Integration Benefits:**\n\n**Why GCash is Essential:**\n- 65M+ Filipino users (2024)\n- Instant payment confirmation\n- Reduced cash handling\n- Appeals to younger demographics\n- No physical change required\n\n**Business Advantages:**\n- Faster transaction processing\n- Automatic digital receipts\n- Real-time payment tracking\n- Reduced theft risk\n- Better cash flow management\n\n**Setup:** Settings → Payment Methods → Enable GCash → Enter merchant details\n\n**💡 Marketing Tip:** Display GCash acceptance prominently to attract digital-savvy customers.'],

      // TEAM MANAGEMENT - Philippine Work Culture
      ['add team member', '👥 **Professional Team Onboarding:**\n\n**Step-by-Step Process:**\n1. **Team Management** → "Add Team Member"\n2. **Required Information:**\n   - Full Name & Contact Details\n   - Position/Role Title\n   - Email Address (for login access)\n   - Phone Number\n   - Emergency Contact\n\n**Role Assignment:**\n- **Staff:** Basic POS and inventory access\n- **Supervisor:** Team oversight and reports\n- **Manager:** Full operational control\n- **Owner:** Complete system administration\n\n**📋 Philippine Employment Best Practices:**\n- Proper documentation (201 files)\n- SSS, PhilHealth, Pag-IBIG registration\n- Clear job descriptions and expectations\n- Regular performance reviews'],

      ['team roles', '🎯 **Role-Based Access Control (RBAC):**\n\n**Staff Level:**\n- Process POS transactions\n- View assigned inventory\n- Basic reporting access\n- Time tracking\n\n**Supervisor Level:**\n- All staff permissions\n- Team scheduling\n- Performance monitoring\n- Inventory adjustments\n\n**Manager Level:**\n- All supervisor permissions\n- Financial reports\n- Supplier management\n- Staff hiring/termination\n\n**Owner Level:**\n- Complete system access\n- Business settings\n- User management\n- Financial controls\n\n**💼 Management Tip:** Delegate appropriately but maintain oversight of critical business functions.'],

      // BUSINESS INTELLIGENCE - Growth Strategies
      ['increase sales', '🚀 **Data-Driven Sales Growth Strategies:**\n\n**Immediate Actions (Week 1-2):**\n1. **Analyze Top Performers:** Business Reports → Sales Analytics\n2. **Promote Bestsellers:** Feature high-margin items prominently\n3. **Bundle Products:** Create attractive combo offers\n4. **Staff Training:** Improve upselling techniques\n\n**Medium-term Strategy (Month 1-3):**\n- **Customer Segmentation:** Track preferences and buying patterns\n- **Seasonal Planning:** Prepare for holidays and events\n- **Inventory Optimization:** Focus on fast-moving, profitable items\n- **Marketing Integration:** Use sales data for targeted promotions\n\n**📈 Expected Results:** Businesses typically see 10-30% sales increase with proper data utilization.'],

      ['customer retention', '💝 **Philippine Customer Loyalty Strategies:**\n\n**Cultural Considerations:**\n- **Personal Relationships:** Filipinos value personal connections\n- **Family-Oriented:** Consider family packages and deals\n- **Value-Conscious:** Emphasize quality and fair pricing\n- **Social Influence:** Word-of-mouth is powerful\n\n**Retention Tactics:**\n1. **Loyalty Programs:** Points-based rewards system\n2. **Personalized Service:** Remember customer preferences\n3. **Quality Consistency:** Maintain high standards\n4. **Community Engagement:** Participate in local events\n5. **Digital Engagement:** Social media and mobile apps\n\n**💰 ROI:** Increasing retention by 5% can boost profits by 25-95%'],

      // FINANCIAL MANAGEMENT - Philippine Business Context
      ['financial reports', '💰 **Comprehensive Financial Analytics:**\n\n**Essential Reports:**\n1. **Daily Sales Summary** - Track daily performance\n2. **Profit & Loss Statement** - Monthly profitability\n3. **Cash Flow Analysis** - Monitor liquidity\n4. **Expense Breakdown** - Control operational costs\n5. **Tax Preparation Reports** - BIR compliance ready\n\n**Philippine Tax Considerations:**\n- VAT Registration (₱3M+ annual sales)\n- Quarterly Tax Returns\n- Annual Income Tax\n- Withholding Tax obligations\n\n**📊 KPI Monitoring:**\n- Gross Profit Margin: Target 60-70%\n- Inventory Turnover: 6-12x annually\n- Customer Acquisition Cost vs. Lifetime Value'],

      ['bir compliance', '🏛️ **BIR Compliance & Tax Management:**\n\n**Required Documents:**\n- Official Receipts (OR)\n- Sales Invoices (SI)\n- Delivery Receipts (DR)\n- Monthly Sales Reports\n- Quarterly VAT Returns\n\n**CoreTrack BIR Features:**\n- BIR-compliant receipt formatting\n- Automatic VAT calculations\n- Digital record keeping\n- Export capabilities for accountants\n- Audit trail maintenance\n\n**💡 Compliance Tips:**\n- Keep detailed transaction records\n- Regular backup of sales data\n- Consult with licensed accountants\n- Stay updated on BIR requirements'],

      // SYSTEM HELP & TROUBLESHOOTING
      ['getting started', '🎉 **Welcome to CoreTrack - Your Success Roadmap:**\n\n**Phase 1: Foundation (Days 1-3)**\n1. **Business Setup:** Configure company information\n2. **Payment Methods:** Enable preferred payment options\n3. **User Accounts:** Add team members with appropriate roles\n4. **Basic Training:** Familiarize staff with core functions\n\n**Phase 2: Inventory & Menu (Days 4-7)**\n1. **Product Catalog:** Add all inventory items\n2. **Menu Creation:** Build your POS menu\n3. **Pricing Strategy:** Set competitive yet profitable prices\n4. **Supplier Setup:** Configure vendor information\n\n**Phase 3: Operations (Week 2)**\n1. **Test Transactions:** Process sample orders\n2. **Staff Training:** Comprehensive system training\n3. **Go Live:** Start actual operations\n4. **Monitor & Optimize:** Track performance and adjust\n\n**🎯 Success Metrics:** Target 100% staff adoption within 2 weeks.'],

      ['support', '🤝 **Professional Support & Resources:**\n\n**Direct Support Channels:**\n- **Live Chat:** Available 24/7 for urgent issues\n- **Email Support:** support@coretrack.ph\n- **Phone Support:** +63 (02) 8XXX-XXXX\n- **Video Calls:** Scheduled technical assistance\n\n**Self-Service Resources:**\n- **Help Documentation:** Comprehensive guides\n- **Video Tutorials:** Step-by-step walkthroughs\n- **Community Forum:** Connect with other users\n- **Feature Requests:** Submit enhancement ideas\n\n**Enterprise Support:**\n- Dedicated account manager\n- Priority technical support\n- Custom training sessions\n- Implementation assistance\n\n**🌟 Commitment:** Your success is our priority. We understand Philippine business challenges and provide localized solutions.'],

      // ADVANCED FEATURES
      ['capital intelligence', '💎 **Capital Intelligence - Advanced Analytics:**\n\n**Financial Intelligence Features:**\n- **Cash Flow Forecasting:** Predict future liquidity needs\n- **Profitability Analysis:** Product and service margin analysis\n- **Investment ROI:** Evaluate equipment and expansion decisions\n- **Cost Optimization:** Identify expense reduction opportunities\n\n**Business Intelligence Insights:**\n- **Customer Lifetime Value:** Calculate long-term customer worth\n- **Market Trend Analysis:** Seasonal and demographic patterns\n- **Competitive Positioning:** Performance benchmarking\n- **Growth Opportunity Mapping:** Data-driven expansion strategies\n\n**Strategic Decision Support:**\n- **Scenario Planning:** Model different business scenarios\n- **Risk Assessment:** Identify potential business risks\n- **Resource Allocation:** Optimize staff and inventory deployment'],

      ['discrepancy monitoring', '🔍 **Discrepancy Monitor - Loss Prevention:**\n\n**Inventory Discrepancy Tracking:**\n- **Real-time Variance Detection:** Automatic alerts for stock differences\n- **Theft Prevention:** Monitor unusual transaction patterns\n- **Waste Tracking:** Categorize and analyze product waste\n- **Audit Trail:** Complete transaction history for investigation\n\n**Alert System:**\n- **High-Value Item Monitoring:** Special attention to expensive products\n- **Employee Activity Tracking:** Monitor staff transaction patterns\n- **Supplier Delivery Verification:** Compare received vs. ordered quantities\n- **Customer Return Analysis:** Track return patterns and reasons\n\n**Loss Prevention Strategies:**\n- **Regular Stock Counts:** Scheduled inventory audits\n- **Staff Training:** Proper handling and recording procedures\n- **Security Protocols:** Access control and surveillance integration']
    ])
  }

  private getContextualPrompt(message: string, context: ChatContext, realData?: string): string {
    const { userRole, businessType, currentPage } = context

    // Get conversation history for context
    const recentHistory = this.conversationHistory.slice(-3).map(h => 
      `User: ${h.user}\nAI: ${h.ai}`
    ).join('\n\n')

    let systemPrompt = `You are CoreTrack AI Assistant - a professional business intelligence expert specializing in Philippine business operations and inventory management systems.

🎯 MY CORE MISSION:
I provide expert guidance for CoreTrack, the leading business management platform designed specifically for Filipino entrepreneurs. I deliver actionable insights, professional advice, and data-driven recommendations to help businesses thrive.

👤 USER PROFILE:
- Role: ${userRole === 'owner' ? 'Business Owner & Decision Maker' : userRole === 'manager' ? 'Operations Manager' : 'Team Member'}
- Business Type: ${businessType === 'restaurant' ? 'Restaurant/Food Service Operations' : businessType === 'retail' ? 'Retail & Commerce' : 'Multi-Industry Business'}
- Current Module: ${currentPage?.replace('/', '').replace('-', ' ').toUpperCase() || 'DASHBOARD'}

🏢 PHILIPPINE BUSINESS EXPERTISE:
I understand the unique challenges and opportunities in the Philippine market:
- BIR compliance and tax regulations (VAT, withholding tax, quarterly returns)
- DTI business registration and permit requirements  
- Local payment methods (GCash, Maya, Bank transfers, Cash)
- Supply chain challenges and seasonal variations
- Staff management and labor law compliance (13th month pay, SSS, PhilHealth, Pag-IBIG)
- Cultural business practices and customer preferences

💼 MY COMPREHENSIVE CAPABILITIES:

📦 INVENTORY MASTERY:
- Stock level optimization and automated reorder points
- Supplier relationship management and cost negotiation
- Wastage reduction strategies and loss prevention
- Product categorization and pricing strategies
- Seasonal demand forecasting and procurement planning

💰 FINANCIAL INTELLIGENCE:
- Real-time cash flow analysis and projection
- Profit margin optimization per product/service
- Expense categorization and budget management
- ROI analysis for business investments
- Tax planning and compliance guidance

📊 POS & SALES OPERATIONS:
- Efficient order processing workflows
- Payment method optimization (reducing transaction costs)
- Customer loyalty program strategies
- Sales performance analysis and staff productivity
- Peak hour management and queue optimization

👥 TEAM & OPERATIONS:
- Staff scheduling and productivity tracking
- Role-based access control and security
- Performance metrics and KPI monitoring
- Training protocols and standard operating procedures
- Multi-location coordination and branch management

📈 BUSINESS INTELLIGENCE:
- Data-driven decision making support
- Market trend analysis and competitive positioning
- Customer behavior insights and segmentation
- Growth opportunity identification
- Risk assessment and mitigation strategies

🎯 MY COMMUNICATION STYLE:
- Professional yet approachable - I provide expert advice without unnecessary jargon
- Action-oriented - Every response includes specific, implementable recommendations
- Data-driven - I reference actual business metrics when available
- Context-aware - I consider your specific role, business type, and current situation
- Solution-focused - I identify problems and provide clear resolution paths

CONVERSATION CONTEXT:
${recentHistory ? `Previous Discussion:\n${recentHistory}\n` : 'New conversation started.'}

${realData ? `📊 LIVE BUSINESS DATA:\n${realData}\n` : ''}

🔍 CURRENT INQUIRY: "${message}"

I'm ready to provide expert business guidance tailored to your specific needs. Whether you need operational advice, financial insights, system help, or strategic recommendations, I'm here to help you succeed.

How can I assist you in optimizing your business operations today?`

    return systemPrompt
  }

  private async callGeminiAPI(prompt: string, tenantId: string, subscriptionPlan?: string): Promise<string> {
    if (!this.geminiApiKey) {
      throw new Error('Gemini API key not configured')
    }

    // Check rate limit before making request
    const rateLimitCheck = this.checkRateLimit(tenantId, subscriptionPlan)
    if (!rateLimitCheck.canProceed) {
      const waitTimeSeconds = rateLimitCheck.waitTime ? Math.ceil(rateLimitCheck.waitTime / 1000) : 60
      throw new Error(`Rate limit exceeded. Please wait ${waitTimeSeconds} seconds before trying again.`)
    }

    const rateLimit = this.getTenantRateLimit(tenantId)
    
    // Try primary model first, fallback to secondary if overloaded
    const modelsToTry = [this.primaryModel, this.fallbackModel]
    
    for (let i = 0; i < modelsToTry.length; i++) {
      const modelUrl = modelsToTry[i]
      const modelName = modelUrl.includes('flash') ? 'Flash' : 'Pro'
      
      try {
        console.log(`🔑 Trying Gemini ${modelName} model for tenant ${tenantId}... (Rate limit: ${rateLimit.requestCount}/${this.MAX_REQUESTS_PER_MINUTE})`)
        console.log('🌐 API URL:', modelUrl)
        
        const response = await fetch(`${modelUrl}?key=${this.geminiApiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 800  // Reduced to save quota
            },
            safetySettings: [
              {
                category: 'HARM_CATEGORY_HARASSMENT',
                threshold: 'BLOCK_MEDIUM_AND_ABOVE'
              },
              {
                category: 'HARM_CATEGORY_HATE_SPEECH',
                threshold: 'BLOCK_MEDIUM_AND_ABOVE'
              }
            ]
          })
        })

        console.log(`📡 ${modelName} API Response Status:`, response.status)
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error(`❌ ${modelName} API Error Response:`, errorText)
          
          // Handle rate limit errors specifically
          if (response.status === 429) {
            rateLimit.isBlocked = true
            rateLimit.blockUntil = Date.now() + 300000 // Block for 5 minutes
            throw new Error(`API quota exceeded. Please wait 5 minutes before trying again.`)
          }
          
          // If this is a 503 (overloaded) and we have more models to try, continue to next
          if (response.status === 503 && i < modelsToTry.length - 1) {
            console.log(`⏭️ ${modelName} model overloaded, trying next model...`)
            continue
          }
          
          throw new Error(`Gemini ${modelName} API error: ${response.status} - ${errorText}`)
        }

        const data = await response.json()
        
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
          console.log(`✅ Successfully got response from ${modelName} model for tenant ${tenantId}`)
          this.incrementRateLimit(tenantId) // Only increment on successful response
          return data.candidates[0].content.parts[0].text
        }
        
        throw new Error(`Invalid response from Gemini ${modelName} API`)
        
      } catch (error: any) {
        console.error(`${modelName} API call failed:`, error)
        
        // Handle quota/rate limit errors
        if (error.message?.includes('429') || error.message?.includes('quota')) {
          rateLimit.isBlocked = true
          rateLimit.blockUntil = Date.now() + 300000 // Block for 5 minutes
          throw error
        }
        
        // If this is the last model and we still have errors, throw
        if (i === modelsToTry.length - 1) {
          throw error
        }
        
        // If 503 error, try next model
        if (error.message?.includes('503') || error.message?.includes('overloaded')) {
          console.log(`⏭️ ${modelName} model overloaded, trying next model...`)
          continue
        }
        
        // For other errors, throw immediately
        throw error
      }
    }
    
    // This should never be reached, but just in case
    throw new Error('All Gemini models failed')
  }

  private findKnowledgeBaseMatch(message: string): string | null {
    const lowerMessage = message.toLowerCase()
    
    for (const [key, response] of Array.from(this.knowledgeBase.entries())) {
      if (lowerMessage.includes(key.toLowerCase())) {
        return response
      }
    }
    
    return null
  }

  private generateConversationalFallback(message: string, contextualData: string | null, context: ChatContext): string {
    const lowerMessage = message.toLowerCase()
    
    // Add contextual data if available
    let response = contextualData ? `${contextualData}\n\n` : ''
    
    // Smart contextual responses with personality (from our earlier conversational AI updates)
    if (lowerMessage.includes('inventory') || lowerMessage.includes('stock')) {
      response += `Inventory questions - I love these! 📦 What's going on with your stock? Need help adding new items, checking what's running low, or maybe setting up those handy alerts so you never run out of your bestsellers?`
    } else if (lowerMessage.includes('pos') || lowerMessage.includes('order') || lowerMessage.includes('payment')) {
      response += `POS stuff - awesome! 💰 Are you trying to ring up an order, sort out a payment issue, or maybe customize your menu? I'm here to make your checkout process smooth as butter!`
    } else if (lowerMessage.includes('team') || lowerMessage.includes('staff') || lowerMessage.includes('employee')) {
      response += `Team management - one of my favorite topics! 👥 Building a great team is so important. Are you looking to add someone new, adjust who can do what, or just figure out the different roles? Let's get your crew sorted!`
    } else if (lowerMessage.includes('report') || lowerMessage.includes('analytics') || lowerMessage.includes('sales')) {
      response += `Ooh, data time! 📊 I get excited about analytics because they tell such cool stories about your business. What insights are you curious about? Sales trends, inventory performance, or maybe your financial picture?`
    } else if (lowerMessage.includes('how') || lowerMessage.includes('help') || lowerMessage.includes('?')) {
      response += `I'm totally here for you! 🙋‍♀️ What's on your mind? Whether it's inventory mysteries, POS puzzles, team stuff, or just wanting to understand your numbers better - let's figure it out together!`
    } else {
      response += `Hey there! 👋 I'm your CoreTrack AI assistant, and I'm genuinely excited to help you succeed! Whether you want to chat about inventory, streamline your orders, build your team, or dive into your business analytics - I'm your girl! What's happening in your business world today?`
    }
    
    return response
  }

  async sendMessage(message: string, context: ChatContext): Promise<string> {
    try {
      // Initialize data service for real CoreTrack data
      const dataService = new AIDataService(context)
      
      // Get relevant business data based on user's question
      const contextualData = await dataService.getContextualData(message)
      
      // Check if API key is configured - ALWAYS try AI first for natural conversation
      if (!this.geminiApiKey || this.geminiApiKey === 'your_gemini_api_key_here') {
        console.log('🔑 No Gemini API key configured, using enhanced fallback')
        return this.generateConversationalFallback(message, contextualData, context)
      }

      // Check rate limit before making AI request
      const tenantId = context.tenantId || 'default'
      const subscriptionPlan = context.subscriptionPlan || 'basic'
      const rateLimitCheck = this.checkRateLimit(tenantId, subscriptionPlan)
      if (!rateLimitCheck.canProceed) {
        const waitTimeSeconds = rateLimitCheck.waitTime ? Math.ceil(rateLimitCheck.waitTime / 1000) : 60
        
        // Use enhanced fallback with real data when rate limited
        console.log(`🚫 Rate limited for tenant ${tenantId}, using enhanced fallback response`)
        
        const fallbackResponse = this.findKnowledgeBaseMatch(message)
        if (fallbackResponse) {
          if (contextualData) {
            return `${contextualData}\n\n---\n\n${fallbackResponse}\n\n⏱️ *AI responses temporarily limited. Full AI will be available in ${waitTimeSeconds} seconds.*`
          }
          return `${fallbackResponse}\n\n⏱️ *AI responses temporarily limited. Please wait ${waitTimeSeconds} seconds for full AI assistance.*`
        }
        
        // Smart contextual fallback when rate limited
        if (contextualData) {
          return `${contextualData}\n\n---\n\n⏱️ **AI Temporarily Limited**\n\nI've provided your latest business data above. Full AI responses will be available in ${waitTimeSeconds} seconds.\n\nFor immediate help:\n📞 Contact support@coretrack.ph\n📖 Check our help documentation`
        }
        
        return `⏱️ **AI Response Limit Reached**\n\nTo ensure quality service, AI responses are temporarily limited. Please wait ${waitTimeSeconds} seconds.\n\nIn the meantime:\n📦 Use the search function for inventory\n💳 Check the POS system for orders\n📊 View reports for analytics\n📞 Contact support@coretrack.ph for urgent help`
      }

      // ALWAYS use Gemini Pro for natural conversation - only fallback on errors
      try {
        const enhancedPrompt = this.getContextualPrompt(message, context, contextualData)
        const response = await this.callGeminiAPI(enhancedPrompt, tenantId, subscriptionPlan)

        // Store conversation for learning (in production, save to database)
        this.conversationHistory.push({
          user: message,
          ai: response
        })

        // Keep only recent conversations in memory
        if (this.conversationHistory.length > 10) {
          this.conversationHistory = this.conversationHistory.slice(-10)
        }

        return response
      } catch (aiError) {
        console.warn('🔄 Gemini API error, using enhanced fallback:', aiError)
        
        const fallbackResponse = this.findKnowledgeBaseMatch(message)
        if (fallbackResponse) {
          if (contextualData) {
            return `${contextualData}\n\n---\n\n${fallbackResponse}\n\n⚠️ *AI temporarily unavailable, showing cached response*`
          }
          return `${fallbackResponse}\n\n⚠️ *AI temporarily unavailable, showing cached response*`
        }
        
        if (contextualData) {
          return `${contextualData}\n\n---\n\n⚠️ **AI Temporarily Unavailable**\n\nI've provided your latest business data above. Please try again in a few minutes for full AI assistance.`
        }
        
        return `⚠️ **AI Temporarily Unavailable**\n\nDon't worry! You can still:\n📦 Manage inventory in the Inventory Center\n💳 Process orders in the POS system\n📊 Check reports and analytics\n📞 Contact support@coretrack.ph for immediate help`
      }

    } catch (error: any) {
      console.error('Chat service error:', error)
      
      // Handle rate limiting errors gracefully
      if (error.message?.includes('Rate limit') || error.message?.includes('quota')) {
        const contextualData = await new AIDataService(context).getContextualData(message)
        const fallbackResponse = this.findKnowledgeBaseMatch(message)
        
        if (fallbackResponse) {
          if (contextualData) {
            return `${contextualData}\n\n---\n\n${fallbackResponse}\n\n⏱️ *${error.message}*`
          }
          return `${fallbackResponse}\n\n⏱️ *${error.message}*`
        }
        
        if (contextualData) {
          return `${contextualData}\n\n---\n\n⏱️ **${error.message}**\n\nI've provided your latest business data above. Please try again in a few minutes for full AI assistance.`
        }
        
        return `⏱️ **${error.message}**\n\nDon't worry! You can still:\n📦 Manage inventory in the Inventory Center\n💳 Process orders in the POS system\n📊 Check reports and analytics\n📞 Contact support@coretrack.ph for immediate help`
      }
      
      // Fallback to knowledge base for other errors
      const fallbackResponse = this.findKnowledgeBaseMatch(message)
      if (fallbackResponse) {
        return fallbackResponse
      }

      // Ultimate fallback
      return "I'm having trouble connecting right now, but I'm here to help! 😊 Try asking about inventory management, POS operations, or team setup. You can also check our help documentation or contact support@coretrack.ph for immediate assistance."
    }
  }

  // Enterprise features for learning and analytics
  async logInteraction(message: string, response: string, context: ChatContext) {
    // In production, log to analytics service
    console.log('Chat interaction logged:', {
      message,
      response,
      context,
      timestamp: new Date().toISOString()
    })
  }

  async getBusinessInsights(tenantId: string): Promise<string[]> {
    // In production, analyze chat patterns for business insights
    return [
      "Your team frequently asks about inventory - consider providing training materials",
      "POS questions spike during lunch hours - ensure staff are prepared",
      "Refund questions suggest reviewing return policy with customers"
    ]
  }
  
  // Rate limit status methods for monitoring - Per Tenant with automatic tracking
  getRateLimitStatus(tenantId: string): {
    requestsThisMinute: number
    requestsToday: number
    maxPerMinute: number
    maxPerDay: number
    isBlocked: boolean
    nextResetIn?: number
    lastActivity: string
    tenantAge: string
  } {
    const now = Date.now()
    const rateLimit = this.getTenantRateLimit(tenantId)
    const nextMinuteReset = 60000 - (now - rateLimit.lastReset)
    const nextDayReset = 86400000 - (now - rateLimit.lastDayReset)
    
    const lastActivity = Math.max(rateLimit.lastReset, rateLimit.lastDayReset)
    const tenantAge = now - Math.min(rateLimit.lastReset, rateLimit.lastDayReset)
    
    return {
      requestsThisMinute: rateLimit.requestCount,
      requestsToday: rateLimit.dailyCount,
      maxPerMinute: this.MAX_REQUESTS_PER_MINUTE,
      maxPerDay: this.MAX_REQUESTS_PER_DAY,
      isBlocked: rateLimit.isBlocked,
      nextResetIn: Math.min(nextMinuteReset, nextDayReset),
      lastActivity: new Date(lastActivity).toISOString(),
      tenantAge: this.formatDuration(tenantAge)
    }
  }
  
  // Get overview of all tenant rate limits
  getAllTenantsStatus(): {
    totalTenants: number
    activeTenants: number
    blockedTenants: number
    totalRequestsToday: number
    oldestTenant: string
  } {
    const tenantIds = Object.keys(this.tenantRateLimits)
    const now = Date.now()
    let activeTenants = 0
    let blockedTenants = 0
    let totalRequestsToday = 0
    let oldestActivity = now
    
    tenantIds.forEach(tenantId => {
      const rateLimit = this.tenantRateLimits[tenantId]
      const lastActivity = Math.max(rateLimit.lastReset, rateLimit.lastDayReset)
      
      // Count active tenants (activity within last 24 hours)
      if (now - lastActivity < 86400000) {
        activeTenants++
      }
      
      if (rateLimit.isBlocked) {
        blockedTenants++
      }
      
      totalRequestsToday += rateLimit.dailyCount
      
      if (lastActivity < oldestActivity) {
        oldestActivity = lastActivity
      }
    })
    
    return {
      totalTenants: tenantIds.length,
      activeTenants,
      blockedTenants,
      totalRequestsToday,
      oldestTenant: tenantIds.length > 0 ? new Date(oldestActivity).toISOString() : 'None'
    }
  }
  
  // Helper method to format duration
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `${days}d ${hours % 24}h`
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }
  
  // Emergency reset for specific tenant (for development/testing only)
  resetRateLimit(tenantId: string): void {
    this.tenantRateLimits[tenantId] = {
      requestCount: 0,
      lastReset: Date.now(),
      dailyCount: 0,
      lastDayReset: Date.now(),
      isBlocked: false
    }
    console.log(`🔄 Rate limit manually reset for tenant ${tenantId}`)
  }
  
  // Reset all rate limits (emergency use only)
  resetAllRateLimits(): void {
    this.tenantRateLimits = {}
    console.log('🔄 All rate limits manually reset')
  }
}

export const chatService = new ChatService()
