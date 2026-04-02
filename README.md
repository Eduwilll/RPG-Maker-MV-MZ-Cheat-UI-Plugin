# RPG Maker MV/MZ Cheat UI + Translation

<p align="left">
  <a href="https://github.com/Eduwilll/RPG-Maker-MV-MZ-Cheat-UI-Plugin/releases">
    <img src="https://img.shields.io/github/v/release/Eduwilll/RPG-Maker-MV-MZ-Cheat-UI-Plugin" alt="GitHub Release" />
  </a>
  <a href="https://github.com/Eduwilll/RPG-Maker-MV-MZ-Cheat-UI-Plugin/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/Eduwilll/RPG-Maker-MV-MZ-Cheat-UI-Plugin" alt="License" />
  </a>
  <a href="https://github.com/Eduwilll/RPG-Maker-MV-MZ-Cheat-UI-Plugin/stargazers">
    <img src="https://img.shields.io/github/stars/Eduwilll/RPG-Maker-MV-MZ-Cheat-UI-Plugin?style=social" alt="GitHub Stars" />
  </a>
  <a href="https://github.com/Eduwilll/RPG-Maker-MV-MZ-Cheat-UI-Plugin/network/members">
    <img src="https://img.shields.io/github/forks/Eduwilll/RPG-Maker-MV-MZ-Cheat-UI-Plugin" alt="GitHub Forks" />
  </a>
  <a href="https://github.com/Eduwilll/RPG-Maker-MV-MZ-Cheat-UI-Plugin/issues">
    <img src="https://img.shields.io/github/issues/Eduwilll/RPG-Maker-MV-MZ-Cheat-UI-Plugin" alt="GitHub Issues" />
  </a>
  <a href="https://github.com/Eduwilll/RPG-Maker-MV-MZ-Cheat-UI-Plugin/commits/main">
    <img src="https://img.shields.io/github/last-commit/Eduwilll/RPG-Maker-MV-MZ-Cheat-UI-Plugin" alt="GitHub Last Commit" />
  </a>
  <a href="https://github.com/Eduwilll/RPG-Maker-MV-MZ-Cheat-UI-Plugin/pulls">
    <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome" />
  </a>
  <br/>
  <a href="https://deepwiki.com/Eduwilll/RPG-Maker-MV-MZ-Cheat-UI-Plugin">
    <img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki" />
  </a>
</p>

A powerful, GUI-based cheat tool for RPG Maker MV and MZ games, featuring **Real-time Machine Translation** support.

---

