#!/bin/bash

# Update Prices Script - Zero Downtime Price Updates
# Usage: ./scripts/update-prices.sh [domain] [port]

DOMAIN=${1:-localhost}
PORT=${2:-7854}
API_URL="http://${DOMAIN}:${PORT}/api/pricing/reload"

echo "FarmyFishFry - Price Update Tool"
echo ""

# Check if pricing.json exists
if [ ! -f "src/data/pricing.json" ]; then
    echo "ERROR: src/data/pricing.json not found"
    echo "Make sure you're running this from the project root"
    exit 1
fi

echo "Current pricing data:"
echo "File: src/data/pricing.json"
echo "Last modified: $(stat -f "%Sm" src/data/pricing.json 2>/dev/null || stat -c "%y" src/data/pricing.json 2>/dev/null || echo "Unknown")"
echo ""

echo "Edit the pricing file now, then press Enter to continue..."
echo "You can:"
echo "- Update item prices"
echo "- Add new items"
echo "- Change the lastUpdated date"
echo ""
read -p "Press Enter when you've finished editing pricing.json..."

echo ""
echo "Triggering price reload..."

# Call the reload API
RESPONSE=$(curl -s -X POST "$API_URL" -H "Content-Type: application/json" 2>/dev/null)

if [ $? -eq 0 ]; then
    echo "Price reload request sent successfully!"
    echo ""
    echo "Response:"
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
    echo ""
    echo "Prices updated without downtime!"
    echo "Users will see new prices immediately"
else
    echo "ERROR: Failed to reach the reload API"
    echo "URL: $API_URL"
    echo "Check that:"
    echo "- The application is running"
    echo "- The domain and port are correct"
    echo "- No firewall is blocking the request"
    echo ""
    echo "NOTE: Changes will still auto-reload within 30 seconds"
fi

echo ""
echo "To verify prices are updated:"
echo "Visit: http://${DOMAIN}:${PORT}/api/pricing/reload (GET)"
echo "Or check the pricing page in your app" 