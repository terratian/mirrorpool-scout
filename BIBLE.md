# Mirror Pool Scout - Project Bible & Architecture Log

## 1. Project Overview & Monetization
* **Application:** Mirror Pool Scout (Standalone Alpha Chrome Extension)
* **Target Audience:** Magic: The Gathering traders, competitive deck brewers, and card arbitrage hunters.
* **Distribution Model:** Manual sideload (.zip) / Gumroad early-access lifetime license ($9) and subscription gating ($9.99/mo tier target).
* **Remote Repository:** `github.com/terratian/mirrorpool-scout`

---

## 2. Implemented Features & UI Taxonomy
* **Dashboard View:** Dedicated full browser tab UI (`dashboard.html` / `dashboard.js`).
* **Navigation Taxonomy:**
  - `Watchlist` (formerly Live Watchlist)
  - `Card Chase` (formerly Procurement Hunter)
  - `Market Insights` (formerly Meta Analytics)
  - `Arbitrage Desk`
* **Deck Extraction & Parsing:**
  - Manual text decklist import (`#manual-deck-input`, `#load-brew-btn`).
  - On-site DOM scraper targeting `mtgdecks.net` and Wizards domains (`magic.gg`, `wizards.com`).
  - Branded export to clipboard for Discord/Reddit and Arena-friendly raw text export (`#export-mtga-btn`).
* **Financial & Arbitrage Engine:**
  - Cross-platform price spread calculation (`calculateArbitrageDelta`).
  - Compares Paper Floor vs MTGO TIX (cash conversion multiplier at ~0.92).
  - Metrics HUD displaying Win Rate, Paper Value, MTGO TIX, and Arbitrage Spread.
* **Multi-Domain Extraction & Storage:**
  - Declarative extraction rules in `metrics-schema.js` targeting MTGGoldfish, TCGplayer, eBay, and MTGDecks.
  - User-intent migration popup (`popup.html` / `popup.js`) passing structured payloads into `chrome.storage.local`.

---

## 3. Active Bug Registry & Known Regressions
* **BUG-01: Full-Tab Messaging Self-Loop**
  - *Symptom:* Clicking "Scrape Active Tab" gets stuck indefinitely on "Scanning...".
  - *Root Cause:* Running `dashboard.html` as a dedicated Chrome tab causes `chrome.tabs.query({active: true, currentWindow: true})` to return the dashboard itself rather than the external target tab (`mtgdecks.net` or `ebay.com`).
  - *Required Fix:* Query tabs explicitly by URL patterns (`*://*.mtgdecks.net/*`, `*://*.ebay.com/*`) or rely on `lastFocusedWindow`.
* **BUG-02: Manifest Script References**
  - *Symptom:* Chrome extension loader errors (`scout-overlay.js` or icon load failures).
  - *Status:* `scout-overlay.js` removed from manifest; icon paths verified.
* **BUG-03: DOM Parsing Fragility**
  - *Symptom:* Generic text (such as privacy/CCPA footers) occasionally extracted instead of card names on aggregate pages.
  - *Fix Implemented:* Filter out header/footer noise tags and prioritize specific product metadata selectors.

---

## 4. Roadmap & Future Architecture
* **Phase 2 (DOM Inspector):** Lightweight automated health-check script to detect when target site class names change, prompting local scraper updates.
* **Phase 3 (Proxmox / Suite Backend):** Transition client-side scraping to a server-backed FastAPI backend deployed on Proxmox, backed by a SQLite/PostgreSQL Scryfall bulk data registry.
