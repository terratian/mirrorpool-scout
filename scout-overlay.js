// Create the host container
const host = document.createElement("div");
host.id = "mirror-pool-scout-host";
// Pin it to the bottom right of the viewport
host.style.position = "fixed";
host.style.bottom = "20px";
host.style.right = "20px";
host.style.zIndex = "2147483647"; // Max z-index to stay above everything
document.body.appendChild(host);

// Attach the Shadow DOM to isolate styles
const shadow = host.attachShadow({ mode: "open" });

// Build the overlay UI
const container = document.createElement("div");
container.innerHTML = `
  <style>
    .scout-widget {
      background-color: #0b1120;
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 12px;
      width: 220px;
      font-family: sans-serif;
      color: #94a3b8;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5);
    }
    .scout-header {
      color: #10b981;
      font-weight: bold;
      font-size: 14px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 5px;
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
      margin-top: 5px;
    }
    .scout-btn:hover { background-color: #2563eb; }
  </style>
  <div class="scout-widget">
    <div class="scout-header">🔮 Mirror Pool Scout</div>
    <div style="font-size: 12px; margin-bottom: 8px;">Active on: ${window.location.hostname}</div>
    <button class="scout-btn" id="send-to-dashboard">➕ Send to Dashboard</button>
  </div>
`;

shadow.appendChild(container);

// Wire the button to send data to the Side Panel via message passing
const sendBtn = shadow.getElementById("send-to-dashboard");
sendBtn.addEventListener("click", () => {
    sendBtn.innerText = "⏳ Syncing...";
    
    // Scrape whatever specific page data is needed here based on the domain
    const pageData = {
        source: window.location.hostname,
        url: window.location.href,
        timestamp: Date.now()
    };

    // Fire the message to the background script / side panel
    chrome.runtime.sendMessage({ action: "sync_to_dashboard", data: pageData }, (response) => {
        sendBtn.innerText = "✅ Sent!";
        setTimeout(() => { sendBtn.innerText = "➕ Send to Dashboard"; }, 2000);
    });
});
