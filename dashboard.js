// --- Mirror Pool Scout: Full 5-Tab Controller (Chase Hunt, Saved Lists, Price Sorting & Synergy Trend Radar) ---

const TIX_TO_USD = 0.92;
let currentSortMode = "price-desc"; // Default sort: Highest price chase targets at the top!

// Curated High-Velocity Metagame & Cross-Archetype Breakout Database (Synced with Live Scryfall Prices)
const META_TREND_RADAR_DB = [
    {
        cardName: "Astral Dragon",
        trendDir: "up",
        trendDeltaPct: "+30.0%",
        baselineUsd: 18.58,
        synergyTags: ["#NoncreatureCopy", "#TokenMultiplier", "#PlaneswalkerSynergy", "#ETBAbuse"],
        triggersOn: ["doubling season", "extravagant replication", "oath of teferi", "rhystic study", "mana reflection", "shadow of the second sun", "sphere of safety", "psychic corrosion", "parallel lives", "anointed procession", "cursed mirror", "panharmonicon"],
        archetypes: ["Commander Superfriends / Mill", "Blue-Based Token Copy", "Duel Commander Control", "Izzet Artifact Combo"],
        whyTrending: "Project Image creates two 3/3 flying Dragon copies of ANY noncreature permanent (Enchantments, Planeswalkers, Artifacts). Explodes with Doubling Season, Extravagant Replication, Rhystic Study, and Oath of Teferi."
    },
    {
        cardName: "Teferi's Protection",
        trendDir: "up",
        trendDeltaPct: "+14.2%",
        baselineUsd: 32.00,
        synergyTags: ["#BoardProtection", "#Superfriends", "#ControlLock"],
        triggersOn: ["oath of teferi", "sphere of safety", "smothering tithe", "rhystic study", "farewell"],
        archetypes: ["Azorius /Esper Control", "Superfriends Planeswalkers", "High-Power Commander"],
        whyTrending: "Phases out all your permanents (protecting high-loyalty Planeswalkers and Enchantment engines) while your life total cannot change."
    },
    {
        cardName: "The One Ring",
        trendDir: "up",
        trendDeltaPct: "+18.5%",
        baselineUsd: 58.00,
        synergyTags: ["#CardDrawEngine", "#Protection", "#UntapAbuse"],
        triggersOn: ["manifold key", "voltaic key", "sheoldred, the apocalypse", "orcish bowmasters", "teferi, time raveler"],
        archetypes: ["Modern Ring Control", "Dimir / Esper Midrange", "cEDH / Commander Staples"],
        whyTrending: "Universal colorless draw engine across Modern and Commander; massive lifegain synergy with Sheoldred, the Apocalypse."
    },
    {
        cardName: "Orcish Bowmasters",
        trendDir: "down",
        trendDeltaPct: "-8.4%",
        baselineUsd: 48.00,
        synergyTags: ["#DrawPunisher", "#WheelSynergy", "#FlashThreat"],
        triggersOn: ["thoughtseize", "sheoldred, the apocalypse", "rhystic study", "peer into the abyss", "windfall"],
        archetypes: ["Dimir Midrange", "Legacy / Timeless Tempo", "Black Control"],
        whyTrending: "Slight cooldown in paper floor creating an under-market buy window; pairs directly with Thoughtseize and punishes Rhystic Study."
    },
    {
        cardName: "Roaming Throne",
        trendDir: "up",
        trendDeltaPct: "+21.6%",
        baselineUsd: 21.50,
        synergyTags: ["#TriggeredAbilityDoubler", "#TribalEngine", "#DragonWizardCleric"],
        triggersOn: ["astral dragon", "starscape cleric", "hinterland sanctifier", "voice of victory", "azusa, lost but seeking"],
        archetypes: ["Cleric / Lifegain Tribal", "Dragon ETB Combo", "Commander Value Shells"],
        whyTrending: "Doubles all triggered abilities of your chosen creature type (including Astral Dragon's Project Image ETB or Cleric lifegain triggers)."
    },
    {
        cardName: "Professor Onyx",
        trendDir: "up",
        trendDeltaPct: "+16.8%",
        baselineUsd: 4.80,
        synergyTags: ["#MagecraftDrain", "#GraveyardTutor", "#LilianaBrawl"],
        triggersOn: ["thoughtseize", "chain of smog", "liliana", "go for the throat", "dark ritual"],
        archetypes: ["Liliana Historic Brawl", "Mono-Black Burn / Discard", "Magecraft Storm"],
        whyTrending: "Rising demand in Brawl and Commander Superfriends; instant-win combo with Chain of Smog and elite top-deck selection."
    }
];

