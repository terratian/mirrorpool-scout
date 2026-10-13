# Mirror Pool Scout - Master Architecture Bible

## 1. Distribution & Licensing
* **Application:** Mirror Pool Scout (Standalone Alpha Chrome Extension)
* **Target:** MTG Grinders, arbitrageurs, collectors, and deck builders.
* **Pricing Model:** $9 Gumroad Lifetime License.
* **Repository:** `github.com/terratian/mirrorpool-scout`

---

## 2. Restored Architectural Modules
### A. Live Watchlist Engine
- **Header Metrics:** Live computation of `Market Total`, `Total Spent`, and `Net Variance`.
- **Listing Cards:** Tracks live eBay auction bids, Buy-It-Now pricing, shipping breakdown, watcher activity, and time remaining.
- **State Management:** CSP-compliant card deletion (`Drop Target`) without DOM injection leaks.

### B. Procurement Hunter (Deck Chase & Acquisition Tracker)
- **Deck Target Importer:** Multi-format parser handling pasted decklists and direct scraping from MTGDecks / Goldfish.
- **Acquisition State:** In-place tracking (`0 / 1 Acquired`) with dynamic basis logging (`Basis Spent`).
- **Marketplace Deep-Links:** One-click links directly into filtered TCGplayer lowest floor, eBay Buy-It-Now, and eBay Live Auctions.
- **Bulk Cart Manifest Exporter:** Generates formatted quantity-name manifests for direct mass-entry into marketplace carts.

### C. Cross-Platform Arbitrage Desk
- **Algorithm:** Mathematical comparison of physical Paper Market Floor against digital MTGO TIX redemption values using the calibrated ~$0.92 cash-out conversion factor.
- **Spread Matrix:** Itemized net dollar delta and percentage margins.

### D. Meta Analytics & Archetype Tracker
- **Competitive Field:** Tracking meta share and estimated paper completion costs for dominant format archetypes (Standard, Modern, Commander, Pioneer).
- **One-Click Pipeline:** 1-click import transfers tournament archetype decklists straight into the Procurement Hunter acquisition grid.

### E. eBay & Multi-Marketplace Content Inspector
- **Smart Extraction:** Prioritizes `.ux-labels-values__labels` Item Specifics table for exact card name extraction, bypassing set strings and conditions.
- **Algorithmic Deal Tiering:** Automatically assigns S-Tier ($20\%+$ discount), Good Deal ($5\%+$ discount), Fair Market Value, or Overpriced flags.
