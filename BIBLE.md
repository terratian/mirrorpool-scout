# Mirror Pool Scout - Component Bible & Architecture Log

### Component: Bulk Cart Manifest Exporter
- **File:** `dashboard.js`
- **Purpose:** Aggregates unacquired inventory items from active deck registries into a clean quantity-name text format.
- **Monetization Hook:** Designed to feed directly into mass-entry terminal endpoints wrapped with affiliate tracking parameters.

### Component: Standalone Watermark & Supporter Key Engine
- **File:** `dashboard.js`, `dashboard.html`
- **Purpose:** Displays a non-intrusive background watermark and bottom supporter banner in the free evaluation build while keeping 100% of standalone Scout features unlocked.
- **Licensing & Distribution:** A one-time **$9.00 Lifetime Key** (via Gumroad) validates locally in `chrome.storage.local` (`licenseValid: true`) and permanently removes the background watermark and bottom banner. Operates in `Standalone Mode` independent of the future Mirror Pool Suite.
