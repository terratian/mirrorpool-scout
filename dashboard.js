// --- Mirror Pool Scout: Full 5-Tab Controller (Matched to Exact 22 DOM IDs) ---

const TIX_TO_USD = 0.92;

function escapeHtml(str) {
    return String(str || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function parsePrice(val) {
    if (typeof val === "number") return isFinite(val) ? val : 0;
    const m = String(val || "").match(/(\d+(?:\.\d+)?)/);
    return m ? parseFloat(m[1]) : 0;
}

document.addEventListener("DOMContentLoaded", () => {
    initTabNavigation();
    initProcurementControls();
    initMetaTracker();
    initSettingsPanel();
    syncAllPanels();
});

// 1. Sidebar Tab Switching (#tab-watchlist, #tab-procurement, #tab-arbitrage, #tab-meta, #tab-settings)
function initTabNavigation() {
    const panels = ["tab-watchlist", "tab-procurement", "tab-arbitrage", "tab-meta", "tab-settings"];
    const navItems = document.querySelectorAll(".sidebar .nav-item, .nav-item, [data-tab], [data-target]");

    navItems.forEach((item) => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            navItems.forEach(n => n.classList.remove("active"));
            item.classList.add("active");

            const explicitTarget = item.getAttribute("data-tab") || item.getAttribute("data-target") || item.getAttribute("href")?.replace("#", "");
            const text = item.innerText.toLowerCase();

            let targetId = explicitTarget;
            if (!targetId || !document.getElementById(targetId)) {
                if (text.includes("watch") || text.includes("chase")) targetId = "tab-watchlist";
                else if (text.includes("procure") || text.includes("hunter")) targetId = "tab-procurement";
                else if (text.includes("arbitrage")) targetId = "tab-arbitrage";
                else if (text.includes("meta") || text.includes("insight")) targetId = "tab-meta";
                else if (text.includes("setting") || text.includes("pref")) targetId = "tab-settings";
            }

            if (targetId && document.getElementById(targetId)) {
                panels.forEach(pid => {
                    const el = document.getElementById(pid);
                    if (el) el.classList.toggle("active", pid === targetId);
                });
            }
        });
    });
}

// 2. Sync & Render All Storage Buckets into Watchlist, Procurement & Arbitrage
function syncAllPanels() {
    chrome.storage.local.get(
        ["watchlist", "watchlist_cards", "card_chase", "procurementTargets", "currentDecklist", "deckMeta"],
        (res) => {
            // Merge legacy & new watchlist/chase records cleanly
            const combinedWatchlist = [
                ...(Array.isArray(res.watchlist) ? res.watchlist : []),
                ...(Array.isArray(res.watchlist_cards) ? res.watchlist_cards : []),
                ...(Array.isArray(res.card_chase) ? res.card_chase : [])
            ];

            // Restore deck metadata controls if saved
            if (res.deckMeta) {
                const nameInput = document.getElementById("deck-name-input");
                const printSelect = document.getElementById("printing-target-select");
                const condSelect = document.getElementById("condition-floor-select");
                if (nameInput && res.deckMeta.deckName) nameInput.value = res.deckMeta.deckName;
                if (printSelect && res.deckMeta.printingTarget) printSelect.value = res.deckMeta.printingTarget;
                if (condSelect && res.deckMeta.conditionFloor) condSelect.value = res.deckMeta.conditionFloor;
            }

            const targets = Array.isArray(res.procurementTargets) && res.procurementTargets.length > 0
                ? res.procurementTargets
                : (Array.isArray(res.currentDecklist) ? res.currentDecklist : []);

            renderWatchlistPanel(combinedWatchlist);
            renderProcurementAndArbitrage(targets, combinedWatchlist, res.deckMeta || {});
        }
    );
}

