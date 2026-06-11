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
        .replace(/\s+/g, '')
        .replace('@', '');
      if (name) return name;
    }
  }
  return null;
}

function getVideoIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('v');
}

function syncTwitchBridgeState() {
  if (isProcessingState) return;
  if (!chrome.runtime || !chrome.runtime.id || !chrome.storage || !chrome.storage.local) return;

  const targetVideoId = getVideoIdFromUrl();
  
  if (!targetVideoId) {
    document.body.classList.remove('switchchat-expanded', 'switchchat-minimized');
    document.querySelectorAll('.twitch-chat-bridge-container, #switchchat-nav-restore-btn').forEach(el => el.remove());
    document.querySelectorAll('.twitch-bridge-active').forEach(el => el.classList.remove('twitch-bridge-active'));
    document.querySelectorAll('.twitch-bridge-minimized').forEach(el => el.classList.remove('twitch-bridge-minimized'));
    currentVideoId = '';
    return;
  }

  /* ==========================================================================
     🛡️ REFINED LIVE STREAM DOM GUARD
     ========================================================================== */
  // Only execute if an active live chat rendering node or iframe explicitly exists in the DOM tree.
  // Structural layout skeletons like #chat-container are ignored here.
  const hasLiveChat = document.querySelector('ytd-live-chat-renderer, #chatframe, ytd-live-chat-frame');
  if (!hasLiveChat) {
    document.body.classList.remove('switchchat-expanded', 'switchchat-minimized');
    document.querySelectorAll('.twitch-chat-bridge-container, #switchchat-nav-restore-btn').forEach(el => el.remove());
    document.querySelectorAll('.twitch-bridge-active').forEach(el => el.classList.remove('twitch-bridge-active'));
    document.querySelectorAll('.twitch-bridge-minimized').forEach(el => el.classList.remove('twitch-bridge-minimized'));
    currentVideoId = '';
    return;
  }

  // Inject standalone navbar button directly into YouTube's top toolbar structure
  let navRestoreBtn = document.querySelector('#switchchat-nav-restore-btn');
  if (!navRestoreBtn) {
    const mastheadEnd = document.querySelector('#masthead #end');
    if (mastheadEnd) {
      navRestoreBtn = document.createElement('button');
      navRestoreBtn.id = 'switchchat-nav-restore-btn';
      navRestoreBtn.textContent = '🔌 Restore Twitch Chat';
      mastheadEnd.insertBefore(navRestoreBtn, mastheadEnd.firstChild);
      
      navRestoreBtn.addEventListener('click', () => {
        const container = document.querySelector('.twitch-chat-bridge-container');
        if (container) {
          container.dataset.minimized = 'false';
          container.classList.remove('minimized');
          const parent = container.parentElement;
          if (parent) {
            parent.classList.remove('twitch-bridge-minimized');
            parent.classList.add('twitch-bridge-active');
          }
          syncTwitchBridgeState();
        }
      });
    }
  }

  const watchFlexy = document.querySelector('ytd-watch-flexy');
  const isTheater = watchFlexy && watchFlexy.hasAttribute('theater');
  
  const activeParent = isTheater 
    ? document.querySelector('#panels-full-bleed-container') 
    : document.querySelector('#chat');

  if (!activeParent) return;

  let existingContainer = activeParent.querySelector('.twitch-chat-bridge-container');

  if (currentVideoId !== targetVideoId) {
    document.querySelectorAll('.twitch-chat-bridge-container').forEach(el => el.remove());
    document.querySelectorAll('.twitch-bridge-active').forEach(el => el.classList.remove('twitch-bridge-active'));
    document.querySelectorAll('.twitch-bridge-minimized').forEach(el => el.classList.remove('twitch-bridge-minimized'));
    existingContainer = null;
  }
  currentVideoId = targetVideoId;

  if (!existingContainer) {
    isProcessingState = true;
    
    document.querySelectorAll('.twitch-chat-bridge-container').forEach(el => el.remove());
    document.querySelectorAll('.twitch-bridge-active').forEach(el => {
      if (el !== activeParent) el.classList.remove('twitch-bridge-active');
    });
    document.querySelectorAll('.twitch-bridge-minimized').forEach(el => {
      if (el !== activeParent) el.classList.remove('twitch-bridge-minimized');
    });

    const placeholder = document.createElement('div');
    placeholder.className = 'twitch-chat-bridge-container';
    placeholder.dataset.videoId = targetVideoId;
    placeholder.dataset.channel = '';
    placeholder.dataset.ytChannel = '';
    placeholder.dataset.minimized = 'false'; 
    
    const initialHeader = document.createElement('div');
    initialHeader.className = 'twitch-chat-header';
    
    const initialTitle = document.createElement('div');
    initialTitle.className = 'header-title-block';
    initialTitle.textContent = 'Switch Chat: Connecting...';
    initialHeader.appendChild(initialTitle);
    
    const statusDiv = document.createElement('div');
    statusDiv.style.display = 'flex';
    statusDiv.style.justifyContent = 'center';
    statusDiv.style.alignItems = 'center';
    statusDiv.style.flexGrow = '1';
    statusDiv.style.color = '#aaa';
    statusDiv.style.fontFamily = 'sans-serif';
    statusDiv.style.fontSize = '13px';
    statusDiv.style.background = '#0f0f0f';
    statusDiv.textContent = 'Synchronizing active stream panel real estate...';
    
    placeholder.append(initialHeader, statusDiv);
    
    activeParent.appendChild(placeholder);
    activeParent.classList.add('twitch-bridge-active'); 
    existingContainer = placeholder;
    isProcessingState = false;
  }

  // PERSISTENCE REDRAW: Maintain layout constraints across runtime ticks
  if (watchFlexy && isTheater && !watchFlexy.hasAttribute('fixed-panels')) {
      watchFlexy.setAttribute('fixed-panels', '');
      setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
  }
  
  if (watchFlexy && !isTheater && watchFlexy.hasAttribute('fixed-panels')) {
      watchFlexy.removeAttribute('fixed-panels');
  }

  if (existingContainer.dataset.minimized === 'true') {
      activeParent.classList.remove('twitch-bridge-active');
      activeParent.classList.add('twitch-bridge-minimized');
      
      document.body.classList.remove('switchchat-expanded');
      document.body.classList.add('switchchat-minimized');
  } else {
      activeParent.classList.remove('twitch-bridge-minimized');
      if (!activeParent.classList.contains('twitch-bridge-active')) {
          activeParent.classList.add('twitch-bridge-active');
      }
      
      document.body.classList.add('switchchat-expanded');
      document.body.classList.remove('switchchat-minimized');
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
    const wasMinimizedBeforeSync = existingContainer.dataset.minimized === 'true';

    existingContainer.replaceChildren();

    const header = document.createElement('div');
    header.className = 'twitch-chat-header';

    const titleBlock = document.createElement('div');
    titleBlock.className = 'header-title-block';
    titleBlock.textContent = 'Switch Chat: ';

    const link = document.createElement('a');
    link.href = `https://www.twitch.tv/${encodeURIComponent(targetChannel)}`;
    link.target = '_blank';
    link.className = 'twitch-channel-link';
    link.textContent = `#${targetChannel}`;
    titleBlock.appendChild(link);

    if (hasOverride) {
      const space = document.createTextNode(' ');
      const overrideSpan = document.createElement('span');
      overrideSpan.className = 'override-tag';
      overrideSpan.textContent = '(Override Saved)';
      titleBlock.append(space, overrideSpan);
    }

    const btnGroup = document.createElement('div');
    btnGroup.className = 'header-btn-group';

    const changeBtn = document.createElement('button');
    changeBtn.id = 'twitch-bridge-change-btn';
    changeBtn.className = 'header-edit-btn';
    changeBtn.textContent = 'Change Channel';

    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'twitch-bridge-toggle-btn';
    toggleBtn.className = 'header-toggle-btn';
    toggleBtn.textContent = 'Minimize';

    btnGroup.append(changeBtn, toggleBtn);
    header.append(titleBlock, btnGroup);

    const iframe = document.createElement('iframe');
    iframe.id = 'twitch-chat-embed';
    iframe.src = `https://www.twitch.tv/embed/${encodeURIComponent(targetChannel)}/chat?parent=${encodeURIComponent(parentDomain)}&darkpopout`;
    iframe.setAttribute('height', '100%');
    iframe.setAttribute('width', '100%');

    existingContainer.append(header, iframe);

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

    if (toggleBtn) {
      if (wasMinimizedBeforeSync) {
        existingContainer.classList.add('minimized');
        activeParent.classList.remove('twitch-bridge-active');
        activeParent.classList.add('twitch-bridge-minimized');
      }

      toggleBtn.addEventListener('click', () => {
        const isCurrentlyMinimized = existingContainer.dataset.minimized === 'true';
        
        if (isCurrentlyMinimized) {
          existingContainer.dataset.minimized = 'false';
          existingContainer.classList.remove('minimized');
          activeParent.classList.remove('twitch-bridge-minimized');
          activeParent.classList.add('twitch-bridge-active');
          toggleBtn.textContent = 'Minimize';
        } else {
          existingContainer.dataset.minimized = 'true';
          existingContainer.classList.add('minimized');
          activeParent.classList.remove('twitch-bridge-active');
          activeParent.classList.add('twitch-bridge-minimized');
          toggleBtn.textContent = 'Minimize';
        }
      });
    }

    isProcessingState = false;
  });
}

if (globalPollInterval) clearInterval(globalPollInterval);
globalPollInterval = setInterval(syncTwitchBridgeState, 250);

syncTwitchBridgeState();