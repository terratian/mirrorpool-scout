// Service Worker for Mirror Pool Scout
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "openDashboard") {
        chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
        sendResponse({ status: "dashboard_opened" });
        return true;
    }
    if (message.action === "fetchComps") {
        // Handle Scryfall fuzzy search lookup and pricing return
        const cardTitle = message.cardTitle;
        fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(cardTitle)}`)
            .then(res => res.json())
            .then(data => {
                if (data && data.prices) {
                    sendResponse({
                        found: true,
                        usd: data.prices.usd || "N/A",
                        eur: data.prices.eur || "N/A",
                        tcg_url: data.purchase_uris ? data.purchase_uris.tcgplayer : "https://www.tcgplayer.com",
                        cm_url: data.purchase_uris ? data.purchase_uris.cardmarket : "https://www.cardmarket.com"
                    });
                } else {
                    sendResponse({ found: false });
                }
            })
            .catch(() => sendResponse({ found: false }));
        return true;
    }
});

chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
});
