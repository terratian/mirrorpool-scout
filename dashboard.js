/* Mirror Pool Scout v1.2 - Proprietary Build - All Rights Reserved */
const TIX_TO_USD = 0.92;
let currentSortMode = "price-desc";
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
function syncAllPanels() {
chrome.storage.local.get(
["watchlist", "\x77\x61\x74\x63\x68\x6c\x69\x73\x74\x5f\x63\x61\x72\x64\x73", "\x63\x61\x72\x64\x5f\x63\x68\x61\x73\x65", "procurementTargets", "\x63\x75\x72\x72\x65\x6e\x74\x44\x65\x63\x6b\x6c\x69\x73\x74", "deckMeta", "savedChaseLists", "priceBaselineMap"],
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
function renderSavedListsToolbar(savedLists, activeDeckName) {
const procTab = document.getElementById("tab-procurement");
if (!procTab) return;
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
chrome.tabs.query({ url: ["*:/, "").trim() || "MTG Deck";
const ratioPct = idx === 0 ? pct : 0;
const prog = document.createElement("div");
prog.innerHTML = `
<div class="mp-deck-progress-track" title="${totalAcq} / ${totalReq} Cards Acquired (${ratioPct}%)">
<div class="mp-deck-progress-fill" style="width:${ratioPct}%;"></div>
</div>
<div class="mp-deck-quick-snipe">
<a class="mp-mini-pill" href="https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent("MTG " + deckTitle + " lot")}&LH_Auction=1&_sop=1" target="_blank" title="Snipe live eBay auctions">🎯 eBay Snipe</a>
<a class="mp-mini-pill" href="https://www.whatnot.com/search?query=${encodeURIComponent("MTG " + deckTitle)}&type=livestreams" target="_blank" title="Hunt live Whatnot streams">⚡ Whatnot</a>
<a class="mp-mini-pill" href="https://www.tcgplayer.com/massentry" target="_blank" title="Open TCGplayer Mass Entry">🛒 TCG Mass</a>
</div>
`;
card.appendChild(prog);
});
}
function bootEcosystemUI() {
ensureEcosystemRibbon();
hydrateTableRowsWithScryfall();
upgradeSidebarDeckCards();
let timer = null;
const obs = new MutationObserver(() => {
clearTimeout(timer);
timer = setTimeout(() => {
ensureEcosystemRibbon();
hydrateTableRowsWithScryfall();
upgradeSidebarDeckCards();
}, 180);
});
obs.observe(document.body, { childList: true, subtree: true });
}
if (document.readyState === "loading") {
document.addEventListener("DOMContentLoaded", bootEcosystemUI);
} else {
bootEcosystemUI();
}
})();
