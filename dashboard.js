document.addEventListener("DOMContentLoaded", () => {
// Navigation State
const navItems = document.querySelectorAll(".nav li");
const views = document.querySelectorAll(".view-section");
const viewTitle = document.getElementById("view-title");

navItems.forEach(item => {
item.addEventListener("click", (e) => {
  navItems.forEach(nav => nav.classList.remove("active"));
  e.target.classList.add("active");
  const targetId = e.target.getAttribute("data-target");
  viewTitle.innerText = e.target.innerText;
  views.forEach(view => {
    view.style.display = view.id === `view-${targetId}` ? (targetId === "watchlist" || targetId === "meta" ? "grid" : "block") : "none";
  });
  if(targetId === "watchlist") loadWatchlist();
  if(targetId === "hunter") loadDeckManager();
});
});

// Watchlist Rendering
function loadWatchlist() {
const watchlistArea = document.getElementById("view-watchlist");
if(!watchlistArea) return;
chrome.storage.local.get({ watchlist: [] }, (res) => {
  watchlistArea.innerHTML = "";
  res.watchlist.forEach((card, index) => {
    const cardDiv = document.createElement("div");
    cardDiv.className = "dash-card";
    cardDiv.style.border = card.pivotAlert ? "1px solid #da3633" : "1px solid #30363d";
    cardDiv.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <a href="${card.url}" target="_blank" class="card-title" style="color:#00ffcc; font-size:14px; text-decoration:none;">${card.title}</a>
        <div style="font-size:11px; font-weight:bold; color:#eab308; background:#21262d; padding:2px 6px; border-radius:4px; white-space:nowrap;">⏱ ${card.timeLeft || "Ending Soon"}</div>
      </div>
      ${card.pivotAlert ? `<div style="background:#da3633; color:#fff; font-weight:bold; font-size:10px; padding:6px; text-align:center; border-radius:4px; margin-top:10px;">🚨 PIVOT REQUIRED: BID EXCEEDS MARKET FLOOR</div>` : ``}
      <div class="card-metrics" style="margin-top:15px; flex-direction:column; gap:6px; background:#0d1117; padding:10px; border-radius:4px;">
        <div style="display:flex; justify-content:space-between;">
          <span style="color:#8b949e;">Market Floor:</span> <span style="color:#eab308; font-weight:bold;">$${card.marketFloor || "--"}</span>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span style="color:#8b949e;">Current eBay Cost:</span> <span style="color:#fff; font-weight:bold;">$${card.price}</span>
        </div>
        <div style="display:flex; justify-content:space-between; border-top:1px solid #30363d; margin-top:4px; padding-top:4px;">
          <span style="color:#8b949e;">Auction Activity:</span> <span style="color:#3fb950; font-weight:bold;">${card.bidders || 0} Bidders / ${card.watchers || 0} Watchers</span>
        </div>
      </div>
      <button class="remove-btn" data-index="${index}" style="background:none; border:1px solid #da3633; color:#da3633; padding:6px; border-radius:4px; cursor:pointer; font-size:11px; margin-top:15px; width:100%; font-weight:bold; transition: background 0.2s;">✖ Drop Target</button>
    `;
    watchlistArea.appendChild(cardDiv);
  });
  document.querySelectorAll(".remove-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const idx = e.target.getAttribute("data-index");
      res.watchlist.splice(idx, 1);
      chrome.storage.local.set({ watchlist: res.watchlist }, loadWatchlist);
    });
  });
});
}

// Procurement Hunter State Management
let currentDecklists = [];
let activeDeckId = null;

const deckSelect = document.getElementById("deck-select");
const deckNameInput = document.getElementById("deck-name");
const prefPrinting = document.getElementById("pref-printing");
const prefCondition = document.getElementById("pref-condition");
const deckTextArea = document.getElementById("deck-import-area");
const btnParseDeck = document.getElementById("btn-parse-deck");
const btnDeleteDeck = document.getElementById("btn-delete-deck");
const hunterResults = document.getElementById("hunter-results");
const saveStatus = document.getElementById("deck-save-status");

function generateId() { return 'deck-' + Math.random().toString(36).substr(2, 9); }

function loadDeckManager() {
chrome.storage.local.get({ decklists: [], activeDeckId: null }, (res) => {
  currentDecklists = res.decklists;
  activeDeckId = res.activeDeckId;
  refreshDeckDropdown();
  if(activeDeckId) {
    selectDeck(activeDeckId);
  } else {
    clearDeckForm();
  }
});
}

function refreshDeckDropdown() {
deckSelect.innerHTML = '<option value="new">+ Create New Registry</option>';
currentDecklists.forEach(deck => {
  const opt = document.createElement("option");
  opt.value = deck.id;
  opt.innerText = deck.name;
  deckSelect.appendChild(opt);
});
if (activeDeckId) deckSelect.value = activeDeckId;
}

function clearDeckForm() {
activeDeckId = null;
deckSelect.value = "new";
deckNameInput.value = "";
deckTextArea.value = "";
prefPrinting.value = "Normal";
prefCondition.value = "Any";
hunterResults.innerHTML = "";
saveStatus.innerText = "";
updateFinancialSummary(null);
}

function selectDeck(id) {
if (id === "new") {
  clearDeckForm();
  return;
}
const deck = currentDecklists.find(d => d.id === id);
if (!deck) return;
activeDeckId = deck.id;
deckNameInput.value = deck.name;
deckTextArea.value = deck.rawText;
prefPrinting.value = deck.prefs?.printing || "Normal";
prefCondition.value = deck.prefs?.condition || "Any";
chrome.storage.local.set({ activeDeckId: id });
renderProcurementSheet(deck);
}

if (deckSelect) deckSelect.addEventListener("change", (e) => selectDeck(e.target.value));

if (btnDeleteDeck) {
btnDeleteDeck.addEventListener("click", () => {
  if(!activeDeckId) return;
  currentDecklists = currentDecklists.filter(d => d.id !== activeDeckId);
  chrome.storage.local.set({ decklists: currentDecklists, activeDeckId: null }, () => {
    loadDeckManager();
  });
});
}

function updateFinancialSummary(deck) {
const marketTotalEl = document.getElementById("stat-market-total");
const spentTotalEl = document.getElementById("stat-spent-total");
const varianceEl = document.getElementById("stat-variance");
if (!marketTotalEl) return;

if (!deck || !deck.marketData) {
  marketTotalEl.innerText = "$0.00";
  spentTotalEl.innerText = "$0.00";
  varianceEl.innerText = "$0.00";
  return;
}

let estMarketTotal = 0;
let actualSpentTotal = 0;

deck.marketData.forEach(card => {
  const cardKey = card.name.toLowerCase();
  const state = deck.acquisitionState[cardKey] || { target: 1, acquired: 0, pricesPaid: [] };
  const usdPrice = parseFloat(card.prices.usd || card.prices.usd_foil || 0);
  
  estMarketTotal += usdPrice * state.target;
  if (Array.isArray(state.pricesPaid)) {
    actualSpentTotal += state.pricesPaid.reduce((acc, curr) => acc + parseFloat(curr || 0), 0);
  }
});

const netVariance = estMarketTotal - actualSpentTotal;
marketTotalEl.innerText = `$${estMarketTotal.toFixed(2)}`;
spentTotalEl.innerText = `$${actualSpentTotal.toFixed(2)}`;
varianceEl.innerText = `${netVariance >= 0 ? '+' : ''}$${netVariance.toFixed(2)}`;
varianceEl.style.color = netVariance >= 0 ? "#3fb950" : "#da3633";
}

if (btnParseDeck) {
btnParseDeck.addEventListener("click", async () => {
  const rawText = deckTextArea.value.trim();
  if (!rawText) return;

  let deckName = deckNameInput.value.trim() || "Untitled List";
  const prefs = { printing: prefPrinting.value, condition: prefCondition.value };

  let deck = currentDecklists.find(d => d.id === activeDeckId);
  if (!deck) {
    deck = { id: generateId(), acquisitionState: {} };
    currentDecklists.push(deck);
    activeDeckId = deck.id;
  }

  deck.name = deckName;
  deck.rawText = rawText;
  deck.prefs = prefs;

  const lines = rawText.split('\n');
  const identifiers = [];
  
  lines.forEach(line => {
    const match = line.match(/^(?:(\d+)x?\s+)?([^\(\n]+)/);
    if (match && match[2] && !line.toLowerCase().startsWith('deck') && !line.toLowerCase().startsWith('sideboard')) {
      const qty = parseInt(match[1]) || 1;
      const name = match[2].trim();
      identifiers.push({ name: name });
      if (!deck.acquisitionState[name.toLowerCase()]) {
        deck.acquisitionState[name.toLowerCase()] = { target: qty, acquired: 0, pricesPaid: [] };
      } else {
        deck.acquisitionState[name.toLowerCase()].target = qty;
      }
    }
  });

  chrome.storage.local.set({ decklists: currentDecklists, activeDeckId: deck.id }, () => {
    refreshDeckDropdown();
    saveStatus.innerText = "✓ Registry Saved";
    setTimeout(() => saveStatus.innerText = "", 3000);
  });

  if (identifiers.length === 0) return;
  btnParseDeck.innerText = "Querying Market APIs...";
  btnParseDeck.disabled = true;
  
  const batch = identifiers.slice(0, 75);
  try {
    const response = await fetch('https://api.scryfall.com/cards/collection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifiers: batch })
    });
    const data = await response.json();
    deck.marketData = data.data;
    renderProcurementSheet(deck);
    chrome.storage.local.set({ decklists: currentDecklists });
  } catch (e) {
    hunterResults.innerHTML = `<div style="color:#da3633; width:100%;">Error querying APIs. Validate list formatting.</div>`;
  }
  btnParseDeck.innerText = "⚡ Compile Procurement Sheet";
  btnParseDeck.disabled = false;
});
}

function renderProcurementSheet(deck) {
if(!hunterResults) return;
hunterResults.innerHTML = "";
if(!deck.marketData) return;

updateFinancialSummary(deck);

deck.marketData.forEach((card, idx) => {
  const cardKey = card.name.toLowerCase();
  const state = deck.acquisitionState[cardKey] || { target: 1, acquired: 0, pricesPaid: [] };
  const usd = card.prices.usd || card.prices.usd_foil || "0.00";
  const cleanName = encodeURIComponent(card.name);
  
  let tcgUrl = `https://www.tcgplayer.com/search/magic/product?productLineName=magic&q=${cleanName}&view=grid&Order=price_asc`;
  if (deck.prefs?.printing === "Foil") tcgUrl += "&Printing=Foil";
  if (deck.prefs?.printing === "Normal") tcgUrl += "&Printing=Normal";
  if (deck.prefs?.condition && deck.prefs.condition !== "Any") {
    tcgUrl += "&Condition=" + encodeURIComponent(deck.prefs.condition);
  }
  
  const ebayBinUrl = `https://www.ebay.com/sch/i.html?_nkw=${cleanName}&_sop=15&LH_BIN=1`;
  const ebayAuctionUrl = `https://www.ebay.com/sch/i.html?_nkw=${cleanName}&_sop=1&LH_Auction=1`;
  const isComplete = state.acquired >= state.target;

  const pricesHtml = (state.pricesPaid || []).map((p, i) => `<span style="background:#21262d; padding:2px 5px; border-radius:3px; font-size:10px; margin-right:4px;">#${i+1}: $${p}</span>`).join('');

  const cardHtml = `
    <div class="dash-card" id="hunter-card-${idx}" style="border: 1px solid ${isComplete ? '#238636' : '#30363d'}">
      <div>
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div class="card-title" style="color:#00ffcc;">${card.name}</div>
          <div style="font-size:11px; font-weight:bold; color:#8b949e; background:#21262d; padding:2px 6px; border-radius:4px;">Target: x${state.target}</div>
        </div>
        
        <div class="card-metrics" style="margin-top:10px; flex-direction:column; gap:5px;">
          <div style="display:flex; justify-content:space-between;">
            <span style="color:#8b949e;">Market Floor:</span> <span style="color:#eab308;">$${usd}</span>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span style="color:#8b949e;">Inventory Status:</span> 
            <span style="color:${isComplete ? '#3fb950' : '#c9d1d9'}; font-weight:bold;" id="status-${idx}">${state.acquired} / ${state.target} Acquired</span>
          </div>
        </div>

        <div style="background:#0d1117; padding:8px; border-radius:4px; margin-top:10px; display:flex; gap:6px; align-items:center;">
          <input type="number" step="0.01" placeholder="Paid ($)" id="input-paid-${idx}" style="width:70px; background:#21262d; border:1px solid #30363d; color:#fff; padding:6px; border-radius:3px; font-size:11px;" ${isComplete ? 'disabled' : ''}>
          <button class="btn-acquire" data-index="${idx}" data-key="${cardKey}" ${isComplete ? 'disabled' : ''} style="flex:1; background:#238636; border:none; color:#fff; font-size:11px; padding:6px; border-radius:3px; cursor:pointer; font-weight:bold;">${isComplete ? '✓ Locked' : '+ Log Basis'}</button>
        </div>
        
        <div id="logged-prices-${idx}" style="margin-top:8px; min-height:16px;">${pricesHtml}</div>
      </div>

      <div style="display:flex; gap:6px; margin-top:15px; flex-direction:column;">
        <a href="${tcgUrl}" target="_blank" style="background:#21262d; border:1px solid #30363d; color:#c9d1d9; text-decoration:none; padding:8px; font-size:11px; text-align:center; border-radius:4px;">TCG Lowest Floor (Filtered)</a>
        <div style="display:flex; gap:6px;">
          <a href="${ebayBinUrl}" target="_blank" style="flex:1; background:#21262d; border:1px solid #30363d; color:#00ffcc; text-decoration:none; padding:8px 4px; font-size:10px; text-align:center; border-radius:4px;">eBay Low BIN</a>
          <a href="${ebayAuctionUrl}" target="_blank" style="flex:1; background:rgba(234,179,8,0.1); border:1px solid #eab308; color:#eab308; text-decoration:none; padding:8px 4px; font-size:10px; text-align:center; border-radius:4px;">eBay Auctions</a>
        </div>
      </div>
    </div>
  `;
  hunterResults.insertAdjacentHTML('beforeend', cardHtml);
});

document.querySelectorAll(".btn-acquire").forEach(btn => {
  btn.addEventListener("click", (e) => {
    const cardKey = e.target.getAttribute("data-key");
    const idx = e.target.getAttribute("data-index");
    const paidInput = document.getElementById(`input-paid-${idx}`);
    const deck = currentDecklists.find(d => d.id === activeDeckId);
    
    let state = deck.acquisitionState[cardKey];
    if (!state.pricesPaid) state.pricesPaid = [];
    
    if (state.acquired < state.target) {
      const cost = parseFloat(paidInput.value) || 0;
      state.acquired += 1;
      state.pricesPaid.push(cost.toFixed(2));
      paidInput.value = "";

      chrome.storage.local.set({ decklists: currentDecklists }, () => {
        document.getElementById(`status-${idx}`).innerText = `${state.acquired} / ${state.target} Acquired`;
        
        const pricesContainer = document.getElementById(`logged-prices-${idx}`);
        pricesContainer.innerHTML = state.pricesPaid.map((p, i) => `<span style="background:#21262d; padding:2px 5px; border-radius:3px; font-size:10px; margin-right:4px;">#${i+1}: $${p}</span>`).join('');
        
        updateFinancialSummary(deck);

        if (state.acquired >= state.target) {
          document.getElementById(`status-${idx}`).style.color = "#3fb950";
          document.getElementById(`hunter-card-${idx}`).style.borderColor = "#238636";
          e.target.disabled = true;
          e.target.innerText = "✓ Locked";
          paidInput.disabled = true;
        }
      });
    }
  });
});
}

// Meta Analytics Fetcher
const metaFormatSelect = document.getElementById("meta-format-select");
const metaResultsContainer = document.getElementById("meta-results-container");

async function fetchMetaDecks(format) {
if(!metaResultsContainer) return;
metaResultsContainer.innerHTML = '<div style="color:#8b949e; grid-column: 1 / -1;">Establishing secure connection to mtgdecks.net...</div>';
try {
  const res = await fetch(`https://mtgdecks.net/${format}`);
  const html = await res.text();
  const doc = new DOMParser().parseFromString(html, "text/html");
  const rows = Array.from(doc.querySelectorAll('table tbody tr')).slice(0, 12);
  
  metaResultsContainer.innerHTML = "";
  if (rows.length === 0) {
      metaResultsContainer.innerHTML = '<div style="color:#da3633; grid-column: 1 / -1;">Could not parse layout.</div>';
      return;
  }
  rows.forEach(row => {
    const nameLink = row.querySelector('a');
    if (!nameLink) return;
    const deckName = nameLink.innerText.trim();
    if(deckName.length < 3) return; 
    
    // BUG FIX: Secure URL string parser handles relative vs absolute links safely
    const rawHref = nameLink.getAttribute('href');
    const deckUrl = rawHref.startsWith('http') ? rawHref : new URL(rawHref, 'https://mtgdecks.net').href;
    
    const rowText = row.innerText;
    const winRateMatch = rowText.match(/(\d+\.?\d*)%/);
    const winRate = winRateMatch ? winRateMatch[0] : "--%";
    
    // FEATURE ADD: Scrape aggregate Paper Cost from the row data
    const priceMatch = rowText.match(/\$\s?([0-9,]+(\.\d{2})?)/);
    const paperCost = priceMatch ? `$${priceMatch[1]}` : "N/A";
    
    const cardHtml = `
      <div class="dash-card">
        <div class="card-title" style="color:#eab308; font-size:15px; margin-bottom:10px;">${deckName}</div>
        <div class="card-metrics" style="margin-bottom:15px; flex-direction:column; gap:5px;">
          <div style="display:flex; justify-content:space-between;">
            <span style="color:#8b949e;">Format Meta:</span> <span style="color:#fff;">${format}</span>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span style="color:#8b949e;">Meta Share:</span> <span style="color:#3fb950; font-weight:bold;">${winRate}</span>
          </div>
          <div style="display:flex; justify-content:space-between; border-top: 1px solid #30363d; padding-top: 5px; margin-top: 5px;">
            <span style="color:#8b949e;">Est. Paper Cost:</span> <span style="color:#00ffcc; font-weight:bold;">${paperCost}</span>
          </div>
        </div>
        <button class="btn-native-import" data-url="${deckUrl}" data-name="${deckName}" style="width:100%; background:rgba(0,255,204,0.05); border:1px solid #00ffcc; color:#00ffcc; padding:8px; font-size:11px; border-radius:4px; font-weight:bold; cursor:pointer;">⚡ Import Decklist <a href="${deckUrl}" target="_blank" style="background:#21262d; border:1px solid #30363d; color:#c9d1d9; text-decoration:none; padding:8px; font-size:11px; text-align:center; border-radius:4px; font-weight:bold; display:block;">Inspect Archetype Source</a> Price Sheet</button>
      </div>
    `;
    metaResultsContainer.insertAdjacentHTML('beforeend', cardHtml);
  });
} catch (e) {
  metaResultsContainer.innerHTML = `<div style="color:#da3633; grid-column: 1 / -1;">Error retrieving meta data.</div>`;
}
}

if (metaFormatSelect) {
metaFormatSelect.addEventListener("change", (e) => fetchMetaDecks(e.target.value));
const metaTab = document.querySelector('[data-target="meta"]');
if(metaTab) {
  metaTab.addEventListener("click", () => {
    if(metaResultsContainer.innerHTML.trim() === "") fetchMetaDecks(metaFormatSelect.value);
  });
}
}
});

// Bulk Manifest Generator & Clipboard Exporter
function generateBulkManifest(deck) {
if (!deck || !deck.acquisitionState) return "";

let manifestLines = [];
Object.keys(deck.acquisitionState).forEach(cardKey => {
const state = deck.acquisitionState[cardKey];
const needed = state.target - (state.acquired || 0);
if (needed > 0) {
  const cardMeta = deck.marketData?.find(c => c.name.toLowerCase() === cardKey);
  const cardName = cardMeta ? cardMeta.name : cardKey;
  manifestLines.push(`${needed} ${cardName}`);
}
});

return manifestLines.join("\n");
}

// Placeholder function for license verification
function verifyLifetimeLicense(isValid) {
    if (isValid) {
        const watermark = document.getElementById('license-watermark');
        if (watermark) watermark.style.display = 'none';
        // Save state to chrome.storage.local here later
    }
}
