// background.js
console.log("[SwitchChat Background] Service worker initialized successfully.");

// Local state container to hold global emotes once fetched
let cachedGlobalEmotes = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FETCH_BTTV_EMOTES') {
    console.log(`[SwitchChat Background] Starting emote pipeline for channel: "${message.channel}"`);
    
    const ivrUrl = `https://api.ivr.fi/v2/twitch/user?login=${encodeURIComponent(message.channel)}`;
    const globalBttvUrl = `https://api.betterttv.net/3/cached/emotes/global`;

    // Process our identity lookup promise
    const promises = [
      fetch(ivrUrl).then(res => res.json())
    ];

    // Pull down global assets only if our local engine memory cache is dry
    if (!cachedGlobalEmotes) {
      console.log("[SwitchChat Background] Global asset cache empty. Fetching BetterTTV global manifest...");
      promises.push(fetch(globalBttvUrl).then(res => res.json()));
    } else {
      promises.push(Promise.resolve(cachedGlobalEmotes));
    }

    Promise.all(promises)
      .then(([userData, globalData]) => {
        // Update local memory footprint with global listings
        if (!cachedGlobalEmotes) {
          cachedGlobalEmotes = globalData;
        }

        if (!userData || !userData[0] || !userData[0].id) {
          throw new Error(`Could not find a matching Twitch User ID for "${message.channel}"`);
        }
        
        const twitchId = userData[0].id;
        const channelBttvUrl = `https://api.betterttv.net/3/cached/users/twitch/${twitchId}`;
        
        return fetch(channelBttvUrl)
          .then(res => res.json())
          .then(channelData => {
            // Package channel-specific, shared, and global arrays up into a single delivery bundle
            sendResponse({ 
              success: true, 
              data: {
                channelEmotes: channelData.channelEmotes || [],
                sharedEmotes: channelData.sharedEmotes || [],
                globalEmotes: cachedGlobalEmotes || []
              }
            });
          });
      })
      .catch(err => {
        console.error("[SwitchChat Background] Critical pipeline handling error:", err);
        sendResponse({ success: false, error: err.message });
      });
      
    return true; // Maintains MV3 message channel link open asynchronously
  }
});