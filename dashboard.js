document.addEventListener("DOMContentLoaded", () => {
    const importBtn = document.getElementById("import-deck-btn");
    const activeDeckPanel = document.getElementById("active-deck-panel");
    const shareBtn = document.getElementById("share-deck-btn");
    const mtgaBtn = document.getElementById("export-mtga-btn");
    const loadBrewBtn = document.getElementById("load-brew-btn");
    const manualInput = document.getElementById("manual-deck-input");
    const metaTagsInput = document.getElementById("meta-tags-input");

    // 1. Wire Sidebar Navigation Tabs
    const navItems = document.querySelectorAll(".sidebar .nav-item");
    navItems.forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            navItems.forEach(n => n.classList.remove("active"));
            item.classList.add("active");
            const headerSpan = document.querySelector(".header-title span");
            if (headerSpan) headerSpan.innerText = item.innerText.trim();
        });
    });

    // 2. Initialize stored decklist & migrated datasets on load
    chrome.storage.local.get(["currentDecklist"], (res) => {
        if (res.currentDecklist && res.currentDecklist.length > 0 && activeDeckPanel) {
            activeDeckPanel.style.display = "block";
            refreshArbitrageWithScryfall();
        }
    });
    renderMigratedStorage();

    // 3. Scrape Active External Tab (MTGDecks / Goldfish / Wizards)
    if (importBtn) {
        importBtn.addEventListener("click", () => {
            const defaultLabel = "🌐 Scrape Active Tab (MTGDecks)";
            importBtn.innerText = "⏳ Scanning...";
            chrome.tabs.query({ url: ["*://*.mtgdecks.net/*", "*://*.mtggoldfish.com/*", "*://*.magic.gg/*", "*://*.wizards.com/*"] }, (tabs) => {
                if (!tabs || tabs.length === 0) {
                    alert("No supported decklist tab found. Open an MTGDecks or MTGGoldfish deck page in another tab first.");
                    importBtn.innerText = defaultLabel;
                    return;
                }
                chrome.tabs.sendMessage(tabs[0].id, { action: "extract_deck" }, (response) => {
                    if (chrome.runtime.lastError || !response || response.status !== "success") {
                        importBtn.innerText = "❌ Scraping Failed";
                        setTimeout(() => { importBtn.innerText = defaultLabel; }, 3000);
                        return;
                    }
                    importBtn.innerText = "✅ Deck Imported";
                    if (activeDeckPanel) activeDeckPanel.style.display = "block";
                    refreshArbitrageWithScryfall();
                    setTimeout(() => { importBtn.innerText = defaultLabel; }, 3000);
                });
            });
        });
    }

    // 4. Load & Analyze Manual Brew Input
    if (loadBrewBtn && manualInput) {
        loadBrewBtn.addEventListener("click", () => {
            const rawText = manualInput.value.trim();
            if (!rawText) return;
            const lines = rawText.split("\n");
            const decklist = [];
            lines.forEach(line => {
                const cleaned = line.trim();
                if (!cleaned || /^(Deck|Sideboard|Commander|Companion)$/i.test(cleaned)) return;
                const match = cleaned.match(/^(\d+)[xX]?\s+(.+?)(?:\s+\([A-Z0-9]+\)\s*\d*)?$/);
                if (match) {
                    decklist.push({ quantity: parseInt(match[1], 10), cardName: match[2].trim() });
                }
            });

            if (decklist.length > 0) {
                const tags = metaTagsInput ? metaTagsInput.value.trim() : "";
                chrome.storage.local.set({
                    currentDecklist: decklist,
                    currentMetaTags: tags
                }, () => {
                    loadBrewBtn.innerText = "✅ Brew Loaded (" + decklist.length + " unique)";
                    if (activeDeckPanel) activeDeckPanel.style.display = "block";
                    refreshArbitrageWithScryfall();
                    setTimeout(() => { loadBrewBtn.innerText = "🛠️ Load & Analyze Brew"; }, 3000);
                });
            } else {
                alert("Could not parse cards. Use format: '4 Thoughtseize'");
            }
        });
    }

    // 5. Export Branded List
    if (shareBtn) {
        shareBtn.addEventListener("click", (e) => {
            e.preventDefault();
            chrome.storage.local.get("currentDecklist", (result) => {
                const list = result.currentDecklist;
                if (!list || list.length === 0) { alert("No decklist loaded to share."); return; }
                let exportText = "🎯 **Target Procurement List**\n\n";
                list.forEach(card => { exportText += `${card.quantity}x ${card.cardName}\n`; });
                exportText += "\n---\n🔮 *Scraped & Analyzed via Mirror Pool Scout*\n";
                navigator.clipboard.writeText(exportText).then(() => {
                    const original = shareBtn.innerText;
                    shareBtn.innerText = "✅ Copied to Clipboard!";
                    setTimeout(() => { shareBtn.innerText = original; }, 3000);
                });
            });
        });
    }

    // 6. Export Clean MTGA Format
    if (mtgaBtn) {
        mtgaBtn.addEventListener("click", (e) => {
            e.preventDefault();
            chrome.storage.local.get("currentDecklist", (result) => {
                const list = result.currentDecklist;
                if (!list || list.length === 0) { alert("No decklist loaded."); return; }
                let mtgaText = "";
                list.forEach(card => { mtgaText += `${card.quantity} ${card.cardName}\n`; });
                navigator.clipboard.writeText(mtgaText).then(() => {
                    const original = mtgaBtn.innerText;
                    mtgaBtn.innerText = "✅ Copied for Arena!";
                    setTimeout(() => { mtgaBtn.innerText = original; }, 3000);
                });
            });
        });
    }
});

