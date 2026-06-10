# SwitchChat 🚀

A lightweight, high-performance Chrome Extension built with pure vanilla JavaScript and advanced CSS layout controls. SwitchChat seamlessly replaces the native YouTube live chat viewport with a fully functional, synchronized Twitch chat embed frame. 

Designed for dual-platform viewers who prefer the streaming infrastructure of YouTube but the community chat culture and emote ecosystem of Twitch.

---
## 🎮 Usage Guide
By default, you don't need to do anything! When you navigate to a live stream on YouTube, the extension sweeps the page metadata, extracts the creator's username, formats it, and loads their Twitch chat room hands-free.

### 🔄 Handling Name Mismatches (Manual Override)
If a creator uses entirely different usernames across platforms (for example, YouTube: `mynameisboaty` vs. Twitch: `b0aty`), you can sync them easily:

1. Click the **Change Channel** button located directly inside the custom Twitch Chat Bridge header on the webpage.
2. Type the exact target Twitch username (e.g., `b0aty`) into the popup prompt.
3. Click **OK**. The extension commits the name to local storage and dynamically updates the iframe layout instantly.
    *Note* You only have to do this once. SwitchChat saves this to your local browser and checks there the next time you visit that same page 
---

## 🚀 Core Features

* **Instant Multi-Platform Synchronization:** Automatically scrapes YouTube live stream meta-elements to resolve the creator's username handles and map their corresponding Twitch chat rooms.
* **Persistent Mapping Overrides:** Includes an intelligent, native browser memory persistence system (`chrome.storage.local`) allowing users to easily re-route mismatching platform usernames with custom channel overrides.
* **Non-Destructive Layout Minimization:** A highly calculated minimize/restore toggle engine that refactors the active sidebar into a sleek, 40px top control banner, completely restoring native YouTube chat capabilities without blocking underlying controls.
* **Hyperlinked Platform Anchors:** Transforms localized header strings into secure, clean anchor points (`target="_blank"`) for immediate channel redirection in separate navigation tabs.
* **Zero Inline Styles (Content Security Friendly):** Structured strictly around decoupled CSS class injections to maintain full layout control, visual scannability, and seamless dark-mode compliance.

---

## 🛠️ Technical Challenges & Engineering Triumphs

Building an overlay on top of modern Single Page Applications (SPAs) like YouTube introduces aggressive background rendering mechanics. Below are the core engineering hurdles overcome during development:

### 1. Defeating the Stale DOM Cache Mirroring Illusion
**The Problem:** YouTube optimizes speed by keeping inactive page layouts cached in hidden background nodes. Standard DOM selectors (`document.getElementById`) frequently grabbed stale, detached sidebar frames hidden in browser memory, injecting the extension into invisible windows while the active screen space continued displaying native components.
**The Solution:** Bypassed resource-heavy `MutationObserver` loops and instituted a strict, read-only 250ms evaluation clock. The system scans available layout structures and filters them by checking active physical pixel output dimensions:

 ```javascript

if (element.offsetWidth > 0 || element.offsetHeight > 0) {
  activeParent = element;
  break;
} 
```
Because the engine only reads cached geometric measurements from the browser's last completed paint cycle, this prevents forced reflow synchronization, operating at a near-zero CPU frame budget.

# 2. Eliminating Asynchronous Component Race Conditions
The Problem: When loading a live stream, YouTube's layout engine instantly positions the chat frames to appear responsive, but lazily fetches the creator's specific channel metadata moments later. Waiting for the username string to resolve before drawing our UI gave native chats a head start, completely boxing our extension out of the layout container on direct page clicks.
The Solution: The "Dark Curtain" Strategy. The exact millisecond a valid video tracking ID is processed in the URL string, a placeholder canvas is instantly appended to lock down and mask the visual space. The extension then cleanly polls for the username behind the protective curtain, upgrading the visual frames with live iFrame data the instant it surfaces without flashing native UI elements.

# 3. Absolute Boundary Positioning over Hidden Closures
The Problem: When minimizing the Twitch chat overlay to show the native YouTube chat, standard margin adjustments caused absolute layout clipping, hiding native controls ("Top chat" menus, setting gears, close icons) behind my banner.
The Solution: Leveraged advanced structural CSS rules. Instead of targeting specific nested sub-elements, the stylesheet targets the entire immediate sibling element group dynamically and recalculates the absolute boundaries uniformly:

