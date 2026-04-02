# Features

Full reference of everything the cheat UI can do.

## Opening the cheat window

Press <kbd>`Ctrl`</kbd> + <kbd>`C`</kbd> (default) to toggle the cheat panel. The window appears in the **upper-right corner** of the game. It is semi-transparent until you hover over it — that's intentional, so it doesn't block gameplay.

You can rebind this shortcut in the **Shortcuts** tab.

---

## Stats tab

![Stats Panel](/images/stats-setting-panel.png)

Edit live party stats without opening the save menu.

| Field | Description |
|-------|-------------|
| HP / MP | Set current or max HP/MP for any party member |
| Gold | Set gold to any value |
| Movement speed | Change walk/run speed multiplier |
| Level | Directly set a character's level |
| **Pop Out Window** | Click the button in the General panel to launch the Cheat UI in a separate standalone window. |

---

## Utilities (General Tab)

![General Panel](/images/general-panel.png)

Special helpers to bypass game restrictions.

| Feature | Description |
|---------|-------------|
| **Force Save** | Overrides game-level save restrictions, allowing you to save even in forbidden areas. |
| **Mouse Teleport** | When enabled (**Alt + M**), click anywhere on the map to instantly teleport the player. |
| **Debug Console** | Open the NW.js developer tools to inspect game scripts or variables. |
| **Debug Menu (F9)** | Instant access to the built-in RPG Maker debug menu. |

---

## Items tab

![Items Panel](/images/item-setting-panel.png)

- Search items by name to find them instantly
- Add any item, weapon, or armor to the inventory
- Set quantity to any value

---

## Variables tab

![Variables Panel](/images/variable-setting-panel.png)

Displays all game variables with their current values. Click any variable to edit it in-place. Use the search bar to filter by variable name or ID.

---

## Switches tab

![Switches Panel](/images/switch-setting-panel.png)

Lists all game switches (boolean on/off flags). Toggle any switch with a single click. Searchable by name or ID.

---

## Map / Teleport tab

![Teleport Panel](/images/teleport-panel.png)

| Feature | Description |
|---------|-------------|
| Save location | Saves current map ID + X/Y coordinates |
| Recall location | Teleports back to the saved position |
| Teleport | Go to any map ID + X/Y you enter manually |
| No Clip | Walk through walls and impassable terrain |

---

## Battle tab

![Battle Panel](/images/health-setting-panel.png)

| Feature | Description |
|---------|-------------|
| Force victory | Immediately end battle as a win |
| Force defeat | Immediately trigger game-over |
| Force escape | Exit battle as if escaped |
| Force abort | End battle without any result |
| Fill party TP | Set all party members' TP to max |
| Fill enemy TP | Set all enemies' TP to max |
| Set party HP | Set all members to 1 HP or full HP |
| Set enemy HP | Set all enemies to 1 HP or full HP |

---

## Speed tab

Control how fast the game runs.

- **Speed multiplier**: ×0.1 (slow-mo) to ×10 (fast-forward)
- **Apply in**: all scenes, or battles only

---

## Encounter tab

| Toggle | Description |
|--------|-------------|
| Disable encounters | Random encounters stop occurring |
| Force encounter | Trigger a random encounter immediately |

---

## Shortcuts tab

Bind any of the following actions to a custom key combo:

- Toggle save window
- Toggle load window
- Quick save
- Quick load
- Go to title screen
- Toggle no-clip
- Edit party HP
- Edit enemy HP

See the [Shortcuts page](/guide/shortcuts) for detailed instructions.

---

## Developer Tools

Opens the Chromium DevTools panel (F12-style) inside the game window. Useful for inspecting game internals, reading the console, or debugging scripts.

---

---

## Translate tab

![Translate Panel](/images/translate-settings-panel.png)

Translate variable names, switch names, map names, and item names in real-time.

For detailed instructions and engine setup, see the **[Full Translation Guide](/guide/translation-usage)**.

### LLM & AI Engine
The plugin features a high-performance translation engine that supports:
- **Lingva Translate**: A private, free alternative to Google Translate. Support for JA → EN and more.
- **Local AI (Ollama)**: Connect to a locally running Ollama instance for private, unlimited translations.
- **Cloud AI (OpenAI / Gemini)**: Use state-of-the-art models like GPT-4o or Gemini 2.0 for the highest quality dialogue translation.

### Performance Features
- **Translation Bank**: Results are cached locally so you never pay (or wait) for the same string twice.
- **Batch Processing**: Translates up to 80 strings per request, allowing full game translation in minutes.
- **Load Balancing**: Support for multi-node Lingva clusters for extreme throughput.

::: tip Local Setup
For the best experience, we recommend running a local **Lingva Docker Cluster** for instant, free, and private translations.
:::
