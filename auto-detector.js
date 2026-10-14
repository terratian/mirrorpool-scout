// --- Mirror Pool Scout: Non-Intrusive Scryfall-Verified Auto-Detector ---
(() => {
    if (window.location.hostname.includes("ebay.com") && window.location.pathname.includes("/itm/")) {
        return; // Leave eBay listing pages 100% to content.js Auction Tracker badge
    }
    if (document.getElementById("mpscout-autodetect-host")) return;

    function scanPageForCandidates() {
        const deckCandidates = [];
        const seenLines = new Set();

        // 1. Scan structured table rows, decklist containers, and text nodes for "Qty CardName"
        const selectors = "tr, li, .deck-list-row, .decklist-card, .card-item, .deck-table td, p, pre";
        document.querySelectorAll(selectors).forEach(el => {
            const raw = (el.innerText || "").trim().replace(/\s+/g, " ");
            if (!raw || raw.length > 65 || seenLines.has(raw)) return;
            seenLines.add(raw);

            const m = raw.match(/^(\d{1,2})[xX]?\s+([A-Za-z][A-Za-z0-9',/\-\s]{2,45}?)(?:\s+\([A-Z0-9]{2,5}\)\s*\d*|\s+\$[\d.]+|\s+\d+\.\d+\s*tix)?$/i);
            if (m) {
                const qty = parseInt(m[1], 10);
                const name = m[2].trim();
                if (qty >= 1 && qty <= 99) {
                    deckCandidates.push({ quantity: qty, cardName: name });
                }
            }
        });

        // 2. Scan primary headings & document.title for single-card pages (TCGplayer, Goldfish, Cardmarket)
        const titleCandidates = [];
        document.querySelectorAll("h1, .product-details__name, .card-name-header").forEach(h => {
            const t = (h.innerText || "").trim();
            if (t && t.length <= 60) {
                titleCandidates.push(t.split(/[\(\[#|]/)[0].replace(/\bPrice\b/i, "").trim());
            }
        });

        const docTitle = document.title.split(/[|\-—:]/)[0].split(/[\(\[#]/)[0].trim();
        if (docTitle) titleCandidates.push(docTitle);

        return { deckCandidates, titleCandidates };
    }

    function runDetection() {
        const { deckCandidates, titleCandidates } = scanPageForCandidates();
        if (deckCandidates.length === 0 && titleCandidates.length === 0) return;

        chrome.runtime.sendMessage({
            action: "verifyDetectedCandidates",
            deckCandidates,
            titleCandidates
        }, (res) => {
            if (chrome.runtime.lastError || !res || !res.armed) return;

            const hasDeck = Array.isArray(res.decklist) && res.decklist.length >= 3;
            const hasSingle = Boolean(res.singleCard);
            if (!hasDeck && !hasSingle) return;

            renderDetectionPill(res);
        });
    }

    function renderDetectionPill(res) {
        if (document.getElementById("mpscout-autodetect-host")) return;

        const host = document.createElement("div");
        host.id = "mpscout-autodetect-host";
        host.style.cssText = "position:fixed; top:14px; right:14px; z-index:2147483646; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;";
        const shadow = host.attachShadow({ mode: "open" });

        const hasDeck = Array.isArray(res.decklist) && res.decklist.length >= 3;
        const labelText = hasDeck
            ? `Deck Detected: <strong>${res.totalCards} cards</strong> (${res.decklist.length} unique)`
            : `Card Detected: <strong>${res.singleCard}</strong>`;

        const btnLabel = hasDeck ? "⚡ Import Deck to Scout" : "🎯 Add to Watchlist";

        shadow.innerHTML = `
            <div style="background:#0b1120; border:1px solid #10b981; border-radius:8px; padding:8px 12px; color:#f8fafc; display:flex; align-items:center; gap:10px; box-shadow:0 10px 25px rgba(0,0,0,0.65); font-size:12px;">
                <span style="color:#00ffcc; font-weight:800;">◈ SCOUT</span>
                <span style="color:#cbd5e1;">${labelText}</span>
                <button id="mp-auto-import-btn" style="background:#10b981; color:#030712; border:none; border-radius:5px; padding:5px 10px; font-weight:800; font-size:11px; cursor:pointer; white-space:nowrap;">${btnLabel}</button>
                <button id="mp-auto-open-btn" style="background:#1e293b; color:#38bdf8; border:1px solid #334155; border-radius:5px; padding:5px 8px; font-weight:700; font-size:11px; cursor:pointer;" title="Open Dashboard">⛶</button>
                <button id="mp-auto-close-btn" style="background:transparent; border:none; color:#64748b; font-size:14px; cursor:pointer; padding:0 4px;" title="Dismiss">✕</button>
            </div>
        `;

        document.body.appendChild(host);

        const importBtn = shadow.getElementById("mp-auto-import-btn");
        const openBtn = shadow.getElementById("mp-auto-open-btn");
        const closeBtn = shadow.getElementById("mp-auto-close-btn");

        importBtn.addEventListener("click", () => {
            importBtn.innerText = "⏳ Importing...";
            chrome.runtime.sendMessage({
                action: "importDetectedToScout",
                mode: hasDeck ? "deck" : "single",
                decklist: res.decklist,
                deckName: document.title.split("|")[0].trim(),
                cardName: res.singleCard,
                url: window.location.href
            }, (reply) => {
                if (reply && reply.status === "success") {
                    importBtn.innerText = "✅ Imported to Scout!";
                    importBtn.style.background = "#059669";
                    importBtn.style.color = "#fff";
                } else {
                    importBtn.innerText = "❌ Retry";
                }
            });
        });

        openBtn.addEventListener("click", () => {
            chrome.runtime.sendMessage({ action: "openDashboard" });
        });

        closeBtn.addEventListener("click", () => host.remove());
    }

    setTimeout(runDetection, 1400);
})();
