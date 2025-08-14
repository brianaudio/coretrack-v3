# Xendit Setup Guide for CoreTrack

## Why Xendit Instead of PayMongo?

✅ **No DTI/BIR Required** - You can start accepting payments immediately without expensive business registration  
✅ **Lower Barriers** - Perfect for startups and small businesses  
✅ **Philippine-Focused** - Built specifically for the Philippine market  
✅ **Multiple Payment Methods** - GCash, Maya, ShopeePay, DANA, credit cards, bank transfers, 7-Eleven  
✅ **Great Documentation** - Easy to integrate and use  

## Getting Started

### 1. Sign Up for Xendit
1. Go to [https://dashboard.xendit.co/register](https://dashboard.xendit.co/register)
2. Choose "Business Account" 
3. Fill in basic information (you can use personal info for now)
4. Verify your email

### 2. Get Your API Keys
1. Log in to Xendit Dashboard
2. Go to **Settings > Developers > API Keys**
3. Copy your **Test Public Key** (starts with `xnd_public_development_`)
4. Copy your **Test Secret Key** (starts with `xnd_test_`)

### 3. Update Your Environment Variables
Replace the placeholder values in your `.env.local` file:

```bash
# Replace these with your actual Xendit test keys
XENDIT_PUBLIC_KEY=xnd_public_development_YOUR_ACTUAL_PUBLIC_KEY
XENDIT_SECRET_KEY=xnd_test_YOUR_ACTUAL_SECRET_KEY
XENDIT_WEBHOOK_TOKEN=your_webhook_verification_token_here
NEXT_PUBLIC_XENDIT_PUBLIC_KEY=xnd_public_development_YOUR_ACTUAL_PUBLIC_KEY
```

### 4. Test the Integration
1. Restart your development server
2. Go to `http://localhost:3002/settings`
3. Try upgrading to any plan
4. Test with different payment methods

## Available Payment Methods

### E-Wallets (Instant)
- **GCash** 💙 - Most popular in Philippines
- **Maya (PayMaya)** 💚 - Second most popular
- **ShopeePay** 🧡 - Growing fast
- **DANA** 🔵 - Alternative option

### Credit/Debit Cards
- **Visa, Mastercard, JCB** 💳 - International and local cards

### Bank Transfers
- **BPI Online** 🏦 - Bank of the Philippine Islands
- **BDO Online** 🏪 - Banco de Oro

### Retail Outlets
- **7-Eleven** 🏪 - Pay cash at any 7-Eleven store

## Going Live (When Ready)

### 1. Business Verification (Optional)
- For higher transaction limits, you can verify your business later
- This is when you might need DTI/BIR, but you can operate with lower limits initially

### 2. Production Keys
1. Complete identity verification in Xendit dashboard
2. Get your live API keys (starts with `xnd_public_production_` and `xnd_`)
3. Replace test keys with live keys in production environment

### 3. Webhook Setup
1. Set up webhook endpoint: `https://yourdomain.com/api/xendit/webhook`
2. Configure webhook in Xendit dashboard to receive payment notifications

## Pricing Structure

### Xendit Fees (Competitive with PayMongo)
- **E-wallets**: 3.5% + ₱15 per transaction
- **Credit Cards**: 3.5% + ₱15 per transaction  
- **Bank Transfers**: ₱25 per transaction
- **7-Eleven**: ₱25 per transaction

### No Setup Fees
- Free to set up and start
- No monthly fees
- Only pay per successful transaction

## Benefits Over PayMongo

| Feature | Xendit | PayMongo |
|---------|--------|----------|
| DTI/BIR Required | ❌ No | ✅ Yes |
| Setup Cost | Free | ~₱20,000+ |
| Time to Start | Same day | Weeks/months |
| Payment Methods | 8+ options | 4 options |
| Startup Friendly | ✅ Yes | ❌ No |

## Support & Resources

- **Documentation**: [https://developers.xendit.co/](https://developers.xendit.co/)
- **Dashboard**: [https://dashboard.xendit.co/](https://dashboard.xendit.co/)
- **Support**: Live chat in dashboard
- **Test Cards**: Use `4000000000000002` for successful test payments

## Next Steps

1. **Sign up for Xendit** (5 minutes)
2. **Get your API keys** (2 minutes)  
3. **Update your .env.local** (1 minute)
4. **Test payments** (5 minutes)
5. **Launch your business** 🚀

This approach lets you start accepting payments immediately without the expensive DTI/BIR requirements that PayMongo needs!
