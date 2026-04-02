# Changelog

## v1.1.2 — Latest

### What's New in v1.1.2
**Features**
- [Feat] Added "Pop Out" standalone window mode (NW.js).
- [Feat] Dynamic test game scanning and interactive selection in `dev.py`.

**Bug Fixes**
- [Fix] Resolved `ReferenceError` crashes in Web Preview (Expanded mocks).
- [Fix] Implemented `Cache-Control: no-store` in dev server for instant UI updates.
- [Fix] Resolved `parentId` recursion crash in `SaveRecallPanel`.
- [Fix] Fixed `KeyValueStorage` naming collisions in browser environments.

**Performance**
- [Tweak] Set Pop Out window to not stay always-on-top by default for better multitasking.

---

## v1.1.1

### What's New in v1.1.1
**Features**
- **Dev-Sync**: Link source directly to games using `deploy/dev.py`.
- **Web-UI Preview**: Develop in browser with `start-preview.py`.
- **Force Save**: Bypasses game save restrictions.
- **Debug Tools**: NW.js Console & F9 Debug Menu access.
- **Mouse Teleport**: Click to teleport (`Alt + M` toggle).
- **UI Refactor**: Modern, compact grid for General Panel.

**Bug Fixes**
- **MV Crash**: Fixed `SyntaxError` in old Chromium versions by removing optional chaining.
- **Build Paths**: Deploy script now correctly outputs to project root.
- **Git**: Optimized `.gitignore` for test directories.

**Performance**
- **Hot Reloading**: Dev-Sync enables sub-second iteration times.

---

## v1.1.0

### What's New in v1.1.0
**Features**
- **LLM Translation Engine**: Integrated support for local and cloud LLMs (Ollama, OpenAI, Google Gemini) via OpenAI-compatible APIs.
- **Pre-configured AI Endpoints**: New optimized presets for Ollama (Local), OpenAI (GPT-4o-mini), and Google Gemini (2.0-flash).
- **Custom LLM Support**: Added ability to connect to any OpenAI-compatible inference server (LM Studio, vLLM, DeepSeek, etc.).
- **Docker-Compose Suite**: Updated `docker-compose.yml` to include a pre-configured Ollama service alongside the Lingva cluster.
- **Automated Releases**: New CI/CD pipeline that automatically builds and packages MV/MZ versions when tags are pushed.

**Bug Fixes**
- **Repo URL Correction**: Fixed the GitHub API path for version checking (Eduwill → Eduwilll).
- **404 Handling**: Improved node rotation logic to gracefully handle 404/500 errors from specific failover endpoints.
- **I/O Bottleneck**: Resolved a major performance hit caused by synchronous disk writes in the translation bank.
- **Public API Stability**: Enhanced rate-limit handling (429 errors) with exponential backoff and 1.5s request gaps.

**Performance**
- **Translation Speed**: Optimized the engine to handle a full game (13k+ strings) in ~83 seconds (up from 24 minutes) using local Docker nodes.
- **Load Balancing**: Implemented a 3-node load balancer for Lingva clusters, increasing throughput to ~161 strings/sec.
- **High-speed Batching**: New LLM batch engine that packs up to 80 strings or 4000 characters into a single request.

---

## v1.0.22

**Features**
- RPG Maker MV/MZ Cheat UI + Translation initial integration improvements.
- Added **Mouse Teleport** and **Force Save** capabilities.

---

## v1.0.3

- Added support for RPG Maker MZ games
- Added game speed acceleration (×0.1 ~ ×10)
- Added selectable speed scope: all scenes or battle only
- Added random encounter on/off toggle
- Added force encounter option
- Added force victory / defeat / escape / abort from battle
- Added fill TP for enemies and party
- Fixed error that occurred when loading a save with god mode enabled

## v1.0.2

- Added customizable shortcut keys
- UI improvements and layout refinements
- Fixed a bug where clicking the cheat window affected game input

## v1.0.1

- Added shortcut functions (quick save, quick load, goto title, no-clip toggle)
- Various UI improvements

## v1.0.0

- Initial release
- GUI-based cheat window for RPG Maker MV
- Edit stats, gold, speed, items, variables, switches
- No-clip mode, god mode
- Save and recall location, teleport
- Item, variable, and switch search
- Developer tools integration
