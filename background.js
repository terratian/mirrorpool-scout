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
            const rawTitle = (message.cardName || message.cardTitle || "").trim();

            function sanitizeEbayCardTitle(raw) {
                let s = raw
                    // Strip leading prefixes like MTG, MGT, Magic: The Gathering, NM, Foil
                    .replace(/^(?:MTG|MGT|Magic:?\s*The\s*Gathering|NM|LP|MP|HP|Mint|Near\s*Mint|Foil|Non-?Foil|1x|2x|3x|4x|x?\d+x?)\b[\s\-|:•]*/ig, "")
                    .trim();

                // If the card name is followed by (Set/Number) or [Set/Number], e.g. "Thoughtseize (M 0020) NM R..."
                const beforeParen = s.split(/\s*[\(\[#]/)[0].trim();
                if (beforeParen.length >= 3 && !/^(?:MTG|MGT|Magic|Commander|Standard|Modern)$/i.test(beforeParen)) {
                    s = beforeParen;
                }

                // Cut off at the first condition / rarity / set-code marker in the remaining title
                s = s.split(/\b(?:NM|LP|MP|HP|DMG|Near\s*Mint|Lightly\s*Played|MTG|MGT|Foil|Non-?Foil|Outlaws\s*of|Commander|Secret\s*Lair|Borderless|Extended\s*Art|Showcase|Retro\s*Frame|[A-Z]{3}-\d+|#?\d{2,4}\/\d{2,4}|\b[MRUC]\s+\d{3,4})\b/i)[0];

                // Strip trailing single-letter rarity/condition tokens (e.g. " NM", " R", " M")
                s = s.replace(/\s+\b(?:NM|LP|MP|HP|M|R|U|C)\b\s*$/ig, "").trim();
                return s.replace(/[\-|:\/]+$/, "").trim();
            }

            const cleanName = sanitizeEbayCardTitle(rawTitle);
            if (!cleanName) {
                sendResponse({ found: false, error: "Empty card name after cleanup" });
                return;
            }

            (async () => {
                try {
                    // Attempt 1: Exact/Fuzzy named lookup on sanitized name
                    let res = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(cleanName)}`);
                    let card = await res.json();

                    // Attempt 2: If still noisy, try the first 1-3 words via fuzzy lookup
                    if (card.object === "error") {
                        const words = cleanName.split(/\s+/);
                        for (let len = Math.min(3, words.length); len >= 1; len--) {
                            const candidate = words.slice(0, len).join(" ");
                            if (candidate.length < 3) continue;
                            res = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(candidate)}`);
                            card = await res.json();
                            if (card.object !== "error") break;
                        }
                    }

                    if (card.object === "error") {
                        sendResponse({ found: false, error: card.details || "Could not match card" });
                    } else {
                        const isFoilListing = /\bfoil\b/i.test(rawTitle) && !/\bnon[-\s]?foil\b/i.test(rawTitle);
                        const bestUsd = isFoilListing
                            ? (card.prices?.usd_foil || card.prices?.usd || "0.00")
                            : (card.prices?.usd || card.prices?.usd_foil || "0.00");

                        sendResponse({
                            found: true,
                            name: card.name,
                            usd: bestUsd,
                            usd_foil: card.prices?.usd_foil || "0.00",
                            tix: card.prices?.tix || "0.00",
                            eur: card.prices?.eur || "N/A",
                            prices: { usd: bestUsd, usd_foil: card.prices?.usd_foil || "0.00", tix: card.prices?.tix || "0.00", eur: card.prices?.eur || "N/A" },
                            uri: card.scryfall_uri,
                            tcgplayer_url: card.purchase_uris?.tcgplayer || "",
                            tcg_url: card.purchase_uris?.tcgplayer || `https://www.tcgplayer.com/search/magic/product?q=${encodeURIComponent(card.name)}`,
                            cm_url: card.purchase_uris?.cardmarket || `https://www.cardmarket.com/en/Magic/Products/Search?searchString=${encodeURIComponent(card.name)}`
                        });
                    }
                } catch (err) {
                    sendResponse({ found: false, error: err.message });
                }
            })();
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


// --- Mirror Pool Scout: Local Scryfall Card-Name Catalog & Auto-Detector ---
let scryfallNameSet = null;
let catalogLoadingPromise = null;

async function getScryfallCatalogSet() {
    if (scryfallNameSet && scryfallNameSet.size > 1000) return scryfallNameSet;
    if (catalogLoadingPromise) return catalogLoadingPromise;

    catalogLoadingPromise = new Promise((resolve) => {
        chrome.storage.local.get(["scryfallCatalogNames", "scryfallCatalogUpdatedAt"], async (res) => {
            const now = Date.now();
            const ageHours = res.scryfallCatalogUpdatedAt ? (now - res.scryfallCatalogUpdatedAt) / 3600000 : 999;

            if (Array.isArray(res.scryfallCatalogNames) && res.scryfallCatalogNames.length > 5000 && ageHours < 168) {
                scryfallNameSet = new Set(res.scryfallCatalogNames);
                resolve(scryfallNameSet);
                return;
            }

            try {
                const resp = await fetch("https://api.scryfall.com/catalog/card-names");
                const data = await resp.json();
                if (Array.isArray(data.data)) {
                    const lowerNames = [];
                    data.data.forEach(name => {
                        lowerNames.push(name.toLowerCase());
                        // Also index front face of double-faced / split cards (e.g. "Fable of the Mirror-Breaker // Reflection of Kiki-Jiki")
                        if (name.includes(" // ")) {
                            lowerNames.push(name.split(" // ")[0].trim().toLowerCase());
                        }
                    });
                    scryfallNameSet = new Set(lowerNames);
                    chrome.storage.local.set({
                        scryfallCatalogNames: lowerNames,
                        scryfallCatalogUpdatedAt: now
                    });
                    console.log(`[MPScout] Cached ${scryfallNameSet.size} Scryfall card names locally.`);
                    resolve(scryfallNameSet);
                    return;
                }
            } catch (err) {
                console.warn("[MPScout] Catalog fetch error:", err);
            }
            scryfallNameSet = new Set();
            resolve(scryfallNameSet);
        });
    });
    return catalogLoadingPromise;
}

// Pre-warm catalog on service worker startup
getScryfallCatalogSet();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "verifyDetectedCandidates") {
        chrome.storage.local.get({ scoutArmed: true }, async (cfg) => {
            if (!cfg.scoutArmed) {
                if (sender.tab?.id) chrome.action.setBadgeText({ tabId: sender.tab.id, text: "" });
                sendResponse({ armed: false });
                return;
            }

            const nameSet = await getScryfallCatalogSet();
            const rawDeckLines = Array.isArray(message.deckCandidates) ? message.deckCandidates : [];
            const rawTitleCandidates = Array.isArray(message.titleCandidates) ? message.titleCandidates : [];

            // 1. Verify Decklist Candidates against exact Scryfall Catalog Set
            const verifiedMap = new Map();
            for (const item of rawDeckLines) {
                const rawName = String(item.cardName || "").trim();
                const cleanKey = rawName.toLowerCase().split(" // ")[0].trim();
                if (cleanKey.length >= 2 && nameSet.has(cleanKey)) {
                    const prev = verifiedMap.get(cleanKey);
                    if (prev) {
                        prev.quantity += (item.quantity || 1);
                    } else {
                        verifiedMap.set(cleanKey, {
                            cardName: rawName,
                            quantity: item.quantity || 1,
                            acquired: 0,
                            basis: 0
                        });
                    }
                }
            }

            const verifiedDeck = Array.from(verifiedMap.values());
            const totalCards = verifiedDeck.reduce((sum, c) => sum + c.quantity, 0);

            // 2. Verify Single-Card Title Candidates if not a full deck page
            let verifiedSingleCard = null;
            for (const candidate of rawTitleCandidates) {
                const clean = String(candidate || "").trim();
                const key = clean.toLowerCase().split(" // ")[0].trim();
                if (key.length >= 3 && nameSet.has(key)) {
                    verifiedSingleCard = clean;
                    break;
                }
            }

            if (sender.tab?.id) {
                const badgeText = verifiedDeck.length >= 3
                    ? String(totalCards)
                    : (verifiedSingleCard ? "1" : "");
                chrome.action.setBadgeBackgroundColor({ tabId: sender.tab.id, color: "#10b981" });
                chrome.action.setBadgeText({ tabId: sender.tab.id, text: badgeText });
            }

            sendResponse({
                armed: true,
                decklist: verifiedDeck,
                totalCards,
                singleCard: verifiedSingleCard
            });
        });
        return true;
    }

    if (message.action === "importDetectedToScout") {
        const mode = message.mode;
        if (mode === "deck" && Array.isArray(message.decklist) && message.decklist.length > 0) {
            chrome.storage.local.set({
                procurementTargets: message.decklist,
                currentDecklist: message.decklist,
                deckMeta: {
                    deckName: message.deckName || "Auto-Detected Deck",
                    printingTarget: "normal",
                    conditionFloor: "any"
                }
            }, () => {
                sendResponse({ status: "success", count: message.decklist.length });
            });
            return true;
        }
                                if (mode === "scavenger_batch" && Array.isArray(message.deals)) {
                chrome.storage.local.get({ watchlist: [] }, (res) => {
                    const existing = Array.isArray(res.watchlist) ? res.watchlist : [];
                    const merged = [...message.deals, ...existing];
                    const seen = new Set();
                    const deduped = merged.filter(item => {
                        const k = ((item.cardName || item.title || "") + "_" + (item.price || "")).toLowerCase();
                        if (seen.has(k)) return false;
                        seen.add(k);
                        return true;
                    });
                    chrome.storage.local.set({ watchlist: deduped }, () => {
                        sendResponse({ status: "success", count: message.deals.length });
                    });
                });
                return true;
            }
            if (mode === "procurement_single" && message.cardName) {
                chrome.storage.local.get({ procurementTargets: [] }, (res) => {
                    const list = Array.isArray(res.procurementTargets) ? res.procurementTargets : [];
                    const key = message.cardName.toLowerCase().trim();
                    const existing = list.find(c => (c.cardName || "").toLowerCase().trim() === key);
                    if (existing) {
                        existing.quantity = (existing.quantity || 1) + 1;
                    } else {
                        list.unshift({ cardName: message.cardName.trim(), quantity: 1, acquired: 0, basis: 0 });
                    }
                    chrome.storage.local.set({ procurementTargets: list, currentDecklist: list }, () => {
                        sendResponse({ status: "success", count: list.length });
                    });
                });
                return true;
            }
            if (mode === "single" && message.cardName) {
            fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(message.cardName)}`)
                .then(r => r.json())
                .then(card => {
                    const floor = parseFloat(card.prices?.usd || card.prices?.usd_foil || 0);
                    const record = {
                        title: card.name || message.cardName,
                        cardName: card.name || message.cardName,
                        price: floor.toFixed(2),
                        marketFloor: floor.toFixed(2),
                        timeLeft: "Spot Price",
                        activity: `MTGO: ${card.prices?.tix || "0.00"} TIX`,
                        url: message.url || card.scryfall_uri,
                        savedAt: Date.now()
                    };
                    chrome.storage.local.get({ watchlist: [] }, (res) => {
                        const updated = [record, ...res.watchlist.filter(x => (x.cardName || x.title) !== record.cardName)];
                        chrome.storage.local.set({ watchlist: updated }, () => {
                            sendResponse({ status: "success", card: record });
                        });
                    });
                })
                .catch(err => sendResponse({ status: "error", error: err.message }));
            return true;
        }
    }
});
