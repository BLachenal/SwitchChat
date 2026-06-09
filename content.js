// content.js

let globalPollInterval = null;
let currentVideoId = '';
let isProcessingState = false;

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
        .replace(/\s+/g, '') // Strip all spaces
        .replace('@', '');   // Strip out handle annotations
      if (name) return name;
    }
  }
  return null;
}

// Extract the core video string component directly out of the active URL string
function getVideoIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('v');
}

function syncTwitchBridgeState() {
  if (isProcessingState) return;
  if (!chrome.runtime || !chrome.runtime.id || !chrome.storage || !chrome.storage.local) return;

  const targetVideoId = getVideoIdFromUrl();
  
  // ROUTING GATE: Clear state and turn off classes if navigating out to homepage feeds
  if (!targetVideoId) {
    document.querySelectorAll('.twitch-chat-bridge-container').forEach(el => el.remove());
    document.querySelectorAll('.twitch-bridge-active').forEach(el => el.classList.remove('twitch-bridge-active'));
    currentVideoId = '';
    return;
  }

  // Loop through all possible layout nodes and isolate the one drawing real screen pixels
  const candidates = document.querySelectorAll('#panels-full-bleed-container, #chat');
  let activeParent = null;
  
  for (const el of candidates) {
    if (el.offsetWidth > 0 || el.offsetHeight > 0) {
      activeParent = el;
      break;
    }
  }

  if (!activeParent) return;

  // SCOPED LOOKUP: Only check for our container inside the active visual parent element
  let existingContainer = activeParent.querySelector('.twitch-chat-bridge-container');

  // If the user changed videos, clear old elements and classes everywhere to prevent tracking bleed
  if (currentVideoId !== targetVideoId) {
    document.querySelectorAll('.twitch-chat-bridge-container').forEach(el => el.remove());
    document.querySelectorAll('.twitch-bridge-active').forEach(el => el.classList.remove('twitch-bridge-active'));
    existingContainer = null;
  }
  currentVideoId = targetVideoId;

  // INJECTION: Drop curtain canvas and engage cloaking device class instantly inside the visible scope
  if (!existingContainer) {
    isProcessingState = true;
    
    document.querySelectorAll('.twitch-chat-bridge-container').forEach(el => el.remove());
    document.querySelectorAll('.twitch-bridge-active').forEach(el => {
      if (el !== activeParent) el.classList.remove('twitch-bridge-active');
    });

    const placeholder = document.createElement('div');
    placeholder.className = 'twitch-chat-bridge-container';
    placeholder.dataset.videoId = targetVideoId;
    placeholder.dataset.channel = '';
    placeholder.dataset.ytChannel = '';
    
    placeholder.innerHTML = `
      <div class="twitch-chat-header">
        <div class="header-title-block">Twitch Chat Bridge: Connecting...</div>
      </div>
      <div style="display:flex; justify-content:center; align-items:center; flex-grow:1; color:#aaa; font-family:sans-serif; font-size:13px; background:#0f0f0f;">
        Synchronizing active stream panel real estate...
      </div>
    `;
    
    activeParent.appendChild(placeholder);
    activeParent.classList.add('twitch-bridge-active'); 
    existingContainer = placeholder;
    isProcessingState = false;
  }

  if (!activeParent.classList.contains('twitch-bridge-active')) {
    activeParent.classList.add('twitch-bridge-active');
  }

  if (existingContainer.dataset.ytChannel !== '') {
    const freshCheck = getYouTubeChannelName();
    if (freshCheck && existingContainer.dataset.ytChannel !== freshCheck) {
      existingContainer.dataset.ytChannel = ''; 
    } else {
      return; 
    }
  }

  const ytChannel = getYouTubeChannelName();
  if (!ytChannel) return; 

  isProcessingState = true;

  chrome.storage.local.get(['channelOverrides'], (result) => {
    if (chrome.runtime.lastError || !chrome.runtime || !chrome.runtime.id) {
      isProcessingState = false;
      return;
    }

    const overrides = result.channelOverrides || {};
    const hasOverride = !!overrides[ytChannel];
    const targetChannel = overrides[ytChannel] || ytChannel;

    existingContainer.dataset.channel = targetChannel;
    existingContainer.dataset.ytChannel = ytChannel;

    const parentDomain = window.location.hostname;

    // Modified the template line below to inject a clean hyperlinked anchor tag
    existingContainer.innerHTML = `
      <div class="twitch-chat-header">
        <div class="header-title-block">
          TwitchTube Chat: <a href="https://www.twitch.tv/${targetChannel}" target="_blank" class="twitch-channel-link">#${targetChannel}</a>
          ${hasOverride ? '<span class="override-tag">(Override Saved)</span>' : ''}
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

    const changeBtn = existingContainer.querySelector('#twitch-bridge-change-btn');
    if (changeBtn) {
      changeBtn.addEventListener('click', () => {
        const input = prompt(`Enter Twitch channel name for YouTube channel @${ytChannel} (Leave blank to reset):`, targetChannel);
        if (input !== null) {
          const cleanedName = input.trim().toLowerCase().replace(/\s+/g, '');
          chrome.storage.local.get(['channelOverrides'], (freshResult) => {
            const freshOverrides = freshResult.channelOverrides || {};
            if (cleanedName === '') {
              delete freshOverrides[ytChannel];
            } else {
              freshOverrides[ytChannel] = cleanedName;
            }
            chrome.storage.local.set({ channelOverrides: freshOverrides }, () => {
              existingContainer.dataset.ytChannel = ''; 
              isProcessingState = false;
              syncTwitchBridgeState();
            });
          });
        }
      });
    }

    isProcessingState = false;
  });
}

if (globalPollInterval) clearInterval(globalPollInterval);
globalPollInterval = setInterval(syncTwitchBridgeState, 250);

syncTwitchBridgeState();