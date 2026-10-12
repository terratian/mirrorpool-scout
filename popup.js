document.addEventListener("DOMContentLoaded", () => {
const container = document.getElementById("mp-watchlist-container");

function renderWatchlist() {
chrome.storage.local.get({ watchlist: [] }, (res) => {
  container.innerHTML = "";
  if (res.watchlist.length === 0) {
    container.innerHTML = '<div class="empty-state">No targets tracked. Pin auctions from eBay to begin overwatch.</div>';
    return;
  }

  res.watchlist.forEach((card, index) => {
    const div = document.createElement("div");
    div.className = "card-item";
    div.innerHTML = `
      <div style="flex:1; overflow:hidden;">
        <div class="card-title"><a href="${card.url}" target="_blank" style="color:inherit; text-decoration:none;">${card.title}</a></div>
        <div class="card-price">$${card.price} (Total Cost)</div>
      </div>
      <button class="remove-btn" data-index="${index}">✖</button>
    `;
    container.appendChild(div);
  });

  document.querySelectorAll(".remove-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const idx = e.target.getAttribute("data-index");
      res.watchlist.splice(idx, 1);
      chrome.storage.local.set({ watchlist: res.watchlist }, renderWatchlist);
    });
  });
});
}

renderWatchlist();
});

// Listen for Dashboard Launch
document.addEventListener("DOMContentLoaded", () => {
const dashBtn = document.getElementById("btn-dashboard");
if (dashBtn) {
dashBtn.addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
});
}
});
