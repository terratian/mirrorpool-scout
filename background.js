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

    // 2. Single Card Fuzzy Lookup (for eBay Content Script Badge)
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

    // 3. Batch Collection Lookup (Up to 75 cards per request for Decklists & Arbitrage)
    if (message.action === "fetchCollectionPrices") {
        const cardNames = message.cardNames || [];
        if (cardNames.length === 0) {
            sendResponse({ status: "empty", prices: {} });
            return;
        }

        const uniqueNames = [...new Set(cardNames.map(n => n.trim()).filter(Boolean))];
        const batches = [];
        for (let i = 0; i < uniqueNames.length; i += 75) {
            batches.push(uniqueNames.slice(i, i + 75));
        }

        (async () => {
            const priceMap = {};
            for (const batch of batches) {
                const identifiers = batch.map(name => ({ name }));
                try {
                    const res = await fetch("https://api.scryfall.com/cards/collection", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ identifiers })
                    });
                    if (res.ok) {
                        const data = await res.json();
                        (data.data || []).forEach(card => {
                            const key = card.name.toLowerCase();
                            priceMap[key] = {
                                name: card.name,
                                usd: parseFloat(card.prices?.usd || card.prices?.usd_foil || 0),
                                usd_foil: parseFloat(card.prices?.usd_foil || 0),
                                tix: parseFloat(card.prices?.tix || 0)
                            };
                        });
                    }
                } catch (err) {
                    console.error("[MPScout] Scryfall collection batch error:", err);
                }
                // Respect Scryfall rate limit (100ms between requests)
                await new Promise(r => setTimeout(r, 100));
            }
            chrome.storage.local.set({ scryfallPriceCache: priceMap }, () => {
                sendResponse({ status: "success", prices: priceMap });
            });
        })();
        return true;
    }

    // 4. Open Full-Tab Dashboard
    if (message.action === "openDashboard") {
        chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
        sendResponse({ status: "dashboard_opened" });
        return true;
    }
});

chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
});
