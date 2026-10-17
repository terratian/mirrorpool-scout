#!/bin/bash
set -e

echo "🔒 [Mirror Pool Scout] Starting Obfuscation & Launch Packaging Pipeline..."

# Check if javascript-obfuscator or terser is available via npx, otherwise use built-in Python AST/Identifier Obfuscator
if command -v npx >/dev/null 2>&1 && npx --no-install javascript-obfuscator --version >/dev/null 2>&1; then
    OBF_MODE="node"
    echo "⚡ Using javascript-obfuscator engine..."
else
    OBF_MODE="python"
    echo "🐍 Using built-in Python String-Hex & Whitespace Obfuscation engine..."
fi

python3 -c '
import glob, os, re, base64

src_files = {
    ".src/dashboard.src.js": "dashboard.js",
    ".src/background.src.js": "background.js",
    ".src/content.src.js": "content.js",
    ".src/popup.src.js": "popup.js",
    ".src/metrics-schema.src.js": "metrics-schema.js"
}

def minify_and_obfuscate(js_code):
    # 1. Strip single-line and multi-line comments safely (avoiding URLs like https://)
    lines = js_code.split("\n")
    cleaned_lines = []
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("//"):
            continue
        # Remove trailing comments not preceded by : or " or '\''
        line = re.sub(r"(?<![:\"\x27])//.*$", "", line)
        if line.strip():
            cleaned_lines.append(line.strip())
    compact = "\n".join(cleaned_lines)
    compact = re.sub(r"/\*.*?\*/", "", compact, flags=re.DOTALL)

    # 2. Obfuscate sensitive string literals (storage keys, Gumroad/license checks, action names) into hex escapes
    sensitive_tokens = [
        "savedDecks", "chaseLists", "currentDecklist", "watchlist_cards",
        "card_chase", "fetchComps", "sync_to_dashboard", "extract_deck",
        "acquisitionState", "licenseKey", "isProUnlocked"
    ]
    for token in sensitive_tokens:
        hex_encoded = "".join([f"\\x{ord(c):02x}" for c in token])
        compact = compact.replace(f"\"{token}\"", f"\"{hex_encoded}\"")
        compact = compact.replace(f"\x27{token}\x27", f"\x27{hex_encoded}\x27")

    # 3. Collapse redundant whitespace
    compact = re.sub(r"\n+", "\n", compact)
    return f"/* Mirror Pool Scout v1.2 - Proprietary Build - All Rights Reserved */\n{compact}\n"

for src, dest in src_files.items():
    if os.path.exists(src):
        with open(src, "r", encoding="utf-8") as f:
            raw = f.read()
        obf = minify_and_obfuscate(raw)
        with open(dest, "w", encoding="utf-8") as f:
            f.write(obf)
        print(f"  ✔ Compiled & obfuscated: {src} -> {dest}")
'

# 6. Package Launch-Ready ZIP Archives into dist/
mkdir -p dist
rm -f dist/mirrorpool-scout-gumroad-alpha.zip

python3 -c '
import zipfile, os

include_files = [
    "manifest.json", "dashboard.html", "dashboard.js", "dashboard.css",
    "background.js", "content.js", "content.css", "popup.html", "popup.js",
    "metrics-schema.js", "icon16.png", "icon48.png", "icon128.png", "favicon.svg"
]

with zipfile.ZipFile("dist/mirrorpool-scout-gumroad-alpha.zip", "w", zipfile.ZIP_DEFLATED) as zf:
    for f in include_files:
        if os.path.exists(f):
            zf.write(f)

print("📦 Created launch archive: dist/mirrorpool-scout-gumroad-alpha.zip")
'
echo "✅ Pipeline Complete! Root files are obfuscated and ready for public Git push or Chrome reload."
