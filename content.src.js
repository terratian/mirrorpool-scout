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
  // Clean up the timer to strip "Today 05:39 PM" formatting
  const timeStr = timerEl.innerText.replace(/Ends\s*in/i, "").replace(/Ends/i, "").trim();
  const timeMatch = timeStr.match(/(\d+d\s+\d+h|\d+h\s+\d+m|\d+m\s+\d+s)/);
  timeLeft = timeMatch ? timeMatch[0] : timeStr.split(/Today|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/i)[0].trim();
}

const badge = document.createElement("div");
badge.id = "mirrorpool-badge-root";
badge.innerHTML = `
  <div class="mp-header">
    <div class="mp-brand">◈ MIRROR POOL™ SCOUT</div>
    <div class="mp-status">${isAuction ? "AUCTION TRACKER" : "FIXED LISTING"}</div>
  </div>
  <div class="mp-metrics-row" style="display:grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 10px; text-align: left;">
    <div>
      <div class="mp-metric-label" style="font-size:10px; color:#8b949e; text-transform:uppercase; margin-bottom:2px;">${isAuction ? "Bid" : "Price"}</div>
      <div class="mp-metric-val" style="color:#00ffcc; font-size:14px; font-weight:bold;">$${listedPrice.toFixed(2)}</div>
    </div>
    <div>
      <div class="mp-metric-label" style="font-size:10px; color:#8b949e; text-transform:uppercase; margin-bottom:2px;">Shipping</div>
      <div class="mp-metric-val" style="color:#8b949e; font-size:12px; font-weight:bold; margin-top:2px;">${shippingCost === 0 ? 'Free' : '+$' + shippingCost.toFixed(2)}</div>
    </div>
    <div>
      <div class="mp-metric-label" style="font-size:10px; color:#8b949e; text-transform:uppercase; margin-bottom:2px;">Activity</div>
      <div class="mp-metric-val" style="color:#3fb950; font-size:12px; font-weight:bold; margin-top:2px;">${bidCount}B / ${watchers}W</div>
    </div>
    <div>
      <div class="mp-metric-label" style="font-size:10px; color:#8b949e; text-transform:uppercase; margin-bottom:2px;">Time Left</div>
      <div class="mp-metric-val" style="color:#eab308; font-size:12px; font-weight:bold; margin-top:2px;">${timeLeft}</div>
    </div>
  </div>
  <div id="mp-deal-verdict-container"></div>
  <div class="mp-actions-row" style="display:flex; gap:8px; margin-top: 10px;">
    <button id="mp-btn-save" class="mp-btn" style="flex:1; padding:6px; border-radius:4px; background:#21262d; border:1px solid #30363d; color:#c9d1d9; font-weight:bold; cursor:pointer;">+ Bookmark</button>
    <button id="mp-btn-dash" class="mp-btn" style="flex:1; padding:6px; border-radius:4px; background:rgba(0,255,204,0.05); border:1px solid #00ffcc; color:#00ffcc; font-weight:bold; cursor:pointer;">⛶ Open Dashboard</button>
  </div>
`;

const targetParent = priceContainer.closest(".x-price-section") || priceContainer.parentElement;
targetParent.parentNode.insertBefore(badge, targetParent.nextSibling);

let trueMarketFloor = "N/A";

// Clean eBay title for API matching


    // Mirror Pool: Smart eBay Title Extraction
    let itemSpec = Array.from(document.querySelectorAll(".ux-labels-values__labels")).find(el => el.innerText.includes("Card Name"));
    if (itemSpec && itemSpec.nextElementSibling) {
        searchTitle = itemSpec.nextElementSibling.innerText.trim();
    } else {
        // Fallback cleanup
        searchTitle = searchTitle.replace(/^(MTG|Magic: The Gathering|NM|LP|MP|HP|Foil)\s*[-|:]?\s*/ig, "").replace(/\[.*?\]/g, "").split("-")[0].trim();
    }
    chrome.runtime.sendMessage({ action: "fetchComps"
, cardTitle: searchTitle }, (res) => {
  const verdictContainer = badge.querySelector('#mp-deal-verdict-container');
  
  if (!res || !res.found) {
    verdictContainer.innerHTML = `
      <div style="background:rgba(218,54,51,0.1); border:1px solid #da3633; color:#ff7b72; padding:8px; border-radius:4px; font-size:11px; text-align:center; margin-top:10px;">
        ⚠️ API Query Failed: Could not extract exact card name.
      </div>`;
    return;
  }
  
  const rawMarketPrice = parseFloat(res.usd);
  const tcgShipping = rawMarketPrice >= 50.00 ? 0.00 : 1.22;
  trueMarketFloor = (rawMarketPrice + tcgShipping).toFixed(2);
  const discountPct = ((parseFloat(trueMarketFloor) - totalCost) / parseFloat(trueMarketFloor)) * 100;
  
  let dealBanner = '';
  if (discountPct >= 20) dealBanner = `<div style="background:#238636; color:#fff; padding:6px; text-align:center; border-radius:4px; font-weight:bold; font-size:11px; margin-bottom:10px;">🔥 S-TIER DEAL: ${discountPct.toFixed(0)}% UNDER MARKET</div>`;
  else if (discountPct >= 5) dealBanner = `<div style="background:#1f6feb; color:#fff; padding:6px; text-align:center; border-radius:4px; font-weight:bold; font-size:11px; margin-bottom:10px;">✅ GOOD DEAL: ${discountPct.toFixed(0)}% UNDER MARKET</div>`;
  else if (discountPct >= -5) dealBanner = `<div style="background:#eab308; color:#000; padding:6px; text-align:center; border-radius:4px; font-weight:bold; font-size:11px; margin-bottom:10px;">⚖️ FAIR MARKET VALUE</div>`;
  else dealBanner = `<div style="background:#da3633; color:#fff; padding:6px; text-align:center; border-radius:4px; font-weight:bold; font-size:11px; margin-bottom:10px;">⚠️ OVERPRICED: ${Math.abs(discountPct).toFixed(0)}% OVER MARKET</div>`;

  verdictContainer.innerHTML = `
    ${dealBanner}
    <div class="mp-arbitrage-row" style="padding-top: 5px; border-top: 1px solid #30363d;">
      <div style="font-size: 10px; color: #8b949e; margin-bottom: 5px;">LIVE BENCHMARKS:</div>
      <div style="display: flex; gap: 8px;">
        <a href="${res.tcg_url}" target="_blank" class="mp-btn" style="background:#21262d; border:1px solid #30363d; color:#c9d1d9; text-decoration:none; flex:1; text-align:center; padding:6px; border-radius:4px; font-size:11px; font-weight:bold;">TCG (Total): $${trueMarketFloor}</a>
        ${res.eur !== "N/A" ? `<a href="${res.cm_url}" target="_blank" class="mp-btn" style="background:#21262d; border:1px solid #30363d; color:#c9d1d9; text-decoration:none; flex:1; text-align:center; padding:6px; border-radius:4px; font-size:11px; font-weight:bold;">Cardmarket: €${(parseFloat(res.eur) + 1.50).toFixed(2)}</a>` : ''}
      </div>
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
      saveBtn.style.borderColor = "#3fb950";
      saveBtn.style.color = "#3fb950";
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
