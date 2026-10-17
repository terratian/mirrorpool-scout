#!/bin/bash
# Mirror Pool Scout - release packager.
# Ships readable code (the Chrome Web Store rejects obfuscated JS). Optional minify via terser, which is safe
# (a real parser, unlike regex comment stripping that broke background.js on the " // " card-name string).
set -euo pipefail
cd "$(dirname "$0")"

echo "🔮 Building Mirror Pool Scout release..."

# content.js is generated from content.src.js (single source of truth)
[ -f content.src.js ] && cp content.src.js content.js

rm -rf dist && mkdir -p dist

# Collect exactly what manifest.json + dashboard.html reference, so nothing is missed or shipped by accident.
python3 - <<'PY'
import json, re, shutil, os, sys
m = json.load(open("manifest.json"))
files = {"manifest.json", m["background"]["service_worker"], "dashboard.html"}
for cs in m.get("content_scripts", []):
    files.update(cs.get("js", [])); files.update(cs.get("css", []))
files.update(m.get("icons", {}).values())
files.update(m.get("action", {}).get("default_icon", {}).values())
if m.get("action", {}).get("default_popup"): files.add(m["action"]["default_popup"])
html = open("dashboard.html", encoding="utf-8").read()
files.update(re.findall(r'(?:src|href)="([^"#:]+\.(?:js|css|png|svg))"', html))
for js in ("dashboard.js", "auto-detector.js", "content.js"):
    if os.path.exists(js):
        files.update(re.findall(r'["\']([\w\-]+\.(?:png|svg))["\']', open(js, encoding="utf-8").read()))
missing = sorted(f for f in files if not os.path.exists(f))
if missing:
    sys.exit("❌ Referenced but missing: " + ", ".join(missing))
for f in sorted(files):
    shutil.copy(f, "dist/" + f)
print("  files:", ", ".join(sorted(files)))
PY

# Customer-facing install note (sideload)
VER=$(python3 -c 'import json;print(json.load(open("manifest.json"))["version"])')
cat > dist/INSTALL.txt <<TXT
Mirror Pool Scout v${VER} - install (Chrome / Chromium / Edge / Brave)

1. Unzip this folder somewhere permanent (Chrome loads it from disk; do not delete it afterwards).
2. Open chrome://extensions and turn on "Developer mode" (top right).
3. Click "Load unpacked" and choose the unzipped folder.
4. Pin the extension, then click its icon to open the dashboard.

License: open the dashboard > Settings & API, paste your Gumroad license key, press the button.
Updates: download the new zip, unzip over the old folder, then press reload on chrome://extensions.

Disclosure: some eBay / TCGplayer links are affiliate links (eBay Partner Network, Impact). They are only
tagged when you click them, cost you nothing, and can be switched off in Settings.
Support: https://mrjoshua.gumroad.com/l/mirrorpoolscout
TXT

# Syntax-check everything we ship
for f in dist/*.js; do node --check "$f"; done

# Optional: safe minification
if [ "${MINIFY:-0}" = "1" ] && command -v npx >/dev/null 2>&1; then
    for f in dist/*.js; do npx --yes terser "$f" --compress --mangle -o "$f"; done
    for f in dist/*.js; do node --check "$f"; done
fi

VERSION=$(python3 -c 'import json;print(json.load(open("manifest.json"))["version"])')
OUT="mirrorpool-scout-v${VERSION}.zip"
rm -f "$OUT"
(cd dist && zip -qr "../$OUT" .)
echo "✅ $OUT ($(du -h "$OUT" | cut -f1)). Sideload: unzip, then chrome://extensions > Load unpacked."