### 📖 [Full Documentation Site](https://eduwilll.github.io/RPG-Maker-MV-MZ-Cheat-UI-Plugin/)
Check out our [Documentation](https://eduwilll.github.io/RPG-Maker-MV-MZ-Cheat-UI-Plugin/) for detailed guides on:
- **[Installation Guide](https://eduwilll.github.io/RPG-Maker-MV-MZ-Cheat-UI-Plugin/guide/introduction/getting-started)**
- **[Translation & AI Setup](https://eduwilll.github.io/RPG-Maker-MV-MZ-Cheat-UI-Plugin/guide/translation/translation-usage)**
- **[Full Engine Reference](https://eduwilll.github.io/RPG-Maker-MV-MZ-Cheat-UI-Plugin/guide/features/features)**
- **[Keyboard Shortcuts](https://eduwilll.github.io/RPG-Maker-MV-MZ-Cheat-UI-Plugin/guide/features/shortcuts)**

---

## 📸 UI Samples
<p float="left">
  <img src="https://user-images.githubusercontent.com/99193603/153754676-cee2b96e-c03a-491f-b71c-3c57d6dcc474.JPG" width="24%"/>
  <img src="https://user-images.githubusercontent.com/99193603/153754683-4e7a09a5-2d31-436d-8546-7a5d658eb282.JPG" width="24%"/>
  <img src="https://user-images.githubusercontent.com/99193603/153754687-732648c8-3483-42bb-9634-dd22d674dfed.JPG" width="24%"/>
  <img src="https://user-images.githubusercontent.com/99193603/153754696-0cbc76f9-99fa-47a7-a0d0-6510a2f76e01.JPG" width="24%"/>
</p>

---

## 🔥 Features
- **Cheat Panel**: Gold, Stats, Speed, Items, Weapons, Armors, Skills, and more.
- **World Hacks**: Wall-through (Noclip), God Mode, Disable Encounters.
- **New Utilities**: 
  - **Force Save**: Overrides game-level save restrictions.
  - **Debug Access**: Instant access to NW.js Console and RPG Maker Debug (F9) Menu.
  - **Mouse Teleport**: Move your player instantly with `Alt + M` (toggle) and click!
  - **Pop Out Window**: Launch the Cheat UI in a separate standalone window for better multitasking.
- **Smart Translation**: Real-time translation for Variables, Switches, Maps, and Items.
  - Supports **Lingva Translate** (Free/Private Google Translate alternative).
  - **Translation Bank**: Caches results for instant loading.
  - **Batch Processing**: Translates hundreds of items in seconds.
- **Customizable Shortcuts**: Full control over key bindings.

---

## 🛠️ Installation

### Step 1: Download
Get the latest `-core.tar.gz` package for your engine from the [Releases](https://github.com/Eduwilll/RPG-Maker-MV-MZ-Cheat-UI-Plugin/releases) page.

### Step 2: Copy Files
Extract the archive and copy the `js/` and `cheat/` folders into your game directory:

| Engine | Copy To | File to Backup/Replace |
|--------|---------|-------------------------|
| **RPG Maker MV** | `{game_folder}/www/` | `www/js/main.js` |
| **RPG Maker MZ** | `{game_folder}/` | `js/main.js` |

> [!CAUTION]
> **Backup your original `main.js` first!** This plugin must replace the game's entry point to inject the cheat UI.

### Step 3: Run
Launch the game and press **`Ctrl + C`** to toggle the menu. It starts semi-transparent in the top-right corner.

---

## 🐳 Self-Hosting Lingva (Docker)
For maximum speed and 100% privacy, you can run Lingva locally on your computer.

### Option 1: Single Instance (Fast)
```bash
docker run -d -p 3000:3000 thedaviddelta/lingva-translate
```
- In plugin settings, select: **"Local Lingva Docker (Port 3000)"**.

### Option 2: 3-Node Cluster (Balanced/Extreme Speed)
We provide a `docker-compose.yml` in this repository to run a 3-instance cluster on ports 3000, 3001, and 3002.
```bash
docker-compose up -d
```
- In plugin settings, select: **"Local Lingva Docker (Ports 3000, 3001, 3002 Balanced)"**.

---

## 🛠️ Development & UI Preview

We provide professional tools to speed up UI development and game integration.

### 1. Web-UI Preview (Browser Development)
Develop your Vue/Vuetify UI directly in your browser with near-instant updates. No game restart required!
```powershell
.venv\Scripts\python.exe start-preview.py
```
- Open `http://localhost:8080/preview/index.html` in your browser.
- **Improved Stability**: Now includes comprehensive RPG Maker engine mocks (`$game*`, `$data*`) and **Automatic Cache-Busting** for instant UI development.

### 2. Dev-Sync (Auto-Injection & Symlinking)
Link your development folder to a test game. Any saved changes in your IDE are instantly visible in the game (press `F5`).
```powershell
# Setup for any game
.venv\Scripts\python.exe deploy\dev.py --game-path "C:/MyTestGame"

# Quick setup for local test folders (Includes Interactive Selection)
.venv\Scripts\python.exe deploy\dev.py --mv
.venv\Scripts\python.exe deploy\dev.py --mz
```

---

## ⚡ Translation Performance Benchmarks

Real benchmarks translating a full RPG Maker game **(13,338 unique strings)** — Japanese → English:

| Endpoint | Time | Throughput | Batches | Avg Latency (p50) | Errors | Success Rate |
|---|---|---|---|---|---|---|
| **3-Node Docker Balanced** | **1m 23s** | 161 str/s | 467 | 4,055ms | 4 timeouts | 99.3% |
| **Single Docker** | **3m 40s** | 61 str/s | 473 | 12,517ms | 11 timeouts | 99.0% |
| **Public API (lingva.ml)** | **48m 33s** | 4.6 str/s | 784 | 3,684ms | 3 (404 fallback) | 99.9% |

> **💡 Recommendation:** Use the **3-Node Docker Balanced** setup for bulk translation. It is **35× faster** than the public API and avoids Cloudflare rate limiting.

### Metrics Console Output
After each translation, a detailed metrics report is printed to the developer console:
```
════════════════════════════════════════════════════════════
  TRANSLATION METRICS REPORT
════════════════════════════════════════════════════════════
  Total wall-clock time:   1m 23s
  Strings translated:      13,338
  Throughput:              160.9 strings/second
  ─────────────────────────────────────────
  HTTP Requests made:      471
  Total batches:           467
  Avg batch size:          29 items, 779 chars
  ─────────────────────────────────────────
  Latency (min/avg/p50/p95/max): 545/4452/4055/7401/30004 ms
  ─────────────────────────────────────────
  Requests per node:
    http://localhost:3000: 157 requests
    http://localhost:3001: 157 requests
    http://localhost:3002: 157 requests
════════════════════════════════════════════════════════════
```

---

## 🌍 Translation Setup
1. Open Menu (**`Ctrl + C`**) -> **Translation** Tab.
2. Toggle **Enable** ON.
3. Select an **End Point** (e.g., **Lingva JA → EN**).
4. Check **Targets** (Variables, Items, etc.) and click **"Start Translation"**.

---

## 📜 Credits
- **Original Plugin**: [paramonos](https://github.com/paramonos/RPG-Maker-MV-MZ-Cheat-UI-Plugin)
- **Translation Idea**: [sieucapoccho3717](https://github.com/sieucapoccho3717/RPG-Maker-MV-MZ-Cheat-UI-Plugin)
- **Maintained & Enhanced by**: [Eduwilll](https://github.com/Eduwilll/RPG-Maker-MV-MZ-Cheat-UI-Plugin)
