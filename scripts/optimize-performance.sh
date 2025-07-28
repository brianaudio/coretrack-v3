#!/bin/bash

echo "🚀 CoreTrack Performance Optimization Script"
echo "============================================"

# Clear VS Code workspace state
echo "🧹 Clearing VS Code workspace state..."
rm -rf ".vscode/settings.json.bak" 2>/dev/null || true

# Clear Next.js cache
echo "🗑️  Clearing Next.js cache..."
rm -rf .next 2>/dev/null || true
rm -rf dist 2>/dev/null || true
rm -rf build 2>/dev/null || true
rm -rf .turbo 2>/dev/null || true

# Clear node modules cache
echo "📦 Clearing npm cache..."
npm cache clean --force 2>/dev/null || true

# Clear system caches (macOS)
echo "💾 Clearing system caches..."
sudo dscacheutil -flushcache 2>/dev/null || true
sudo killall -HUP mDNSResponder 2>/dev/null || true

# Kill any lingering Node processes
echo "🔄 Stopping lingering processes..."
pkill -f "next-dev" 2>/dev/null || true
pkill -f "node.*next" 2>/dev/null || true

# Free up memory
echo "🧠 Freeing up memory..."
sudo purge 2>/dev/null || echo "Note: purge command not available"

# Restart development server with optimizations
echo "🚀 Starting optimized development server..."
npm run dev -- --turbo

echo "✅ Performance optimization complete!"
echo ""
echo "Additional Tips:"
echo "- Close unused VS Code tabs (Cmd+W)"
echo "- Disable unnecessary extensions"
echo "- Restart VS Code if still slow (Cmd+Shift+P > Developer: Reload Window)"
echo "- Consider using VS Code Insiders for better performance"
