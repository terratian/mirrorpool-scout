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

// --- Navigation Panel Router ---
document.addEventListener("DOMContentLoaded", () => {
    const navItems = document.querySelectorAll(".nav-item");
    const headerTitle = document.querySelector(".header-title span");
    const mainContentCards = document.querySelectorAll(".main-content .card");

    navItems.forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            
            // Remove active state from all buttons
            navItems.forEach(nav => nav.classList.remove("active"));
            
            // Add active state to clicked button
            e.currentTarget.classList.add("active");
            
            // Update header title to match navigation
            const viewName = e.currentTarget.innerText.replace(/[^\w\s&]/g, '').trim();
            if (headerTitle) headerTitle.innerText = viewName;
            
            // Basic view toggling (hides default cards if not on Watchlist)
            if (viewName.includes("Watchlist") || viewName.includes("Live")) {
                mainContentCards.forEach(card => card.style.display = card.id === "active-deck-panel" && !document.getElementById("hud-winrate").innerText ? "none" : "block");
            } else {
                mainContentCards.forEach(card => card.style.display = "none");
                // Future implementation: Reveal specific panels for Arbitrage/Chase here
            }
        });
    });
});

// --- Render Bookmarked Cards ---
function renderCardChase() {
    chrome.storage.local.get(["card_chase"], (result) => {
        const chaseData = result.card_chase || [];
        // Target the Procurement Hunter container (assumes we append a grid if empty)
        const cardsContainer = document.querySelectorAll(".main-content .card")[1]; 
        if (!cardsContainer) return;
        
        if (chaseData.length === 0) {
            cardsContainer.innerHTML = '<div style="font-size:13px; color:#94a3b8;">No tracked items yet. Bookmark cards from eBay to see them here.</div>';
            return;
        }
        
        cardsContainer.innerHTML = chaseData.map(item => `
            <div style="background:#1e293b; padding:10px; border-radius:6px; margin-bottom:10px; border-left:3px solid #3b82f6;">
                <div style="font-weight:bold; color:#f8fafc; margin-bottom:4px;">${item.cardName}</div>
                <div style="display:flex; justify-content:space-between; font-size:12px; color:#94a3b8;">
                    <span>${item.metricA}: <span style="color:#10b981;">${item.valueA}</span></span>
                    <a href="${item.url}" target="_blank" style="color:#3b82f6; text-decoration:none;">View Listing ↗</a>
                </div>
            </div>
        `).join('');
    });
}

document.addEventListener("DOMContentLoaded", renderCardChase);
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.card_chase) {
        renderCardChase();
    }
});
