// popup.js

const emoteToggle = document.getElementById('emote-toggle');

// 1. Initialize toggle state when menu opens (defaulting to true)
chrome.storage.local.get(['emotesEnabled'], (result) => {
  emoteToggle.checked = result.emotesEnabled !== false;
});

// 2. Handle configuration changes and runtime permissions
emoteToggle.addEventListener('change', () => {
  const shouldEnable = emoteToggle.checked;

  if (shouldEnable) {
    // Request API access dynamically at runtime to avoid the update trap
    chrome.permissions.request({
      origins: [
        "https://api.betterttv.net/*",
        "https://api.7tv.app/*",
        "https://api.ivr.fi/*"
      ]
    }, (granted) => {
      if (granted) {
        chrome.storage.local.set({ emotesEnabled: true });
        console.log("Permissions granted and emotes enabled.");
      } else {
        // If user rejects the permission dialog, force toggle back off
        emoteToggle.checked = false;
        chrome.storage.local.set({ emotesEnabled: false });
      }
    });
  } else {
    // Turn off feature safely
    chrome.storage.local.set({ emotesEnabled: false });
  }
});