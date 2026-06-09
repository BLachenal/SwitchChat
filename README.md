# TwitchTubeChat 🚀

A lightweight, modern Manifest V3 browser extension that seamlessly bridges the gap between streaming platforms by overlaying live Twitch chat directly into YouTube stream pages.

---

## 🌟 Features

* **Dual-Layout Synchronization:** Automatically detects and adapts to YouTube's **Standard View** and **Theater Mode** grids by tracking dynamic container mutations on the fly.
* **Intelligent Auto-Detection:** Scrapes the YouTube DOM using a cascading layer of selectors to find the creator's channel name, instantly mapping it to their corresponding Twitch chat room.
* **Inline Channel Override:** Built-in "Change Channel" interaction right inside the chat header to quickly bypass name mismatches (e.g., when a creator's YouTube handle doesn't match their Twitch username).
* **Modular Architecture:** Complete separation of concerns with isolated stylesheets and logic components—zero inline styles or messy scripting blocks.
* **Self-Cleaning Lifecycle Guards:** Defensively handles extension updates and tab updates, silently flushing out orphaned "ghost" background scripts to prevent memory leaks or console clutter.

---
## 🎮 Usage Guide

### 🔍 Auto-Detection Mode
By default, you don't need to do anything! When you navigate to a live stream or video, the extension sweeps the page metadata, extracts the creator's username, formats it, and loads their Twitch chat room hands-free.

### 🔄 Handling Name Mismatches (Manual Override)
If a creator uses entirely different usernames across platforms (for example, YouTube: `mynameisboaty` vs. Twitch: `b0aty`), you can sync them with a single click:

1. Click the **Change Channel** button located directly inside the custom Twitch Chat Bridge header on the webpage.
2. Type the exact target Twitch username (e.g., `b0aty`) into the popup prompt.
3. Click **OK**. The extension commits the name to local storage and dynamically updates the iframe layout instantly.
4. **To Reset:** If you want to clear the custom override and revert back to hands-free auto-detection, click **Change Channel** again, leave the text input completely blank, and click **OK**.