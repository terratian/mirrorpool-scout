const host = document.createElement("div");
host.id = "mirror-pool-scout-host";
host.style.position = "fixed";
host.style.bottom = "20px";
host.style.right = "20px";
host.style.zIndex = "2147483647";
document.body.appendChild(host);

const shadow = host.attachShadow({ mode: "open" });
shadow.innerHTML = `
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
    <div style="font-size: 11px; margin-bottom: 8px;">Active: ${window.location.hostname}</div>
    <button class="scout-btn" id="send-to-dashboard">➕ Send to Dashboard</button>
  </div>
`;

shadow.getElementById("send-to-dashboard").addEventListener("click", () => {
    const btn = shadow.getElementById("send-to-dashboard");
    btn.innerText = "✅ Sent!";
    setTimeout(() => { btn.innerText = "➕ Send to Dashboard"; }, 2000);
    
    chrome.runtime.sendMessage({
        action: "sync_to_dashboard",
        data: { url: window.location.href, title: document.title }
    });
});
