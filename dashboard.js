// Mirror Pool Scout - Dashboard Controller

document.addEventListener("DOMContentLoaded", () => {
    // 1. Navigation Switching
    const navItems = document.querySelectorAll(".sidebar .nav-item");
    const panels = document.querySelectorAll(".tab-panel");

    navItems.forEach(item => {
        item.addEventListener("click", () => {
            navItems.forEach(n => n.classList.remove("active"));
            panels.forEach(p => p.classList.remove("active"));

            item.classList.add("active");
            const targetTab = item.getAttribute("data-tab");
            const activePanel = document.getElementById(targetTab);
            if (activePanel) activePanel.classList.add("active");
        });
    });

    // 2. Render Procurement Hunter Bookmarks
    function renderChaseCards() {
        chrome.storage.local.get(["card_chase"], (result) => {
            const chaseGrid = document.getElementById("chase-cards-grid");
            const arbitrageGrid = document.getElementById("arbitrage-list");
            const chaseList = result.card_chase || [];

            if (chaseList.length === 0) {
                chaseGrid.innerHTML = '<div style="color:#94a3b8; font-size:13px;">No tracked targets yet. Click "+ Bookmark" on an eBay listing to track it here.</div>';
                return;
            }

            chaseGrid.innerHTML = chaseList.map((item, index) => `
                <div class="card-box">
                    <div class="card-box-header">
                        <strong style="color:#38bdf8; font-size:14px;">${item.cardName}</strong>
                        <span class="badge" style="background:#10b981; color:#030712;">${item.dealGrade || 'A'}</span>
                    </div>
                    <div style="font-size:12px; color:#94a3b8; margin-bottom:4px;">Listing: <strong style="color:#fff;">$${item.ebayPrice}</strong> (Floor: $${item.paperFloor})</div>
                    <div style="font-size:12px; color:#94a3b8; margin-bottom:4px;">Spread: <strong style="color:#10b981;">${item.arbitrageMargin || '0%'}</strong> | TIX: ${item.mtgoTix}</div>
                    <div style="font-size:11px; color:#64748b; margin-bottom:10px;">Metagame: ${item.metaStaple || 'Universal'}</div>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <a href="${item.url}" target="_blank" style="color:#3b82f6; font-size:12px; text-decoration:none; font-weight:600;">View Listing ↗</a>
                        <button onclick="removeChaseItem(${index})" style="background:transparent; border:none; color:#ef4444; cursor:pointer; font-size:11px;">Drop Target</button>
                    </div>
                </div>
            `).join('');

            // Also populate Arbitrage Desk
            if (arbitrageGrid) {
                arbitrageGrid.innerHTML = chaseList.map(item => `
                    <div class="card-box">
                        <div class="card-box-header">
                            <strong style="color:#fff;">${item.cardName}</strong>
                            <span style="color:#10b981; font-weight:bold;">${item.arbitrageMargin}</span>
                        </div>
                        <div style="font-size:12px; color:#94a3b8;">Physical: $${item.ebayPrice} | MTGO TIX: ${item.mtgoTix}</div>
                    </div>
                `).join('');
            }
        });
    }

    window.removeChaseItem = function(index) {
        chrome.storage.local.get(["card_chase"], (result) => {
            let list = result.card_chase || [];
            list.splice(index, 1);
            chrome.storage.local.set({ card_chase: list }, renderChaseCards);
        });
    };

    renderChaseCards();

    // Listen for live bookmarks
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes.card_chase) {
            renderChaseCards();
        }
    });

    // 3. Deck Import & Tab Scraper Handlers
    const scrapeBtn = document.getElementById("scrape-tab-btn");
    if (scrapeBtn) {
        scrapeBtn.addEventListener("click", () => {
            scrapeBtn.innerText = "⏳ Querying tabs...";
            chrome.tabs.query({ url: ["*://*.mtgdecks.net/*", "*://*.ebay.com/*"] }, (tabs) => {
                if (!tabs || tabs.length === 0) {
                    alert("Please open an MTGDecks or eBay tab to scrape.");
                    scrapeBtn.innerText = "Scrape External Tab (MTGDecks)";
                    return;
                }
                chrome.tabs.sendMessage(tabs[0].id, { action: "extract_deck" }, (res) => {
                    scrapeBtn.innerText = res && res.status === "success" ? "✅ Scraped" : "Scrape External Tab (MTGDecks)";
                });
            });
        });
    }
});
