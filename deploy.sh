#!/bin/bash

# CoreTrack v3 Deployment Script
echo "🚀 CoreTrack v3 Deployment to Vercel"
echo "=================================="

# Check if build exists
if [ ! -d ".next" ]; then
    echo "📦 Building project first..."
    npm run build
fi

echo "✅ Build ready for deployment"
echo ""
echo "🔧 Deployment Options:"
echo "1. Manual Vercel Dashboard: https://vercel.com/dashboard"
echo "2. Import from GitHub: https://github.com/brianaudio/coretrack-v3"
echo "3. Direct CLI deployment (requires auth)"
echo ""
echo "📋 Project Configuration:"
echo "- Framework: Next.js"
echo "- Build Command: npm run build" 
echo "- Output Directory: .next"
echo "- Install Command: npm install"
echo ""
echo "🌟 Your project is ready to deploy!"