function escapeHtml(str) {
    return String(str || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function parsePrice(val) {
    if (typeof val === "number") return isFinite(val) ? val : 0;
    const m = String(val || "").match(/(\d+(?:\.\d+)?)/);
    return m ? parseFloat(m[1]) : 0;
}

document.addEventListener("DOMContentLoaded", () => {
    initTabNavigation();
    initArmedToggle();
    initChaseHuntControls();
    initMetaTracker();
    initSettingsPanel();
    syncAllPanels();
});

// 1. Sidebar Tab Switching
function initTabNavigation() {
    const panels = ["tab-watchlist", "tab-procurement", "tab-arbitrage", "tab-meta", "tab-settings"];
    const navItems = document.querySelectorAll(".sidebar .nav-item, .nav-item, [data-tab], [data-target]");

    navItems.forEach((item) => {
        if (item.innerText.includes("Procurement")) {
            item.innerHTML = item.innerHTML.replace(/Procurement Hunter/g, "Chase Hunt");
        }
        item.addEventListener("click", (e) => {
            e.preventDefault();
            navItems.forEach(n => n.classList.remove("active"));
            item.classList.add("active");

            const explicitTarget = item.getAttribute("data-tab") || item.getAttribute("data-target") || item.getAttribute("href")?.replace("#", "");
            const text = item.innerText.toLowerCase();

            let targetId = explicitTarget;
            if (!targetId || !document.getElementById(targetId)) {
                if (text.includes("watch")) targetId = "tab-watchlist";
                else if (text.includes("chase") || text.includes("procure") || text.includes("hunt")) targetId = "tab-procurement";
                else if (text.includes("arbitrage")) targetId = "tab-arbitrage";
                else if (text.includes("meta") || text.includes("insight")) targetId = "tab-meta";
                else if (text.includes("setting") || text.includes("pref")) targetId = "tab-settings";
            }

            if (targetId && document.getElementById(targetId)) {
                panels.forEach(pid => {
                    const el = document.getElementById(pid);
                    if (el) el.classList.toggle("active", pid === targetId);
                });
            }
        });
    });
}

// 2. Sync & Render All Storage Buckets
function syncAllPanels() {
    chrome.storage.local.get(
        ["watchlist", "watchlist_cards", "card_chase", "procurementTargets", "currentDecklist", "deckMeta", "savedChaseLists", "priceBaselineMap"],
        (res) => {
            const combinedWatchlist = [
                ...(Array.isArray(res.watchlist) ? res.watchlist : []),
                ...(Array.isArray(res.watchlist_cards) ? res.watchlist_cards : []),
                ...(Array.isArray(res.card_chase) ? res.card_chase : [])
            ];

            if (res.deckMeta) {
                const nameInput = document.getElementById("deck-name-input");
                const printSelect = document.getElementById("printing-target-select");
                const condSelect = document.getElementById("condition-floor-select");
                if (nameInput && res.deckMeta.deckName) nameInput.value = res.deckMeta.deckName;
                if (printSelect && res.deckMeta.printingTarget) printSelect.value = res.deckMeta.printingTarget;
                if (condSelect && res.deckMeta.conditionFloor) condSelect.value = res.deckMeta.conditionFloor;
            }

            const targets = Array.isArray(res.procurementTargets) && res.procurementTargets.length > 0
                ? res.procurementTargets
                : (Array.isArray(res.currentDecklist) ? res.currentDecklist : []);

            renderSavedListsToolbar(res.savedChaseLists || {}, res.deckMeta?.deckName || "");
            renderWatchlistPanel(combinedWatchlist);
            renderChaseHuntAndArbitrage(targets, combinedWatchlist, res.deckMeta || {}, res.priceBaselineMap || {});
        }
    );
}

// 3. Inject Saved Chase Lists Manager & Sort Control Bar in #tab-procurement (Chase Hunt)
function renderSavedListsToolbar(savedLists, activeDeckName) {
    const procTab = document.getElementById("tab-procurement");
    if (!procTab) return;

    // Rename heading inside #tab-procurement to Chase Hunt
    procTab.querySelectorAll("h1, h2, h3").forEach(h => {
        if (h.innerText.includes("Procurement")) {
            h.innerText = h.innerText.replace(/Procurement Hunter/g, "Chase Hunt").replace(/Procurement/g, "Chase Hunt");
        }
    });

    let toolbar = document.getElementById("chase-hunt-saved-toolbar");
    if (!toolbar) {
        toolbar = document.createElement("div");
        toolbar.id = "chase-hunt-saved-toolbar";
        toolbar.style.cssText = "display:flex; justify-content:space-between; align-items:center; gap:10px; background:#0b1120; border:1px solid #1e293b; border-radius:8px; padding:10px 14px; margin-bottom:12px; flex-wrap:wrap;";
        const procContainer = document.getElementById("procurement-container") || procTab.firstElementChild;
        if (procContainer && procContainer.parentNode === procTab) {
            procTab.insertBefore(toolbar, procContainer);
        } else {
            procTab.appendChild(toolbar);
        }
    }

    const listNames = Object.keys(savedLists);
    const optionsHtml = `<option value="">📂 Saved Chase Hunt Lists (${listNames.length})...</option>` +
        listNames.map(name => `<option value="${escapeHtml(name)}" ${name === activeDeckName ? "selected" : ""}>${escapeHtml(name)} (${savedLists[name].cards?.length || 0} unique)</option>`).join("");

    toolbar.innerHTML = `
        <div style="display:flex; gap:8px; align-items:center; flex:1; min-width:260px;">
            <select id="saved-chase-list-select" style="flex:1; background:#070d17; color:#f8fafc; border:1px solid #334155; border-radius:6px; padding:7px 10px; font-size:12px; font-weight:600; cursor:pointer;">
                ${optionsHtml}
            </select>
            <button id="btn-new-chase-list" style="background:#1e293b; color:#38bdf8; border:1px solid #334155; border-radius:6px; padding:7px 10px; font-size:11px; font-weight:700; cursor:pointer; white-space:nowrap;">+ New List</button>
            <button id="btn-delete-chase-list" style="background:rgba(239,68,68,0.12); color:#ef4444; border:1px solid #ef4444; border-radius:6px; padding:7px 10px; font-size:11px; font-weight:700; cursor:pointer; white-space:nowrap;">🗑 Delete</button>
            <a href="https://mtgscavenger.com/" target="_blank" style="background:rgba(245,158,11,0.15); color:#f59e0b; border:1px solid #f59e0b; border-radius:6px; padding:7px 10px; font-size:11px; font-weight:800; text-decoration:none; white-space:nowrap;" title="Open MTGScavenger with Mirror Pool Scout Adapter">🦴 Hunt MTGScavenger ↗</a>
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
            <span style="font-size:11px; color:#94a3b8; font-weight:600;">Sort Chase Hunt:</span>
            <select id="chase-sort-select" style="background:#070d17; color:#10b981; border:1px solid #10b981; border-radius:6px; padding:7px 10px; font-size:12px; font-weight:700; cursor:pointer;">
                <option value="price-desc" ${currentSortMode === "price-desc" ? "selected" : ""}>💰 Paper Price: High ➔ Low</option>
                <option value="price-asc" ${currentSortMode === "price-asc" ? "selected" : ""}>💵 Paper Price: Low ➔ High</option>
                <option value="tix-desc" ${currentSortMode === "tix-desc" ? "selected" : ""}>💻 MTGO TIX: High ➔ Low</option>
                <option value="trend-desc" ${currentSortMode === "trend-desc" ? "selected" : ""}>📈 Meta Trend / Spiking First</option>
                <option value="name-asc" ${currentSortMode === "name-asc" ? "selected" : ""}>🔤 Card Name: A ➔ Z</option>
            </select>
        </div>
    `;

    const sel = document.getElementById("saved-chase-list-select");
    const newBtn = document.getElementById("btn-new-chase-list");
    const delBtn = document.getElementById("btn-delete-chase-list");
    const sortSel = document.getElementById("chase-sort-select");

    if (sel) {
        sel.addEventListener("change", () => {
            const chosen = sel.value;
            if (!chosen || !savedLists[chosen]) return;
            const entry = savedLists[chosen];
            const decklistInput = document.getElementById("decklist-input");
            const deckNameInput = document.getElementById("deck-name-input");
            if (deckNameInput) deckNameInput.value = chosen;
            if (decklistInput) {
                decklistInput.value = (entry.cards || []).map(c => `${c.quantity || 1} ${c.cardName}`).join("\n");
            }
            chrome.storage.local.set({
                procurementTargets: entry.cards || [],
                currentDecklist: entry.cards || [],
                deckMeta: entry.meta || { deckName: chosen, printingTarget: "normal", conditionFloor: "any" }
            }, syncAllPanels);
        });
    }

    if (newBtn) {
        newBtn.addEventListener("click", () => {
            const decklistInput = document.getElementById("decklist-input");
            const deckNameInput = document.getElementById("deck-name-input");
            if (deckNameInput) {
                deckNameInput.value = "";
                deckNameInput.focus();
            }
            if (decklistInput) decklistInput.value = "";
        });
    }

    if (delBtn) {
        delBtn.addEventListener("click", () => {
            const chosen = sel?.value || activeDeckName;
            if (!chosen || !savedLists[chosen]) return;
            delete savedLists[chosen];
            chrome.storage.local.set({ savedChaseLists: savedLists }, syncAllPanels);
        });
    }

    if (sortSel) {
        sortSel.addEventListener("change", () => {
            currentSortMode = sortSel.value;
            syncAllPanels();
        });
    }
}

// 4. Render #tab-watchlist
function renderWatchlistPanel(items) {
    const grid = document.getElementById("watchlist-grid");
    const mktEl = document.getElementById("wl-market-total");
    const spentEl = document.getElementById("wl-total-spent");
    const varEl = document.getElementById("wl-net-variance");

    if (!grid) return;

    if (!items || items.length === 0) {
        grid.innerHTML = `<div style="color:#94a3b8; font-size:12px; padding:16px; border:1px dashed #1e293b; border-radius:6px;">No active targets in Watchlist yet. Bookmark cards from eBay, MTGGoldfish, or TCGplayer to track live deals and trigger Synergy Radar alerts.</div>`;
        if (mktEl) mktEl.innerText = "$0.00";
        if (spentEl) spentEl.innerText = "$0.00";
        if (varEl) varEl.innerText = "$0.00";
        return;
    }

    let marketTotal = 0;
    let spentTotal = 0;

    grid.innerHTML = items.map((item, idx) => {
        const title = item.cardName || item.title || "Tracked Listing";
        const marketFloor = parsePrice(item.marketFloor || item.paperPrice || item.usd || item.valueA);
        const currentCost = parsePrice(item.totalCost || item.currentPrice || item.price || item.valueA);
        const timeText = item.timeLeft || item.metricB || "Active";
        const activityText = item.activity || (item.valueB ? `${item.metricB || "Info"}: ${item.valueB}` : `${item.bidders || 0} Bidders / ${item.watchers || 0} Watchers`);

        marketTotal += marketFloor;
        spentTotal += currentCost;

        const maxSnipe = Math.max(0.99, (marketFloor || currentCost || 5) * 0.85).toFixed(2);
        const encoded = encodeURIComponent(`MTG "${title}" -proxy -custom`);
        const ebayBinUrl = `https://www.ebay.com/sch/i.html?_nkw=${encoded}&_sacat=19107&LH_BIN=1&_sop=15&_udhi=${maxSnipe}`;

        return `
            <div class="watchlist-card" style="background:#0b1120; border:1px solid #1e293b; border-radius:8px; padding:14px; display:flex; flex-direction:column; gap:8px;">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
                    <a href="${escapeHtml(item.url || ebayBinUrl)}" target="_blank" style="color:#10b981; font-weight:700; font-size:14px; text-decoration:none; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${escapeHtml(title)}">${escapeHtml(title)}</a>
                    <span style="font-size:11px; color:#f59e0b; background:#1e293b; padding:2px 6px; border-radius:4px; white-space:nowrap;">⏱ ${escapeHtml(timeText)}</span>
                </div>
                <div style="background:#070d17; border:1px solid #1e293b; border-radius:6px; padding:10px; font-size:12px; display:flex; flex-direction:column; gap:4px;">
                    <div style="display:flex; justify-content:space-between;"><span style="color:#94a3b8;">Scryfall Floor:</span><strong style="color:#f59e0b;">${marketFloor > 0 ? "$" + marketFloor.toFixed(2) : "$--"}</strong></div>
                    <div style="display:flex; justify-content:space-between;"><span style="color:#94a3b8;">Listed / Spot Cost:</span><strong style="color:#00ffcc;">$${currentCost.toFixed(2)}</strong></div>
                    <div style="display:flex; justify-content:space-between;"><span style="color:#94a3b8;">Activity:</span><span style="color:#10b981;">${escapeHtml(activityText)}</span></div>
                </div>
                <div style="display:flex; gap:6px;">
                    <a href="${escapeHtml(item.url || ebayBinUrl)}" target="_blank" style="flex:1; text-align:center; background:#10b981; color:#030712; text-decoration:none; padding:6px; border-radius:4px; font-size:11px; font-weight:800;">🎯 Listing ($${currentCost.toFixed(2)}) ↗</a>
                    <button class="btn drop-wl-btn" data-index="${idx}" style="background:transparent; border:1px solid #ef4444; color:#ef4444; padding:6px 10px; border-radius:4px; cursor:pointer; font-size:11px; font-weight:600;">✖ Drop</button>
                </div>
            </div>
        `;
    }).join("");

    const netVariance = marketTotal - spentTotal;
    if (mktEl) mktEl.innerText = "$" + marketTotal.toFixed(2);
    if (spentEl) spentEl.innerText = "$" + spentTotal.toFixed(2);
    if (varEl) {
        varEl.innerText = (netVariance >= 0 ? "+$" : "-$") + Math.abs(netVariance).toFixed(2);
        varEl.style.color = netVariance >= 0 ? "#10b981" : "#ef4444";
    }

    grid.querySelectorAll(".drop-wl-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const idx = parseInt(btn.getAttribute("data-index"), 10);
            const updated = items.filter((_, i) => i !== idx);
            chrome.storage.local.set({ watchlist: updated, watchlist_cards: [], card_chase: [] }, syncAllPanels);
        });
    });
}

