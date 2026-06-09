/* popup.js */
document.addEventListener('DOMContentLoaded', () => {
  const channelInput = document.getElementById('channelInput');
  const saveBtn = document.getElementById('saveBtn');

  // Load any previously saved channel name override when popup opens
  chrome.storage.local.get(['twitchChannel'], (result) => {
    if (result.twitchChannel) {
      channelInput.value = result.twitchChannel;
    }
  });

  // Save or clear the channel name target
  saveBtn.addEventListener('click', () => {
    const channelName = channelInput.value.trim().toLowerCase();
    
    // If the user clears the input field, we remove the override entirely 
    // so the extension falls back to auto-detecting the YouTube name.
    if (!channelName) {
      chrome.storage.local.remove('twitchChannel', () => {
        alert("Manual override removed. Reverting to auto-detection! Refresh your stream page.");
        window.close();
      });
    } else {
      chrome.storage.local.set({ twitchChannel: channelName }, () => {
        alert(`Target successfully locked to: #${channelName}. Refresh your stream page!`);
        window.close();
      });
    }
  });
});