// 3. Render #tab-watchlist (#wl-market-total, #wl-total-spent, #wl-net-variance, #watchlist-grid)
function renderWatchlistPanel(items) {
    const grid = document.getElementById("watchlist-grid");
    const mktEl = document.getElementById("wl-market-total");
    const spentEl = document.getElementById("wl-total-spent");
    const varEl = document.getElementById("wl-net-variance");

    if (!grid) return;

    if (!items || items.length === 0) {
        grid.innerHTML = `<div style="color:#94a3b8; font-size:12px; padding:16px; border:1px dashed #1e293b; border-radius:6px;">No active targets in Watchlist / Card Chase yet. Use the eBay badge or Popup Utility to bookmark listings.</div>`;
        if (mktEl) mktEl.innerText = "$0.00";
        if (spentEl) spentEl.innerText = "$0.00";
        if (varEl) varEl.innerText = "$0.00";
        return;
    }

    let marketTotal = 0;
    let spentTotal = 0;

    grid.innerHTML = items.map((item, idx) => {
        const title = item.cardName || item.title || "Tracked Listing";
        const marketFloor = parsePrice(item.marketFloor || item.paperPrice || item.usd || item.valueA);
        const currentCost = parsePrice(item.totalCost || item.currentPrice || item.price || item.valueA);
        const timeText = item.timeLeft || item.metricB || "Active";
        const activityText = item.activity || (item.valueB ? `${item.metricB || "Info"}: ${item.valueB}` : "0 Bidders / 0 Watchers");

        marketTotal += marketFloor;
        spentTotal += currentCost;

        return `
            <div class="watchlist-card" style="background:#0b1120; border:1px solid #1e293b; border-radius:8px; padding:14px; display:flex; flex-direction:column; gap:8px;">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
                    <a href="${escapeHtml(item.url || "#")}" target="_blank" style="color:#10b981; font-weight:700; font-size:14px; text-decoration:none; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${escapeHtml(title)}">${escapeHtml(title)}</a>
                    <span style="font-size:11px; color:#f59e0b; background:#1e293b; padding:2px 6px; border-radius:4px; white-space:nowrap;">⏱ ${escapeHtml(timeText)}</span>
                </div>
                <div style="background:#070d17; border:1px solid #1e293b; border-radius:6px; padding:10px; font-size:12px; display:flex; flex-direction:column; gap:4px;">
                    <div style="display:flex; justify-content:space-between;"><span style="color:#94a3b8;">Market Floor:</span><strong style="color:#f59e0b;">${marketFloor > 0 ? "$" + marketFloor.toFixed(2) : "$--"}</strong></div>
                    <div style="display:flex; justify-content:space-between;"><span style="color:#94a3b8;">Current eBay/List Cost:</span><strong style="color:#f8fafc;">$${currentCost.toFixed(2)}</strong></div>
                    <div style="display:flex; justify-content:space-between;"><span style="color:#94a3b8;">Activity:</span><span style="color:#10b981;">${escapeHtml(activityText)}</span></div>
                </div>
                <button class="btn drop-wl-btn" data-index="${idx}" style="background:transparent; border:1px solid #ef4444; color:#ef4444; padding:6px; border-radius:4px; cursor:pointer; font-size:11px; font-weight:600;">✖ Drop Target</button>
            </div>
        `;
    }).join("");

    const netVariance = marketTotal - spentTotal;
    if (mktEl) mktEl.innerText = "$" + marketTotal.toFixed(2);
    if (spentEl) spentEl.innerText = "$" + spentTotal.toFixed(2);
    if (varEl) {
        varEl.innerText = (netVariance >= 0 ? "+$" : "-$") + Math.abs(netVariance).toFixed(2);
        varEl.style.color = netVariance >= 0 ? "#10b981" : "#ef4444";
    }

    grid.querySelectorAll(".drop-wl-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const idx = parseInt(btn.getAttribute("data-index"), 10);
            const updated = items.filter((_, i) => i !== idx);
            chrome.storage.local.set({ watchlist: updated, watchlist_cards: [], card_chase: [] }, syncAllPanels);
        });
    });
}

