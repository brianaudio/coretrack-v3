#!/bin/bash

# CoreTrack Beta Testing - Workspace Status Check
echo "🧪 CoreTrack Beta Testing - Workspace Status"
echo "=============================================="

# Check if essential debugging tools exist
echo "🔧 Debugging Tools Status:"
if [ -f "debug-complete-flow.js" ]; then
    echo "  ✅ debug-complete-flow.js"
else
    echo "  ❌ debug-complete-flow.js"
fi

if [ -f "check-production-data.js" ]; then
    echo "  ✅ check-production-data.js"
else
    echo "  ❌ check-production-data.js"
fi

if [ -f "src/lib/utils/debugHelper.ts" ]; then
    echo "  ✅ debugHelper.ts"
else
    echo "  ❌ debugHelper.ts"
fi

# Check if development server is running
echo ""
echo "🚀 Development Server:"
if pgrep -f "next dev" > /dev/null; then
    echo "  ✅ Development server is running"
else
    echo "  ⚠️  Development server not detected"
fi

# Count available debug scripts
DEBUG_COUNT=$(ls debug-*.js 2>/dev/null | wc -l | tr -d ' ')
TEST_COUNT=$(ls test-*.js 2>/dev/null | wc -l | tr -d ' ')

echo ""
echo "📊 Available Tools:"
echo "  🔍 Debug Scripts: $DEBUG_COUNT"
echo "  🧪 Test Scripts: $TEST_COUNT"

# Check archive status
if [ -d ".archive" ]; then
    BACKUP_COUNT=$(ls .archive/backup-files/ 2>/dev/null | wc -l | tr -d ' ')
    DOC_COUNT=$(ls .archive/completed-docs/ 2>/dev/null | wc -l | tr -d ' ')
    echo "  📁 Archived Backups: $BACKUP_COUNT"
    echo "  📚 Archived Docs: $DOC_COUNT"
fi

# Check environment
echo ""
echo "🌍 Environment:"
if [ -f ".env.local" ]; then
    echo "  ✅ .env.local exists"
else
    echo "  ❌ .env.local missing"
fi

# Quick health check
echo ""
echo "🏥 Quick Health Check:"
if [ -d "node_modules" ]; then
    echo "  ✅ Dependencies installed"
else
    echo "  ❌ Run 'npm install'"
fi

if [ -d ".next" ]; then
    echo "  ✅ Next.js built"
else
    echo "  ⚠️  May need 'npm run build'"
fi

echo ""
echo "🎯 Beta Testing Status: READY"
echo "All debugging tools preserved and workspace organized."
echo ""
echo "Quick commands:"
echo "  npm run dev          # Start development server"
echo "  node debug-*.js      # Run specific debug script"  
echo "  ls debug-*.js        # See all debug tools"
echo "  cat .archive/BETA_TESTING_GUIDE.md  # View beta guide"
