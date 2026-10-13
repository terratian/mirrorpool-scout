// Mirror Pool Scout - eBay Overlay Injector

function injectOverlay() {
    if (document.getElementById("mirror-pool-overlay")) return;
    
    // 1. Extract Name from Item Specifics
    let searchTitle = document.title;
    const labels = document.querySelectorAll(".ux-labels-values__labels");
    for (let label of labels) {
        if (label.innerText.trim().toLowerCase() === "card name") {
            const valueNode = label.nextElementSibling;
            if (valueNode) {
                searchTitle = valueNode.innerText.trim();
                break;
            }
        }
    }
    
    // Fallback cleanup if Item Specifics are missing
    if (searchTitle === document.title) {
        searchTitle = searchTitle.replace(/^(MTG|Magic:?\s*The\s*Gathering|NM|LP|MP|HP|Foil)\s*[-|:]?\s*/ig, "");
        searchTitle = searchTitle.replace(/\[.*?\]/g, "").replace(/\(.*?\)/g, "").split("|")[0].trim();
    }

    // 2. Build UI
    const overlay = document.createElement("div");
    overlay.id = "mirror-pool-overlay";
    overlay.style.cssText = "position:fixed; bottom:20px; right:20px; z-index:999999; background:#0b1120; border:1px solid #1e293b; border-radius:8px; padding:15px; width:300px; color:#f8fafc; font-family:sans-serif; box-shadow:0 10px 15px -3px rgba(0,0,0,0.5);";
    
    overlay.innerHTML = `
        <div style="color:#10b981; font-weight:bold; margin-bottom:10px; font-size:14px;">🔮 Mirror Pool Scout</div>
        <div style="font-size:12px; margin-bottom:5px; color:#94a3b8;">Target: <span style="color:#fff;">${searchTitle}</span></div>
        <div id="mp-pricing-metrics" style="font-size:12px; margin-bottom:15px;">⏳ Querying Scryfall API...</div>
        <div style="display:flex; gap:10px;">
            <button id="mp-bookmark-btn" style="flex:1; padding:8px; background:#3b82f6; color:#fff; border:none; border-radius:4px; cursor:pointer; font-weight:bold;">+ Bookmark</button>
            <button id="mp-dash-btn" style="flex:1; padding:8px; background:#1e293b; color:#fff; border:1px solid #334155; border-radius:4px; cursor:pointer;">Open Dashboard</button>
        </div>
    `;
    document.body.appendChild(overlay);

    // 3. Query Scryfall Background Engine
    chrome.runtime.sendMessage({ action: "fetchComps", searchTitle: searchTitle }, (response) => {
        const metricsDiv = document.getElementById("mp-pricing-metrics");
        if (response && response.success) {
            metricsDiv.innerHTML = `
                <div style="display:flex; justify-content:space-between; margin-top:8px;">
                    <span>Paper Floor:</span> <span style="color:#10b981; font-weight:bold;">$${response.prices.usd}</span>
                </div>
                <div style="display:flex; justify-content:space-between; margin-top:4px;">
                    <span>MTGO TIX:</span> <span style="color:#3b82f6; font-weight:bold;">${response.prices.tix}</span>
                </div>
            `;
        } else {
            metricsDiv.innerHTML = `<span style="color:#ef4444;">⚠ API Query Failed: Card not found.</span>`;
        }
    });

    // 4. Button Listeners
    document.getElementById("mp-dash-btn").addEventListener("click", () => {
        chrome.runtime.sendMessage({ action: "openDashboard" });
    });
    
    document.getElementById("mp-bookmark-btn").addEventListener("click", (e) => {
        e.target.innerText = "✅ Saved!";
        e.target.style.background = "#10b981";
        const priceStr = document.querySelector(".x-price-primary span, .main-price span")?.innerText || "N/A";
        
        chrome.runtime.sendMessage({
            action: "sync_to_dashboard",
            payload: {
                actionType: "tcg_product",
                cardName: searchTitle,
                metricA: "eBay Price",
                valueA: priceStr.trim(),
                metricB: "Source",
                valueB: "eBay Listing",
                url: window.location.href
            }
        });
        setTimeout(() => { e.target.innerText = "+ Bookmark"; e.target.style.background = "#3b82f6"; }, 2000);
    });
}

// Initialize after a short delay to let eBay's dynamic DOM settle
setTimeout(injectOverlay, 1500);
