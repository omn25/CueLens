#!/bin/bash
echo "=== Overshoot API Key Checker ==="
echo ""
if [ -f .env.local ]; then
  echo "✅ .env.local file exists"
  if grep -q "NEXT_PUBLIC_OVERSHOOT_API_KEY" .env.local; then
    KEY=$(grep "NEXT_PUBLIC_OVERSHOOT_API_KEY" .env.local | cut -d'=' -f2 | tr -d ' ')
    if [ "$KEY" = "your_overshoot_api_key_here" ] || [ -z "$KEY" ]; then
      echo "❌ API key still has placeholder value"
      echo "   Please replace 'your_overshoot_api_key_here' with your actual key"
    else
      LEN=${#KEY}
      PREFIX=${KEY:0:4}
      echo "✅ API key found (length: $LEN characters)"
      echo "   Starts with: $PREFIX"
      if [ "$PREFIX" != "ovs_" ]; then
        echo "   ⚠️  Warning: Key should start with 'ovs_'"
      fi
      if [ $LEN -lt 30 ] || [ $LEN -gt 50 ]; then
        echo "   ⚠️  Warning: Key length seems unusual (expected 30-40 chars)"
      fi
      echo "   First 10 chars: ${KEY:0:10}..."
    fi
  else
    echo "❌ NEXT_PUBLIC_OVERSHOOT_API_KEY not found in .env.local"
  fi
else
  echo "❌ .env.local file not found"
fi
echo ""
echo "Remember: After updating .env.local, you MUST restart your dev server!"
