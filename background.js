chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "sync_to_dashboard") {
        const payload = message.payload;
        if (!payload) {
            sendResponse({ status: "error", message: "Empty payload received" });
            return;
        }

        // Fallback to targetKey from schema or actionType
        const dataStoreKey = payload.targetKey || payload.actionType || "general_scout_logs";

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

chrome.action.onClicked.addListener((tab) => {
    chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
});
