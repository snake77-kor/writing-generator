#!/bin/bash
cd "$(dirname "$0")"
echo "Starting CSAT Generator..."

# Get local IP (macOS specific)
IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)

echo "-----------------------------------------------------"
echo "Local Access:     http://localhost:8000"
if [ ! -z "$IP" ]; then
    echo "Network Access:   http://$IP:8000"
    echo " (Use this URL on other devices in the same Wi-Fi)"
fi
echo "-----------------------------------------------------"

python3 -m http.server 8000