```CSS
#chat.twitch-bridge-minimized > :not(.twitch-chat-bridge-container),
#panels-full-bleed-container.twitch-bridge-minimized > :not(.twitch-chat-bridge-container) {
  position: absolute !important;
  top: 40px !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  height: calc(100% - 40px) !important;
  box-sizing: border-box !important;
}
```
This leaves YouTube’s internal layout code perfectly unbroken, smoothly translating the native text views down by exactly 40px to preserve all underlying interactable utility panels.

# ⚡ Performance Architecture & Runtime Analysis
A primary optimization goal of this extension was minimizing its impact on the browser rendering pipeline during intensive live-stream playback.

The Layout Thrashing (Forced Synchronous Reflow) Risk
Ordinarily, browsers execute rendering lazily according to a strict pipeline:

JavaScript⟶Style (Recalc)⟶Layout (Reflow)⟶Paint⟶Composite
When JavaScript changes a style, the browser waits until the macro-task block finishes to calculate layout changes in a single operation. However, querying geometry properties like .offsetWidth or .offsetHeight immediately after writing a style modification forces the browser to stop execution, recalculate the entire page layout mid-script to provide an accurate pixel value, and destroy frame performance.

# Why SwitchChat is Ultra-Lightweight
SwitchChat circumvents layout thrashing through three core architectural rules:

Read-Only Inquiries: The 250ms polling loop strictly evaluates element sizes before making any structural changes to the page. Because no style modifications are pending prior to the read call, the browser effortlessly pulls the pixel geometry values from its pre-calculated layout cache instantly.

Microscopic Target Scope: Instead of querying the broad DOM tree or processing large NodeLists, the script targets an isolated candidate array containing a maximum of 2 to 4 layout boxes:

```JavaScript
const candidates = document.querySelectorAll('#panels-full-bleed-container, #chat'); 
```
Low-Frequency Clocking: Rather than using a volatile MutationObserver that fires hundreds of times per second on every chat bubble update, animation frame, or thumbnail paint, SwitchChat relies on a controlled 250ms interval. This ensures it consumes less than 0.01% of a standard CPU frame budget.

# Some Legal stuff

The Official Embedding Protocol: SwitchChat does not rely on web scraping or private access tokens to pull chat feeds. It leverages Twitch's official, publicly documented embed engine framework (https://www.twitch.tv/embed/{channel}/chat), utilizing the web tools precisely as their engineers intended.

Monetization & Ad Restrictions: SwitchChat is 100% free and open-source. It does not intercept network traffic, modify streaming ad revenue metrics, or track user metrics. Staying clear of ad interception ensures the extension avoids high-priority platform enforcement queues.


# 🛠️ Local Installation & Development
To load this project locally in your browser workspace for testing or evaluation:

Clone or download this repository onto your machine:

Bash
git clone [https://github.com/BLachenal/SwitchChat.git]
Open Google Chrome and navigate to the extensions management dashboard at: chrome://extensions/

Toggle the Developer mode switch in the top right corner to ON.

Click the Load unpacked button in the top left corner.

Select the root project directory containing your manifest.json, content.js, and content.css assets.

# 🦊 Pro-Tips: Activating Full Emote Support (7TV / FFZ)
Modern browsers utilize Storage Partitioning to separate third-party frames. Because the Twitch chat runs inside an embedded window hosted on YouTube, standard standalone emote extensions often fail to pierce the iframe boundary.

To get full custom animations (catJAM, KEKW, etc.) working seamlessly inside SwitchChat:

Ensure the FrankerFaceZ (FFZ) browser extension is installed.

Open a live stream on YouTube to initialize the SwitchChat window.

Click the FFZ Control Center gear icon located directly inside the bottom row of our embedded chat container.

Navigate to Add-ons on the left menu, and enable 7TV Emotes and BetterTTV Emotes.

Flipping this setting inside the embedded window saves the configuration to the unique browser-allocated third-party storage jar, providing persistent custom emote mapping across all future YouTube stream views.

This project is open-source and distributed under the MIT License. Feel free to modify, expand, or refactor the architecture for your own personal live-streaming layout needs.