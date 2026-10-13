document.addEventListener("DOMContentLoaded", () => {
    // --- 1. Navigation Router ---
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

    // --- 2. Procurement Hunter & CSP-Safe Deletion ---
    function renderChaseCards() {
        chrome.storage.local.get(["card_chase"], (result) => {
            const chaseGrid = document.getElementById("chase-cards-grid");
            const arbitrageGrid = document.getElementById("arbitrage-list");
            const chaseList = result.card_chase || [];

            if (chaseList.length === 0) {
                if(chaseGrid) chaseGrid.innerHTML = '<div style="color:#94a3b8; font-size:13px;">No tracked targets yet. Click "+ Bookmark" on an eBay listing to track it here.</div>';
                if(arbitrageGrid) arbitrageGrid.innerHTML = '';
                calculateArbitrageDelta([]);
                return;
            }

            if(chaseGrid) {
                chaseGrid.innerHTML = chaseList.map((item, index) => `
                    <div class="card-box">
                        <div class="card-box-header">
                            <strong style="color:#38bdf8; font-size:14px;">${item.cardName}</strong>
                            <span class="badge" style="background:#10b981; color:#030712;">${item.dealGrade || 'EVAL'}</span>
                        </div>
                        <div style="font-size:12px; color:#94a3b8; margin-bottom:4px;">Listing: <strong style="color:#fff;">$${item.ebayPrice}</strong> (Floor: $${item.paperFloor})</div>
                        <div style="font-size:12px; color:#94a3b8; margin-bottom:4px;">Spread: <strong style="color:#10b981;">${item.arbitrageMargin || '0%'}</strong> | TIX: ${item.mtgoTix}</div>
                        <div style="font-size:11px; color:#64748b; margin-bottom:10px;">Metagame: ${item.metaStaple || 'Universal'}</div>
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <a href="${item.url}" target="_blank" style="color:#3b82f6; font-size:12px; text-decoration:none; font-weight:600;">View Listing ↗</a>
                            <button class="drop-target-btn" data-index="${index}" style="background:transparent; border:none; color:#ef4444; cursor:pointer; font-size:11px;">Drop Target</button>
                        </div>
                    </div>
                `).join('');

                // Safely attach event listeners bypassing CSP restrictions
                document.querySelectorAll('.drop-target-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const idx = parseInt(e.target.getAttribute('data-index'), 10);
                        removeChaseItem(idx);
                    });
                });
            }

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
            
            calculateArbitrageDelta(chaseList);
        });
    }

    function removeChaseItem(index) {
        chrome.storage.local.get(["card_chase"], (result) => {
            let list = result.card_chase || [];
            list.splice(index, 1);
            chrome.storage.local.set({ card_chase: list }, renderChaseCards);
        });
    }

    renderChaseCards();
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes.card_chase) renderChaseCards();
    });

    // --- 3. Arbitrage Engine ---
    function calculateArbitrageDelta(chaseList) {
        const summaryDiv = document.getElementById("arbitrage-summary");
        if (!summaryDiv) return;

        if (!chaseList || chaseList.length === 0) {
            summaryDiv.innerText = "Awaiting Bookmarks to calculate spread.";
            return;
        }

        let totalPaper = 0;
        let totalTix = 0;
        const tixMultiplier = 0.92;

        chaseList.forEach(item => {
            totalPaper += parseFloat(item.paperFloor) || 0;
            totalTix += parseFloat(item.mtgoTix) || 0;
        });

        const mtgoUsdValue = totalTix * tixMultiplier;
        const deltaUsd = totalPaper - mtgoUsdValue;
        const deltaPercent = totalPaper > 0 ? ((deltaUsd / totalPaper) * 100).toFixed(1) : 0;

        summaryDiv.innerHTML = `
            <div>Aggregate Paper Floor: <span style="color:#10b981;">$${totalPaper.toFixed(2)}</span></div>
            <div>Aggregate Digital TIX: <span style="color:#38bdf8;">${totalTix.toFixed(2)} ($${mtgoUsdValue.toFixed(2)})</span></div>
            <div style="margin-top:8px; padding-top:8px; border-top:1px dashed #1e293b;">
                Cross-Platform Arbitrage Spread: <span style="color:${deltaUsd >= 0 ? '#10b981' : '#ef4444'}; font-weight:bold;">$${deltaUsd.toFixed(2)} (${deltaPercent}%)</span>
            </div>
        `;
    }

    // --- 4. Bulk Cart Exporter ---
    const scrapeBtn = document.getElementById("scrape-tab-btn");
    if (scrapeBtn) {
        scrapeBtn.addEventListener("click", () => {
            chrome.storage.local.get(["card_chase"], (result) => {
                const list = result.card_chase || [];
                if (list.length === 0) { alert("No targets to export."); return; }
                let exportText = "";
                list.forEach(item => { exportText += `1 ${item.cardName}\n`; });
                navigator.clipboard.writeText(exportText).then(() => {
                    const orig = scrapeBtn.innerText;
                    scrapeBtn.innerText = "✅ Exported to Clipboard";
                    setTimeout(() => { scrapeBtn.innerText = orig; }, 3000);
                });
            });
        });
    }
});
