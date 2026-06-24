const REMEMBRALL_URL = "https://remembrall-web.vercel.app/";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "send-to-remembrall",
    title: "Send to Remembrall",
    contexts: ["selection"],
  });
});

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: REMEMBRALL_URL });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === "send-to-remembrall" && info.selectionText) {
    const encoded = encodeURIComponent(info.selectionText);
    chrome.tabs.create({ url: `${REMEMBRALL_URL}?clip=${encoded}` });
  }
});