// 4. Wire #tab-procurement Controls (#scrape-deck-btn, #export-manifest-btn, #save-deck-btn, etc.)
function initProcurementControls() {
    const saveDeckBtn = document.getElementById("save-deck-btn");
    const scrapeDeckBtn = document.getElementById("scrape-deck-btn");
    const exportManifestBtn = document.getElementById("export-manifest-btn");
    const decklistInput = document.getElementById("decklist-input");
    const deckNameInput = document.getElementById("deck-name-input");
    const printingSelect = document.getElementById("printing-target-select");
    const conditionSelect = document.getElementById("condition-floor-select");

    if (saveDeckBtn && decklistInput) {
        saveDeckBtn.addEventListener("click", () => {
            const raw = decklistInput.value.trim();
            if (!raw) {
                alert("Paste a decklist into the box first (e.g. 4 Thoughtseize).");
                return;
            }
            const parsedMap = new Map();
            raw.split("\n").forEach(line => {
                const cleaned = line.trim();
                if (!cleaned || /^(Deck|Sideboard|Commander|Companion|\/\/)/i.test(cleaned)) return;
                // Strip MTGA set codes like (2XM) 107 cleanly
                const match = cleaned.match(/^(\d+)[xX]?\s+(.+?)(?:\s+\([A-Z0-9]{2,5}\)\s*\d*.*)?$/);
                if (match) {
                    const qty = parseInt(match[1], 10) || 1;
                    const name = match[2].trim();
                    const key = name.toLowerCase();
                    if (parsedMap.has(key)) {
                        parsedMap.get(key).quantity += qty;
                    } else {
                        parsedMap.set(key, { cardName: name, quantity: qty, acquired: 0, basis: 0 });
                    }
                }
            });

            const list = Array.from(parsedMap.values());
            if (list.length === 0) {
                alert("Could not parse any valid card lines. Format: '4 Thoughtseize'");
                return;
            }

            const deckMeta = {
                deckName: deckNameInput ? deckNameInput.value.trim() : "Custom Brew",
                printingTarget: printingSelect ? printingSelect.value : "normal",
                conditionFloor: conditionSelect ? conditionSelect.value : "any"
            };

            saveDeckBtn.innerText = "⏳ Querying Scryfall...";
            chrome.storage.local.set({ procurementTargets: list, currentDecklist: list, deckMeta }, () => {
                syncAllPanels();
                setTimeout(() => { saveDeckBtn.innerText = "⚡ Save & Generate Procurement Sheet"; }, 1200);
            });
        });
    }

    if (scrapeDeckBtn) {
        scrapeDeckBtn.addEventListener("click", () => {
            const origText = scrapeDeckBtn.innerText;
            scrapeDeckBtn.innerText = "⏳ Scanning Open Tabs...";

            chrome.tabs.query({ url: ["*://*.mtgdecks.net/*", "*://*.mtggoldfish.com/*", "*://*.magic.gg/*", "*://*.wizards.com/*"] }, (tabs) => {
                if (!tabs || tabs.length === 0) {
                    alert("No open MTGDecks, MTGGoldfish, or Magic.gg tab detected. Open a decklist tab first.");
                    scrapeDeckBtn.innerText = origText;
                    return;
                }

                const targetTab = tabs[0];
                chrome.scripting.executeScript({
                    target: { tabId: targetTab.id },
                    func: () => {
                        const cards = [];
                        // Try common decklist row selectors across MTGGoldfish & MTGDecks
                        const rows = document.querySelectorAll("tr.deck-category-card, .deck-table tr, .card-item, [data-card-id]");
                        rows.forEach(r => {
                            const text = r.innerText.trim().replace(/\s+/g, " ");
                            const m = text.match(/^(\d+)\s+([A-Za-z0-9',/\-\s]+)/);
                            if (m && m[2].length > 2 && !/^(Lands|Creatures|Spells|Sideboard|Total)/i.test(m[2])) {
                                cards.push(`${m[1]} ${m[2].trim()}`);
                            }
                        });
                        return { title: document.title.split("|")[0].trim(), lines: cards };
                    }
                }, (results) => {
                    scrapeDeckBtn.innerText = origText;
                    if (chrome.runtime.lastError || !results || !results[0]?.result?.lines?.length) {
                        alert("Could not automatically parse rows on that tab. You can copy/paste the list directly into the box below.");
                        return;
                    }
                    const { title, lines } = results[0].result;
                    if (deckNameInput && title) deckNameInput.value = title;
                    if (decklistInput) decklistInput.value = lines.join("\n");
                    if (saveDeckBtn) saveDeckBtn.click();
                });
            });
        });
    }

    if (exportManifestBtn) {
        exportManifestBtn.addEventListener("click", () => {
            chrome.storage.local.get(["procurementTargets", "currentDecklist"], (res) => {
                const list = res.procurementTargets || res.currentDecklist || [];
                if (list.length === 0) {
                    alert("No procurement sheet loaded to export.");
                    return;
                }
                // Clean mass-entry format (no header/footer clutter that breaks TCGplayer Mass Entry)
                const manifestText = list
                    .map(c => `${Math.max(0, (c.quantity || 1) - (c.acquired || 0))} ${c.cardName}`)
                    .filter(line => !line.startsWith("0 "))
                    .join("\n");

                navigator.clipboard.writeText(manifestText).then(() => {
                    const orig = exportManifestBtn.innerText;
                    exportManifestBtn.innerText = "✅ Clean Manifest Copied!";
                    setTimeout(() => { exportManifestBtn.innerText = orig; }, 2000);
                });
            });
        });
    }

    if (printingSelect) printingSelect.addEventListener("change", syncAllPanels);
    if (conditionSelect) conditionSelect.addEventListener("change", syncAllPanels);
}

// 5. Fetch Live Scryfall Prices & Populate #procurement-tbody and #tab-arbitrage
function renderProcurementAndArbitrage(targets, watchlistItems, deckMeta) {
    const tbody = document.getElementById("procurement-tbody");
    const arbPaperEl = document.getElementById("arb-paper-total");
    const arbMtgoEl = document.getElementById("arb-mtgo-total");
    const arbSpreadEl = document.getElementById("arb-spread-total");
    const arbGrid = document.getElementById("arbitrage-spread-grid");

    const cardNames = [
        ...targets.map(t => t.cardName),
        ...watchlistItems.map(w => w.cardName || w.title)
    ].filter(Boolean);

    if (cardNames.length === 0) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:16px; color:#94a3b8;">Paste a decklist above and click Save & Generate Procurement Sheet.</td></tr>`;
        if (arbGrid) arbGrid.innerHTML = `<div style="color:#94a3b8; font-size:12px; padding:16px;">Load a decklist in Procurement Hunter to compute live Paper vs. MTGO TIX arbitrage spreads.</div>`;
        return;
    }

    chrome.runtime.sendMessage({ action: "fetchCollectionPrices", cardNames }, (response) => {
        const priceMap = (response && response.prices) ? response.prices : {};
        const preferFoil = (document.getElementById("printing-target-select")?.value || deckMeta.printingTarget || "").toLowerCase().includes("foil");

        let totalPaperRemaining = 0;
        let totalMtgoTixRemaining = 0;

        if (tbody) {
            tbody.innerHTML = targets.map((item, idx) => {
                const name = item.cardName || "Unknown Card";
                const key = name.toLowerCase();
                const scry = priceMap[key] || { usd: 0, usd_foil: 0, tix: 0 };
                const unitPaper = preferFoil && scry.usd_foil > 0 ? scry.usd_foil : scry.usd;
                const unitTix = scry.tix || 0;
                const qty = item.quantity || 1;
                const acquired = item.acquired || 0;
                const remaining = Math.max(0, qty - acquired);

                totalPaperRemaining += unitPaper * remaining;
                totalMtgoTixRemaining += unitTix * remaining;

                const encoded = encodeURIComponent(name);
                const tcgUrl = `https://www.tcgplayer.com/search/magic/product?q=${encoded}`;
                const ebayBinUrl = `https://www.ebay.com/sch/i.html?_nkw=MTG+${encoded}&LH_BIN=1&_sop=15`;
                const ebayAuctionUrl = `https://www.ebay.com/sch/i.html?_nkw=MTG+${encoded}&LH_Auction=1&_sop=1`;

                return `
                    <tr style="border-bottom:1px solid #1e293b; font-size:12px;">
                        <td style="padding:10px; color:#10b981; font-weight:700;">${escapeHtml(name)}</td>
                        <td style="padding:10px; color:#cbd5e1;">${acquired} / ${qty}</td>
                        <td style="padding:10px; color:#f59e0b; font-weight:700;">$${unitPaper.toFixed(2)}</td>
                        <td style="padding:10px; color:#38bdf8;">${unitTix.toFixed(2)} TIX</td>
                        <td style="padding:10px; color:#94a3b8;">$${(item.basis || 0).toFixed(2)}</td>
                        <td style="padding:10px;">
                            <div style="display:flex; gap:4px; align-items:center;">
                                <input type="number" step="0.01" placeholder="Paid $" class="basis-input" data-idx="${idx}" style="width:65px; background:#070d17; border:1px solid #334155; color:#f8fafc; padding:4px; border-radius:4px; font-size:11px;">
                                <button class="log-basis-btn" data-idx="${idx}" style="background:#10b981; color:#030712; border:none; padding:4px 8px; border-radius:4px; font-weight:700; font-size:11px; cursor:pointer;">+1</button>
                            </div>
                        </td>
                        <td style="padding:10px;">
                            <div style="display:flex; gap:6px;">
                                <a href="${tcgUrl}" target="_blank" style="color:#cbd5e1; background:#1e293b; padding:4px 6px; border-radius:4px; text-decoration:none; font-size:11px;">TCG</a>
                                <a href="${ebayBinUrl}" target="_blank" style="color:#10b981; background:#1e293b; padding:4px 6px; border-radius:4px; text-decoration:none; font-size:11px;">BIN</a>
                                <a href="${ebayAuctionUrl}" target="_blank" style="color:#f59e0b; background:#1e293b; padding:4px 6px; border-radius:4px; text-decoration:none; font-size:11px;">Auc</a>
                            </div>
                        </td>
                    </tr>
                `;
            }).join("");

            tbody.querySelectorAll(".log-basis-btn").forEach(btn => {
                btn.addEventListener("click", () => {
                    const idx = parseInt(btn.getAttribute("data-idx"), 10);
                    const input = tbody.querySelector(`.basis-input[data-idx="${idx}"]`);
                    const paid = parsePrice(input ? input.value : 0);
                    if (targets[idx]) {
                        targets[idx].acquired = Math.min(targets[idx].quantity, (targets[idx].acquired || 0) + 1);
                        targets[idx].basis = (targets[idx].basis || 0) + paid;
                        chrome.storage.local.set({ procurementTargets: targets }, syncAllPanels);
                    }
                });
            });
        }

        // Update #tab-arbitrage HUD & Spread Grid
        const mtgoUsd = totalMtgoTixRemaining * TIX_TO_USD;
        const spreadUsd = totalPaperRemaining - mtgoUsd;
        const spreadPct = totalPaperRemaining > 0 ? (spreadUsd / totalPaperRemaining) * 100 : 0;

        if (arbPaperEl) arbPaperEl.innerText = `$${totalPaperRemaining.toFixed(2)}`;
        if (arbMtgoEl) arbMtgoEl.innerText = `${totalMtgoTixRemaining.toFixed(2)} TIX ($${mtgoUsd.toFixed(2)})`;
        if (arbSpreadEl) {
            arbSpreadEl.innerText = `${spreadUsd >= 0 ? "+" : "-"}$${Math.abs(spreadUsd).toFixed(2)} (${spreadPct.toFixed(1)}%)`;
            arbSpreadEl.style.color = spreadUsd >= 0 ? "#10b981" : "#ef4444";
        }

        if (arbGrid) {
            arbGrid.innerHTML = targets.map(item => {
                const name = item.cardName || "Unknown Card";
                const scry = priceMap[name.toLowerCase()] || { usd: 0, tix: 0 };
                const tixUsd = (scry.tix || 0) * TIX_TO_USD;
                const unitSpread = (scry.usd || 0) - tixUsd;
                return `
                    <div style="background:#0b1120; border:1px solid #1e293b; border-radius:8px; padding:12px;">
                        <div style="font-weight:700; color:#38bdf8; font-size:13px; margin-bottom:6px;">${escapeHtml(name)} (x${item.quantity || 1})</div>
                        <div style="font-size:12px; color:#94a3b8; display:flex; justify-content:space-between;"><span>Paper Floor:</span><strong style="color:#10b981;">$${(scry.usd || 0).toFixed(2)}</strong></div>
                        <div style="font-size:12px; color:#94a3b8; display:flex; justify-content:space-between;"><span>MTGO TIX:</span><strong style="color:#3b82f6;">${(scry.tix || 0).toFixed(2)} ($${tixUsd.toFixed(2)})</strong></div>
                        <div style="font-size:12px; color:#94a3b8; display:flex; justify-content:space-between; margin-top:4px; padding-top:4px; border-top:1px solid #1e293b;"><span>Net Unit Delta:</span><strong style="color:${unitSpread >= 0 ? "#f59e0b" : "#ef4444"};">${unitSpread >= 0 ? "+" : "-"}$${Math.abs(unitSpread).toFixed(2)}</strong></div>
                    </div>
                `;
            }).join("");
        }
    });
}

// 6. Wire #tab-meta (#meta-format-filter & #meta-tracker-grid)
function initMetaTracker() {
    const filterSelect = document.getElementById("meta-format-filter");
    const metaGrid = document.getElementById("meta-tracker-grid");
    if (!metaGrid) return;

    const sampleArchetypes = [
        { format: "standard", name: "Dimir Midrange (Sample)", share: "18.4%", winrate: "55.2%", staples: ["4 Thoughtseize", "4 Go for the Throat", "2 Sheoldred, the Apocalypse"] },
        { format: "modern", name: "Dimir Murktide (Sample)", share: "12.1%", winrate: "53.8%", staples: ["4 Thoughtseize", "4 Counterspell", "3 Murktide Regent"] },
        { format: "commander", name: "Liliana Graveyard Burn (Sample)", share: "8.7%", winrate: "56.0%", staples: ["1 Thoughtseize", "1 Professor Onyx", "1 Inkshield"] }
    ];

    function renderMeta() {
        const selected = (filterSelect ? filterSelect.value : "all").toLowerCase();
        const filtered = selected === "all" ? sampleArchetypes : sampleArchetypes.filter(a => a.format === selected);
        metaGrid.innerHTML = filtered.map((arch, idx) => `
            <div style="background:#0b1120; border:1px solid #1e293b; border-radius:8px; padding:14px; display:flex; flex-direction:column; gap:8px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong style="color:#38bdf8; font-size:14px;">${escapeHtml(arch.name)}</strong>
                    <span style="font-size:11px; color:#10b981; background:#1e293b; padding:2px 6px; border-radius:4px;">WR: ${arch.winrate}</span>
                </div>
                <div style="font-size:11px; color:#94a3b8;">Meta Share: <strong>${arch.share}</strong> | Format: <strong style="text-transform:uppercase;">${arch.format}</strong></div>
                <div style="font-size:11px; color:#cbd5e1; background:#070d17; padding:8px; border-radius:4px; font-family:monospace;">${arch.staples.join("<br>")}</div>
                <button class="load-meta-sample-btn" data-idx="${idx}" style="background:#3b82f6; color:#fff; border:none; padding:6px; border-radius:4px; font-size:11px; font-weight:600; cursor:pointer;">⚡ Load Staples into Procurement</button>
            </div>
        `).join("");

        metaGrid.querySelectorAll(".load-meta-sample-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const arch = filtered[parseInt(btn.getAttribute("data-idx"), 10)];
                const decklistInput = document.getElementById("decklist-input");
                const deckNameInput = document.getElementById("deck-name-input");
                const saveBtn = document.getElementById("save-deck-btn");
                if (deckNameInput) deckNameInput.value = arch.name;
                if (decklistInput) decklistInput.value = arch.staples.join("\n");
                if (saveBtn) saveBtn.click();
            });
        });
    }

    if (filterSelect) filterSelect.addEventListener("change", renderMeta);
    renderMeta();
}

chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "local") syncAllPanels();
});



// 7. Wire #tab-settings & Standalone Watermark / Banner Removal
function applyWatermarkState(isLicensed) {
    // Target any existing or injected watermark / banner elements
    const wmSelectors = [".watermark", ".watermark-overlay", "#mp-watermark", ".support-banner", "#mp-support-banner"];
    wmSelectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
            el.style.display = isLicensed ? "none" : "";
        });
    });

    // Ensure the watermark & bottom banner exist when unlicensed (matching Screenshot 14)
    let wm = document.getElementById("mp-watermark");
    if (!wm && !document.querySelector(".watermark, .watermark-overlay")) {
        wm = document.createElement("div");
        wm.id = "mp-watermark";
        wm.style.cssText = "position:fixed; inset:0; pointer-events:none; z-index:0; display:flex; align-items:center; justify-content:center; opacity:0.08;";
        wm.innerHTML = `<img src="mpscoutlogo.svg" onerror="this.src=\"icon128.png\"" style="width:420px; max-width:60vw; filter:grayscale(20%);" alt="">`;
        document.body.appendChild(wm);
    }
    if (wm) wm.style.display = isLicensed ? "none" : "flex";

    let banner = document.getElementById("mp-support-banner");
    if (!banner && !document.querySelector(".support-banner")) {
        banner = document.createElement("div");
        banner.id = "mp-support-banner";
        banner.style.cssText = "position:fixed; bottom:0; left:0; right:0; z-index:999; background:rgba(3,7,18,0.95); border-top:1px solid #1e293b; padding:8px 16px; text-align:center; font-size:12px; color:#cbd5e1;";
        banner.innerHTML = `<strong>Alpha Build:</strong> Feel free to use the app! Snag a <a href="#" id="banner-key-link" style="color:#10b981; font-weight:700; text-decoration:underline;">$9 Lifetime Key</a> to remove the watermark and support an out-of-work solo developer building rad tools for all your TCG needs.`;
        document.body.appendChild(banner);
        const link = banner.querySelector("#banner-key-link");
        if (link) {
            link.addEventListener("click", (e) => {
                e.preventDefault();
                document.querySelectorAll(".tab-panel").forEach(p => p.classList.toggle("active", p.id === "tab-settings"));
            });
        }
    }
    if (banner) banner.style.display = isLicensed ? "none" : "block";
}

