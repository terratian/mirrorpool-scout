// Default Tab Routing
document.addEventListener("DOMContentLoaded", () => {
    const metaTab = document.querySelector('[data-tab="meta-analytics"]');
    if (metaTab) metaTab.click();
    
    renderLiveWatchlist();
    bindExportButton();
});

// TCGplayer Mass Entry Manifest Generator
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

// Bind Clipboard Export
function bindExportButton() {
    const exportBtn = document.getElementById('export-manifest-btn');
    if (!exportBtn) return;

    exportBtn.addEventListener('click', () => {
        // Fetch active deck from storage
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

// Dashboard Live Watchlist Listener
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
