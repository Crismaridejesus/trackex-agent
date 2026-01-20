#!/bin/bash
#
# TrackEx Agent Reset Script for macOS
# 
# This script completely resets the TrackEx Agent by:
# 1. Removing the application data directory
# 2. Deleting all keychain entries
#
# Use this when:
# - Authentication issues persist after reinstall
# - Version mismatch errors occur
# - Clean start is needed for troubleshooting
#
# Usage: ./reset-trackex.sh
#

set -e

echo "========================================="
echo "  TrackEx Agent Reset Script for macOS"
echo "========================================="
echo ""

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "Error: This script is for macOS only."
    echo "For Windows, use reset-trackex.bat"
    exit 1
fi

echo "This will reset TrackEx Agent by:"
echo "  • Removing application data (~Library/Application Support/TrackEx)"
echo "  • Deleting keychain entries (device_token, session_data, server_url, app_version)"
echo ""
read -p "Are you sure you want to continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo "Resetting TrackEx Agent..."
echo ""

# Step 1: Remove application data directory
DATA_DIR="$HOME/Library/Application Support/TrackEx"
if [ -d "$DATA_DIR" ]; then
    echo "→ Removing application data: $DATA_DIR"
    rm -rf "$DATA_DIR"
    echo "  ✓ Application data removed"
else
    echo "→ No application data found (already clean)"
fi

# Step 2: Delete keychain entries
echo ""
echo "→ Removing keychain entries..."

SERVICE_NAME="com.trackex.agent"
KEYS=("device_token" "session_data" "server_url" "app_version")

for key in "${KEYS[@]}"; do
    if security delete-generic-password -s "$SERVICE_NAME" -a "$key" 2>/dev/null; then
        echo "  ✓ Deleted keychain entry: $key"
    else
        echo "  - Keychain entry not found: $key (already deleted)"
    fi
done

echo ""
echo "========================================="
echo "  TrackEx Agent has been reset!"
echo "========================================="
echo ""
echo "Next steps:"
echo "  1. Restart the TrackEx Agent application"
echo "  2. Sign in with your credentials"
echo ""
echo "If you continue to experience issues, please contact support."

