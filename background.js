// background.js
console.log("[SwitchChat Background] Unified Emote Engine Initialized.");

let cachedBttvGlobal = null;
let cached7tvGlobal = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FETCH_ALL_EMOTES') {
    const channel = message.channel;
    console.log(`[SwitchChat Background] Initializing multi-suite query for channel: "${channel}"`);
    
    // Step 1: Resolve Username -> Numerical Twitch ID
    fetch(`https://api.ivr.fi/v2/twitch/user?login=${encodeURIComponent(channel)}`)
      .then(res => res.json())
      .then(async (userData) => {
        if (!userData || !userData[0] || !userData[0].id) {
          throw new Error(`Could not resolve Twitch ID room metrics for: ${channel}`);
        }
        const twitchId = userData[0].id;
        console.log(`[SwitchChat Background] Verified room ID: ${twitchId}`);

        // Assemble parallel network execution promises
        const pipeline = [
          // Fetch BetterTTV Channel configuration
          fetch(`https://api.betterttv.net/3/cached/users/twitch/${twitchId}`).then(res => res.json()).catch(() => ({})),
          // Fetch 7TV Channel configuration
          fetch(`https://api.7tv.app/v3/users/twitch/${twitchId}`).then(res => res.json()).catch(() => ({}))
        ];

        // Append BetterTTV global caches
        if (!cachedBttvGlobal) {
          pipeline.push(fetch(`https://api.betterttv.net/3/cached/emotes/global`).then(res => res.json()).catch(() => []));
        } else {
          pipeline.push(Promise.resolve(cachedBttvGlobal));
        }

        // Append 7TV global caches
        if (!cached7tvGlobal) {
          pipeline.push(fetch(`https://api.7tv.app/v3/emotes/global`).then(res => res.json()).catch(() => ({})));
        } else {
          pipeline.push(Promise.resolve(cached7tvGlobal));
        }

        const [bttvChannel, s7tvChannel, bttvGlobal, s7tvGlobal] = await Promise.all(pipeline);

        // Commit global listings to instance memory states
        if (!cachedBttvGlobal) cachedBttvGlobal = bttvGlobal;
        if (!cached7tvGlobal) cached7tvGlobal = s7tvGlobal;

        // Flatten datasets down into a single payload packet
        const unifiedEmoteList = [];

        // Process BetterTTV Channel mappings
        if (bttvChannel.channelEmotes) bttvChannel.channelEmotes.forEach(e => unifiedEmoteList.push({ code: e.code, id: e.id, engine: 'bttv' }));
        if (bttvChannel.sharedEmotes) bttvChannel.sharedEmotes.forEach(e => unifiedEmoteList.push({ code: e.code, id: e.id, engine: 'bttv' }));
        if (Array.isArray(bttvGlobal)) bttvGlobal.forEach(e => unifiedEmoteList.push({ code: e.code, id: e.id, engine: 'bttv' }));

        // Process 7TV Channel mappings
        if (s7tvChannel?.emote_set?.emotes) {
          s7tvChannel.emote_set.emotes.forEach(e => unifiedEmoteList.push({ code: e.name, id: e.id, engine: '7tv' }));
        }
        // Process 7TV Global mappings
        if (s7tvGlobal?.emotes) {
          s7tvGlobal.emotes.forEach(e => unifiedEmoteList.push({ code: e.name, id: e.id, engine: '7tv' }));
        }

        console.log(`[SwitchChat Background] Success! Relaying ${unifiedEmoteList.length} distinct matching keys down to the frame client.`);
        sendResponse({ success: true, emotes: unifiedEmoteList });
      })
      .catch(err => {
        console.error("[SwitchChat Background] Pipeline failure:", err);
        sendResponse({ success: false, error: err.message });
      });

    return true; // Crucial for async runtime execution contexts in MV3
  }
});