#!/bin/bash
echo "# Mirror Pool Scout - Codebase Export"
echo "Date: $(date)"

echo ""
echo "## Repository Status"
echo '```'
git status
echo '```'

echo ""
echo "## Recent Git History"
echo '```'
git log --oneline -n 20
echo '```'

files=(
    "dashboard.html"
    "dashboard.js"
    "content.src.js"
    "background.js"
    "manifest.json"
    "PROJECT_BIBLE.md"
    "BIBLE.md"
    "project_bible.md"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo ""
        echo "## File: $file"
        echo '```'
        cat "$file"
        echo ""
        echo '```'
    fi
done
