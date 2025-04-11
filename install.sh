#!/bin/bash

# MySQL Query MCP Server Installation Script
# Author: Abou Koné

set -e

echo "=== MySQL Query MCP Server Installation ==="
echo ""

# Detect package manager
if command -v npm >/dev/null 2>&1; then
  PKG_MANAGER="npm"
elif command -v yarn >/dev/null 2>&1; then
  PKG_MANAGER="yarn"
else
  echo "❌ Error: Neither npm nor yarn found. Please install Node.js and npm first."
  exit 1
fi

echo "📦 Using $PKG_MANAGER for installation"

# Check Node.js version
NODE_VERSION=$(node -v | cut -d 'v' -f 2)
NODE_MAJOR=$(echo $NODE_VERSION | cut -d '.' -f 1)

if [ "$NODE_MAJOR" -lt 14 ]; then
  echo "❌ Error: Node.js version 14 or higher is required."
  echo "Current version: $NODE_VERSION"
  echo "Please update your Node.js installation."
  exit 1
fi

echo "✅ Node.js version $NODE_VERSION detected"

# Install the package
echo ""
echo "📥 Installing mysql-query-mcp-server..."

if [ "$PKG_MANAGER" = "npm" ]; then
  npm install -g mysql-query-mcp-server
else
  yarn global add mysql-query-mcp-server
fi

echo "✅ Installation complete!"

# Set up configuration
echo ""
echo "🔧 Setting up configuration..."

if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    echo "✅ Created .env file from template"
  else
    echo "⚠️  Warning: .env.example not found. Please create a .env file manually."
  fi
else
  echo "ℹ️  .env file already exists, skipping creation"
fi

echo ""
echo "🚀 MySQL Query MCP Server is ready!"
echo "ℹ️  Run 'mysql-query-mcp' to start the server"
echo ""
echo "For more information and documentation, visit:"
echo "https://github.com/devakone/mysql-query-mcp-server"
echo "" 