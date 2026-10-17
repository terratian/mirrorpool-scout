(() => {
if (document.getElementById("mirrorpool-badge-root")) return;

function initScoutBadge() {
    const priceContainer = document.querySelector(".x-price-primary") || document.querySelector(".x-bin-price") || document.querySelector(".x-bid-price");
    if (!priceContainer) return;

    const titleEl = document.querySelector(".x-item-title__mainTitle") || document.querySelector("h1");
    const rawTitle = titleEl ? titleEl.innerText.trim() : "Unknown Card";

    let searchTitle = rawTitle.replace(/\b(MTG|MAGIC THE GATHERING|MAGIC|COMMANDER|DUSKMOURN|BLOOMBURROW|LEGENDS|BALDUR'S GATE|NM|MINT|LP|SP|MP|HP|FOIL|NF|EN|ENGLISH|PSA|BGS|CGC|TCG|WOTC)\b/gi, '');
    searchTitle = searchTitle.replace(/\b[A-Z0-9]{3,4}\b/g, '');
    searchTitle = searchTitle.replace(/#\d+/g, '');
    searchTitle = searchTitle.replace(/[^a-zA-Z\s\-',]/g, ' ').replace(/\s+/g, ' ').trim();
    if (searchTitle.length < 3) searchTitle = rawTitle;

    const rawPriceText = priceContainer.innerText || "";
    const cleanPriceMatch = rawPriceText.replace(/,/g, "").match(/[\d.]+/);
    const listedPrice = cleanPriceMatch ? parseFloat(cleanPriceMatch[0]) : 0;

    let shippingCost = 0;
    const shippingEl = document.querySelector('.ux-labels-values--shipping') || document.querySelector('.sh-str') || document.querySelector('.ux-textspans--BOLD');
    if (shippingEl) {
      const shipText = shippingEl.innerText.toLowerCase();
      if (!shipText.includes('free')) {
        const shipMatch = shipText.replace(/,/g, "").match(/[\d.]+/);
        if (shipMatch) shippingCost = parseFloat(shipMatch[0]);
      }
    }
    const totalCost = listedPrice + shippingCost;

    const bidCountEl = document.querySelector(".x-bid-count");
    const bidCount = bidCountEl ? parseInt(bidCountEl.innerText.replace(/\D/g, ""), 10) || 0 : 0;
    const isAuction = bidCountEl !== null || document.body.innerText.includes("Current bid:");

    let watchers = 0;
    const watchMatch = document.body.innerText.match(/(\d+)\s+(?:people are|person is) watching/i) || document.body.innerText.match(/(\d+)\s+watchers?/i);
    if (watchMatch) watchers = parseInt(watchMatch[1]);

    const timerEl = document.querySelector(".ux-timer") || document.querySelector(".x-end-time");
    let timeLeft = isAuction ? "Ending Soon" : "Buy It Now";
    if (timerEl) {
      const timeStr = timerEl.innerText.replace(/Ends\s*in/i, "").replace(/Ends/i, "").trim();
      const timeMatch = timeStr.match(/(\d+d\s+\d+h|\d+h\s+\d+m|\d+m\s+\d+s)/);
      timeLeft = timeMatch ? timeMatch[0] : timeStr.split(/Today|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/i)[0].trim();
    }

    const badge = document.createElement("div");
    badge.id = "mirrorpool-badge-root";
    badge.innerHTML = `
      <div class="mp-header" style="background:#0b1120; padding:10px; border-radius:6px 6px 0 0; border:1px solid #334155; border-bottom:none;">
        <div class="mp-brand" style="color:#10b981; font-weight:800; font-size:12px;">◈ MIRROR POOL™ SCOUT</div>
        <div class="mp-status" style="color:#38bdf8; font-size:10px;">${isAuction ? "AUCTION TRACKER" : "FIXED LISTING"}</div>
      </div>
      <div class="mp-metrics-row" style="background:#030712; padding:10px; border:1px solid #334155; display:grid; grid-template-columns: repeat(4, 1fr); gap: 8px; text-align: left;">
        <div>
          <div style="font-size:9px; color:#94a3b8; text-transform:uppercase;">${isAuction ? "Bid" : "Price"}</div>
          <div style="color:#f59e0b; font-size:13px; font-weight:bold;">$${listedPrice.toFixed(2)}</div>
        </div>
        <div>
          <div style="font-size:9px; color:#94a3b8; text-transform:uppercase;">Shipping</div>
          <div style="color:#94a3b8; font-size:11px; font-weight:bold;">${shippingCost === 0 ? 'Free' : '+$' + shippingCost.toFixed(2)}</div>
        </div>
        <div>
          <div style="font-size:9px; color:#94a3b8; text-transform:uppercase;">Activity</div>
          <div style="color:#10b981; font-size:11px; font-weight:bold;">${bidCount}B / ${watchers}W</div>
        </div>
        <div>
          <div style="font-size:9px; color:#94a3b8; text-transform:uppercase;">Time Left</div>
          <div style="color:#eab308; font-size:11px; font-weight:bold;">${timeLeft}</div>
        </div>
      </div>
      <div id="mp-deal-verdict-container" style="background:#030712; padding:0 10px 10px 10px; border:1px solid #334155; border-top:none; border-radius:0 0 6px 6px;"></div>
      <div class="mp-actions-row" style="display:flex; gap:8px; margin-top: 8px;">
        <button id="mp-btn-save" style="flex:1; padding:6px; border-radius:4px; background:#1e293b; border:1px solid #334155; color:#f8fafc; font-weight:bold; cursor:pointer; font-size:11px;">+ Bookmark</button>
        <button id="mp-btn-dash" style="flex:1; padding:6px; border-radius:4px; background:rgba(16,185,129,0.1); border:1px solid #10b981; color:#10b981; font-weight:bold; cursor:pointer; font-size:11px;">⛶ Open Dashboard</button>
      </div>
    `;

    const targetParent = priceContainer.closest(".x-price-section") || priceContainer.parentElement;
    targetParent.parentNode.insertBefore(badge, targetParent.nextSibling);

    let trueMarketFloor = "N/A";

    chrome.runtime.sendMessage({ action: "fetchComps", cardTitle: searchTitle }, (res) => {
      const verdictContainer = badge.querySelector('#mp-deal-verdict-container');
      if (!res || !res.found) {
        verdictContainer.innerHTML = `
          <div style="background:rgba(239,68,68,0.1); border:1px solid #ef4444; color:#f87171; padding:6px; border-radius:4px; font-size:10px; text-align:center;">
            ⚠️ API Query Failed: ${res?.error || 'Card not found'}
          </div>`;
        return;
      }
      
      const rawMarketPrice = parseFloat(res.usd);
      trueMarketFloor = rawMarketPrice.toFixed(2);
      const discountPct = ((rawMarketPrice - totalCost) / rawMarketPrice) * 100;
      
      let dealBanner = '';
      if (discountPct >= 20) dealBanner = `<div style="background:#10b981; color:#030712; padding:5px; text-align:center; border-radius:4px; font-weight:bold; font-size:10px; margin-bottom:6px;">🔥 S-TIER DEAL: ${discountPct.toFixed(0)}% UNDER MARKET</div>`;
      else if (discountPct >= 5) dealBanner = `<div style="background:#3b82f6; color:#fff; padding:5px; text-align:center; border-radius:4px; font-weight:bold; font-size:10px; margin-bottom:6px;">✅ GOOD DEAL: ${discountPct.toFixed(0)}% UNDER MARKET</div>`;
      else dealBanner = `<div style="background:#f59e0b; color:#030712; padding:5px; text-align:center; border-radius:4px; font-weight:bold; font-size:10px; margin-bottom:6px;">⚖️ FAIR MARKET VALUE</div>`;

      verdictContainer.innerHTML = `
        ${dealBanner}
        <div style="display: flex; gap: 8px; align-items:center; justify-content:space-between; font-size:11px; color:#94a3b8;">
          <span>TCG Market Floor: <strong style="color:#10b981;">$${trueMarketFloor}</strong></span>
          <a href="${res.tcgplayer_url || res.uri}" target="_blank" style="color:#38bdf8; text-decoration:none;">Scryfall ↗</a>
        </div>
      `;
    });

    document.getElementById("mp-btn-dash").addEventListener("click", () => {
      chrome.runtime.sendMessage({ action: "openDashboard" });
    });

    const saveBtn = document.getElementById("mp-btn-save");
    saveBtn.addEventListener("click", () => {
      const cardRecord = { 
        title: searchTitle, 
        price: totalCost.toFixed(2), 
        bidders: bidCount,
        watchers: watchers,
        timeLeft: timeLeft,
        marketFloor: trueMarketFloor,
        url: window.location.href, 
        savedAt: Date.now() 
      };
      chrome.storage.local.get({ watchlist: [] }, (res) => {
        const updated = [cardRecord, ...res.watchlist.filter(x => x.title !== cardRecord.title)];
        chrome.storage.local.set({ watchlist: updated }, () => {
          saveBtn.innerText = "✓ Bookmarked";
          saveBtn.style.borderColor = "#10b981";
          saveBtn.style.color = "#10b981";
        });
      });
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initScoutBadge);
} else {
    initScoutBadge();
}
})();
