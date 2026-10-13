// Mirror Pool Scout - eBay Overlay & Market Inspector

function initScoutOverlay() {
    if (document.getElementById("mirror-pool-overlay")) return;

    // 1. Extract Target Card Name
    let cardName = "";
    const labels = document.querySelectorAll(".ux-labels-values__labels");
    for (let label of labels) {
        if (label.innerText.trim().toLowerCase() === "card name") {
            const val = label.nextElementSibling;
            if (val) {
                cardName = val.innerText.trim();
                break;
            }
        }
    }

    if (!cardName) {
        const titleEl = document.querySelector(".x-item-title__mainTitle span, h1");
        let raw = titleEl ? titleEl.innerText : document.title;
        raw = raw.replace(/^MTG\s*(COMMANDER:?\s*)?/i, "");
        raw = raw.replace(/^(Magic:?\s*The\s*Gathering|NM|LP|MP|HP|Foil|Pre-Owned)\s*[-|:]?\s*/ig, "");
        raw = raw.replace(/[A-Z0-9]{3,4}\s*#?\d+.*$/i, "");
        raw = raw.replace(/\[.*?\]/g, "").replace(/\(.*?\)/g, "").split("|")[0].trim();
        cardName = raw;
    }

    // 2. Extract Price from eBay Listing
    const priceEl = document.querySelector(".x-price-primary span, .main-price span");
    const ebayPriceStr = priceEl ? priceEl.innerText.replace(/[^0-9.]/g, '') : "0.00";
    const ebayPrice = parseFloat(ebayPriceStr) || 0;

    // 3. Inject Clean Floating Inspector
    const overlay = document.createElement("div");
    overlay.id = "mirror-pool-overlay";
    overlay.style.cssText = "position:fixed; bottom:20px; right:20px; z-index:2147483647; background:#0b1120; border:1px solid #1e293b; border-radius:8px; padding:14px; width:280px; color:#f8fafc; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; box-shadow:0 10px 25px -5px rgba(0,0,0,0.6); font-size:12px;";

    overlay.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom:1px solid #1e293b; padding-bottom:6px;">
            <span style="color:#10b981; font-weight:700; font-size:13px;">🔮 Mirror Pool Scout</span>
            <span id="mp-deal-grade" style="background:#1e293b; color:#94a3b8; font-weight:700; padding:2px 6px; border-radius:4px; font-size:11px;">EVAL</span>
        </div>
        <div style="margin-bottom:6px; color:#94a3b8;">Target: <strong style="color:#38bdf8;">${cardName}</strong></div>
        <div id="mp-metrics-box" style="background:#030712; border-radius:6px; padding:8px; margin-bottom:10px;">
            <div style="color:#64748b;">Querying Scryfall API...</div>
        </div>
        <div style="display:flex; gap:8px;">
            <button id="mp-bookmark-btn" style="flex:1; background:#2563eb; color:#fff; border:none; padding:7px 10px; border-radius:5px; font-weight:600; cursor:pointer;">+ Bookmark</button>
            <button id="mp-dash-btn" style="flex:1; background:#1e293b; color:#e2e8f0; border:1px solid #334155; padding:7px 10px; border-radius:5px; font-weight:600; cursor:pointer;">Open Dashboard</button>
        </div>
    `;
    document.body.appendChild(overlay);

    // 4. Query Scryfall Background Engine
    chrome.runtime.sendMessage({ action: "fetchComps", cardName: cardName }, (response) => {
        const metricsBox = document.getElementById("mp-metrics-box");
        const gradeBadge = document.getElementById("mp-deal-grade");

        if (response && response.success) {
            const paperFloor = parseFloat(response.prices.usd) || 0;
            const mtgoTix = parseFloat(response.prices.tix) || 0;
            const mtgoUsd = mtgoTix * 0.92;

            // Deal & Arbitrage Grade Calculation
            let grade = "C";
            let gradeBg = "#f59e0b";
            let diffPercent = 0;
            if (paperFloor > 0 && ebayPrice > 0) {
                diffPercent = ((paperFloor - ebayPrice) / paperFloor) * 100;
                if (diffPercent >= 20) { grade = "A+ (Steal)"; gradeBg = "#10b981"; }
                else if (diffPercent >= 10) { grade = "A (Discount)"; gradeBg = "#059669"; }
                else if (diffPercent >= -5) { grade = "B (Fair Market)"; gradeBg = "#3b82f6"; }
                else { grade = "Overpriced"; gradeBg = "#ef4444"; }
            }

            if (gradeBadge) {
                gradeBadge.innerText = grade;
                gradeBadge.style.background = gradeBg;
                gradeBadge.style.color = "#ffffff";
            }

            metricsBox.innerHTML = `
                <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                    <span style="color:#94a3b8;">eBay Price:</span>
                    <strong style="color:#f8fafc;">$${ebayPrice.toFixed(2)}</strong>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                    <span style="color:#94a3b8;">Paper Floor:</span>
                    <strong style="color:#10b981;">$${paperFloor ? paperFloor.toFixed(2) : "N/A"}</strong>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                    <span style="color:#94a3b8;">MTGO TIX:</span>
                    <strong style="color:#38bdf8;">${mtgoTix ? mtgoTix.toFixed(2) : "N/A"} ($${mtgoUsd.toFixed(2)})</strong>
                </div>
                <div style="display:flex; justify-content:space-between; border-top:1px dashed #1e293b; padding-top:4px;">
                    <span style="color:#94a3b8;">Arbitrage Margin:</span>
                    <strong style="color:${diffPercent >= 0 ? '#10b981' : '#ef4444'};">${diffPercent.toFixed(1)}%</strong>
                </div>
            `;

            // Setup Bookmark Button payload
            const bookmarkBtn = document.getElementById("mp-bookmark-btn");
            bookmarkBtn.onclick = () => {
                bookmarkBtn.innerText = "✅ Saved!";
                bookmarkBtn.style.background = "#10b981";

                chrome.runtime.sendMessage({
                    action: "sync_to_dashboard",
                    payload: {
                        actionType: "tcg_product",
                        cardName: cardName,
                        ebayPrice: ebayPrice.toFixed(2),
                        paperFloor: paperFloor.toFixed(2),
                        mtgoTix: mtgoTix.toFixed(2),
                        arbitrageMargin: diffPercent.toFixed(1) + "%",
                        dealGrade: grade,
                        metaStaple: "Commander / Multi-Format Flex",
                        url: window.location.href,
                        timestamp: new Date().toLocaleDateString()
                    }
                });

                setTimeout(() => {
                    bookmarkBtn.innerText = "+ Bookmark";
                    bookmarkBtn.style.background = "#2563eb";
                }, 2000);
            };
        } else {
            metricsBox.innerHTML = `<span style="color:#ef4444;">Could not find match on Scryfall.</span>`;
        }
    });

    document.getElementById("mp-dash-btn").onclick = () => {
        chrome.runtime.sendMessage({ action: "openDashboard" });
    };
}

setTimeout(initScoutOverlay, 1000);
