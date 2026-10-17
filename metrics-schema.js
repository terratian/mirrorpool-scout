/* Mirror Pool Scout v1.2 - Proprietary Build - All Rights Reserved */
const TCG_METRICS_SCHEMA = {
"mtggoldfish.com": {
siteName: "MTGGoldfish",
targetKey: "\x77\x61\x74\x63\x68\x6c\x69\x73\x74\x5f\x63\x61\x72\x64\x73",
extract: () => {
let cardName = "Unknown Card";
const h1s = document.querySelectorAll("h1");
for (let h of h1s) {
const text = h.innerText.trim();
if (text && !text.includes("Privacy") && !text.includes("CCPA") && !text.includes("Cookie") && !text.includes("MTGGoldfish")) {
cardName = text.split("#")[0].replace("Price", "").trim();
break;
}
}
const tabletopEl = document.querySelector(".tweak-price-tabletop, .price-box-price");
const mtgoEl = document.querySelector(".tweak-price-mtgo");
return {
cardName: cardName,
metricA: "Paper Floor",
valueA: tabletopEl ? tabletopEl.innerText.trim() : "N/A",
metricB: "MTGO TIX",
valueB: mtgoEl ? mtgoEl.innerText.trim() : "N/A",
actionType: "goldfish_card"
};
}
},
"ebay.com": {
siteName: "eBay Auction",
targetKey: "\x63\x61\x72\x64\x5f\x63\x68\x61\x73\x65",
extract: () => {
const titleEl = document.querySelector(".x-item-title__mainTitle span, h1");
const bidEl = document.querySelector(".x-price-primary span, .main-price span");
const shipEl = document.querySelector(".ux-shipping-cost span, .shipping-cost");
return {
cardName: titleEl ? titleEl.innerText.trim() : "eBay Listing",
metricA: "Current Bid",
valueA: bidEl ? bidEl.innerText.trim() : "N/A",
metricB: "Shipping",
valueB: shipEl ? shipEl.innerText.trim() : "Calculated",
actionType: "tcg_product"
};
}
},
"tcgplayer.com": {
siteName: "TCGplayer Marketplace",
targetKey: "\x63\x61\x72\x64\x5f\x63\x68\x61\x73\x65",
extract: () => {
const titleEl = document.querySelector(".product-details__name");
const priceEl = document.querySelector(".product-details__price");
return {
cardName: titleEl ? titleEl.innerText.trim() : "TCG Product",
metricA: "Market Price",
valueA: priceEl ? priceEl.innerText.trim() : "N/A",
metricB: "Variant",
valueB: "Standard/Foil",
actionType: "tcg_product"
};
}
},
"mtgdecks.net": {
siteName: "MTGDecks Analyzer",
targetKey: "\x63\x75\x72\x72\x65\x6e\x74\x44\x65\x63\x6b\x6c\x69\x73\x74",
extract: () => {
return {
cardName: document.title.split("|")[0].trim() || "Active Decklist",
metricA: "Detected Format",
valueA: "Competitive Meta",
metricB: "Spreads",
valueB: "Computed",
actionType: "decklist_scrape"
};
}
}
};