// 5. Wire Chase Hunt Controls (Save to Named Lists + Scrape + Clean Export)
function initChaseHuntControls() {
    const saveDeckBtn = document.getElementById("save-deck-btn");
    const scrapeDeckBtn = document.getElementById("scrape-deck-btn");
    const exportManifestBtn = document.getElementById("export-manifest-btn");
    const decklistInput = document.getElementById("decklist-input");
    const deckNameInput = document.getElementById("deck-name-input");
    const printingSelect = document.getElementById("printing-target-select");
    const conditionSelect = document.getElementById("condition-floor-select");

    if (saveDeckBtn) saveDeckBtn.innerText = "⚡ Save & Compile Chase Hunt Sheet";

    if (saveDeckBtn && decklistInput) {
        saveDeckBtn.addEventListener("click", () => {
            const raw = decklistInput.value.trim();
            if (!raw) {
                alert("Paste a decklist or card list into the box first (e.g. 4 Thoughtseize).");
                return;
            }
            const parsedMap = new Map();
            raw.split("\n").forEach(line => {
                const cleaned = line.trim();
                if (!cleaned || /^(Deck|Sideboard|Commander|Companion|\/\/)/i.test(cleaned)) return;
                const match = cleaned.match(/^(\d+)[xX]?\s+(.+?)(?:\s+\([A-Z0-9]{2,5}\)\s*\d*.*)?$/);
                if (match) {
                    const qty = parseInt(match[1], 10) || 1;
                    const name = match[2].trim();
                    const key = name.toLowerCase();
                    if (parsedMap.has(key)) {
                        parsedMap.get(key).quantity += qty;
                    } else {
                        parsedMap.set(key, { cardName: name, quantity: qty, acquired: 0, basis: 0 });
                    }
                }
            });

            const list = Array.from(parsedMap.values());
            if (list.length === 0) {
                alert("Could not parse any valid card lines. Format: '4 Thoughtseize'");
                return;
            }

            const deckName = (deckNameInput && deckNameInput.value.trim())
                ? deckNameInput.value.trim()
                : `Chase List (${list.length} Cards)`;
            if (deckNameInput) deckNameInput.value = deckName;

            const deckMeta = {
                deckName,
                printingTarget: printingSelect ? printingSelect.value : "normal",
                conditionFloor: conditionSelect ? conditionSelect.value : "any"
            };

            saveDeckBtn.innerText = "⏳ Saving & Querying Scryfall...";
            chrome.storage.local.get({ savedChaseLists: {} }, (res) => {
                const savedLists = res.savedChaseLists || {};
                savedLists[deckName] = { cards: list, meta: deckMeta, updatedAt: Date.now() };
                chrome.storage.local.set({
                    procurementTargets: list,
                    currentDecklist: list,
                    deckMeta,
                    savedChaseLists: savedLists
                }, () => {
                    syncAllPanels();
                    setTimeout(() => { saveDeckBtn.innerText = "✅ Saved to Chase Hunt Library!"; }, 400);
                    setTimeout(() => { saveDeckBtn.innerText = "⚡ Save & Compile Chase Hunt Sheet"; }, 2200);
                });
            });
        });
    }

    if (scrapeDeckBtn) {
        scrapeDeckBtn.addEventListener("click", () => {
            const origText = scrapeDeckBtn.innerText;
            scrapeDeckBtn.innerText = "⏳ Scanning Open Tabs...";

            chrome.tabs.query({ url: ["*://*.mtgdecks.net/*", "*://*.mtggoldfish.com/*", "*://*.magic.gg/*", "*://*.wizards.com/*"] }, (tabs) => {
                if (!tabs || tabs.length === 0) {
                    alert("No open MTGDecks, MTGGoldfish, or Magic.gg tab detected.");
                    scrapeDeckBtn.innerText = origText;
                    return;
                }

                const targetTab = tabs[0];
                chrome.scripting.executeScript({
                    target: { tabId: targetTab.id },
                    func: () => {
                        const cards = [];
                        const primaryTable = document.querySelector("#tab-paper table.deck-view-deck-table, table.deck-view-deck-table") || document;
                        primaryTable.querySelectorAll("tr").forEach(tr => {
                            if (tr.classList.contains("deck-category-header") || tr.querySelector("th")) return;
                            const link = tr.querySelector("a[href*='/price/'], td.deck-col-card a, a.card_id, .td-card a");
                            const qtyTd = tr.querySelector("td.deck-col-qty, .td-qty, td:first-child");
                            if (link && qtyTd) {
                                const qMatch = qtyTd.innerText.trim().match(/^(\d{1,2})\b/);
                                const name = link.innerText.trim();
                                if (qMatch && name) cards.push(`${qMatch[1]} ${name}`);
                            }
                        });
                        const h1 = document.querySelector("h1.deck-view-title, h1");
                        const title = h1 ? (h1.childNodes[0]?.textContent?.trim() || h1.innerText.split("\n")[0].trim()) : document.title.split("|")[0].trim();
                        return { title, lines: cards };
                    }
                }, (results) => {
                    scrapeDeckBtn.innerText = origText;
                    if (chrome.runtime.lastError || !results || !results[0]?.result?.lines?.length) {
                        alert("Could not automatically parse rows on that tab.");
                        return;
                    }
                    const { title, lines } = results[0].result;
                    if (deckNameInput && title) deckNameInput.value = title;
                    if (decklistInput) decklistInput.value = lines.join("\n");
                    if (saveDeckBtn) saveDeckBtn.click();
                });
            });
        });
    }

    if (exportManifestBtn) {
        exportManifestBtn.addEventListener("click", () => {
            chrome.storage.local.get(["procurementTargets", "currentDecklist"], (res) => {
                const list = res.procurementTargets || res.currentDecklist || [];
                if (list.length === 0) {
                    alert("No Chase Hunt sheet loaded to export.");
                    return;
                }
                const manifestText = list
                    .map(c => `${Math.max(0, (c.quantity || 1) - (c.acquired || 0))} ${c.cardName}`)
                    .filter(line => !line.startsWith("0 "))
                    .join("\n");

                navigator.clipboard.writeText(manifestText).then(() => {
                    const orig = exportManifestBtn.innerText;
                    exportManifestBtn.innerText = "✅ Clean Manifest Copied!";
                    setTimeout(() => { exportManifestBtn.innerText = orig; }, 2000);
                });
            });
        });
    }

    if (printingSelect) printingSelect.addEventListener("change", syncAllPanels);
    if (conditionSelect) conditionSelect.addEventListener("change", syncAllPanels);
}

