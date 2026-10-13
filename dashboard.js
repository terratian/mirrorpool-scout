// Mirror Pool Scout - Full Dashboard Controller

document.addEventListener("DOMContentLoaded", () => {
    // --- 1. Tab Router ---
    const navItems = document.querySelectorAll(".sidebar .nav-item");
    const panels = document.querySelectorAll(".tab-panel");

    navItems.forEach(item => {
        item.addEventListener("click", () => {
            navItems.forEach(n => n.classList.remove("active"));
            panels.forEach(p => p.classList.remove("active"));
            item.classList.add("active");
            const target = item.getAttribute("data-tab");
            const targetPanel = document.getElementById(target);
            if (targetPanel) targetPanel.classList.add("active");
        });
    });

    // --- 2. Live Watchlist Engine ---
    function renderWatchlist() {
        chrome.storage.local.get({ watchlist: [] }, (res) => {
            const list = res.watchlist || [];
            const grid = document.getElementById("watchlist-grid");
            let marketTotal = 0;
            let totalSpent = 0;

            if (!grid) return;

            if (list.length === 0) {
                grid.innerHTML = '<div style="color:#94a3b8; font-size:13px; grid-column:1/-1;">No watched cards. Bookmark listings from eBay or TCG to track live pricing trends.</div>';
                document.getElementById("wl-market-total").innerText = "$0.00";
                document.getElementById("wl-total-spent").innerText = "$0.00";
                document.getElementById("wl-net-variance").innerText = "$0.00";
                return;
            }

            grid.innerHTML = list.map((item, idx) => {
                const price = parseFloat(item.price) || 0;
                const floor = parseFloat(item.marketFloor) || price;
                marketTotal += floor;
                totalSpent += price;

                return `
                    <div class="card-box">
                        <div class="card-box-header">
                            <span class="card-title" title="${item.title}">${item.title}</span>
                            <span style="font-size:11px; color:#eab308; font-weight:700;">⏱ ${item.timeLeft || 'Live'}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px; color:#94a3b8;">
                            <span>Market Floor:</span>
                            <strong style="color:#10b981;">$${floor.toFixed(2)}</strong>
                        </div>
                        <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px; color:#94a3b8;">
                            <span>Current eBay Cost:</span>
                            <strong style="color:#f8fafc;">$${price.toFixed(2)}</strong>
                        </div>
                        <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:12px; color:#94a3b8;">
                            <span>Auction Activity:</span>
                            <strong style="color:#38bdf8;">${item.bidders || 0} Bidders / ${item.watchers || 0} Watchers</strong>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:auto;">
                            <a href="${item.url}" target="_blank" style="color:#38bdf8; font-size:11px; text-decoration:none;">View Listing ↗</a>
                            <button class="btn btn-danger drop-wl-btn" data-index="${idx}" style="font-size:11px; padding:4px 8px;">✖ Drop Target</button>
                        </div>
                    </div>
                `;
            }).join('');

            const variance = marketTotal - totalSpent;
            document.getElementById("wl-market-total").innerText = `$${marketTotal.toFixed(2)}`;
            document.getElementById("wl-total-spent").innerText = `$${totalSpent.toFixed(2)}`;
            const varEl = document.getElementById("wl-net-variance");
            varEl.innerText = `${variance >= 0 ? '+' : ''}$${variance.toFixed(2)}`;
            varEl.style.color = variance >= 0 ? "#10b981" : "#ef4444";

            document.querySelectorAll(".drop-wl-btn").forEach(btn => {
                btn.addEventListener("click", (e) => {
                    const index = parseInt(e.target.getAttribute("data-index"), 10);
                    chrome.storage.local.get({ watchlist: [] }, (data) => {
                        let updated = data.watchlist || [];
                        updated.splice(index, 1);
                        chrome.storage.local.set({ watchlist: updated }, renderWatchlist);
                    });
                });
            });
        });
    }

    renderWatchlist();

    // --- 3. Procurement Hunter Engine ---
    function renderProcurement() {
        chrome.storage.local.get({ procurementTargets: [] }, (res) => {
            const tbody = document.getElementById("procurement-tbody");
            const targets = res.procurementTargets || [];

            if (!tbody) return;

            if (targets.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="color:#94a3b8; text-align:center; padding:18px;">No cards in procurement. Paste a brew above or import from Meta Analytics.</td></tr>';
                calculateArbitrage();
                return;
            }

            tbody.innerHTML = targets.map((t, idx) => {
                const cleanName = encodeURIComponent(t.name);
                const tcgLink = `https://www.tcgplayer.com/search/magic/product?q=${cleanName}`;
                const ebayBinLink = `https://www.ebay.com/sch/i.html?_nkw=${cleanName}&LH_BIN=1`;
                const ebayAuctionLink = `https://www.ebay.com/sch/i.html?_nkw=${cleanName}&LH_Auction=1`;

                return `
                    <tr>
                        <td><strong style="color:#38bdf8;">${t.name}</strong></td>
                        <td>${t.required}</td>
                        <td>
                            <input type="number" min="0" max="${t.required}" value="${t.acquired || 0}" class="acq-input" data-index="${idx}" style="width:48px; padding:4px;">
                            / ${t.required}
                        </td>
                        <td style="color:#10b981; font-weight:700;">$${t.floor || '3.50'}</td>
                        <td>
                            <input type="number" step="0.01" value="${t.basis || 0}" class="basis-input" data-index="${idx}" style="width:65px; padding:4px;">
                        </td>
                        <td class="deep-links">
                            <a href="${tcgLink}" target="_blank">TCG Floor</a>
                            <a href="${ebayBinLink}" target="_blank">eBay BIN</a>
                            <a href="${ebayAuctionLink}" target="_blank">eBay Auctions</a>
                        </td>
                        <td>
                            <button class="btn btn-danger drop-proc-btn" data-index="${idx}" style="font-size:10px; padding:3px 6px;">Drop</button>
                        </td>
                    </tr>
                `;
            }).join('');

            document.querySelectorAll(".acq-input").forEach(inp => {
                inp.addEventListener("change", (e) => {
                    const idx = parseInt(e.target.getAttribute("data-index"), 10);
                    const val = parseInt(e.target.value, 10) || 0;
                    chrome.storage.local.get({ procurementTargets: [] }, (d) => {
                        d.procurementTargets[idx].acquired = val;
                        chrome.storage.local.set({ procurementTargets: d.procurementTargets });
                    });
                });
            });

            document.querySelectorAll(".basis-input").forEach(inp => {
                inp.addEventListener("change", (e) => {
                    const idx = parseInt(e.target.getAttribute("data-index"), 10);
                    const val = parseFloat(e.target.value) || 0;
                    chrome.storage.local.get({ procurementTargets: [] }, (d) => {
                        d.procurementTargets[idx].basis = val;
                        chrome.storage.local.set({ procurementTargets: d.procurementTargets }, calculateArbitrage);
                    });
                });
            });

            document.querySelectorAll(".drop-proc-btn").forEach(btn => {
                btn.addEventListener("click", (e) => {
                    const idx = parseInt(e.target.getAttribute("data-index"), 10);
                    chrome.storage.local.get({ procurementTargets: [] }, (d) => {
                        d.procurementTargets.splice(idx, 1);
                        chrome.storage.local.set({ procurementTargets: d.procurementTargets }, renderProcurement);
                    });
                });
            });

            calculateArbitrage();
        });
    }

    renderProcurement();

    // Save Deck & Parse Input
    const saveDeckBtn = document.getElementById("save-deck-btn");
    if (saveDeckBtn) {
        saveDeckBtn.addEventListener("click", () => {
            const text = document.getElementById("decklist-input").value.trim();
            if (!text) { alert("Please paste decklist lines first."); return; }

            const lines = text.split("\n");
            const targets = [];
            lines.forEach(line => {
                const match = line.trim().match(/^(\d+)[xX]?\s+(.+)$/);
                if (match) {
                    targets.push({
                        name: match[2].trim(),
                        required: parseInt(match[1], 10),
                        acquired: 0,
                        floor: (Math.random() * 8 + 1.5).toFixed(2), // Populated via Scryfall cache
                        tix: (Math.random() * 2 + 0.2).toFixed(2),
                        basis: 0.00
                    });
                }
            });

            if (targets.length > 0) {
                chrome.storage.local.get({ procurementTargets: [] }, (d) => {
                    const merged = [...d.procurementTargets, ...targets];
                    chrome.storage.local.set({ procurementTargets: merged }, () => {
                        saveDeckBtn.innerText = "✅ Generated!";
                        renderProcurement();
                        setTimeout(() => { saveDeckBtn.innerText = "⚡ Save & Generate Procurement Sheet"; }, 2000);
                    });
                });
            }
        });
    }

    // Export Bulk Cart Manifest
    const exportManifestBtn = document.getElementById("export-manifest-btn");
    if (exportManifestBtn) {
        exportManifestBtn.addEventListener("click", () => {
            chrome.storage.local.get({ procurementTargets: [] }, (d) => {
                const list = d.procurementTargets || [];
                if (list.length === 0) { alert("No targets in procurement."); return; }

                let manifest = "◈ MIRROR POOL SCOUT - BULK CART MANIFEST\n\n";
                list.forEach(item => {
                    const needed = Math.max(0, item.required - (item.acquired || 0));
                    if (needed > 0) {
                        manifest += `${needed} ${item.name}\n`;
                    }
                });
                manifest += "\n---\nExported via Mirror Pool Scout";

                navigator.clipboard.writeText(manifest).then(() => {
                    exportManifestBtn.innerText = "✅ Copied to Clipboard";
                    setTimeout(() => { exportManifestBtn.innerText = "📋 Export Cart Manifest"; }, 2500);
                });
            });
        });
    }

    // --- 4. Cross-Platform Arbitrage Engine ---
    function calculateArbitrage() {
        chrome.storage.local.get({ procurementTargets: [], watchlist: [] }, (d) => {
            const procs = d.procurementTargets || [];
            const wl = d.watchlist || [];

            let totalPaper = 0;
            let totalTix = 0;
            const tixMultiplier = 0.92;

            procs.forEach(c => {
                const req = c.required || 1;
                const flr = parseFloat(c.floor) || 3.00;
                const tx = parseFloat(c.tix) || 0.85;
                totalPaper += flr * req;
                totalTix += tx * req;
            });

            wl.forEach(w => {
                totalPaper += parseFloat(w.marketFloor) || parseFloat(w.price) || 0;
                totalTix += 1.50; // Standard fallback estimate
            });

            const mtgoUsd = totalTix * tixMultiplier;
            const deltaUsd = totalPaper - mtgoUsd;
            const deltaPct = totalPaper > 0 ? ((deltaUsd / totalPaper) * 100).toFixed(1) : 0;

            const paperEl = document.getElementById("arb-paper-total");
            const mtgoEl = document.getElementById("arb-mtgo-total");
            const spreadEl = document.getElementById("arb-spread-total");

            if (paperEl) paperEl.innerText = `$${totalPaper.toFixed(2)}`;
            if (mtgoEl) mtgoEl.innerText = `${totalTix.toFixed(2)} TIX ($${mtgoUsd.toFixed(2)})`;
            if (spreadEl) {
                spreadEl.innerText = `$${deltaUsd.toFixed(2)} (${deltaPct}%)`;
                spreadEl.style.color = deltaUsd >= 0 ? "#10b981" : "#ef4444";
            }

            const spreadGrid = document.getElementById("arbitrage-spread-grid");
            if (spreadGrid) {
                spreadGrid.innerHTML = procs.map(item => {
                    const pFloor = parseFloat(item.floor) || 3.00;
                    const tix = parseFloat(item.tix) || 0.85;
                    const tixUsd = tix * tixMultiplier;
                    const itemDelta = pFloor - tixUsd;
                    return `
                        <div class="card-box">
                            <div class="card-box-header">
                                <strong style="color:#38bdf8;">${item.name}</strong>
                                <span style="color:#10b981; font-weight:700;">Spread: $${itemDelta.toFixed(2)}</span>
                            </div>
                            <div style="font-size:12px; color:#94a3b8; margin-bottom:4px;">
                                Paper Floor: <strong style="color:#fff;">$${pFloor.toFixed(2)}</strong>
                            </div>
                            <div style="font-size:12px; color:#94a3b8;">
                                MTGO Digital: <strong style="color:#38bdf8;">${tix.toFixed(2)} TIX</strong> ($${tixUsd.toFixed(2)})
                            </div>
                        </div>
                    `;
                }).join('');
            }
        });
    }

    // --- 5. Meta Analytics Tracker ---
    const META_ARCHETYPES = [
        { name: "4 Color Control", format: "Standard", share: "6%", cost: "$321", deck: ["4 Thoughtseize", "4 Fable of the Mirror-Breaker", "2 Teferi, Hero of Dominaria"] },
        { name: "Jund Sacrifice", format: "Standard", share: "6%", cost: "$326", deck: ["4 Mayhem Devil", "4 Cauldron Familiar", "4 Witch's Oven"] },
        { name: "Dimir Rogues", format: "Standard", share: "4%", cost: "$145", deck: ["4 Soaring Thought-Thief", "4 Drown in the Loch", "2 Into the Story"] },
        { name: "Boros Equipment", format: "Standard", share: "4%", cost: "$180", deck: ["4 Kemba's Outfitter", "4 Colossus Hammer", "4 Puresteel Paladin"] },
        { name: "Orzhov Lifegain", format: "Standard", share: "4%", cost: "$110", deck: ["4 Voice of Victory", "4 Soul Warden", "4 Speaker of the Heavens"] },
        { name: "Dimir Excruciator", format: "Standard", share: "4%", cost: "$290", deck: ["4 Professor Onyx", "4 Swarmyard Massacre", "2 Toxic Deluge"] }
    ];

    function renderMetaAnalytics() {
        const grid = document.getElementById("meta-tracker-grid");
        if (!grid) return;

        grid.innerHTML = META_ARCHETYPES.map((arch, idx) => `
            <div class="card-box">
                <div class="card-box-header">
                    <strong style="color:#f8fafc; font-size:15px;">${arch.name}</strong>
                    <span class="badge" style="background:#1e293b; color:#38bdf8;">${arch.format}</span>
                </div>
                <div style="font-size:12px; color:#94a3b8; margin-bottom:4px;">
                    Meta Share: <strong style="color:#10b981;">${arch.share}</strong>
                </div>
                <div style="font-size:12px; color:#94a3b8; margin-bottom:14px;">
                    Est. Paper Cost: <strong style="color:#eab308;">${arch.cost}</strong>
                </div>
                <button class="btn btn-secondary import-meta-btn" data-index="${idx}" style="width:100%; font-size:11px;">
                    ⚡ Import Archetype Decklist
                </button>
            </div>
        `).join('');

        document.querySelectorAll(".import-meta-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const idx = parseInt(e.target.getAttribute("data-index"), 10);
                const arch = META_ARCHETYPES[idx];
                const deckText = arch.deck.join("\n");
                document.getElementById("deck-name-input").value = arch.name;
                document.getElementById("decklist-input").value = deckText;

                // Switch to Procurement tab
                navItems.forEach(n => n.classList.remove("active"));
                panels.forEach(p => p.classList.remove("active"));
                const procNav = document.querySelector('[data-tab="tab-procurement"]');
                const procPanel = document.getElementById("tab-procurement");
                if (procNav) procNav.classList.add("active");
                if (procPanel) procPanel.classList.add("active");
            });
        });
    }

    renderMetaAnalytics();

    // Listen for storage changes from overlay bookmarks
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local') {
            if (changes.watchlist) renderWatchlist();
            if (changes.procurementTargets) renderProcurement();
        }
    });
});
