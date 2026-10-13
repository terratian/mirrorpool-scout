// Mirror Pool Scout Service Worker

// Helper: Focus existing dashboard tab or create a new one
function focusOrCreateDashboard() {
    const dashUrl = chrome.runtime.getURL("dashboard.html");
    chrome.tabs.query({ url: dashUrl }, (tabs) => {
        if (tabs.length > 0) {
            chrome.tabs.update(tabs[0].id, { active: true });
            chrome.windows.update(tabs[0].windowId, { focused: true });
        } else {
            chrome.tabs.create({ url: dashUrl });
        }
    });
}

// 1. Icon Click Listener
chrome.action.onClicked.addListener(() => {
    focusOrCreateDashboard();
});

// 2. Runtime Message Dispatcher
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Open Dashboard action
    if (request.action === "openDashboard") {
        focusOrCreateDashboard();
        sendResponse({ status: "dashboard_opened" });
        return true;
    }

    // Cross-domain data migration
    if (request.action === "sync_to_dashboard") {
        const payload = request.payload;
        if (!payload) {
            sendResponse({ status: "error", message: "Empty payload received" });
            return;
        }
        let dataStoreKey = "general_scout_logs";
        switch (payload.actionType) {
            case "goldfish_card": dataStoreKey = "watchlist_cards"; break;
            case "tcg_product": dataStoreKey = "card_chase"; break;
            case "decklist_scrape": dataStoreKey = "currentDecklist"; break;
            default: dataStoreKey = "general_scout_logs";
        }
        chrome.storage.local.get([dataStoreKey], (result) => {
            let existing = result[dataStoreKey] || [];
            if (!Array.isArray(existing)) existing = [existing];
            existing.unshift(payload);
            chrome.storage.local.set({ [dataStoreKey]: existing }, () => {
                sendResponse({ status: "success", storedKey: dataStoreKey });
            });
        });
        return true;
    }

    // Scryfall Comps API
    if (request.action === "fetchComps") {
        const cardQuery = encodeURIComponent(request.searchTitle || request.cardName || "");
        fetch(`https://api.scryfall.com/cards/named?fuzzy=${cardQuery}`)
            .then(res => res.json())
            .then(data => {
                if (data.object === "card") {
                    sendResponse({
                        success: true,
                        found: true,
                        name: data.name,
                        prices: {
                            usd: data.prices.usd || "N/A",
                            usd_foil: data.prices.usd_foil || "N/A",
                            tix: data.prices.tix || "N/A"
                        }
                    });
                } else {
                    sendResponse({ success: false, found: false, error: data.details || "Card not found" });
                }
            })
            .catch(err => {
                sendResponse({ success: false, found: false, error: err.toString() });
            });
        return true;
    }
});