// 6. Fetch Live Scryfall Prices, Sort Chase Hunt Table, Show Prices on Buttons & Run Synergy Trend Algorithm
function renderChaseHuntAndArbitrage(targets, watchlistItems, deckMeta, baselineMap) {
    const tbody = document.getElementById("procurement-tbody");
    const arbPaperEl = document.getElementById("arb-paper-total");
    const arbMtgoEl = document.getElementById("arb-mtgo-total");
    const arbSpreadEl = document.getElementById("arb-spread-total");
    const arbGrid = document.getElementById("arbitrage-spread-grid");

    // Include radar breakout cards (like Astral Dragon) in batch Scryfall lookup so their live USD/TIX are always current!
    const radarNames = META_TREND_RADAR_DB.map(r => r.cardName);
    const cardNames = [
        ...targets.map(t => t.cardName),
        ...watchlistItems.map(w => w.cardName || w.title),
        ...radarNames
    ].filter(Boolean);

    if (targets.length === 0 && watchlistItems.length === 0) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:16px; color:#94a3b8;">Paste a decklist above and click ⚡ Save & Compile Chase Hunt Sheet.</td></tr>`;
        if (arbGrid) arbGrid.innerHTML = `<div style="color:#94a3b8; font-size:12px; padding:16px;">Load a decklist in Chase Hunt to compute live Paper vs. MTGO TIX arbitrage spreads.</div>`;
        renderSynergyAndTrendRadar([], [], {});
        return;
    }

    chrome.runtime.sendMessage({ action: "fetchCollectionPrices", cardNames }, (response) => {
        const priceMap = (response && response.prices) ? response.prices : {};
        const preferFoil = (document.getElementById("printing-target-select")?.value || deckMeta.printingTarget || "").toLowerCase().includes("foil");

        // Update local baseline map to track real price movement over time
        const updatedBaselines = { ...baselineMap };
        Object.keys(priceMap).forEach(k => {
            const cur = priceMap[k].usd || 0;
            if (cur > 0 && !updatedBaselines[k]) {
                updatedBaselines[k] = cur;
            }
        });
        chrome.storage.local.set({ priceBaselineMap: updatedBaselines });

        let totalPaperRemaining = 0;
        let totalMtgoTixRemaining = 0;

        // Enrich targets with live Scryfall pricing + trend velocity before sorting
        const enrichedTargets = targets.map((item, originalIndex) => {
            const name = item.cardName || "Unknown Card";
            const key = name.toLowerCase().trim();
            const scry = priceMap[key] || { usd: 0, usd_foil: 0, tix: 0, oracle_text: "", type_line: "", edhrec_rank: 99999 };
            const unitPaper = preferFoil && scry.usd_foil > 0 ? scry.usd_foil : (scry.usd || 0);
            const unitTix = scry.tix || 0;
            const qty = item.quantity || 1;
            const acquired = item.acquired || 0;
            const remaining = Math.max(0, qty - acquired);

            totalPaperRemaining += unitPaper * remaining;
            totalMtgoTixRemaining += unitTix * remaining;

            // Compute trend indicator (from radar DB or baseline comparison)
            const radarEntry = META_TREND_RADAR_DB.find(r => r.cardName.toLowerCase() === key);
            const basePrice = radarEntry ? radarEntry.baselineUsd : (updatedBaselines[key] || unitPaper);
            const deltaPct = basePrice > 0 ? ((unitPaper - basePrice) / basePrice) * 100 : 0;

            return {
                ...item,
                originalIndex,
                unitPaper,
                unitTix,
                remaining,
                deltaPct,
                oracle_text: scry.oracle_text || "",
                type_line: scry.type_line || ""
            };
        });

        // Sort enrichedTargets according to user's selected sort mode
        enrichedTargets.sort((a, b) => {
            if (currentSortMode === "price-desc") return b.unitPaper - a.unitPaper;
            if (currentSortMode === "price-asc") return a.unitPaper - b.unitPaper;
            if (currentSortMode === "tix-desc") return b.unitTix - a.unitTix;
            if (currentSortMode === "trend-desc") return Math.abs(b.deltaPct) - Math.abs(a.deltaPct) || (b.unitPaper - a.unitPaper);
            if (currentSortMode === "name-asc") return a.cardName.localeCompare(b.cardName);
            return 0;
        });

        if (tbody) {
            tbody.innerHTML = enrichedTargets.map((item) => {
                const name = item.cardName || "Unknown Card";
                const idx = item.originalIndex;
                const unitPaper = item.unitPaper;
                const unitTix = item.unitTix;
                const qty = item.quantity || 1;
                const acquired = item.acquired || 0;

                // Actionable Snipe Ceiling (85% of Scryfall Floor) shown directly on the BIN and Auc buttons!
                const snipeCeiling = unitPaper > 0 ? Math.max(0.99, unitPaper * 0.85).toFixed(2) : "4.99";
                const tcgLabel = unitPaper > 0 ? `TCG $${unitPaper.toFixed(2)}` : "TCG Search";
                const binLabel = unitPaper > 0 ? `BIN <$${snipeCeiling}` : "eBay BIN";
                const aucLabel = unitPaper > 0 ? `Auc <$${snipeCeiling}` : "eBay Auc";

                const minBinFloor = unitPaper >= 8.0 ? Math.max(2.50, unitPaper * 0.40).toFixed(2) : "0.99";
                const minAucFloor = unitPaper >= 15.0 ? Math.max(1.99, unitPaper * 0.18).toFixed(2) : "0.99";
                const exactQuery = encodeURIComponent(`MTG "${name}" -proxy -proxies -playtest -fanart -alter -alters -altered -custom -placeholder -token -replica`);
                const tcgUrl = `https://www.tcgplayer.com/search/magic/product?q=${encodeURIComponent(name)}`;
                const ebayBinUrl = `https://www.ebay.com/sch/i.html?_nkw=${exactQuery}&_sacat=19107&LH_BIN=1&_sop=15&_udlo=${minBinFloor}&_udhi=${snipeCeiling}`;
                const ebayAuctionUrl = `https://www.ebay.com/sch/i.html?_nkw=${exactQuery}&_sacat=19107&LH_Auction=1&_sop=1&_udlo=${minAucFloor}&_udhi=${snipeCeiling}`;

                let trendPill = "";
                if (item.deltaPct >= 5) {
                    trendPill = `<span style="margin-left:6px; font-size:10px; background:rgba(16,185,129,0.15); color:#10b981; padding:1px 5px; border-radius:4px; font-weight:700;">📈 +${item.deltaPct.toFixed(0)}%</span>`;
                } else if (item.deltaPct <= -5) {
                    trendPill = `<span style="margin-left:6px; font-size:10px; background:rgba(56,189,248,0.15); color:#38bdf8; padding:1px 5px; border-radius:4px; font-weight:700;">📉 ${item.deltaPct.toFixed(0)}% Buy Dip</span>`;
                }

                return `
                    <tr style="border-bottom:1px solid #1e293b; font-size:12px;">
                        <td style="padding:10px; color:#10b981; font-weight:700;">${escapeHtml(name)}${trendPill}</td>
                        <td style="padding:10px; color:#cbd5e1;">${acquired} / ${qty}</td>
                        <td style="padding:10px; color:#f59e0b; font-weight:700;">$${unitPaper.toFixed(2)}</td>
                        <td style="padding:10px; color:#38bdf8;">${unitTix.toFixed(2)} TIX</td>
                        <td style="padding:10px; color:#94a3b8;">$${(item.basis || 0).toFixed(2)}</td>
                        <td style="padding:10px;">
                            <div style="display:flex; gap:4px; align-items:center;">
                                <input type="number" step="0.01" placeholder="Paid $" class="basis-input" data-idx="${idx}" style="width:65px; background:#070d17; border:1px solid #334155; color:#f8fafc; padding:4px; border-radius:4px; font-size:11px;">
                                <button class="log-basis-btn" data-idx="${idx}" style="background:#10b981; color:#030712; border:none; padding:4px 8px; border-radius:4px; font-weight:700; font-size:11px; cursor:pointer;">+1</button>
                            </div>
                        </td>
                        <td style="padding:10px;">
                            <div style="display:flex; gap:6px; flex-wrap:nowrap;">
                                <a href="${tcgUrl}" target="_blank" style="color:#f8fafc; background:#1e293b; border:1px solid #475569; padding:4px 7px; border-radius:4px; text-decoration:none; font-size:11px; font-weight:700; white-space:nowrap;" title="View on TCGplayer">${tcgLabel}</a>
                                <a href="${ebayBinUrl}" target="_blank" style="color:#10b981; background:rgba(16,185,129,0.1); border:1px solid #10b981; padding:4px 7px; border-radius:4px; text-decoration:none; font-size:11px; font-weight:700; white-space:nowrap;" title="Snipe eBay Buy It Now under 85% Scryfall Floor">${binLabel}</a>
                                <a href="${ebayAuctionUrl}" target="_blank" style="color:#f59e0b; background:rgba(245,158,11,0.1); border:1px solid #f59e0b; padding:4px 7px; border-radius:4px; text-decoration:none; font-size:11px; font-weight:700; white-space:nowrap;" title="Snipe eBay Ending Auctions under 85% Scryfall Floor">${aucLabel}</a>
                            </div>
                        </td>
                    </tr>
                `;
            }).join("");

            tbody.querySelectorAll(".log-basis-btn").forEach(btn => {
                btn.addEventListener("click", () => {
                    const idx = parseInt(btn.getAttribute("data-idx"), 10);
                    const input = tbody.querySelector(`.basis-input[data-idx="${idx}"]`);
                    const paid = parsePrice(input ? input.value : 0);
                    if (targets[idx]) {
                        targets[idx].acquired = Math.min(targets[idx].quantity, (targets[idx].acquired || 0) + 1);
                        targets[idx].basis = (targets[idx].basis || 0) + paid;
                        chrome.storage.local.set({ procurementTargets: targets }, syncAllPanels);
                    }
                });
            });
        }

        // Update #tab-arbitrage HUD & Spread Grid
        const mtgoUsd = totalMtgoTixRemaining * TIX_TO_USD;
        const spreadUsd = totalPaperRemaining - mtgoUsd;
        const spreadPct = totalPaperRemaining > 0 ? (spreadUsd / totalPaperRemaining) * 100 : 0;

        if (arbPaperEl) arbPaperEl.innerText = `$${totalPaperRemaining.toFixed(2)}`;
        if (arbMtgoEl) arbMtgoEl.innerText = `${totalMtgoTixRemaining.toFixed(2)} TIX ($${mtgoUsd.toFixed(2)})`;
        if (arbSpreadEl) {
            arbSpreadEl.innerText = `${spreadUsd >= 0 ? "+" : "-"}$${Math.abs(spreadUsd).toFixed(2)} (${spreadPct.toFixed(1)}%)`;
            arbSpreadEl.style.color = spreadUsd >= 0 ? "#10b981" : "#ef4444";
        }

        if (arbGrid) {
            const watchlistByCard = {};
            (watchlistItems || []).forEach(w => {
                const k = (w.cardName || w.title || "").toLowerCase().trim();
                if (k) watchlistByCard[k] = w;
            });

            const combinedArbItems = [...enrichedTargets];
            (watchlistItems || []).forEach(w => {
                const wName = (w.cardName || w.title || "").trim();
                if (wName && !combinedArbItems.some(t => (t.cardName || "").toLowerCase().trim() === wName.toLowerCase())) {
                    combinedArbItems.push({ cardName: wName, quantity: 1, fromWatchlist: true, watchRecord: w });
                }
            });

            arbGrid.innerHTML = combinedArbItems.map(item => {
                const name = item.cardName || "Unknown Card";
                const key = name.toLowerCase().trim();
                const scry = priceMap[key] || { usd: 0, tix: 0 };
                const wMatch = item.watchRecord || watchlistByCard[key];

                const paperFloor = scry.usd > 0 ? scry.usd : parsePrice(wMatch?.marketFloor);
                const tix = scry.tix || 0;
                const tixUsd = tix * TIX_TO_USD;
                const unitSpread = paperFloor - tixUsd;
                const spreadPctCard = paperFloor > 0 ? (unitSpread / paperFloor) * 100 : 0;

                const listedCost = wMatch ? parsePrice(wMatch.price || wMatch.totalCost || wMatch.valueA) : 0;
                const hasLiveFlip = wMatch && listedCost > 0 && paperFloor > listedCost;
                const flipProfit = hasLiveFlip ? (paperFloor - listedCost) : 0;
                const flipPct = hasLiveFlip && paperFloor > 0 ? (flipProfit / paperFloor) * 100 : 0;

                let signalBadge = "";
                let borderColor = "#1e293b";

                if (hasLiveFlip && flipPct >= 15) {
                    borderColor = "#10b981";
                    signalBadge = `<div style="background:rgba(16,185,129,0.18); border:1px solid #10b981; color:#10b981; padding:5px 8px; border-radius:4px; font-size:11px; font-weight:800; margin-bottom:8px; text-align:center;">🔥 LIVE EBAY ARBITRAGE: +$${flipProfit.toFixed(2)}/ea (${flipPct.toFixed(0)}% UNDER FLOOR)</div>`;
                } else if (unitSpread >= 5.0 && spreadPctCard >= 25) {
                    borderColor = "#f59e0b";
                    signalBadge = `<div style="background:rgba(245,158,11,0.15); border:1px solid #f59e0b; color:#f59e0b; padding:5px 8px; border-radius:4px; font-size:11px; font-weight:800; margin-bottom:8px; text-align:center;">💎 DIGITAL ➔ PAPER ARB: +$${unitSpread.toFixed(2)}/ea (${spreadPctCard.toFixed(0)}% SPREAD)</div>`;
                } else if (unitSpread <= -1.0) {
                    borderColor = "#38bdf8";
                    signalBadge = `<div style="background:rgba(56,189,248,0.15); border:1px solid #38bdf8; color:#38bdf8; padding:5px 8px; border-radius:4px; font-size:11px; font-weight:800; margin-bottom:8px; text-align:center;">⚡ PAPER UNDER DIGITAL: BUY PAPER / SELL MTGO ($${Math.abs(unitSpread).toFixed(2)} EDGE)</div>`;
                } else {
                    signalBadge = `<div style="background:#070d17; border:1px solid #1e293b; color:#64748b; padding:5px 8px; border-radius:4px; font-size:11px; font-weight:700; margin-bottom:8px; text-align:center;">⚖️ PARITY MARKET (LOW ARBITRAGE SPREAD)</div>`;
                }

                const maxSnipe = Math.max(0.99, paperFloor * 0.85).toFixed(2);
                const minSnipe = paperFloor >= 8.0 ? Math.max(2.50, paperFloor * 0.40).toFixed(2) : "0.99";
                const encoded = encodeURIComponent(`MTG "${name}" -proxy -proxies -playtest -fanart -alter -alters -altered -custom -placeholder -token`);
                const actionUrl = wMatch?.url || `https://www.ebay.com/sch/i.html?_nkw=${encoded}&_sacat=19107&LH_BIN=1&_sop=15&_udlo=${minSnipe}&_udhi=${maxSnipe}`;
                const actionLabel = wMatch?.url
                    ? `🎯 Open Bookmarked Deal ($${listedCost.toFixed(2)} vs $${paperFloor.toFixed(2)} Floor) ↗`
                    : `🎯 Snipe eBay BIN <$${maxSnipe} (Floor $${paperFloor.toFixed(2)}) ↗`;

                return `
                    <div style="background:#0b1120; border:1px solid ${borderColor}; border-radius:8px; padding:14px; display:flex; flex-direction:column; justify-content:space-between;">
                        <div>
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                                <span style="font-weight:700; color:#38bdf8; font-size:14px;">${escapeHtml(name)} (x${item.quantity || 1})</span>
                                ${wMatch ? `<span style="font-size:10px; background:#065f46; color:#10b981; padding:2px 6px; border-radius:4px; font-weight:700;">BOOKMARKED</span>` : ""}
                            </div>
                            ${signalBadge}
                            <div style="font-size:12px; color:#94a3b8; display:flex; justify-content:space-between; margin-bottom:3px;"><span>Paper Floor:</span><strong style="color:#10b981;">$${paperFloor.toFixed(2)}</strong></div>
                            ${hasLiveFlip ? `<div style="font-size:12px; color:#94a3b8; display:flex; justify-content:space-between; margin-bottom:3px;"><span>Bookmarked eBay Cost:</span><strong style="color:#00ffcc;">$${listedCost.toFixed(2)} (Save$${flipProfit.toFixed(2)})</strong></div>` : ""}
                            <div style="font-size:12px; color:#94a3b8; display:flex; justify-content:space-between; margin-bottom:3px;"><span>MTGO TIX:</span><strong style="color:#3b82f6;">${tix.toFixed(2)} ($${tixUsd.toFixed(2)})</strong></div>
                            <div style="font-size:12px; color:#94a3b8; display:flex; justify-content:space-between; margin-top:4px; padding-top:4px; border-top:1px solid #1e293b;"><span>Paper vs. MTGO Delta:</span><strong style="color:${unitSpread >= 0 ? "#f59e0b" : "#38bdf8"};">${unitSpread >= 0 ? "+" : "-"}$${Math.abs(unitSpread).toFixed(2)}</strong></div>
                        </div>
                        <a href="${escapeHtml(actionUrl)}" target="_blank" style="margin-top:10px; display:block; text-align:center; background:#1e293b; color:#f8fafc; text-decoration:none; padding:7px; border-radius:4px; font-size:11px; font-weight:700; border:1px solid #10b981;">${actionLabel}</a>
                    </div>
                `;
            }).join("");
        }

        // Run Algorithmic Synergy & Metagame Trend Radar across user's Chase Hunt + Watchlist
        renderSynergyAndTrendRadar(enrichedTargets, watchlistItems, priceMap);
    });
}

