// iframe-patch.js
console.log("[SwitchChat Iframe Patch] Script successfully loaded inside frame layout window origin:", window.location.href);

const urlSegments = window.location.pathname.split('/');
const channelName = urlSegments[2]?.toLowerCase();
console.log(`[SwitchChat Iframe Patch] Target Twitch channel determined as: "${channelName}"`);

let bttvEmotes = {};

async function loadBTTVEmotes() {
  if (!channelName) return;

  chrome.runtime.sendMessage({ type: 'FETCH_BTTV_EMOTES', channel: channelName }, (response) => {
    if (!response || !response.success) {
      console.warn(`[SwitchChat Iframe Patch] BetterTTV initialization halted: ${response.error || 'Unknown Error'}`);
      return;
    }

    const data = response.data;
    const channelEmotes = data.channelEmotes || [];
    const sharedEmotes = data.sharedEmotes || [];
    const globalEmotes = data.globalEmotes || []; // Extract the new global array
    
    // Assemble uniform lookup table including global entries
    const allEmotes = [...channelEmotes, ...sharedEmotes, ...globalEmotes];
    
    allEmotes.forEach(emote => {
      bttvEmotes[emote.code] = emote.id;
    });
    
    console.log("[SwitchChat Iframe Patch] Client memory database built. Total searchable keywords:", Object.keys(bttvEmotes).length);
    observeChatStream();
  });
}

function observeChatStream() {
  // Broad layout matching fallback to secure a link to the chat box container
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

  console.log("[SwitchChat Iframe Patch] Target container successfully linked! Processing backlog and setting up observer...");

  // Scan any messages already on screen at startup
  parseAndRenderEmotes(chatContainer);

  const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        // Process the entire newly added chat row container at once
        if (node.nodeType === Node.ELEMENT_NODE) {
          parseAndRenderEmotes(node);
        }
      });
    });
  });

  observer.observe(chatContainer, { childList: true, subtree: true });
}

function parseAndRenderEmotes(rootElement) {
  // Defensive guard: don't re-process our own injected image elements
  if (rootElement.classList && rootElement.classList.contains('bttv-processed-emote')) return;

  // Use a TreeWalker to find every single raw text node hidden inside this element, regardless of class names
  const walker = document.createTreeWalker(rootElement, NodeFilter.SHOW_TEXT, null, false);
  const nodesToReplace = [];
  let textNode;

  while (textNode = walker.nextNode()) {
    // Ignore empty spacing text nodes or anything inside scripts/styles
    if (!textNode.nodeValue.trim()) continue;
    if (textNode.parentElement && (textNode.parentElement.tagName === 'SCRIPT' || textNode.parentElement.tagName === 'STYLE')) {
      continue;
    }

    // Split text by white space to evaluate individual word matches
    const words = textNode.nodeValue.split(/\s+/);
    const hasEmote = words.some(word => bttvEmotes[word]);
    
    if (hasEmote) {
      nodesToReplace.push(textNode);
    }
  }

  // Swap out the matching text node strings for clean DOM fragments containing images
  nodesToReplace.forEach(targetTextNode => {
    const parent = targetTextNode.parentElement;
    if (!parent) return;

    const originalContent = targetTextNode.nodeValue;
    const words = originalContent.split(' ');
    const fragment = document.createDocumentFragment();

    words.forEach((word, index) => {
      if (bttvEmotes[word]) {
        console.log(`[SwitchChat Iframe Patch] Converting keyword match: "${word}"`);
        
        const img = document.createElement('img');
        img.src = `https://cdn.betterttv.net/emote/${bttvEmotes[word]}/1x`;
        img.alt = word;
        img.title = word; 
        img.className = 'bttv-processed-emote';
        img.style.verticalAlign = 'middle';
        img.style.margin = '0 3px';
        img.style.display = 'inline-block';
        
        fragment.appendChild(img);
      } else {
        fragment.appendChild(document.createTextNode(word));
      }
      
      // Maintain proper layout spaces between words
      if (index < words.length - 1) {
        fragment.appendChild(document.createTextNode(' '));
      }
    });

    // Swap the text node with our new mixed text/image node fragment safely
    parent.replaceChild(fragment, targetTextNode);
  });
}

loadBTTVEmotes();