// --- Live Scryfall Collection Pricing & HUD Updater ---
function refreshArbitrageWithScryfall() {
    chrome.storage.local.get(["currentDecklist"], (result) => {
        const decklist = result.currentDecklist || [];
        if (decklist.length === 0) return;

        const hudPaper = document.getElementById("hud-paper");
        const hudMtgo = document.getElementById("hud-mtgo");
        const hudSpread = document.getElementById("hud-spread");
        if (hudPaper) hudPaper.innerText = "⏳...";

        const names = decklist.map(c => c.cardName);
        chrome.runtime.sendMessage({ action: "fetchCollectionPrices", cardNames: names }, (res) => {
            const priceMap = (res && res.prices) ? res.prices : {};
            let totalPaperCost = 0;
            let totalMtgoTix = 0;
            const tixToUsdRate = 0.92;

            decklist.forEach(card => {
                const key = (card.cardName || "").toLowerCase();
                const entry = priceMap[key] || { usd: 0, tix: 0 };
                totalPaperCost += (entry.usd || 0) * (card.quantity || 1);
                totalMtgoTix += (entry.tix || 0) * (card.quantity || 1);
            });

            const mtgoConvertedUsd = totalMtgoTix * tixToUsdRate;
            const absoluteDelta = totalPaperCost - mtgoConvertedUsd;
            const percentageDelta = totalPaperCost > 0 ? (absoluteDelta / totalPaperCost) * 100 : 0;

            updateMetricsHUD({
                paperValue: totalPaperCost.toFixed(2),
                mtgoValue: totalMtgoTix.toFixed(2),
                deltaUsd: absoluteDelta.toFixed(2),
                deltaPercent: percentageDelta.toFixed(1)
            });
        });
    });
}

function updateMetricsHUD(metrics) {
    const hudPaper = document.getElementById("hud-paper");
    const hudMtgo = document.getElementById("hud-mtgo");
    const hudSpread = document.getElementById("hud-spread");

    if (hudPaper) hudPaper.innerText = "$" + metrics.paperValue;
    if (hudMtgo) hudMtgo.innerText = metrics.mtgoValue + " TIX";
    if (hudSpread) {
        const isPositive = parseFloat(metrics.deltaUsd) >= 0;
        hudSpread.style.color = isPositive ? "#10b981" : "#ef4444";
        hudSpread.innerText = `$${metrics.deltaUsd} (${metrics.deltaPercent}%)`;
    }
}

// --- Render Watchlist & Card Chase Containers from Local Storage ---
function renderMigratedStorage() {
    chrome.storage.local.get(["watchlist_cards", "card_chase"], (res) => {
        const watchEl = document.getElementById("watchlist-container");
        if (watchEl && Array.isArray(res.watchlist_cards) && res.watchlist_cards.length > 0) {
            watchEl.innerHTML = res.watchlist_cards.map(item => `
                <div style="padding:10px; margin-bottom:8px; border:1px solid #334155; border-radius:6px; background:#1e293b; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="color:#38bdf8; font-weight:700; font-size:13px;">${item.cardName || item.title || "Watchlist Card"}</div>
                        <div style="font-size:11px; color:#94a3b8; margin-top:2px;">
                            ${item.metricA || "Floor"}: <span style="color:#f59e0b;">${item.valueA || item.paperPrice || "N/A"}</span> |
                            ${item.metricB || "MTGO"}: <span style="color:#3b82f6;">${item.valueB || item.mtgoPrice || "N/A"}</span>
                        </div>
                    </div>
                    ${item.url ? `<a href="${item.url}" target="_blank" style="color:#10b981; font-size:11px; text-decoration:none;">View ↗</a>` : ""}
                </div>
            `).join("");
        }

        const chaseEl = document.getElementById("chase-container");
        if (chaseEl && Array.isArray(res.card_chase) && res.card_chase.length > 0) {
            chaseEl.innerHTML = res.card_chase.map(item => `
                <div style="padding:10px; margin-bottom:8px; border:1px solid #334155; border-radius:6px; background:#1e293b; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="color:#f59e0b; font-weight:700; font-size:13px;">${item.cardName || item.title || "Chase Target"}</div>
                        <div style="font-size:11px; color:#94a3b8; margin-top:2px;">
                            ${item.metricA || "Price"}: <span style="color:#10b981;">${item.valueA || item.price || "N/A"}</span> |
                            ${item.metricB || "Shipping"}: <span style="color:#cbd5e1;">${item.valueB || "N/A"}</span>
                        </div>
                    </div>
                    ${item.url ? `<a href="${item.url}" target="_blank" style="color:#38bdf8; font-size:11px; text-decoration:none;">Listing ↗</a>` : ""}
                </div>
            `).join("");
        }
    });
}

chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "local") {
        if (changes.currentDecklist) refreshArbitrageWithScryfall();
        if (changes.watchlist_cards || changes.card_chase) renderMigratedStorage();
    }
});
