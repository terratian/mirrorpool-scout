const existingHost = document.getElementById("mirror-pool-scout-host");
if (existingHost) existingHost.remove();

const host = document.createElement("div");
host.id = "mirror-pool-scout-host";
host.style.position = "fixed";
host.style.bottom = "20px";
host.style.right = "20px";
host.style.zIndex = "2147483647";
document.body.appendChild(host);

const shadow = host.attachShadow({ mode: "open" });
const hostname = window.location.hostname;

function detectDomainProfile() {
    let cardName = "Unknown Card";

    if (hostname.includes("mtggoldfish.com")) {
        // Check common MTGGoldfish title containers first
        const primaryHeading = document.querySelector(".card-name-header, h1.text-dark, .col-md-12 h1");
        if (primaryHeading) {
            cardName = primaryHeading.innerText.split("#")[0].replace("Price", "").trim();
        } else {
            // Fallback: iterate over all h1 elements and grab the first valid one
            const headers = document.querySelectorAll("h1");
            for (let h of headers) {
                const text = h.innerText.trim();
                if (text && !text.includes("Privacy") && !text.includes("CCPA") && !text.includes("Cookie") && !text.includes("MTGGoldfish")) {
                    cardName = text.split("#")[0].replace("Price", "").trim();
                    break;
                }
            }
        }

        const tabletopEl = document.querySelector(".tweak-price-tabletop, .price-box-price");
        const mtgoEl = document.querySelector(".tweak-price-mtgo");
        
        return {
            name: "MTGGoldfish Inspector",
            primaryLabel: "📥 Push to Watchlist",
            secondaryLabel: "⚡ Export Arbitrage Delta",
            cardName: cardName,
            metricA: "Paper Floor",
            metricB: tabletopEl ? tabletopEl.innerText.trim() : "N/A",
            metricC: mtgoEl ? mtgoEl.innerText.trim() + " TIX" : "N/A",
            actionType: "goldfish_card"
        };
    }
    
    return {
        name: "Generic TCG Scout",
        primaryLabel: "📥 Push to Watchlist",
        secondaryLabel: "📋 Copy Spread Data",
        cardName: document.title.split("|")[0].trim(),
        metricA: "Page URL",
        metricB: window.location.href,
        actionType: "watchlist"
    };
}

const data = detectDomainProfile();

shadow.innerHTML = `
  <style>
    .scout-widget {
      background-color: #030712;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 12px;
      width: 260px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #f8fafc;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.7);
    }
    .scout-header {
      color: #10b981;
      font-weight: 700;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #1e293b;
      padding-bottom: 6px;
    }
    .card-inspect-box {
      background: #0b1120;
      border: 1px solid #1e293b;
      border-radius: 6px;
      padding: 8px;
      margin-bottom: 10px;
      font-size: 12px;
    }
    .inspect-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
      color: #94a3b8;
    }
    .inspect-row span:last-child {
      color: #f8fafc;
      font-weight: 600;
    }
    .btn-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .scout-btn {
      width: 100%;
      background-color: #3b82f6;
      color: #fff;
      border: none;
      padding: 7px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
      font-size: 11px;
      transition: background 0.2s;
    }
    .scout-btn:hover { background-color: #2563eb; }
    .btn-secondary { background-color: #1e293b; color: #cbd5e1; }
    .btn-secondary:hover { background-color: #334155; }
  </style>
  <div class="scout-widget">
    <div class="scout-header">
      <span>🔮 ${data.name}</span>
    </div>
    <div class="card-inspect-box">
      <div style="color: #38bdf8; font-weight: 700; margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${data.cardName}">${data.cardName}</div>
      <div class="inspect-row"><span>${data.metricA}:</span> <span style="color: #f59e0b;">${data.metricB}</span></div>
      ${data.metricC ? `<div class="inspect-row"><span>MTGO TIX:</span> <span style="color: #3b82f6;">${data.metricC}</span></div>` : ''}
    </div>
    <div class="btn-group">
      <button class="scout-btn" id="primary-action-btn">${data.primaryLabel}</button>
      <button class="scout-btn btn-secondary" id="secondary-action-btn">${data.secondaryLabel}</button>
    </div>
  </div>
`;

shadow.getElementById("primary-action-btn").addEventListener("click", () => {
    const btn = shadow.getElementById("primary-action-btn");
    btn.innerText = "✅ Data Captured!";
    btn.style.backgroundColor = "#10b981";
    
    chrome.runtime.sendMessage({ action: "sync_to_dashboard", payload: data });

    setTimeout(() => { 
        btn.innerText = data.primaryLabel; 
        btn.style.backgroundColor = "#3b82f6";
    }, 2000);
});

shadow.getElementById("secondary-action-btn").addEventListener("click", () => {
    const btn = shadow.getElementById("secondary-action-btn");
    const exportText = `[MPScout Export] ${data.cardName} | ${data.metricA}: ${data.metricB} ${data.metricC ? '| MTGO: ' + data.metricC : ''} | ${window.location.href}`;
    navigator.clipboard.writeText(exportText).then(() => {
        btn.innerText = "✅ Copied Spreads!";
        setTimeout(() => { btn.innerText = data.secondaryLabel; }, 2000);
    });
});
