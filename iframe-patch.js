// iframe-patch.js
console.log("[SwitchChat Iframe Patch] Dual-Engine Emote Script Loaded inside origin:", window.location.href);

const urlSegments = window.location.pathname.split('/');
const channelName = urlSegments[2]?.toLowerCase();
console.log(`[SwitchChat Iframe Patch] Evaluating platform boundaries for: "${channelName}"`);

let unifiedEmoteMap = {};
// Inside iframe-patch.js

async function loadUnifiedEmotes() {
  if (!channelName) return;

  // Check user preference state before compiling asset arrays
  chrome.storage.local.get(['emotesEnabled'], (result) => {
    if (result.emotesEnabled === false) {
      console.log("[SwitchChat Iframe Patch] Third-party emotes are disabled in settings.");
      return; // Terminate script loop early
    }

    console.log(`[SwitchChat Iframe Patch] Settings verified active. Sending compilation bundle request...`);
    
    chrome.runtime.sendMessage({ type: 'FETCH_ALL_EMOTES', channel: channelName }, (response) => {
      if (!response || !response.success) {
        console.warn(`[SwitchChat Iframe Patch] Network compilation failed or timed out: ${response?.error}`);
        return;
      }

      response.emotes.forEach(emote => {
        unifiedEmoteMap[emote.code] = { id: emote.id, engine: emote.engine };
      });
      
      console.log("[SwitchChat Iframe Patch] Memory maps constructed. Total searchable keys:", Object.keys(unifiedEmoteMap).length);
      observeChatStream();
    });
  });
}

function observeChatStream() {
  const chatContainer = document.querySelector(
    '.chat-scrollable-area__content, ' +
    '.chat-scrollable-area__message-container, ' +
    '[data-a-target="chat-lines-container"], ' +
    '.chat-room__content, ' +
    '.chat-list--default'
  );
  
  if (!chatContainer) {
    setTimeout(observeChatStream, 500);
    return;
  }

  console.log("[SwitchChat Iframe Patch] Container connection linked! Processing backlog layout text arrays...");
  parseAndRenderEmotes(chatContainer);

  const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          parseAndRenderEmotes(node);
        }
      });
    });
  });

  observer.observe(chatContainer, { childList: true, subtree: true });
}

function parseAndRenderEmotes(rootElement) {
  if (rootElement.classList && rootElement.classList.contains('switchchat-rendered')) return;

  const walker = document.createTreeWalker(rootElement, NodeFilter.SHOW_TEXT, null, false);
  const nodesToReplace = [];
  let textNode;

  while (textNode = walker.nextNode()) {
    if (!textNode.nodeValue.trim()) continue;
    if (textNode.parentElement && (textNode.parentElement.tagName === 'SCRIPT' || textNode.parentElement.tagName === 'STYLE')) {
      continue;
    }

    const words = textNode.nodeValue.split(/\s+/);
    const hasEmote = words.some(word => unifiedEmoteMap[word]);
    
    if (hasEmote) {
      nodesToReplace.push(textNode);
    }
  }

  nodesToReplace.forEach(targetTextNode => {
    const parent = targetTextNode.parentElement;
    if (!parent) return;

    const originalContent = targetTextNode.nodeValue;
    const words = originalContent.split(' ');
    const fragment = document.createDocumentFragment();

    words.forEach((word, index) => {
      if (unifiedEmoteMap[word]) {
        console.log(`[SwitchChat Iframe Patch] Conversion processing match: "${word}"`);
        const emoteMetadata = unifiedEmoteMap[word];
        
        const img = document.createElement('img');
        
        // Dynamically path CDN target assets based on engine flags
        if (emoteMetadata.engine === 'bttv') {
          img.src = `https://cdn.betterttv.net/emote/${emoteMetadata.id}/1x`;
        } else if (emoteMetadata.engine === '7tv') {
          img.src = `https://cdn.7tv.app/emote/${emoteMetadata.id}/1x.webp`;
        }
        
        img.alt = word;
        img.title = word; 
        img.className = 'switchchat-rendered';
        img.style.verticalAlign = 'middle';
        img.style.margin = '0 3px';
        img.style.display = 'inline-block';
        
        fragment.appendChild(img);
      } else {
        fragment.appendChild(document.createTextNode(word));
      }
      
      if (index < words.length - 1) {
        fragment.appendChild(document.createTextNode(' '));
      }
    });

    parent.replaceChild(fragment, targetTextNode);
  });
}

loadUnifiedEmotes();