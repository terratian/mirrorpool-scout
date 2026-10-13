// Mirror Pool Scout Service Worker

// 1. Direct Icon Click -> Open Dashboard in New Tab

});

// 2. Runtime Message Dispatcher
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Open Dashboard action triggered from overlay widget
    if (request.action === "openDashboard") {
        chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
        sendResponse({ status: "dashboard_opened" });
        return true;
    }

    // Cross-domain data migration to storage
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

    // Scryfall Comps & Pricing Engine
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

chrome.action.onClicked.addListener(() => focusOrCreateDashboard());

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "openDashboard") {
        focusOrCreateDashboard();
        sendResponse({ status: "dashboard_opened" });
        return true;
    }

});