function initSettingsPanel() {
    const settingsPanel = document.getElementById("tab-settings");
    chrome.storage.local.get(["licenseKey", "licenseValid"], (res) => {
        const isLicensed = Boolean(res.licenseValid);
        const savedKey = res.licenseKey || "";

        applyWatermarkState(isLicensed);
        if (!settingsPanel) return;

        settingsPanel.innerHTML = `
            <div style="background:#0b1120; border:1px solid #1e293b; border-radius:8px; padding:18px; max-width:540px; display:flex; flex-direction:column; gap:14px; position:relative; z-index:2;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong style="color:#10b981; font-size:15px;">🔑 Mirror Pool Scout (Standalone) — Lifetime Key</strong>
                    <span style="font-size:11px; padding:3px 8px; border-radius:4px; font-weight:700; background:${isLicensed ? "#065f46" : "#1e293b"}; color:${isLicensed ? "#10b981" : "#f59e0b"};">
                        ${isLicensed ? "✅ WATERMARK REMOVED (LIFETIME)" : "💧 WATERMARKED ALPHA BUILD"}
                    </span>
                </div>
                <div style="font-size:12px; color:#94a3b8; line-height:1.5;">
                    All standalone features in <strong>Mirror Pool Scout</strong> are 100% unlocked. Enter your <strong>$9.00 Lifetime Key</strong> below to permanently remove the background watermark and bottom supporter banner.
                </div>
                <div style="display:flex; gap:8px;">
                    <input type="text" id="gumroad-key-input" value="${escapeHtml(savedKey)}" placeholder="Enter $9 Lifetime Key (e.g. MPSCOUT-XXXX-XXXX)" style="flex:1; background:#070d17; border:1px solid #334155; color:#f8fafc; padding:8px; border-radius:4px; font-size:12px;">
                    <button id="verify-key-btn" style="background:#10b981; color:#030712; border:none; padding:8px 14px; border-radius:4px; font-weight:700; font-size:12px; cursor:pointer;">${isLicensed ? "Update Key" : "Remove Watermark"}</button>
                </div>
                <div id="lic-status-msg" style="font-size:11px; color:#94a3b8;"></div>
                <hr style="border:none; border-top:1px solid #1e293b; margin:4px 0;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:12px; color:#cbd5e1;">Support solo development & strip the watermark:</span>
                    <a href="https://gumroad.com" target="_blank" style="background:#10b981; color:#030712; text-decoration:none; padding:6px 12px; border-radius:4px; font-size:12px; font-weight:700;">Snag $9 Lifetime Key ↗</a>
                </div>
            </div>
        `;

        const verifyBtn = document.getElementById("verify-key-btn");
        const keyInput = document.getElementById("gumroad-key-input");
        const statusMsg = document.getElementById("lic-status-msg");

        if (verifyBtn && keyInput) {
            verifyBtn.addEventListener("click", () => {
                const key = keyInput.value.trim();
                if (key.length >= 8) {
                    chrome.storage.local.set({ licenseKey: key, licenseValid: true }, () => {
                        applyWatermarkState(true);
                        initSettingsPanel();
                    });
                } else {
                    statusMsg.innerText = "Please enter your valid Gumroad Lifetime Key.";
                    statusMsg.style.color = "#ef4444";
                }
            });
        }
    });
}
