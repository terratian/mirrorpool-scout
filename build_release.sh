#!/bin/bash
set -e

echo "🔮 Building Mirror Pool Scout Release Package..."

# 1. Keep content.js synced from single source of truth (content.src.js)
if [ -f "content.src.js" ]; then
    cp content.src.js content.js
fi

# 2. Clean previous build artifacts
rm -rf dist mirrorpool-scout-release.zip
mkdir -p dist

# 3. Copy only production files required by manifest.json
cp manifest.json background.js content.js dashboard.html dashboard.js dist/
[ -f "popup.html" ] && cp popup.html dist/
[ -f "popup.js" ] && cp popup.js dist/
[ -f "metrics-schema.js" ] && cp metrics-schema.js dist/
[ -f "mtgdecks-scraper.js" ] && cp mtgdecks-scraper.js dist/
for icon in icon16.png icon48.png icon128.png mpsbanner1mb.png; do
    [ -f "$icon" ] && cp "$icon" dist/
done

# 4. Minify JS in dist/ if terser is available via npx (CWS-compliant)
if command -v npx >/dev/null 2>&1; then
    echo "⚡ Minifying production JavaScript..."
    for jsfile in dist/*.js; do
        npx --yes terser "$jsfile" --compress --mangle -o "$jsfile" 2>/dev/null || true
    done
fi

# 5. Package into clean .zip for Chrome Web Store & Gumroad
cd dist
zip -r ../mirrorpool-scout-release.zip ./*
cd ..

echo "✅ Release package ready: $(pwd)/mirrorpool-scout-release.zip"
ls -lh mirrorpool-scout-release.zip
