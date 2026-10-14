// --- Mirror Pool Scout: Site-Specific Cross-Platform Intelligence Adapters ---
(() => {
    const host = window.location.hostname;
    const path = window.location.pathname;

    // eBay item listings are handled by content.js Auction Tracker badge
    if (host.includes("ebay.com") && path.includes("/itm/")) return;
    if (document.getElementById("mirrorpool-site-adapter")) return;

    const TIX_RATE = 0.92;

    // 1. Site-Specific Deck & Card Extractors
    function extractGoldfishData() {
        const isDeck = path.includes("/archetype/") || path.includes("/deck/");
        const h1 = document.querySelector("h1.deck-view-title, .card-name-header h1, main h1, h1");
        let title = h1 ? (h1.childNodes[0]?.textContent?.trim() || h1.innerText.split("\n")[0].trim()) : document.title.split("|")[0].trim();
        title = title.replace(/\s*Price$/i, "").trim();

        const bodyText = document.body.innerText;
        const paperMatch = bodyText.match(/Tabletop\s*\$\s*([\d,]+(?:\.\d{2})?)/i);
        const tixMatch = bodyText.match(/MTGO\s*([\d,]+(?:\.\d{2})?)\s*tix/i);
        const paperVal = paperMatch ? parseFloat(paperMatch[1].replace(/,/g, "")) : 0;
        const tixVal = tixMatch ? parseFloat(tixMatch[1].replace(/,/g, "")) : 0;

        const deckMap = new Map();
        let highestCard = { name: "", price: 0 };

        if (isDeck) {
            // Only parse the FIRST visible deck table (#tab-paper or primary table) so quantities aren't doubled by #tab-online
            const primaryTable = document.querySelector("#tab-paper table.deck-view-deck-table, table.deck-view-deck-table") || document;
            primaryTable.querySelectorAll("tr").forEach(tr => {
                if (tr.classList.contains("deck-category-header") || tr.querySelector("th")) return;
                const link = tr.querySelector("a[href*='/price/'], td.deck-col-card a, a.card_id");
                const qtyTd = tr.querySelector("td.deck-col-qty, td:first-child");
                const priceTd = tr.querySelector("td.deck-col-price, td:nth-last-child(2), td:last-child");
                if (link && qtyTd) {
                    const name = link.innerText.trim();
                    const qMatch = qtyTd.innerText.trim().match(/^(\d{1,2})\b/);
                    const pMatch = priceTd ? priceTd.innerText.replace(/,/g, "").match(/\$\s*(\d+(?:\.\d+)?)/) : null;
                    if (name && qMatch) {
                        const qty = parseInt(qMatch[1], 10);
                        const rowPrice = pMatch ? parseFloat(pMatch[1]) : 0;
                        const unitPrice = qty > 0 ? rowPrice / qty : rowPrice;
                        if (unitPrice > highestCard.price) {
                            highestCard = { name, price: unitPrice };
                        }
                        const key = name.toLowerCase();
                        if (deckMap.has(key)) {
                            deckMap.get(key).quantity += qty;
                        } else {
                            deckMap.set(key, { cardName: name, quantity: qty, unitPrice, acquired: 0, basis: 0 });
                        }
                    }
                }
            });
        }

        const anchor = document.querySelector(".deck-view-description, h1.deck-view-title, .card-name-header, main h1, h1");
        return {
            site: "MTGGoldfish",
            isDeck,
            title,
            paperVal,
            tixVal,
            winRate: null,
            highestCard,
            decklist: Array.from(deckMap.values()),
            anchor
        };
    }

    function extractMtgDecksData() {
        const h1 = document.querySelector("h1");
        const title = h1 ? h1.innerText.trim() : document.title.split("|")[0].trim();
        const bodyText = document.body.innerText;
        const wrMatch = bodyText.match(/(\d{2}(?:\.\d)?)\s*%\s*(?:Winrate|Win\s*Rate)/i);
        const winRate = wrMatch ? wrMatch[1] + "%" : null;

        const deckMap = new Map();
        document.querySelectorAll("table tr, .card-item").forEach(row => {
            const qtyEl = row.querySelector(".td-qty, td:first-child, .qty");
            const nameEl = row.querySelector(".td-card a, .card-name, a[href*='/prices/'], a");
            if (qtyEl && nameEl) {
                const qMatch = qtyEl.innerText.trim().match(/^(\d{1,2})\b/);
                const name = nameEl.innerText.trim();
                if (qMatch && name && name.length > 2 && !/^(Lands|Creatures|Spells|Sideboard|Total)/i.test(name)) {
                    const qty = parseInt(qMatch[1], 10);
                    const key = name.toLowerCase();
                    if (!deckMap.has(key)) {
                        deckMap.set(key, { cardName: name, quantity: qty, acquired: 0, basis: 0 });
                    }
                }
            }
        });

        const anchor = document.querySelector("h1, .deck-header");
        return {
            site: "MTGDecks",
            isDeck: deckMap.size >= 3,
            title,
            paperVal: 0,
            tixVal: 0,
            winRate,
            highestCard: { name: "", price: 0 },
            decklist: Array.from(deckMap.values()),
            anchor
        };
    }

    function extractMarketplaceCardData() {
        const h1 = document.querySelector(".product-details__name, h1");
        const rawTitle = h1 ? h1.innerText.trim() : document.title.split("|")[0].trim();
        const cleanTitle = rawTitle.split(/[\(\[#|]/)[0].replace(/\s*-\s*Magic:.*$/i, "").trim();
        const pEl = document.querySelector(".product-details__price, .spotlight__price, .price-box-price");
        const pMatch = pEl ? pEl.innerText.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/) : null;
        const paperVal = pMatch ? parseFloat(pMatch[1]) : 0;
        const anchor = document.querySelector(".product-details__name, h1");

        return {
            site: host.includes("tcgplayer.com") ? "TCGplayer" : "Cardmarket",
            isDeck: false,
            title: cleanTitle,
            paperVal,
            tixVal: 0,
            winRate: null,
            highestCard: { name: cleanTitle, price: paperVal },
            decklist: [],
            anchor
        };
    }

    function buildSiteAdapter() {
        chrome.storage.local.get({ scoutArmed: true, procurementTargets: [], watchlist: [] }, (store) => {
            if (!store.scoutArmed) return;

            let data = null;
            if (host.includes("mtggoldfish.com")) data = extractGoldfishData();
            else if (host.includes("mtgdecks.net") || host.includes("magic.gg") || host.includes("wizards.com")) data = extractMtgDecksData();
            else if (host.includes("tcgplayer.com") || host.includes("cardmarket.com")) data = extractMarketplaceCardData();

            if (!data || (!data.isDeck && !data.title)) return;

            // Cross-reference against user's existing Mirror Pool Inventory & Watchlist!
            const ownedMap = new Map();
            (store.procurementTargets || []).forEach(t => {
                if (t.cardName) ownedMap.set(t.cardName.toLowerCase().trim(), t);
            });

            let alreadyAcquiredCount = 0;
            let ownedSavingsUsd = 0;
            let totalCards = 0;

            if (data.isDeck) {
                data.decklist.forEach(c => {
                    totalCards += c.quantity;
                    const match = ownedMap.get(c.cardName.toLowerCase().trim());
                    if (match && match.acquired > 0) {
                        const used = Math.min(c.quantity, match.acquired);
                        alreadyAcquiredCount += used;
                        ownedSavingsUsd += used * (c.unitPrice || 0);
                    }
                });
            }

            // Update extension toolbar badge count
            chrome.runtime.sendMessage({
                action: "verifyDetectedCandidates",
                deckCandidates: data.decklist,
                titleCandidates: [data.title]
            });

            // Compute What Goldfish/TCGplayer DOESN'T Show: Net Arbitrage Cash-Out Spread & True Cost to Complete
            const mtgoCashOutUsd = data.tixVal * TIX_RATE;
            const netArbSpread = data.paperVal > 0 && data.tixVal > 0 ? (data.paperVal - mtgoCashOutUsd) : 0;
            const netArbPct = data.paperVal > 0 ? (netArbSpread / data.paperVal) * 100 : 0;
            const trueCostToComplete = Math.max(0, data.paperVal - ownedSavingsUsd);

            const sniperCardName = data.highestCard?.name || data.title;
            const ebaySniperUrl = `https://www.ebay.com/sch/i.html?_nkw=MTG+${encodeURIComponent(sniperCardName)}&LH_BIN=1&_sop=15`;

            const container = document.createElement("div");
            container.id = "mirrorpool-site-adapter";
            container.style.cssText = "background:#0b1120; border:1px solid #00ffcc; border-radius:8px; padding:12px 16px; margin:14px 0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; color:#f8fafc; box-shadow:0 10px 25px rgba(0,0,0,0.65); position:relative; z-index:9999;";

            container.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px solid #1e293b; padding-bottom:6px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="color:#00ffcc; font-weight:800; font-size:12px; letter-spacing:0.5px;">◈ MIRROR POOL™ SCOUT</span>
                        <span style="background:#1e293b; color:#38bdf8; font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px;">${data.site.toUpperCase()} ADAPTER</span>
                    </div>
                    <span style="font-size:10px; font-weight:700; color:#10b981;">
                        ${data.isDeck ? `✓ ${totalCards} Cards (${data.decklist.length} Unique) Ready` : "✓ Live Cross-Market Comp"}
                    </span>
                </div>

                <!-- Value-Add Intelligence Row (Metrics Host Site Does NOT Compute) -->
                <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:10px; margin-bottom:10px; background:#070d17; padding:10px; border-radius:6px; border:1px solid #1e293b; text-align:left;">
                    <div>
                        <div style="font-size:9px; color:#94a3b8; text-transform:uppercase;">${data.isDeck ? "Your Cost to Complete" : "Scryfall Paper Floor"}</div>
                        <div id="mp-val-1" style="color:#00ffcc; font-size:13px; font-weight:800;">
                            ${data.isDeck
                                ? (trueCostToComplete > 0 ? `$${trueCostToComplete.toFixed(2)} (${alreadyAcquiredCount} Owned)` : "⏳ Calc via Scryfall...")
                                : (data.paperVal > 0 ? `$${data.paperVal.toFixed(2)}` : "⏳ Querying...")}
                        </div>
                    </div>
                    <div>
                        <div style="font-size:9px; color:#94a3b8; text-transform:uppercase;">MTGO Cash-Out ($0.92/TIX)</div>
                        <div id="mp-val-2" style="color:#38bdf8; font-size:13px; font-weight:800;">
                            ${data.tixVal > 0 ? `$${mtgoCashOutUsd.toFixed(2)} (${data.tixVal.toFixed(1)} TIX)` : "⏳ Querying TIX..."}
                        </div>
                    </div>
                    <div>
                        <div style="font-size:9px; color:#94a3b8; text-transform:uppercase;">Net Paper/MTGO Spread</div>
                        <div id="mp-val-3" style="color:${netArbSpread >= 0 ? "#f59e0b" : "#10b981"}; font-size:13px; font-weight:800;">
                            ${data.paperVal > 0 && data.tixVal > 0
                                ? `${netArbSpread >= 0 ? "+" : "-"}$${Math.abs(netArbSpread).toFixed(2)} (${netArbPct.toFixed(0)}%)`
                                : (data.winRate ? `Win Rate: ${data.winRate}` : "⏳ Computing...")}
                        </div>
                    </div>
                    <div>
                        <div style="font-size:9px; color:#94a3b8; text-transform:uppercase;">${data.isDeck ? "Top Chase Target" : "Active Deck Status"}</div>
                        <div style="color:#eab308; font-size:12px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${sniperCardName}">
                            ${data.isDeck && data.highestCard.name
                                ? `${data.highestCard.name} ($${data.highestCard.price.toFixed(2)})`
                                : (ownedMap.has(data.title.toLowerCase()) ? "🎯 In Your Procurement List!" : "Not in Active Deck")}
                        </div>
                    </div>
                </div>

                <!-- Unified Action Bar -->
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button id="mp-act-primary" style="flex:1.3; padding:8px 10px; border-radius:5px; background:#10b981; border:none; color:#030712; font-weight:800; font-size:11px; cursor:pointer;">
                        ${data.isDeck ? `⚡ Import ${data.decklist.length} Unique Cards to Procurement` : "📥 + Save to Watchlist"}
                    </button>
                    <button id="mp-act-secondary" style="flex:1; padding:8px 10px; border-radius:5px; background:#1e293b; border:1px solid #334155; color:#f8fafc; font-weight:700; font-size:11px; cursor:pointer;">
                        ${data.isDeck ? "📋 Copy Clean MTGA List" : "🎯 + Add to Procurement"}
                    </button>
                    <a href="${ebaySniperUrl}" target="_blank" style="flex:1; padding:8px 10px; border-radius:5px; background:#1e293b; border:1px solid #f59e0b; color:#f59e0b; font-weight:700; font-size:11px; text-decoration:none; text-align:center;">
                        🔍 Snipe ${data.isDeck && data.highestCard.name ? data.highestCard.name.split(",")[0] : "on eBay"} BIN ↗
                    </a>
                    <button id="mp-act-dash" style="flex:0.8; padding:8px 10px; border-radius:5px; background:rgba(0,255,204,0.08); border:1px solid #00ffcc; color:#00ffcc; font-weight:700; font-size:11px; cursor:pointer;">
                        ⛶ Dashboard
                    </button>
                </div>
            `;

            // Insert directly after the visible page header (or top of main content so hidden tabs never clip it)
            if (data.anchor && data.anchor.parentElement) {
                data.anchor.parentElement.insertBefore(container, data.anchor.nextSibling);
            } else {
                document.body.prepend(container);
            }

            // If on TCGplayer / MTGDecks where TIX or Paper Floor isn't on page, pull live Scryfall pricing automatically
            if (!data.isDeck && data.title) {
                chrome.runtime.sendMessage({ action: "fetchComps", cardName: data.title, cardTitle: data.title }, (comp) => {
                    if (comp && comp.found) {
                        const scryUsd = parseFloat(comp.usd || 0);
                        const scryTix = parseFloat(comp.tix || 0);
                        const tixUsd = scryTix * TIX_RATE;
                        const delta = (data.paperVal || scryUsd) - tixUsd;
                        const v1 = container.querySelector("#mp-val-1");
                        const v2 = container.querySelector("#mp-val-2");
                        const v3 = container.querySelector("#mp-val-3");
                        if (v1) v1.innerText = `$${scryUsd.toFixed(2)} (Scryfall)`;
                        if (v2) v2.innerText = `$${tixUsd.toFixed(2)} (${scryTix.toFixed(2)} TIX)`;
                        if (v3) v3.innerText = `${delta >= 0 ? "+" : "-"}$${Math.abs(delta).toFixed(2)} Spread`;
                    }
                });
            } else if (data.isDeck && data.paperVal === 0 && data.decklist.length > 0) {
                // On MTGDecks, compute live Scryfall Deck Total + MTGO TIX Cash-Out automatically!
                const names = data.decklist.map(c => c.cardName);
                chrome.runtime.sendMessage({ action: "fetchCollectionPrices", cardNames: names }, (res) => {
                    const priceMap = (res && res.prices) ? res.prices : {};
                    let sumUsd = 0, sumTix = 0;
                    data.decklist.forEach(c => {
                        const p = priceMap[c.cardName.toLowerCase()] || { usd: 0, tix: 0 };
                        sumUsd += (p.usd || 0) * c.quantity;
                        sumTix += (p.tix || 0) * c.quantity;
                    });
                    const cashOut = sumTix * TIX_RATE;
                    const v1 = container.querySelector("#mp-val-1");
                    const v2 = container.querySelector("#mp-val-2");
                    if (v1) v1.innerText = `$${Math.max(0, sumUsd - ownedSavingsUsd).toFixed(2)}`;
                    if (v2) v2.innerText = `$${cashOut.toFixed(2)} (${sumTix.toFixed(1)} TIX)`;
                });
            }

            // Wire Buttons
            const priBtn = container.querySelector("#mp-act-primary");
            const secBtn = container.querySelector("#mp-act-secondary");
            const dashBtn = container.querySelector("#mp-act-dash");

            priBtn.addEventListener("click", () => {
                priBtn.innerText = "⏳ Syncing...";
                chrome.runtime.sendMessage({
                    action: "importDetectedToScout",
                    mode: data.isDeck ? "deck" : "single",
                    decklist: data.decklist,
                    deckName: data.title,
                    cardName: data.title,
                    url: window.location.href
                }, () => {
                    priBtn.innerText = data.isDeck ? `✓ Imported ${data.decklist.length} Cards!` : "✓ In Watchlist!";
                    priBtn.style.background = "#059669";
                    priBtn.style.color = "#fff";
                });
            });

            secBtn.addEventListener("click", () => {
                if (data.isDeck) {
                    const mtga = data.decklist.map(c => `${c.quantity} ${c.cardName}`).join("\n");
                    navigator.clipboard.writeText(mtga).then(() => {
                        secBtn.innerText = "✓ MTGA Copied!";
                        setTimeout(() => { secBtn.innerText = "📋 Copy Clean MTGA List"; }, 2000);
                    });
                } else {
                    chrome.runtime.sendMessage({
                        action: "importDetectedToScout",
                        mode: "procurement_single",
                        cardName: data.title
                    }, () => {
                        secBtn.innerText = "✓ In Procurement!";
                        secBtn.style.borderColor = "#10b981";
                        secBtn.style.color = "#10b981";
                    });
                }
            });

            dashBtn.addEventListener("click", () => {
                chrome.runtime.sendMessage({ action: "openDashboard" });
            });
        });
    }

    setTimeout(buildSiteAdapter, 900);
})();
