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

function extractPageData() {
    let cardName = "Unknown Card";
    let paperPrice = "N/A";
    let mtgoPrice = "N/A";
    const hostname = window.location.hostname;

    if (hostname.includes("mtggoldfish.com")) {
        // Target exact card header element, ignoring footers and legal text
        const headerEl = document.querySelector(".card-name-header h1, h1");
        if (headerEl) {
            cardName = headerEl.innerText.split("#")[0].replace("Price", "").trim();
        }
        
        // Target price elements specifically
        const tabletopEl = document.querySelector(".tweak-price-tabletop, .price-box-price");
        if (tabletopEl) paperPrice = tabletopEl.innerText.trim();

        const mtgoEl = document.querySelector(".tweak-price-mtgo");
        if (mtgoEl) mtgoPrice = mtgoEl.innerText.trim();
    }

    return { cardName, paperPrice, mtgoPrice, url: window.location.href, hostname };
}

const data = extractPageData();

shadow.innerHTML = `
  <style>
    .scout-widget {
      background-color: #030712;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 12px;
      width: 250px;
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
      <span>🔮 MP SCOUT ENGINE</span>
      <span style="color: #64748b; font-size: 9px;">${data.hostname}</span>
    </div>
    <div class="card-inspect-box">
      <div style="color: #38bdf8; font-weight: 700; margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${data.cardName}">${data.cardName}</div>
      <div class="inspect-row"><span>Paper Floor:</span> <span style="color: #f59e0b;">${data.paperPrice}</span></div>
      <div class="inspect-row"><span>MTGO TIX:</span> <span style="color: #3b82f6;">${data.mtgoPrice}</span></div>
    </div>
    <div class="btn-group">
      <button class="scout-btn" id="push-watchlist-btn">📥 Push to Watchlist</button>
      <button class="scout-btn btn-secondary" id="copy-spread-btn">📋 Copy Spread Data</button>
    </div>
  </div>
`;

shadow.getElementById("push-watchlist-btn").addEventListener("click", () => {
    const btn = shadow.getElementById("push-watchlist-btn");
    btn.innerText = "✅ Synced!";
    btn.style.backgroundColor = "#10b981";
    
    chrome.runtime.sendMessage({ action: "sync_to_dashboard", cardData: data });

    setTimeout(() => { 
        btn.innerText = "📥 Push to Watchlist"; 
        btn.style.backgroundColor = "#3b82f6";
    }, 2000);
});

shadow.getElementById("copy-spread-btn").addEventListener("click", () => {
    const btn = shadow.getElementById("copy-spread-btn");
    const textToCopy = `Card: ${data.cardName} | Paper: ${data.paperPrice} | MTGO: ${data.mtgoPrice} | Source: ${data.url}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
        btn.innerText = "✅ Copied Spreads!";
        setTimeout(() => { btn.innerText = "📋 Copy Spread Data"; }, 2000);
    });
});
