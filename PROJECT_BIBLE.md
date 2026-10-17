# MIRROR POOL™ SCOUT — MASTER PROJECT BIBLE & AI CONTEXT REGISTRY
**Last Updated:** October 16, 2026
**Repository:** `github.com:terratian/mirrorpool-scout.git` (`~/mirrorpoolbeta/mirrorpool-scout`)
**Current Version:** 1.2.x (Standalone Alpha Build)
**Developer:** Joshua Sultan (Solo Developer)
**Distribution & Licensing:** $9 Lifetime Early-Access License via Gumroad (manual `.zip` sideload with non-transferable license key; removes Alpha watermark and unlocks bulk manifest optimization). Future recurring tier ($9.99/mo) planned for Mirror Pool Suite.

---

## 1. AI ASSISTANT & DEVELOPER GUARDRAILS (CRITICAL OPERATING RULES)
Any AI assistant or developer modifying this repository MUST obey these rules to prevent regressions:
1. **NEVER Blindly Overwrite Core Files:** Never run `cat << 'EOF' > dashboard.html` or `cat << 'EOF' > dashboard.js` with minimal boilerplate. Doing so destroys the established two-column dark terminal UI, custom CSS, and multi-pane architecture.
2. **Use Idempotent, Marker-Scoped Patches:** Always inspect the target file first or use Python scripts with explicit start/end markers (e.g., `/* MP_CUSTOM_CSS_START */` and `// === MP_CHASE_PORTFOLIO_START ===`) to inject or update code safely.
3. **Full-Tab Dashboard Architecture:** `dashboard.html` is a full-screen, two-column workspace application opened in its own dedicated browser tab (`chrome.tabs.create`), NOT squeezed into Chrome's narrow `sidePanel`.
4. **Single Consolidated Bible:** `PROJECT_BIBLE.md` (mirrored in `docs/PROJECT_BIBLE.md`) is the sole canonical documentation file. Legacy duplicates (`BIBLE.md`, `project_bible.md`) are permanently deprecated and removed.

---

## 2. PRODUCT VISION & PHASED ROADMAP

### Phase 1: Mirror Pool Scout (Standalone Client-Side Alpha — Current)
* **Objective:** Deliver a fast, zero-hosting-cost Chrome Extension (Manifest V3) for Magic: The Gathering players, collectors, and arbitrageurs.
* **Core Value Proposition:**
  * Automated decklist & card detection across major TCG aggregators (`mtgdecks.net`, `mtggoldfish.com`, `magic.gg`, `wizards.com`, `moxfield.com`, `mtgscavenger.com`).
  * Live eBay & TCGplayer price comping, sniper ceiling calculations (<85% market floor), and live auction hunting (eBay Auctions ending soonest, Whatnot live streams).
  * Cross-platform Paper (USD) vs. Digital (MTGO TIX) arbitrage delta tracking.
  * Saved Deck Portfolio tracking showing **Total TCG Market Value** vs. **Chase Needed Paper Value** (unacquired cards where `acquired < required`).

### Phase 2: Mirror Pool Suite (Multi-TCG Production Ecosystem)
* **Objective:** Expand beyond MTG into Sports Cards and other major TCGs with official Chrome Web Store distribution, affiliate link wrapping (TCGplayer/Impact, eBay Partner Network, Awin), and image-based bulk lot value detection (integrating the local Mirror Pool optical feature extraction & SQLite fingerprinting pipeline).

### Phase 3: Server-Side Data Silo & Proxmox API Infrastructure
* **Objective:** Transition from client-side DOM scraping to a thin Proxmox container / FastAPI + PostgreSQL/SQLite backend.
* **Data Silo:** Daily automated ingestion of Scryfall Bulk Data JSON files (avoiding the 10 req/sec live Scryfall API rate limit) combined with scheduled server-side Playwright/BeautifulSoup metagame crawlers.
* **Interim Alpha Maintenance (DOM Inspector):** While client-side in Alpha, a lightweight local inspection script monitors target domains (`mtgdecks.net`, `mtggoldfish.com`, `ebay.com`) for DOM selector changes so patches can be pushed rapidly if a site updates its layout.

