# MIRROR POOL™ SCOUT — MASTER PROJECT BIBLE & AI CONTEXT REGISTRY
**Last Updated:** October 17, 2026
**Repository:** `github.com:terratian/mirrorpool-scout.git` (`~/mirrorpoolbeta/mirrorpool-scout`)
**Current Version:** 1.4.0 (Standalone Alpha Build)
**Developer:** Joshua Sultan (Solo Developer)
**Distribution & Licensing:** $9 Lifetime Early-Access License via Gumroad (`https://mrjoshua.gumroad.com/l/mirrorpoolscout`; keys are verified against Gumroad's `licenses/verify` API from Settings; manual `.zip` sideload; removes Alpha watermark and unlocks bulk manifest optimization). Future recurring tier ($9.99/mo) planned for Mirror Pool Suite.

---

## 1. AI ASSISTANT & DEVELOPER GUARDRAILS (CRITICAL OPERATING RULES)
Any AI assistant or developer modifying this repository MUST obey these rules to prevent regressions:
1. **NEVER Blindly Overwrite Core Files:** Never run `cat << 'EOF' > dashboard.html` or `cat << 'EOF' > dashboard.js` with minimal boilerplate. Doing so destroys the established two-column dark terminal UI, custom CSS, and multi-pane architecture.
2. **Use Idempotent, Marker-Scoped Patches:** Always inspect the target file first or use Python scripts with explicit start/end markers (e.g., `/* MP_CUSTOM_CSS_START */` and `// === MP_CHASE_PORTFOLIO_START ===`) to inject or update code safely.
3. **Full-Tab Dashboard Architecture:** `dashboard.html` is a full-screen, two-column workspace application opened in its own dedicated browser tab (`chrome.tabs.create`), NOT squeezed into Chrome's narrow `sidePanel`.
4. **Single Consolidated Bible:** `PROJECT_BIBLE.md` (mirrored in `docs/PROJECT_BIBLE.md`) is the sole canonical documentation file. Legacy duplicates (`BIBLE.md`, `project_bible.md`) are permanently deprecated and removed.
5. **Never revert to an old baseline wholesale.** Tag known-good commits (`git tag good-YYYYMMDD`). If a build breaks, fix forward or `git checkout <tag> -- <file>`; do not "revert to stable baseline" over feature work (this once deleted ~1,500 lines of dashboard).
6. **No regex "obfuscators".** `build_release.sh` ships readable code (optional `MINIFY=1` uses terser). A comment-stripping regex once truncated `name.includes(" // ")` and broke `background.js`. The Chrome Web Store also rejects obfuscated code.
7. **MV3 CSP:** no inline `onclick=` / `onerror=` attributes in extension pages (they silently never run). Use `addEventListener` / delegation.
8. **MutationObserver rule:** any observer on `document.body` must call code that is idempotent (compare a signature before writing to the DOM), otherwise it loops forever.
9. **Escape everything** interpolated into `innerHTML` (`escapeHtml`) and only allow `http(s)` hrefs (`safeHttpUrl`). Card, deck and listing names come from third-party pages.
10. **Do not give AI assistants affiliate/license IDs to "wire in".** All IDs live in `affiliate.js` and the `GUMROAD_*` constants at the top of `dashboard.js`.

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

### Core Files (shipped in the release zip)
* `manifest.json` - MV3. Permissions `storage`, `activeTab`, `alarms`, `scripting`; host permissions for eBay, TCGplayer, Fanatics, Goldin, Cardmarket, MTGDecks, MTGGoldfish, magic.gg, wizards.com, MTGScavenger, `api.scryfall.com`, `api.gumroad.com`. No `default_popup`: the toolbar icon opens the dashboard tab (`chrome.action.onClicked`).
* `background.js` - service worker: `fetchComps` (single-card Scryfall fuzzy lookup, accepts `foil`), `fetchCollectionPrices` (75-card batches, writes `scryfallPriceCache`), `verifyDetectedCandidates` / `importDetectedToScout` (auto-detector), `openDashboard`.
* `content.js` (built from `content.src.js` - edit the `.src.js`, then `cp`/run the build) - eBay listing badge.
* `auto-detector.js` - decklist/card detector + eBay/Whatnot snipe bar on TCG sites and MTGScavenger.
* `affiliate.js` - click-time affiliate decoration (EPN campaign `5339224696`, Impact account `9019865` / TCGplayer program `21018`). `impactTrackingBase` must be pasted from Impact (Create Tracking Link) before TCGplayer links are tagged. Users can opt out in Settings (`affiliateEnabled`).
* `dashboard.html` / `dashboard.js` - full-tab workspace, Settings (license + affiliate disclosure), sidebar portfolio, card rollover.
* `content.css`, icons (`icon16/48/128.png`), `mpsbanner1mb.png` (watermark).
* Not shipped / unused while there is no popup: `popup.html`, `popup.js`, `popup.css`, `metrics-schema.js`, `mtgdecks-scraper.js`, `dashboard.css`.

### `chrome.storage.local` keys (actual)
* `procurementTargets` - active Chase Hunt sheet: `[{ cardName, quantity, acquired, basis }]`
* `currentDecklist`, `deckMeta` - last compiled deck and its name/printing/condition filters
* `savedChaseLists` - saved library: `{ [deckName]: { cards, meta, updatedAt } }`
* `watchlist` - bookmarked listings: `{ title, price, marketFloor, foil, url, bidders, watchers, timeLeft, savedAt }` (deduped by origin+path URL)
* `scryfallPriceCache` - `{ lowercaseName: { name, usd, usd_foil, tix } }` written by `fetchCollectionPrices`
* `scryfallCatalogNames`, `scryfallCatalogUpdatedAt` - card-name catalog for the auto-detector (7-day cache)
* `scoutArmed` - auto-detect on/off; `affiliateEnabled` - affiliate links on/off (default on)
* `licenseKey`, `licenseValid`, `licenseVerifiedAt` - Gumroad license state

---

## 5. KNOWN BUG FIXES & LESSONS LEARNED (DO NOT REINTRODUCE)
1. **`Node.insertBefore` `NotFoundError` in `renderSavedListsToolbar`:** Never call `parentNode.insertBefore(newNode, refNode)` assuming `refNode` is a direct child of `parentNode`; always use `refNode.parentNode.insertBefore(...)` or `refNode.before(...)`.
2. **eBay Title Sanitization for Scryfall API:** Do not rely solely on `.ux-labels-values__labels` DOM nodes on eBay, as sellers frequently omit Item Specifics. Always run the aggressive regex sanitizer on the listing title to strip condition prefixes (`NM`, `LP`) and bracketed collector numbers before calling `fetchComps`.
3. **Tab Self-Targeting Loop:** When `dashboard.html` is open as the active tab, calling `chrome.tabs.query({ active: true, currentWindow: true })` targets the dashboard itself instead of the MTGDecks/Goldfish tab. Always query specific target URLs (`*://*.mtgdecks.net/*`, `*://*.mtggoldfish.com/*`, `*://*.ebay.com/*`) or filter out `chrome-extension://` URLs.
4. **Scryfall 404s on Arena Decklist Paste:** Pasting Arena-formatted lines like `1 Kiora of Salt and Sand (FRA) 273` must pass through `cleanCardName()` to strip `(SET) ###` before hitting Scryfall, with an `onerror` SVG fallback for custom sets.
5. **Infinite MutationObserver loop (fixed 1.3.x):** `renderSidebarPortfolio` rewrote its own DOM on every mutation. It now compares a signature first and the observer is debounced.
6. **Inline handlers blocked by MV3 CSP (fixed 1.3.x):** `onclick`/`onerror` in template strings never ran (visual deck tiles, art thumbnails). Wired via listeners instead.
7. **Release build truncated `background.js` (fixed 1.3.x):** see guardrail 6.
8. **Sidebar read the wrong storage key (fixed 1.3.x):** saved decks live in `savedChaseLists`, not `savedDecks`/`chaseLists`.
9. **Invented prices (fixed 1.3.x):** `$3.50` / `$4.25` fallbacks removed; unknown prices show `-` or `~`.
10. **Paste box hidden in Visual Grid mode (fixed 1.4.0):** the Text List textarea is hidden while Visual Grid is active, so pasting did nothing. `setDeckView()` now switches modes; the empty grid has a "Paste a decklist" button, and pasting a decklist anywhere on the Chase Hunt tab loads it.
11. **eBay badge (fixed 1.2.x):** shipping read only from shipping nodes; non-USD prices produce no verdict; foil detected from title/Finish; Scryfall `0.00` is treated as "no price".

## 6. OPEN ITEMS / NOT YET WIRED
* Impact `impactTrackingBase` (needs the Ad ID from the Impact dashboard).
* Gumroad `GUMROAD_PRODUCT_ID` if the verify API reports that a product id is required.
* Meta Analytics data is hardcoded sample data (no live source yet).
* `content.js` badge only understands eBay's page structure; it does nothing on TCGplayer / Fanatics / Goldin / Cardmarket.
* Live-site selectors (eBay, MTGDecks, MTGGoldfish, Wizards, MTGScavenger) have not been re-verified by automated tests.


## v1.4.0 additions
- `features.js` (loaded after dashboard.js): Chase Hunt totals bar (paper market, paper BIN target <=85%, TIX total, TIX BIN target <=85%), "Scan open market for undervalued paper" (Scryfall all-printings; flags cheapest printing >=12% below default price or >=5% dip vs baseline; eBay BIN link under 90% of cheapest printing), My Decks menu (load/copy/rename/delete from `savedChaseLists`), Bookmarks menu (`mpBookmarks`, migrated once from `watchlist`; eBay badge bookmark button writes to both).
- Rule: never render injected UI as a `<table>` inside #tab-procurement; the legacy name enhancer and sidebar scraper treat any table cell as a deck row.
- `background.js` merges into `scryfallPriceCache` instead of replacing it.
- Not wired: live eBay listing prices (needs eBay API keys); the scan uses Scryfall market data plus eBay search links.

## v1.4.1 naming + list formats
- Plain-language labels (collector/arbitrage friendly): Chase Hunt -> **Buy List**, Meta Analytics -> **Meta Trends**, Arbitrage Desk -> **Arbitrage (Paper vs TIX)**, "Active Procurement Targets" -> **Cards to Buy**, Basis Spent -> **Paid So Far**, Marketplaces & Comps -> **Where to Buy**, Snipe -> **Deals Under 85%**. Internal ids (`tab-procurement`, `procurementTargets`, `savedChaseLists`) are unchanged on purpose (stored user data).
- `listformats.js` (`MPLists.parse` / `MPLists.format`) is the single list reader/writer: MTGGoldfish/MTGDecks plain, Arena/Moxfield `(SET) 123 *F*`, TCGplayer `[SET]`, MTGO `SB:` and .dek XML, ManaBox / TCGplayer / Moxfield / Deckbox CSV. Card records may carry optional `set`, `cn`, `foil`. Exports: plain (also TCGplayer Mass Entry), Arena/Moxfield, ManaBox CSV, generic CSV.
- New menus: My Decks and Bookmarks (`mpBookmarks` storage key). `features.js` holds BIN totals, undervalued-paper scan (Scryfall prints, cached in `printingsCache`), My Decks, Bookmarks.
