# Setting Up Real Gemini AI for CoreTrack

Your AI is currently using smart conversational fallbacks, but to get the full power of Google's Gemini AI, you need to set up an API key.

## Quick Setup (5 minutes)

### 1. Get Your Gemini API Key (FREE)
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key (starts with `AIza...`)

### 2. Add to Vercel Environment Variables
1. Go to your [Vercel Dashboard](https://vercel.com/brians-projects-a2bb5aa0/coretrack-v3/settings/environment-variables)
2. Click "Add New"
3. Name: `NEXT_PUBLIC_GEMINI_API_KEY`
4. Value: Your API key from step 1
5. Click "Save"
6. Redeploy your app

### 3. For Local Development (Optional)
Create a `.env.local` file in your project root:
```env
NEXT_PUBLIC_GEMINI_API_KEY=your_api_key_here
```

## What Changes After Setup

✅ **Before (Current)**: Smart conversational responses with your business data
🚀 **After (With Gemini)**: Full AI conversations that understand context, answer complex questions, and provide personalized business insights

## Free Tier Limits
- 60 requests per minute
- 1,500 requests per day
- Perfect for small to medium businesses

## Why It's Worth It
- Natural conversation flow
- Context-aware responses
- Understands Filipino business terms
- Provides actionable insights
- Learns from your business patterns

Your current setup is already great! The Gemini integration just makes it even more powerful. 🚀