---

## 3. UI TAXONOMY & COMPONENT ARCHITECTURE

### Left Sidebar Navigation (`dashboard.html`)
* **Header:** `MIRROR POOL™ SCOUT` + Status Pill (`🟢 SCOUT ARMED | AUTO-DETECT ON`).
* **Workspace Views:**
  1. `Live Watchlist` — Real-time bookmarked singles, auction targets, and migrated cards from the extension popup/content scripts.
  2. `Chase Hunt` (formerly *Procurement Hunter*) — Decklist import/scraping target sheet (`+ Create / Import Deck Target`), printing/condition filters, `⚡ Scrape MTGDecks / Goldfish Tab`, `📋 Export Cart Manifest`, and the **Active Procurement Targets** table.
  3. `Arbitrage Desk` — Paper USD vs. MTGO TIX spread calculator, conversion factor (`0.92`), and redemption/flip viability metrics.
  4. `Meta Analytics` (also referenced as *Market Insights*) — Trending metagame cards (e.g., *Astral Dragon*), archetype win-rate percentages, and format shares.
* **Saved Decks & Chase Portfolio Panel (`#mp-saved-decks-sidebar`):**
  * Positioned in the left navigation panel above `PREFERENCES`.
  * Displays each saved deck (and the currently loaded Chase Hunt sheet) with two distinct real-time metrics:
    * **Mkt (Total Market Value):** `SUM(unitPrice * required)` across all cards in the list.
    * **Chase (Chase Available / Needed Value):** `SUM(unitPrice * MAX(0, required - acquired))` representing remaining paper acquisition cost.
  * Displays aggregate portfolio totals (`TCG Market Total` and `Chase Needed`) at the bottom of the widget.
* **Preferences:** `Settings & API` (Affiliate IDs, custom snipe discount thresholds, license key entry).
* **Footer:** `Suite Connection: Standalone Mode` + Alpha Build Gumroad $9 Lifetime Key banner.

### Active Procurement Targets Table (`Chase Hunt` View)
Columns:
1. `CARD TARGET` — Clean card name. Hovering triggers the **Interactive Card Rollover Mockup & Value Overlay**.
2. `REQUIRED` / `ACQUIRED` — Tracks collection progress (e.g., `0 / 1`, `0 / 2`) with `+1` basis logging.
3. `MARKET FLOOR` — Live Scryfall/TCGplayer USD floor and MTGO `TIX` value.
4. `BASIS SPENT` — User-logged acquisition cost (`Paid $` input + `+1` button).
5. `ACTIONS` (Snipe & Procurement Triggers):
   * `TCG $X.XX` — Direct link to TCGplayer product search/listing.
   * `BIN <$X.XX` — eBay Buy-It-Now filtered below the 85% snipe ceiling (`LH_BIN=1&_udhi={ceiling}`).
   * `Auc <$X.XX` — Live eBay Auctions filtered below the 85% snipe ceiling, sorted by **Ending Soonest** (`LH_Auction=1&_sop=1&_udhi={ceiling}`).
   * `⚡ WN Live` — Direct search into active **Whatnot** livestreams (`whatnot.com/search?query=MTG+{card}&type=livestreams`) for live auction sniping.

