// --- Mirror Pool Scout: Background Router & Scryfall Pricing Engine ---

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // 1. Route migrated datasets from Popup / Content Scripts into Storage
    if (message.action === "sync_to_dashboard") {
        const payload = message.payload || message.cardData || message.data;
        if (!payload) {
            sendResponse({ status: "error", message: "Empty payload received" });
            return;
        }

        let dataStoreKey = payload.targetKey || "general_scout_logs";
        if (!payload.targetKey && payload.actionType) {
            switch (payload.actionType) {
                case "goldfish_card":
                case "watchlist":
                    dataStoreKey = "watchlist_cards";
                    break;
                case "tcg_product":
                    dataStoreKey = "card_chase";
                    break;
                case "decklist_scrape":
                    dataStoreKey = "currentDecklist";
                    break;
                default:
                    dataStoreKey = "general_scout_logs";
            }
        }

        chrome.storage.local.get([dataStoreKey], (result) => {
            let existingData = result[dataStoreKey] || [];
            if (!Array.isArray(existingData)) existingData = [existingData];
            existingData.unshift(payload);

            chrome.storage.local.set({ [dataStoreKey]: existingData }, () => {
                sendResponse({ status: "success", storedKey: dataStoreKey });
            });
        });
        return true;
    }

    // 2. Single Card Fuzzy Lookup (for eBay Content Script Badge & TCG Comps)
    if (message.action === "fetchComps") {
        const rawTitle = message.cardTitle || "";
        const cleanName = rawTitle
            .replace(/^(MTG|Magic: The Gathering|NM|LP|MP|HP|Foil)\s*[-|:]?\s*/ig, "")
            .replace(/\[.*?\]|\(.*?\)/g, "")
            .split(/[-|/]/)[0]
            .trim();

        if (!cleanName) {
            sendResponse({ found: false, error: "Empty card name after cleanup" });
            return;
        }

        fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(cleanName)}`)
            .then(res => res.json())
            .then(card => {
                if (card.object === "error") {
                    sendResponse({ found: false, error: card.details });
                } else {
                    sendResponse({
                        found: true,
                        name: card.name,
                        usd: card.prices?.usd || card.prices?.usd_foil || "0.00",
                        usd_foil: card.prices?.usd_foil || "0.00",
                        tix: card.prices?.tix || "0.00",
                        uri: card.scryfall_uri,
                        tcgplayer_url: card.purchase_uris?.tcgplayer || ""
                    });
                }
            })
            .catch(err => sendResponse({ found: false, error: err.message }));
        return true;
    }

    // 3. Open Full-Tab Dashboard
    if (message.action === "openDashboard") {
        chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
        sendResponse({ status: "dashboard_opened" });
        return true;
    }
});

chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
});
