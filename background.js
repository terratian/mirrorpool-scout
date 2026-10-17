// Initialize Sentinel Polling
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("sentinel-radar", { periodInMinutes: 15 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "sentinel-radar") {
    executeSentinelRadar();
  }
});

async function executeSentinelRadar() {
  chrome.storage.local.get({ watchlist: [] }, async (res) => {
    if (res.watchlist.length === 0) return;
    
    let stateChanged = false;
    const evaluatedList = await Promise.all(res.watchlist.map(async (card) => {
      if (!card.url.includes("ebay.com/itm")) return card;
      
      try {
        // Fetch live auction DOM
        const req = await fetch(card.url, { cache: "no-store" });
        const html = await req.text();
        
        // Extract live bid
        const priceMatch = html.match(/"price":"([\d.]+)"/);
        if (!priceMatch) return card;
        
        const livePrice = parseFloat(priceMatch[1]);
        const previousPrice = parseFloat(card.price);
        
        // Fetch Live Market Floor
        const query = encodeURIComponent(card.title);
        const scryReq = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${query}`);
        const scryData = await scryReq.json();
        const marketFloor = parseFloat(scryData.prices?.usd || 0) + 1.22; // TCG + standard shipping
        
        if (livePrice !== previousPrice) {
          card.price = livePrice.toFixed(2);
          stateChanged = true;
        }

        // The Pivot Logic: If live bid > TCGPlayer Floor
        if (marketFloor > 1.50 && livePrice > marketFloor) {
          if (!card.pivotAlert) {
            card.pivotAlert = true;
            stateChanged = true;
          }
        } else {
          if (card.pivotAlert) {
            card.pivotAlert = false;
            stateChanged = true;
          }
        }
      } catch (e) {
        // Silently fail on network/fetch errors to prevent crashing the worker
      }
      return card;
    }));

    if (stateChanged) {
      chrome.storage.local.set({ watchlist: evaluatedList });
    }
  });
}

// Existing Dispatcher for the Content Script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fetchComps") {
    const query = encodeURIComponent(request.cardTitle);
    fetch(`https://api.scryfall.com/cards/named?fuzzy=${query}`)
      .then(res => res.ok ? res.json() : Promise.reject("Not found"))
      .then(data => {
        sendResponse({
          found: true,
          usd: data.prices?.usd || "N/A",
          tcg_url: data.purchase_uris?.tcgplayer || null,
          eur: data.prices?.eur || "N/A",
          cm_url: data.purchase_uris?.cardmarket || null
        });
      }).catch(err => sendResponse({ found: false }));
    return true;
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
if (request.action === "openDashboard") {
chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
}
});
