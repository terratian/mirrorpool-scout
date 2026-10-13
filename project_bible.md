# Mirror Pool Project Bible: Alpha Strategy

## Phase 1: Mirror Pool Scout (Standalone Alpha)
**Objective:** Release a functional, client-side Chrome extension via Gumroad to validate the procurement concept and generate initial revenue.
**Target:** Magic: The Gathering players and procurement hunters.
**Monetization:** $9 Lifetime License via Gumroad. Delivered via .zip file for manual sideloading, protected by a non-transferable license key.
**Alpha Feature Lock:**
- Two-column dashboard UI (Figma translated to CSS).
- `mtgdecks.net` automated scraping script.
- Localized `chrome.storage` architecture.

## Phase 2: Mirror Pool Suite (Production Ecosystem)
**Objective:** Transition from a vulnerable client-side extension to a secure, server-backed application supporting multiple trading card games.
**Security:** Migrate proprietary scraping algorithms to a backend API to protect intellectual property.
**Expansion:** Integrate Sports Cards and other major TCGs.
**Distribution:** Official Chrome Web Store deployment.

## Phase 3: Infrastructure & Maintenance (Proxmox / API)
**Objective:** Transition from fragile client-side scraping to a robust, server-backed API architecture to support Mirror Pool Suite.
**Hardware/Hosting:** Deploy a thin Proxmox container or lightweight cloud server to host the API and centralized database.
**Data Silo:** Utilize the existing Mirror Pool SQLite database structure to ingest and index daily Scryfall bulk data, acting as the master card registry.
**Server-Side Scraping:** Move DOM scraping off the client's browser and onto the server to prevent user IP rate-limiting and centralize metagame analytics (Win Rates, Meta %).

## Alpha Maintenance Strategy: DOM Inspector
**Objective:** Proactively monitor target sites for HTML structural changes that would break the client-side extension.
**Execution:** 
- A local script will periodically inspect `mtgdecks.net` and `magic.gg` for the presence of the specific DOM classes used by `mtgdecks-scraper.js`.
- If a target site updates its UI, the script flags the break. 
- The developer updates the extension locally, pushes a new build, and issues an update notification to the user base.

## Phase 2.5: Cross-Platform Arbitrage Engine
**Objective:** Programmatically compute paper vs. digital spreads within the side panel HUD.
**Execution:** 
- Iterates over stored decklists to map single card lookup values against localized currency conversions (TIX to USD factor).
- Exposes net financial delta directly inside the active deck management interface for quick procurement and redemption tracking.
