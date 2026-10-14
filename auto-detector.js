// --- Mirror Pool Scout: Unified Floating Frame for Flagged TCG Sites ---
(() => {
    if (window.location.hostname.includes("ebay.com") && window.location.pathname.includes("/itm/")) {
        return; // eBay item pages use the inline Auction Tracker badge in content.js
    }
    if (document.getElementById("mpscout-autodetect-host")) return;

    function scanPageForCandidates() {
        const deckCandidates = [];
        const seenLines = new Set();

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

        const titleCandidates = [];
        document.querySelectorAll("h1, .product-details__name, .card-name-header").forEach(h => {
            const t = (h.innerText || "").trim();
            if (t && t.length <= 65 && !/privacy|cookie|ccpa/i.test(t)) {
                titleCandidates.push(t.split(/[\(\[#|]/)[0].replace(/\bPrice\b/i, "").trim());
            }
        });

        const docTitle = document.title.split(/[|\-—:]/)[0].split(/[\(\[#]/)[0].replace(/\bPrice\b/i, "").trim();
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

            renderUnifiedFloatingFrame(res, hasDeck);
        });
    }

    function renderUnifiedFloatingFrame(res, hasDeck) {
        if (document.getElementById("mpscout-autodetect-host")) return;

        const host = document.createElement("div");
        host.id = "mpscout-autodetect-host";
        host.style.cssText = "position:fixed; bottom:20px; right:20px; z-index:2147483646; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;";
        const shadow = host.attachShadow({ mode: "open" });

        const siteHost = window.location.hostname.replace(/^www\./, "").toUpperCase();

        shadow.innerHTML = `
            <div style="background:#0b1120; border:1px solid #1e293b; border-radius:8px; padding:12px; width:285px; color:#f8fafc; box-shadow:0 12px 28px rgba(0,0,0,0.75);">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #1e293b; padding-bottom:6px; margin-bottom:8px;">
                    <span style="color:#00ffcc; font-weight:800; font-size:11px; letter-spacing:0.5px;">◈ MIRROR POOL™ SCOUT</span>
                    <div style="display:flex; align-items:center; gap:6px;">
                        <span style="font-size:9px; color:#94a3b8; font-weight:700;">${siteHost}</span>
                        <button id="mp-close" style="background:transparent; border:none; color:#64748b; cursor:pointer; font-size:12px; padding:0;">✕</button>
                    </div>
                </div>

                <div style="background:#070d17; border:1px solid #1e293b; border-radius:6px; padding:8px; margin-bottom:10px; font-size:12px;">
                    <div style="color:#38bdf8; font-weight:700; font-size:13px; margin-bottom:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                        ${hasDeck ? `Decklist (${res.totalCards} Cards / ${res.decklist.length} Unique)` : res.singleCard}
                    </div>
                    <div id="mp-live-metrics" style="display:flex; justify-content:space-between; font-size:11px; color:#94a3b8;">
                        ${hasDeck
                            ? `<span>Verified via Scryfall DB</span><strong style="color:#10b981;">Ready</strong>`
                            : `<span>Scryfall Floor: <strong id="mp-fl" style="color:#10b981;">...</strong></span><span>MTGO: <strong id="mp-tx" style="color:#38bdf8;">...</strong></span>`
                        }
                    </div>
                </div>

                <div style="display:flex; gap:6px; margin-bottom:6px;">
                    <button id="mp-primary-btn" style="flex:1; background:#10b981; color:#030712; border:none; border-radius:4px; padding:7px 6px; font-weight:800; font-size:11px; cursor:pointer;">
                        ${hasDeck ? "⚡ Import Deck" : "📥 + Watchlist"}
                    </button>
                    <button id="mp-secondary-btn" style="flex:1; background:#1e293b; color:#f8fafc; border:1px solid #334155; border-radius:4px; padding:7px 6px; font-weight:700; font-size:11px; cursor:pointer;">
                        ${hasDeck ? "📋 Copy MTGA" : "🎯 + Procurement"}
                    </button>
                </div>
                <button id="mp-dash-btn" style="width:100%; background:rgba(0,255,204,0.06); border:1px solid #00ffcc; color:#00ffcc; border-radius:4px; padding:6px; font-weight:700; font-size:11px; cursor:pointer;">
                    ⛶ Open Scout Dashboard
                </button>
            </div>
        `;

        document.body.appendChild(host);

        // If single card, populate live Scryfall Floor + MTGO TIX right inside the floating frame
        if (!hasDeck && res.singleCard) {
            chrome.runtime.sendMessage({ action: "fetchComps", cardName: res.singleCard, cardTitle: res.singleCard }, (comp) => {
                const fl = shadow.getElementById("mp-fl");
                const tx = shadow.getElementById("mp-tx");
                if (comp && comp.found) {
                    if (fl) fl.innerText = "$" + parseFloat(comp.usd || 0).toFixed(2);
                    if (tx) tx.innerText = (comp.tix || "0.00") + " TIX";
                }
            });
        }

        const primaryBtn = shadow.getElementById("mp-primary-btn");
        const secondaryBtn = shadow.getElementById("mp-secondary-btn");
        const dashBtn = shadow.getElementById("mp-dash-btn");
        const closeBtn = shadow.getElementById("mp-close");

        // Primary Button: "+ Watchlist" (single) OR "Import Deck" (deck)
        primaryBtn.addEventListener("click", () => {
            primaryBtn.innerText = "⏳ Saving...";
            chrome.runtime.sendMessage({
                action: "importDetectedToScout",
                mode: hasDeck ? "deck" : "single",
                decklist: res.decklist,
                deckName: document.title.split("|")[0].trim(),
                cardName: res.singleCard,
                url: window.location.href
            }, () => {
                primaryBtn.innerText = hasDeck ? "✓ Deck Imported" : "✓ In Watchlist";
            });
        });

        // Secondary Button: "+ Procurement" (single) OR "Copy MTGA" (deck)
        secondaryBtn.addEventListener("click", () => {
            if (hasDeck) {
                const mtga = res.decklist.map(c => `${c.quantity} ${c.cardName}`).join("\n");
                navigator.clipboard.writeText(mtga).then(() => {
                    secondaryBtn.innerText = "✓ MTGA Copied!";
                    setTimeout(() => { secondaryBtn.innerText = "📋 Copy MTGA"; }, 2000);
                });
            } else {
                secondaryBtn.innerText = "⏳ Adding...";
                chrome.runtime.sendMessage({
                    action: "importDetectedToScout",
                    mode: "procurement_single",
                    cardName: res.singleCard
                }, () => {
                    secondaryBtn.innerText = "✓ In Procurement";
                });
            }
        });

        dashBtn.addEventListener("click", () => {
            chrome.runtime.sendMessage({ action: "openDashboard" });
        });

        closeBtn.addEventListener("click", () => host.remove());
    }

    setTimeout(runDetection, 1300);
})();
