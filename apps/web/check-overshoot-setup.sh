#!/bin/bash
echo "=== Overshoot API Key Diagnostic ==="
echo ""
echo "Checking apps/web/.env.local file..."
if [ -f apps/web/.env.local ]; then
  echo "✅ .env.local file exists"
  if grep -q "NEXT_PUBLIC_OVERSHOOT_API_KEY" apps/web/.env.local; then
    KEY=$(grep "NEXT_PUBLIC_OVERSHOOT_API_KEY" apps/web/.env.local | cut -d'=' -f2 | xargs)
    if [ -z "$KEY" ] || [ "$KEY" = "your_overshoot_api_key_here" ]; then
      echo "❌ API key is not set or still has placeholder value"
      echo "   Current value: $KEY"
      echo ""
      echo "📝 TO FIX:"
      echo "1. Open: apps/web/.env.local"
      echo "2. Find: NEXT_PUBLIC_OVERSHOOT_API_KEY=your_overshoot_api_key_here"
      echo "3. Replace 'your_overshoot_api_key_here' with your actual API key"
      echo "4. The key should:"
      echo "   - Start with 'ovs_'"
      echo "   - Be 30-40 characters long"
      echo "   - Have NO quotes"
      echo "   - Have NO spaces before/after the = sign"
      echo ""
      echo "5. After updating, RESTART your dev server (this is required!)"
    else
      LEN=${#KEY}
      PREFIX=${KEY:0:4}
      echo "✅ API key found (length: $LEN characters)"
      echo "   Starts with: $PREFIX"
      if [ "$PREFIX" != "ovs_" ]; then
        echo "   ⚠️  WARNING: Key should start with 'ovs_'"
      fi
      if [ $LEN -lt 30 ] || [ $LEN -gt 50 ]; then
        echo "   ⚠️  WARNING: Key length seems unusual (expected 30-40 chars)"
      fi
      echo ""
      echo "✅ Key appears to be set correctly!"
      echo ""
      echo "⚠️  IMPORTANT: If Overshoot still doesn't work:"
      echo "1. Make sure you RESTARTED your dev server after updating .env.local"
      echo "2. Check browser console for error messages"
      echo "3. Verify your API key is active in Overshoot dashboard"
    fi
  else
    echo "❌ NEXT_PUBLIC_OVERSHOOT_API_KEY not found in .env.local"
  fi
else
  echo "❌ .env.local file not found at apps/web/.env.local"
fi
echo ""
