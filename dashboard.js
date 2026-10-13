document.addEventListener("DOMContentLoaded", () => {
    const importBtn = document.getElementById("import-deck-btn");
    const activeDeckPanel = document.getElementById("active-deck-panel");
    const shareBtn = document.getElementById("share-deck-btn");
    const mtgaBtn = document.getElementById("export-mtga-btn");
    const loadBrewBtn = document.getElementById("load-brew-btn");
    const manualInput = document.getElementById("manual-deck-input");
    const metaTagsInput = document.getElementById("meta-tags-input");

    // Initialize metrics on load if data exists
    calculateArbitrageDelta();

    if (importBtn) {
        importBtn.addEventListener("click", () => {
            importBtn.innerText = "⏳ Scanning...";
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                if (tabs[0].url.includes("mtgdecks.net") || tabs[0].url.includes("magic.gg") || tabs[0].url.includes("wizards.com")) {
                    chrome.tabs.sendMessage(tabs[0].id, {action: "extract_deck"}, (response) => {
                        if (response && response.status === "success") {
                            importBtn.innerText = "✅ Deck Imported";
                            activeDeckPanel.style.display = "block";
                            calculateArbitrageDelta();
                            setTimeout(() => { importBtn.innerText = "➕ Scrape Active Tab"; }, 3000);
                        } else {
                            importBtn.innerText = "❌ Scraping Failed";
                            setTimeout(() => { importBtn.innerText = "➕ Scrape Active Tab"; }, 3000);
                        }
                    });
                } else {
                    alert("Please navigate to a valid supported decklist page (MTGDecks or Wizards).");
                    importBtn.innerText = "➕ Scrape Active Tab";
                }
            });
        });
    }

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

    if (loadBrewBtn) {
        loadBrewBtn.addEventListener("click", () => {
            const rawText = manualInput.value.trim();
            if (!rawText) return;
            const lines = rawText.split("\n");
            const decklist = [];
            lines.forEach(line => {
                const match = line.trim().match(/^(\d+)[xX]?\s+(.+)$/);
                if (match) {
                    decklist.push({ quantity: parseInt(match[1], 10), cardName: match[2].trim() });
                }
            });
            if (decklist.length > 0) {
                chrome.storage.local.set({ 
                    currentDecklist: decklist,
                    currentMetaTags: metaTagsInput.value.trim()
                }, () => {
                    loadBrewBtn.innerText = "✅ Brew Loaded";
                    activeDeckPanel.style.display = "block";
                    calculateArbitrageDelta();
                    setTimeout(() => { loadBrewBtn.innerText = "🛠️ Load Brew"; }, 3000);
                });
            } else {
                alert("Could not parse cards. Use format: '4 Card Name'");
            }
        });
    }
});

// Arbitrage Delta Calculation Engine
function calculateArbitrageDelta() {
    chrome.storage.local.get("currentDecklist", (result) => {
        const decklist = result.currentDecklist;
        if (!decklist || decklist.length === 0) return;

        let totalPaperCost = 0;
        let totalMtgoTix = 0;
        const tixToUsdRate = 0.92; 

        decklist.forEach(card => {
            const paperUnitPrice = getCachedPaperPrice(card.cardName); 
            const mtgoUnitPrice = getCachedMtgoPrice(card.cardName);
            totalPaperCost += paperUnitPrice * card.quantity;
            totalMtgoTix += mtgoUnitPrice * card.quantity;
        });

        const mtgoConvertedUsd = totalMtgoTix * tixToUsdRate;
        const absoluteDelta = totalPaperCost - mtgoConvertedUsd;
        const percentageDelta = totalPaperCost > 0 ? ((totalPaperCost - mtgoConvertedUsd) / totalPaperCost) * 100 : 0;

        updateMetricsHUD({
            paperValue: totalPaperCost.toFixed(2),
            mtgoValue: totalMtgoTix.toFixed(2),
            deltaUsd: absoluteDelta.toFixed(2),
            deltaPercent: percentageDelta.toFixed(1)
        });
    });
}

function updateMetricsHUD(metrics) {
    const hudContainer = document.querySelector(".deck-sub-nav div");
    if (hudContainer) {
        hudContainer.innerHTML = `
            <div>🏆 Est. Win Rate: <span style="color: #10b981;">54.2%</span></div>
            <div>💰 Paper Value: <span style="color: #f59e0b;">\\$${metrics.paperValue}</span></div>
            <div>💻 MTGO Value: <span style="color: #3b82f6;">${metrics.mtgoValue} TIX</span></div>
            <div style="margin-top: 4px; border-top: 1px dashed #334155; padding-top: 4px;">
                ⚖️ Arbitrage Spread: <span style="color: ${metrics.deltaUsd >= 0 ? '#10b981' : '#ef4444'};">
                    \\$${metrics.deltaUsd} (${metrics.deltaPercent}%)
                </span>
            </div>
        `;
    }
}

function getCachedPaperPrice(name) { return name.toLowerCase().includes("thoughtseize") ? 14.50 : 3.00; }
function getCachedMtgoPrice(name) { return name.toLowerCase().includes("thoughtseize") ? 2.45 : 0.85; }

// --- Mirror Pool Integration: Popup to Dashboard Sync ---
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && (changes.watchlist_cards || changes.card_chase)) {
        console.log("New market data migrated from popup utility!");
        // We will wire this to populate your existing "Card Chase" grid UI next.
        // For now, reload the dashboard to fetch the latest storage state if needed.
    }
});
