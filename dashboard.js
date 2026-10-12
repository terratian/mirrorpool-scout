document.addEventListener("DOMContentLoaded", () => {
    initNavigation();
    
    // Slight delay to ensure DOM containers exist before rendering
    setTimeout(() => {
        renderLiveWatchlist();
        bindExportButton();
    }, 200);
});

// 1. CORE ROUTING: Tab Navigation
function initNavigation() {
    const tabs = document.querySelectorAll('[data-tab]');
    
    // The main panels based on your sidebar structure
    const panelIds = ['live-watchlist', 'procurement-hunter', 'meta-analytics', 'preferences'];
    
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            const targetId = tab.getAttribute('data-tab');
            const targetEl = document.getElementById(targetId);
            
            if (!targetEl) {
                console.warn(`Panel with ID ${targetId} not found in HTML.`);
                return;
            }

            // Hide all known panels
            panelIds.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.display = 'none';
            });
            
            // Show the target panel
            targetEl.style.display = 'block';

            // Reset visual active states on all tabs
            tabs.forEach(t => {
                t.classList.remove('active');
                // Fallback inline styling just in case CSS classes fail
                t.style.borderLeft = '3px solid transparent';
                t.style.color = '#c9d1d9';
                t.style.backgroundColor = 'transparent';
            });

            // Set visual active state on clicked tab
            tab.classList.add('active');
            tab.style.borderLeft = '3px solid #00ffcc';
            tab.style.color = '#00ffcc';
            tab.style.backgroundColor = 'rgba(0, 255, 204, 0.05)';
        });
    });

    // Force default view to Meta Analytics if it exists, otherwise click the first tab
    const defaultTab = document.querySelector('[data-tab="meta-analytics"]') || tabs[0];
    if (defaultTab) defaultTab.click();
}

// 2. PROCUREMENT: TCGplayer Mass Entry Manifest Generator
function generateBulkManifest(deck) {
    if (!deck || !deck.cards || deck.cards.length === 0) return null;
    let manifest = "";
    deck.cards.forEach(card => {
        if (!card.acquired) {
            manifest += `${card.quantity} ${card.name}\n`;
        }
    });
    return manifest.trim();
}

// 3. PROCUREMENT: Bind Clipboard Export
function bindExportButton() {
    const exportBtn = document.getElementById('export-manifest-btn');
    if (!exportBtn) return;

    exportBtn.addEventListener('click', () => {
        chrome.storage.local.get(['activeProcurement'], (result) => {
            const deck = result.activeProcurement || { cards: [] };
            const manifestText = generateBulkManifest(deck);
            
            if (!manifestText) {
                alert("No missing cards to export or no active deck selected.");
                return;
            }

            navigator.clipboard.writeText(manifestText).then(() => {
                const originalText = exportBtn.innerText;
                exportBtn.innerText = '✅ Copied to Clipboard!';
                exportBtn.style.backgroundColor = '#2ea043';
                setTimeout(() => {
                    exportBtn.innerText = originalText;
                    exportBtn.style.backgroundColor = '#238636';
                }, 2000);
            }).catch(err => console.error('Clipboard error: ', err));
        });
    });
}

// 4. ARBITRAGE: Dashboard Live Watchlist Listener
function renderLiveWatchlist() {
    chrome.storage.local.get(['liveWatchlist'], (result) => {
        const watchlist = result.liveWatchlist || [];
        const container = document.getElementById("arbitrage-list");
        
        if (!container) return;

        if (watchlist.length === 0) {
            container.innerHTML = '<p style="color: #8b949e;">No active snipes found. Go scout eBay!</p>';
            return;
        }

        let html = '<ul style="list-style: none; padding: 0; margin: 0;">';
        watchlist.forEach(item => {
            html += `
                <li style="padding: 10px; background: #0d1117; margin-bottom: 5px; border-radius: 4px; border: 1px solid #30363d; display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #c9d1d9;"><strong>${item.cardName}</strong> - $${item.currentBid} (${item.timeRemaining})</span>
                    <a href="${item.url}" target="_blank" style="color: #58a6ff; text-decoration: none; font-size: 0.9em;">View on ${item.platform}</a>
                </li>
            `;
        });
        html += '</ul>';
        container.innerHTML = html;
    });
}

// Listen for storage changes to update Watchlist in real-time
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.liveWatchlist) {
        renderLiveWatchlist();
    }
});
