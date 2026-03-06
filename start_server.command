#!/bin/bash
cd "$(dirname "$0")"
# Kill process on port 8081 if exists
lsof -ti:8081 | xargs kill -9 2>/dev/null

echo "Starting Writing Generator..."

# Get local IP (macOS specific)
IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)

echo "-----------------------------------------------------"
echo "Local Access:     http://localhost:8081"
if [ ! -z "$IP" ]; then
    echo "Network Access:   http://$IP:8081"
    echo " (Use this URL on other devices in the same Wi-Fi)"
fi
echo "-----------------------------------------------------"

# Open browser automatically
open "http://localhost:8081"

# Start server
python3 -m http.server 8081
