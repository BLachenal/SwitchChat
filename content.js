// content.js

// Helper function to scrape the stream owner's name from YouTube's UI
function getYouTubeChannelName() {
  const selectors = [
    '#owner #channel-name a',
    'ytd-video-owner-renderer #channel-name a',
    'ytd-watch-metadata #owner-name a',
    '#upload-info ytd-channel-name a',
    'ytd-channel-name #text a',
    'ytd-video-owner-renderer a[href*="/@"]',
    'ytd-video-owner-renderer a'
  ];

  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el && el.textContent && el.textContent.trim()) {
      const name = el.textContent
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace('@', '');
      if (name) return name;
    }
  }
  return null;
}

function initTwitchChat() {
  // Double-check extension context inside the execution loop
  if (!chrome.runtime || !chrome.runtime.id || !chrome.storage || !chrome.storage.local) {
    return;
  }

  const theaterPanelsContainer = document.getElementById('panels-full-bleed-container');
  const standardChatContainer = document.getElementById('chat');
  let activeParent = null;

  if (theaterPanelsContainer && window.getComputedStyle(theaterPanelsContainer).display !== 'none') {
    activeParent = theaterPanelsContainer;
  } else if (standardChatContainer) {
    activeParent = standardChatContainer;
  }

  if (!activeParent) return;

  chrome.storage.local.get(['twitchChannel'], (result) => {
    // Additional asynchronous context check
    if (chrome.runtime.lastError || !chrome.runtime || !chrome.runtime.id) return;

    const targetChannel = result.twitchChannel || getYouTubeChannelName();
    if (!targetChannel) return;

    const existingContainer = document.getElementById('twitch-chat-container');
    if (existingContainer) {
      if (existingContainer.parentElement === activeParent && existingContainer.dataset.channel === targetChannel) {
        return; 
      } else {
        existingContainer.remove(); 
      }
    }

    const container = document.createElement('div');
    container.id = 'twitch-chat-container';
    container.dataset.channel = targetChannel; 

    const parentDomain = window.location.hostname; 

    container.innerHTML = `
      <div class="twitch-chat-header">
        <div class="header-title-block">
          Twitch Chat Bridge: <span style="color: #a171ff;">#${targetChannel}</span>
          ${result.twitchChannel ? '<span class="override-tag">(Override)</span>' : ''}
        </div>
        <button id="twitch-bridge-change-btn" class="header-edit-btn">Change Channel</button>
      </div>
      <iframe 
        id="twitch-chat-embed"
        src="https://www.twitch.tv/embed/${targetChannel}/chat?parent=${parentDomain}&darkpopout"
        height="100%"
        width="100%">
      </iframe>
    `;

    activeParent.appendChild(container);

    const changeBtn = container.querySelector('#twitch-bridge-change-btn');
    changeBtn.addEventListener('click', () => {
      const input = prompt("Enter custom Twitch channel name (Leave blank to reset to auto-detect):", targetChannel);
      if (input !== null) {
        const cleanedName = input.trim().toLowerCase().replace(/\s+/g, '');
        if (cleanedName === '') {
          chrome.storage.local.remove('twitchChannel', () => {
            initTwitchChat();
          });
        } else {
          chrome.storage.local.set({ twitchChannel: cleanedName }, () => {
            initTwitchChat();
          });
        }
      }
    });
  });
}

// Global observer wrapper with an absolute entry-level try/catch circuit
const observer = new MutationObserver(() => {
  try {
    // If the browser context has been invalidated, this check will throw or return false
    if (!chrome.runtime || !chrome.runtime.id) {
      observer.disconnect(); // Clear this observer from memory permanently
      return;
    }
    
    if (window.location.href.includes('youtube.com/watch')) {
      initTwitchChat();
    }
  } catch (error) {
    // Context is broken; pull the plug silently
    try {
      observer.disconnect();
    } catch (e) {}
  }
});

observer.observe(document.body, { childList: true, subtree: true });