#!/bin/bash

echo "🚀 Initializing XRP Army Admin Account on Production..."
echo ""

response=$(curl -s -X POST https://api.edgexrp.com/api/auth/init-admin \
  -H "Content-Type: application/json" \
  -d '{"secret": "xrp-army-admin-init-2024"}')

echo "Response from server:"
echo "$response" | python3 -m json.tool

echo ""
echo "✅ If successful, you can now login at https://edgexrp.com with:"
echo "   Email: schacht.dan@gmail.com"
echo "   Password: J3sus1981!"