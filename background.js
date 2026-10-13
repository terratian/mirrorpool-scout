// Enable side panel behavior on extension icon click
try {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
} catch (e) {
    console.error("Side panel behavior error:", e);
}

// Listen for messages from content scripts / domain adapters
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "sync_to_dashboard") {
        const payload = message.payload;
        
        if (!payload) {
            sendResponse({ status: "error", message: "Empty payload received" });
            return;
        }

        let dataStoreKey = "general_scout_logs";

        switch (payload.actionType) {
            case "goldfish_card":
                dataStoreKey = "watchlist_cards";
                break;
            case "tcg_product":
                dataStoreKey = "card_chase";
                break;
            case "decklist_scrape":
                dataStoreKey = "currentDecklist";
                break;
            default:
                dataStoreKey = "general_scout_logs";
        }

        chrome.storage.local.get([dataStoreKey], (result) => {
            let existingData = result[dataStoreKey] || [];
            if (!Array.isArray(existingData)) existingData = [existingData];
            
            existingData.unshift(payload);

            chrome.storage.local.set({ [dataStoreKey]: existingData }, () => {
                sendResponse({ status: "success", storedKey: dataStoreKey });
            });
        });

        return true; 
    }
});

// --- Legacy UI Button Listeners ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "openDashboard") {
        // Check if Side Panel API is available, otherwise fallback to standard tab
        if (chrome.sidePanel && sender.tab) {
            chrome.sidePanel.open({ windowId: sender.tab.windowId });
        } else {
            chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
        }
        sendResponse({ status: "dashboard_opened" });
    }
});
