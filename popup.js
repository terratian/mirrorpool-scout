/* Mirror Pool Scout v1.2 - Proprietary Build - All Rights Reserved */
document.addEventListener("DOMContentLoaded", async () => {
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
if (!tab || !tab.url) return;
const url = new URL(tab.url);
const matchedDomain = Object.keys(TCG_METRICS_SCHEMA).find(domain => url.hostname.includes(domain));
if (!matchedDomain) {
document.getElementById("site-badge").innerText = "Generic";
document.getElementById("card-title").innerText = tab.title || "Unknown Page";
document.getElementById("label-a").innerText = "URL:";
document.getElementById("val-a").innerText = url.hostname;
document.getElementById("label-b").innerText = "Status:";
document.getElementById("val-b").innerText = "Unsupported Site";
return;
}
const schema = TCG_METRICS_SCHEMA[matchedDomain];
document.getElementById("site-badge").innerText = schema.siteName;
try {
const results = await chrome.scripting.executeScript({
target: { tabId: tab.id },
func: schema.extract
});
const data = results[0].result;
document.getElementById("card-title").innerText = data.cardName;
document.getElementById("card-title").title = data.cardName;
document.getElementById("label-a").innerText = data.metricA + ":";
document.getElementById("val-a").innerText = data.valueA;
document.getElementById("label-b").innerText = data.metricB + ":";
document.getElementById("val-b").innerText = data.valueB;
document.getElementById("migrate-btn").addEventListener("click", () => {
chrome.runtime.sendMessage({
action: "\x73\x79\x6e\x63\x5f\x74\x6f\x5f\x64\x61\x73\x68\x62\x6f\x61\x72\x64",
payload: { ...data, hostname: url.hostname, url: tab.url, timestamp: Date.now() }
}, (response) => {
const statusEl = document.getElementById("status-text");
if (response && response.status === "success") {
statusEl.innerText = "✅ Successfully migrated to " + response.storedKey;
document.getElementById("migrate-btn").style.backgroundColor = "#059669";
} else {
statusEl.innerText = "❌ Migration failed.";
}
});
});
} catch (e) {
console.error("Extraction error:", e);
document.getElementById("status-text").innerText = "Error parsing page DOM.";
}
document.getElementById("open-dashboard-btn").addEventListener("click", () => {
chrome.sidePanel.open({ windowId: tab.windowId });
});
});