### Interactive Card Rollover Mockup & Value Overlay (`#mp-card-hover-overlay`)
* **Trigger:** Event-delegated `mousemove` listener across both the **Active Procurement Targets** table (`td:first-child`) and individual lines inside the **Deck Target Textarea**.
* **Sanitization (`cleanCardName`):** Automatically strips leading quantities (`1 `, `4x `), Arena set codes and collector numbers (`(FRA) 273`, `(WOE) 234`), and bracketed tags (`[NEC - 93]`) before querying Scryfall.
* **Data Displayed:**
  * High-resolution card mockup image (`api.scryfall.com/cards/named?fuzzy={cleanName}&format=image&version=normal`) with an automatic SVG fallback card (`MIRROR POOL™ Custom / Unindexed Set`) if a card is from an unindexed or custom set (such as `(FRA)`).
  * Live **TCG Market** price and **Chase Target (<85%)** snipe threshold.
  * Smart viewport collision math so hovering over cards near the bottom or right edge of the window never clips the popup off-screen.

---

## 4. FILE & STORAGE SCHEMA REFERENCE

### Core Files
* `manifest.json` — Manifest V3 configuration (`storage`, `activeTab`, `alarms`, `scripting`), host permissions for TCG marketplaces, background service worker (`background.js`), popup (`popup.html`), and content scripts (`content.js`, `content.css`).
* `dashboard.html` — Full-tab two-column UI markup and embedded CSS styles.
* `dashboard.js` — Dashboard state management, tab routing, Scryfall pricing lookups, Chase Hunt compilation, Saved Lists toolbar (`renderSavedListsToolbar`), Bulk Cart Manifest Exporter, Sidebar Portfolio aggregator, and Card Rollover preview controller.
* `popup.html` & `popup.js` — Toolbar utility popup displaying site-specific extracted metrics (`metrics-schema.js`) with explicit `"Migrate Dataset"` and `"Open Full Dashboard"` triggers.
* `content.src.js` / `content.js` — Marketplace DOM parser (aggressive eBay title regex sanitizer stripping `MTG`, `NM`, `LP`, `Foil`, and `[SET - #]` noise before sending `fetchComps` to `background.js`).
* `background.js` — Service worker handling `fetchComps` (Scryfall fuzzy lookup + pricing extraction), cross-tab message routing, and `chrome.storage.local` persistence.
* `PROJECT_BIBLE.md` & `docs/PROJECT_BIBLE.md` — Master consolidated documentation file.

### `chrome.storage.local` Keys
* `savedDecks` / `chaseLists` — Array of saved deck objects `{ name, cards: [{ cardName, required, acquired, unitPrice, tixPrice, basisSpent }] }`.
* `currentDecklist` — Currently active deck array in the workspace.
* `watchlist_cards` — Single cards migrated from MTGGoldfish/TCGplayer/eBay via the popup or content badge.
* `card_chase` — Active auction/BIN targets migrated from marketplaces.

---

## 5. KNOWN BUG FIXES & LESSONS LEARNED (DO NOT REINTRODUCE)
1. **`Node.insertBefore` `NotFoundError` in `renderSavedListsToolbar`:** Never call `parentNode.insertBefore(newNode, refNode)` assuming `refNode` is a direct child of `parentNode`; always use `refNode.parentNode.insertBefore(...)` or `refNode.before(...)`.
2. **eBay Title Sanitization for Scryfall API:** Do not rely solely on `.ux-labels-values__labels` DOM nodes on eBay, as sellers frequently omit Item Specifics. Always run the aggressive regex sanitizer on the listing title to strip condition prefixes (`NM`, `LP`) and bracketed collector numbers before calling `fetchComps`.
3. **Tab Self-Targeting Loop:** When `dashboard.html` is open as the active tab, calling `chrome.tabs.query({ active: true, currentWindow: true })` targets the dashboard itself instead of the MTGDecks/Goldfish tab. Always query specific target URLs (`*://*.mtgdecks.net/*`, `*://*.mtggoldfish.com/*`, `*://*.ebay.com/*`) or filter out `chrome-extension://` URLs.
4. **Scryfall 404s on Arena Decklist Paste:** Pasting Arena-formatted lines like `1 Kiora of Salt and Sand (FRA) 273` must pass through `cleanCardName()` to strip `(SET) ###` before hitting Scryfall, with an `onerror` SVG fallback for custom sets.
