#!/usr/bin/env bash
set -e

echo "=========================================="
echo " Building ExaGrid Desktop for macOS/Linux "
echo "=========================================="

# 1. Install frontend dependencies
echo "📦 Installing npm packages..."
npm install

# 2. Build Vite frontend bundle
echo "⚡ Building frontend bundle..."
npm run build

# 3. Build native Tauri desktop binary
echo "🦀 Compiling native Rust binary with Tauri..."
npm run tauri build

echo "🎉 Build complete! The executable is located at:"
echo "   src-tauri/target/release/bundle/"
