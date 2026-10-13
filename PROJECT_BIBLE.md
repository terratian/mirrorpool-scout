
## 6. Current Architecture: User-Intent Popup & Site Metrics Schema
* **Transition Date:** October 2026
* **Architecture Shift:** Eliminated intrusive, fragile floating DOM overlay injections in favor of a clean, user-controlled **Extension Popup Utility** (`popup.html` / `popup.js`) paired with a declarative **Site Metrics Schema** (`metrics-schema.js`).
* **Supported Target Platforms:** MTGGoldfish, TCGplayer, eBay, and MTGDecks.
* **Workflow:** User browses a target site, opens the browser action popup, reviews preconfigured site metrics (such as Paper Floor, MTGO TIX, or Auction Bids), and explicitly triggers **"Migrate Dataset"** to push records into `chrome.storage.local` for side panel dashboard analytics.
