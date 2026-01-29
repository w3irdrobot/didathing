#!/bin/bash

# Start script for Did a Thing PWA

PORT=${1:-8000}

echo "🚀 Starting Did a Thing PWA..."
echo "📱 Open your browser to: http://localhost:$PORT"
echo "⏹️  Press Ctrl+C to stop"
echo ""

# Try different servers in order of preference
if command -v python3 &> /dev/null; then
    echo "Using Python 3..."
    python3 -m http.server $PORT
elif command -v python &> /dev/null; then
    echo "Using Python 2..."
    python -m SimpleHTTPServer $PORT
elif command -v php &> /dev/null; then
    echo "Using PHP..."
    php -S localhost:$PORT
elif command -v node &> /dev/null && npx -v &> /dev/null; then
    echo "Using Node.js http-server..."
    npx http-server -p $PORT
else
    echo "❌ Error: No suitable HTTP server found."
    echo "Please install Python, PHP, or Node.js to run the app."
    exit 1
fi