// 7. Algorithmic Metagame Trend & Cross-Archetype Synergy Radar (Populates on Chase Hunt & Meta Analytics)
function renderSynergyAndTrendRadar(enrichedTargets, watchlistItems, priceMap) {
    const procTab = document.getElementById("tab-procurement");
    const metaTab = document.getElementById("tab-meta");

    const userCardSet = new Set([
        ...enrichedTargets.map(t => (t.cardName || "").toLowerCase().trim()),
        ...watchlistItems.map(w => (w.cardName || w.title || "").toLowerCase().trim())
    ]);

    // Detect synergy clusters in user's active Chase Hunt / Watchlist
    const scoredRecommendations = META_TREND_RADAR_DB.map(entry => {
        const matchedCards = entry.triggersOn.filter(trig => userCardSet.has(trig));
        const scry = priceMap[entry.cardName.toLowerCase()] || { usd: entry.baselineUsd, tix: 0 };
        const liveUsd = scry.usd > 0 ? scry.usd : entry.baselineUsd;
        const liveTix = scry.tix || 0;
        const snipeCeiling = Math.max(0.99, liveUsd * 0.85).toFixed(2);
        const alreadyInDeck = userCardSet.has(entry.cardName.toLowerCase());

        return {
            ...entry,
            matchedCards,
            matchScore: matchedCards.length,
            liveUsd,
            liveTix,
            snipeCeiling,
            alreadyInDeck
        };
    }).sort((a, b) => b.matchScore - a.matchScore || b.liveUsd - a.liveUsd);

    const radarHtml = `
        <div style="background:#0b1120; border:1px solid #00ffcc; border-radius:8px; padding:14px; margin-bottom:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px solid #1e293b; padding-bottom:8px;">
                <div>
                    <span style="color:#00ffcc; font-weight:800; font-size:13px;">🔮 ALGORITHMIC METAGAME & SYNERGY RADAR</span>
                    <span style="margin-left:8px; font-size:11px; color:#94a3b8;">Trending Breakouts, Price Movers & Cross-Archetype Fits for Your Active Cards</span>
                </div>
                <span style="font-size:10px; background:#065f46; color:#10b981; padding:3px 8px; border-radius:4px; font-weight:700;">LIVE ORACLE + TREND ENGINE</span>
            </div>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(290px, 1fr)); gap:12px;">
                ${scoredRecommendations.map(rec => {
                    const isTrendingUp = rec.trendDir === "up";
                    const trendBadgeColor = isTrendingUp ? "#10b981" : "#38bdf8";
                    const trendLabel = isTrendingUp ? `📈 TRENDING UP (${rec.trendDeltaPct})` : `📉 DIP BUY WINDOW (${rec.trendDeltaPct})`;
                    const matchBanner = rec.matchedCards.length > 0
                        ? `<div style="background:rgba(16,185,129,0.14); border:1px solid #10b981; color:#10b981; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:700; margin-bottom:6px;">⚡ SYNERGY MATCH WITH YOUR LIST: ${rec.matchedCards.map(c => c.replace(/\b\w/g, l => l.toUpperCase())).join(", ")}</div>`
                        : `<div style="background:#070d17; border:1px solid #1e293b; color:#f59e0b; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:700; margin-bottom:6px;">🔥 HIGH-VELOCITY FORMAT MOVER</div>`;

                    const minRadarFloor = rec.liveUsd >= 8.0 ? Math.max(2.50, rec.liveUsd * 0.40).toFixed(2) : "0.99";
                    const exactQuery = encodeURIComponent(`MTG "${rec.cardName}" -proxy -proxies -playtest -fanart -alter -alters -altered -custom -placeholder -token`);
                    const ebaySnipeUrl = `https://www.ebay.com/sch/i.html?_nkw=${exactQuery}&_sacat=19107&LH_BIN=1&_sop=15&_udlo=${minRadarFloor}&_udhi=${rec.snipeCeiling}`;

                    return `
                        <div style="background:#070d17; border:1px solid ${rec.matchedCards.length > 0 ? "#10b981" : "#1e293b"}; border-radius:8px; padding:12px; display:flex; flex-direction:column; justify-content:space-between; gap:8px;">
                            <div>
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                                    <strong style="color:#38bdf8; font-size:14px;">${escapeHtml(rec.cardName)}</strong>
                                    <span style="font-size:10px; color:${trendBadgeColor}; background:#0b1120; border:1px solid ${trendBadgeColor}; padding:2px 6px; border-radius:4px; font-weight:800;">${trendLabel}</span>
                                </div>
                                ${matchBanner}
                                <div style="font-size:11px; color:#cbd5e1; line-height:1.4; margin-bottom:6px;">${escapeHtml(rec.whyTrending)}</div>
                                <div style="font-size:11px; color:#94a3b8; margin-bottom:4px;"><strong>Cross-Archetypes:</strong> ${rec.archetypes.map(a => `<span style="color:#eab308;">${escapeHtml(a)}</span>`).join(" • ")}</div>
                                <div style="font-size:10px; color:#64748b; margin-bottom:6px;">${rec.synergyTags.join("  ")}</div>
                                <div style="display:flex; justify-content:space-between; font-size:12px; padding-top:6px; border-top:1px solid #1e293b;">
                                    <span>Paper Floor: <strong style="color:#f59e0b;">$${rec.liveUsd.toFixed(2)}</strong> <span style="font-size:10px; color:#64748b;">(was $${rec.baselineUsd.toFixed(2)})</span></span>
                                    <span>MTGO: <strong style="color:#38bdf8;">${rec.liveTix.toFixed(2)} TIX</strong></span>
                                </div>
                            </div>
                            <div style="display:flex; gap:6px; margin-top:4px;">
                                <button class="add-radar-card-btn" data-card="${escapeHtml(rec.cardName)}" style="flex:1; background:${rec.alreadyInDeck ? "#1e293b" : "#10b981"}; color:${rec.alreadyInDeck ? "#94a3b8" : "#030712"}; border:none; padding:6px 8px; border-radius:4px; font-size:11px; font-weight:800; cursor:pointer;">
                                    ${rec.alreadyInDeck ? "✓ In Chase Hunt" : `🎯 + Chase Hunt ($${rec.liveUsd.toFixed(2)})`}
                                </button>
                                <a href="${ebaySnipeUrl}" target="_blank" style="flex:1; text-align:center; background:#1e293b; border:1px solid #f59e0b; color:#f59e0b; text-decoration:none; padding:6px 8px; border-radius:4px; font-size:11px; font-weight:700;"> Snipe BIN <$${rec.snipeCeiling} ↗
                                </a>
                            </div>
                        </div>
                    `;
                }).join("")}
            </div>
        </div>
    `;

    // Mount inside Chase Hunt (#tab-procurement) AND Meta Analytics (#tab-meta)
    [procTab, metaTab].forEach((tab, idx) => {
        if (!tab) return;
        const containerId = idx === 0 ? "chase-synergy-radar-box" : "meta-synergy-radar-box";
        let box = document.getElementById(containerId);
        if (!box) {
            box = document.createElement("div");
            box.id = containerId;
            tab.appendChild(box);
        }
        box.innerHTML = radarHtml;

        box.querySelectorAll(".add-radar-card-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const cName = btn.getAttribute("data-card");
                if (!cName) return;
                chrome.runtime.sendMessage({
                    action: "importDetectedToScout",
                    mode: "procurement_single",
                    cardName: cName
                }, () => {
                    syncAllPanels();
                });
            });
        });
    });
}

// 8. Wire #tab-meta Archetype Cards
function initMetaTracker() {
    const filterSelect = document.getElementById("meta-format-filter");
    const metaGrid = document.getElementById("meta-tracker-grid");
    if (!metaGrid) return;

    const sampleArchetypes = [
        { format: "commander", name: "Mill & Copy Superfriends (Astral Dragon / Doubling Season)", share: "14.2%", winrate: "56.8%", staples: ["1 Astral Dragon", "1 Doubling Season", "1 Rhystic Study", "1 Oath of Teferi", "1 Extravagant Replication", "1 Psychic Corrosion"] },
        { format: "standard", name: "Dimir Midrange", share: "18.4%", winrate: "55.2%", staples: ["4 Thoughtseize", "4 Go for the Throat", "2 Sheoldred, the Apocalypse"] },
        { format: "modern", name: "Dimir Murktide / Ring Control", share: "12.1%", winrate: "53.8%", staples: ["4 Thoughtseize", "4 Counterspell", "4 Orcish Bowmasters", "2 The One Ring"] },
        { format: "commander", name: "Liliana Graveyard Burn & Discard", share: "9.4%", winrate: "56.0%", staples: ["1 Thoughtseize", "1 Professor Onyx", "1 Inkshield", "1 Roaming Throne"] }
    ];

    function renderMeta() {
        const selected = (filterSelect ? filterSelect.value : "all").toLowerCase();
        const filtered = selected === "all" ? sampleArchetypes : sampleArchetypes.filter(a => a.format === selected);
        metaGrid.innerHTML = filtered.map((arch, idx) => `
            <div style="background:#0b1120; border:1px solid #1e293b; border-radius:8px; padding:14px; display:flex; flex-direction:column; gap:8px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong style="color:#38bdf8; font-size:14px;">${escapeHtml(arch.name)}</strong>
                    <span style="font-size:11px; color:#10b981; background:#1e293b; padding:2px 6px; border-radius:4px;">WR: ${arch.winrate}</span>
                </div>
                <div style="font-size:11px; color:#94a3b8;">Meta Share: <strong>${arch.share}</strong> | Format: <strong style="text-transform:uppercase;">${arch.format}</strong></div>
                <div style="font-size:11px; color:#cbd5e1; background:#070d17; padding:8px; border-radius:4px; font-family:monospace;">${arch.staples.join("<br>")}</div>
                <button class="load-meta-sample-btn" data-idx="${idx}" style="background:#10b981; color:#030712; border:none; padding:7px; border-radius:4px; font-size:11px; font-weight:800; cursor:pointer;">⚡ Load Staples into Chase Hunt</button>
            </div>
        `).join("");

        metaGrid.querySelectorAll(".load-meta-sample-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const arch = filtered[parseInt(btn.getAttribute("data-idx"), 10)];
                const decklistInput = document.getElementById("decklist-input");
                const deckNameInput = document.getElementById("deck-name-input");
                const saveBtn = document.getElementById("save-deck-btn");
                if (deckNameInput) deckNameInput.value = arch.name;
                if (decklistInput) decklistInput.value = arch.staples.join("\n");
                if (saveBtn) saveBtn.click();
            });
        });
    }

    if (filterSelect) filterSelect.addEventListener("change", renderMeta);
    renderMeta();
}

// 9. Armed / Disarmed Master Toggle
function initArmedToggle() {
    const sidebar = document.querySelector(".sidebar");
    if (!sidebar || document.getElementById("scout-armed-toggle")) return;

    const btn = document.createElement("button");
    btn.id = "scout-armed-toggle";
    btn.style.cssText = "width:100%; margin-bottom:14px; padding:8px 10px; border-radius:6px; font-size:11px; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:space-between; border:1px solid #10b981; background:rgba(16,185,129,0.12); color:#10b981;";

    function renderState(isArmed) {
        btn.style.borderColor = isArmed ? "#10b981" : "#475569";
        btn.style.background = isArmed ? "rgba(16,185,129,0.12)" : "#0b1120";
        btn.style.color = isArmed ? "#10b981" : "#94a3b8";
        btn.innerHTML = isArmed
            ? `<span>🟢 SCOUT ARMED</span><span style="font-size:9px; opacity:0.85;">AUTO-DETECT ON</span>`
            : `<span>⚪ DISARMED</span><span style="font-size:9px; opacity:0.85;">QUIET MODE</span>`;
    }

    chrome.storage.local.get({ scoutArmed: true }, (res) => {
        renderState(Boolean(res.scoutArmed));
    });

    btn.addEventListener("click", () => {
        chrome.storage.local.get({ scoutArmed: true }, (res) => {
            const nextState = !res.scoutArmed;
            chrome.storage.local.set({ scoutArmed: nextState }, () => {
                renderState(nextState);
            });
        });
    });

    const firstSection = sidebar.querySelector(".nav-section") || sidebar.firstElementChild?.nextSibling;
    sidebar.insertBefore(btn, firstSection);
}

// 10. Standalone Watermark (`mpsbanner1mb.png`) & $9 Lifetime Key Settings
function applyWatermarkState(isLicensed) {
    const wmSelectors = [".watermark", ".watermark-overlay", "#mp-watermark", ".support-banner", "#mp-support-banner"];
    wmSelectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
            el.style.display = isLicensed ? "none" : "";
        });
    });

    let wm = document.getElementById("mp-watermark");
    if (!wm && !document.querySelector(".watermark, .watermark-overlay")) {
        wm = document.createElement("div");
        wm.id = "mp-watermark";
        wm.style.cssText = "position:fixed; inset:0; pointer-events:none; z-index:0; display:flex; align-items:center; justify-content:center; opacity:0.08;";
        wm.innerHTML = `<img src="mpsbanner1mb.png" style="width:420px; max-width:60vw; filter:grayscale(20%);" alt="">`;
        document.body.appendChild(wm);
    }
    if (wm) wm.style.display = isLicensed ? "none" : "flex";

    let banner = document.getElementById("mp-support-banner");
    if (!banner && !document.querySelector(".support-banner")) {
        banner = document.createElement("div");
        banner.id = "mp-support-banner";
        banner.style.cssText = "position:fixed; bottom:0; left:0; right:0; z-index:999; background:rgba(3,7,18,0.95); border-top:1px solid #1e293b; padding:8px 16px; text-align:center; font-size:12px; color:#cbd5e1;";
        banner.innerHTML = `<strong>Alpha Build:</strong> Feel free to use the app! Snag a <a href="#" id="banner-key-link" style="color:#10b981; font-weight:700; text-decoration:underline;">$9 Lifetime Key</a> to remove the watermark and support an out-of-work solo developer building rad tools for all your TCG needs.`;
        document.body.appendChild(banner);
        const link = banner.querySelector("#banner-key-link");
        if (link) {
            link.addEventListener("click", (e) => {
                e.preventDefault();
                document.querySelectorAll(".tab-panel").forEach(p => p.classList.toggle("active", p.id === "tab-settings"));
            });
        }
    }
    if (banner) banner.style.display = isLicensed ? "none" : "block";
}

function initSettingsPanel() {
    const settingsPanel = document.getElementById("tab-settings");
    chrome.storage.local.get(["licenseKey", "licenseValid"], (res) => {
        const isLicensed = Boolean(res.licenseValid);
        const savedKey = res.licenseKey || "";

        applyWatermarkState(isLicensed);
        if (!settingsPanel) return;

        settingsPanel.innerHTML = `
            <div style="background:#0b1120; border:1px solid #1e293b; border-radius:8px; padding:18px; max-width:540px; display:flex; flex-direction:column; gap:14px; position:relative; z-index:2;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong style="color:#10b981; font-size:15px;">🔑 Mirror Pool Scout (Standalone) — Lifetime Key</strong>
                    <span style="font-size:11px; padding:3px 8px; border-radius:4px; font-weight:700; background:${isLicensed ? "#065f46" : "#1e293b"}; color:${isLicensed ? "#10b981" : "#f59e0b"};">
                        ${isLicensed ? "✅ WATERMARK REMOVED (LIFETIME)" : "💧 WATERMARKED ALPHA BUILD"}
                    </span>
                </div>
                <div style="font-size:12px; color:#94a3b8; line-height:1.5;">
                    All standalone features in <strong>Mirror Pool Scout</strong> are 100% unlocked. Enter your <strong>$9.00 Lifetime Key</strong> below to permanently remove the background watermark and bottom supporter banner.
                </div>
                <div style="display:flex; gap:8px;">
                    <input type="text" id="gumroad-key-input" value="${escapeHtml(savedKey)}" placeholder="Enter $9 Lifetime Key (e.g. MPSCOUT-XXXX-XXXX)" style="flex:1; background:#070d17; border:1px solid #334155; color:#f8fafc; padding:8px; border-radius:4px; font-size:12px;">
                    <button id="verify-key-btn" style="background:#10b981; color:#030712; border:none; padding:8px 14px; border-radius:4px; font-weight:700; font-size:12px; cursor:pointer;">${isLicensed ? "Update Key" : "Remove Watermark"}</button>
                </div>
                <div id="lic-status-msg" style="font-size:11px; color:#94a3b8;"></div>
                <hr style="border:none; border-top:1px solid #1e293b; margin:4px 0;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:12px; color:#cbd5e1;">Support solo development & strip the watermark:</span>
                    <a href="https://gumroad.com" target="_blank" style="background:#10b981; color:#030712; text-decoration:none; padding:6px 12px; border-radius:4px; font-size:12px; font-weight:700;">Snag $9 Lifetime Key ↗</a>
                </div>
            </div>
        `;

        const verifyBtn = document.getElementById("verify-key-btn");
        const keyInput = document.getElementById("gumroad-key-input");
        const statusMsg = document.getElementById("lic-status-msg");

        if (verifyBtn && keyInput) {
            verifyBtn.addEventListener("click", () => {
                const key = keyInput.value.trim();
                if (key.length >= 8) {
                    chrome.storage.local.set({ licenseKey: key, licenseValid: true }, () => {
                        applyWatermarkState(true);
                        initSettingsPanel();
                    });
                } else {
                    statusMsg.innerText = "Please enter your valid Gumroad Lifetime Key.";
                    statusMsg.style.color = "#ef4444";
                }
            });
        }
    });
}

chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "local") syncAllPanels();
});
