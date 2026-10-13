// Remove existing host if present
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

// Intelligent scraping based on hostname
function extractPageData() {
    let cardName = document.title.split("|")[0].trim();
    let paperPrice = "N/A";
    let mtgoPrice = "N/A";

    const hostname = window.location.hostname;

    if (hostname.includes("mtggoldfish.com")) {
        // Grab card name and prices directly from MTGGoldfish layout
        const headerTitle = document.querySelector(".card-name-header, h1");
        if (headerTitle) cardName = headerTitle.innerText.split("#")[0].trim();
        
        const tabletopEl = document.querySelector(".tweak-price-tabletop, .price-box-price");
        if (tabletopEl) paperPrice = tabletopEl.innerText.trim();

        const mtgoEl = document.querySelector(".tweak-price-mtgo");
        if (mtgoEl) mtgoPrice = mtgoEl.innerText.trim();
    } else if (hostname.includes("tcgplayer.com")) {
        const tcgTitle = document.querySelector(".product-details__name");
        if (tcgTitle) cardName = tcgTitle.innerText.trim();
        
        const tcgPrice = document.querySelector(".product-details__price");
        if (tcgPrice) paperPrice = tcgPrice.innerText.trim();
    }

    return { cardName, paperPrice, mtgoPrice, url: window.location.href, hostname };
}

const data = extractPageData();

shadow.innerHTML = `
  <style>
    .scout-widget {
      background-color: #0b1120;
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 12px;
      width: 240px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #94a3b8;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
    }
    .scout-header {
      color: #10b981;
      font-weight: bold;
      font-size: 13px;
      margin-bottom: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .card-inspect-box {
      background: #1e293b;
      border-radius: 4px;
      padding: 8px;
      margin-bottom: 8px;
      font-size: 12px;
    }
    .inspect-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
    }
    .inspect-row span:last-child {
      color: #f8fafc;
      font-weight: 600;
    }
    .scout-btn {
      width: 100%;
      background-color: #3b82f6;
      color: #fff;
      border: none;
      padding: 8px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
      font-size: 12px;
      transition: background-color 0.2s;
    }
    .scout-btn:hover { background-color: #2563eb; }
  </style>
  <div class="scout-widget">
    <div class="scout-header">
      <span>🔮 MP SCOUT INSPECT</span>
      <span style="font-size: 10px; color: #64748b;">${data.hostname}</span>
    </div>
    <div class="card-inspect-box">
      <div style="color: #38bdf8; font-weight: bold; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${data.cardName}</div>
      <div class="inspect-row"><span>Paper Floor:</span> <span style="color: #f59e0b;">${data.paperPrice}</span></div>
      <div class="inspect-row"><span>MTGO TIX:</span> <span style="color: #3b82f6;">${data.mtgoPrice}</span></div>
    </div>
    <button class="scout-btn" id="send-to-dashboard">📥 Push to Watchlist</button>
  </div>
`;

shadow.getElementById("send-to-dashboard").addEventListener("click", () => {
    const btn = shadow.getElementById("send-to-dashboard");
    btn.innerText = "✅ Pushed to Deck/Chase";
    btn.style.backgroundColor = "#10b981";
    
    chrome.runtime.sendMessage({
        action: "sync_to_dashboard",
        cardData: data
    });

    setTimeout(() => { 
        btn.innerText = "📥 Push to Watchlist"; 
        btn.style.backgroundColor = "#3b82f6";
    }, 2500);
});
