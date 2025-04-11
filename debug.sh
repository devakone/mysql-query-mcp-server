#!/bin/bash

# Clean and build first
npm run clean
npm run build

# Kill any existing processes
pkill -f mysql-mcp-server || true
pkill -f "@modelcontextprotocol/inspector" || true
lsof -ti:5173,3000,3001,3002,9229 | xargs kill -9 2>/dev/null || true

# Set up base environment
export PORT=3002
export NODE_ENV=development
export DEBUG=@modelcontextprotocol*

# Build the environment args array
ENV_ARGS=()

# Add base environment variables
ENV_ARGS+=("-e" "PORT=3002")
ENV_ARGS+=("-e" "NODE_ENV=development")
ENV_ARGS+=("-e" "DEBUG=@modelcontextprotocol*")

# Load environment variables from .env file and add to args
if [ -f .env ]; then
    while IFS='=' read -r key value || [ -n "$key" ]; do
        # Skip comments and empty lines
        [[ $key =~ ^#.*$ ]] && continue
        [[ -z $key ]] && continue
        
        # Remove any leading/trailing whitespace and quotes
        key=$(echo $key | xargs)
        value=$(echo $value | xargs | sed 's/^"\(.*\)"$/\1/')
        
        # Add to env args if both key and value exist
        if [[ -n $key && -n $value ]]; then
            export "$key=$value"
            ENV_ARGS+=("-e" "$key=$value")
        fi
    done < .env
fi

echo "Starting MCP inspector..."

# Start the inspector with all environment variables
exec npx @modelcontextprotocol/inspector "${ENV_ARGS[@]}" node dist/index.js