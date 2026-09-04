# Changelog

## v1.6.0 - Latest

### Appearance & Event Analysis
- [Feat] **Appearance Panel**: Added window opacity slider (10–100%), dark mode toggle, and primary accent color picker, persisted via `CheatUiSettings`.
- [Feat] **Event Analyzer Panel**: Added Event Sequence Analyzer for Common, Map, and Battle events with command tree, branch/choice visualization, and sequence tracing (`EventDatabase`, `SequenceTracer`, `CommandParser`).
- [Feat] **SaveRecall Flags**: Added preset flags (e.g. Boss Area, shop, checkpoint) plus custom flag input to Save/Recall locations, shown as chips in the location table.
- [Tweak] **CheatModal Polish**: Binds Vuetify dark theme, hover-to-opaque window fading, larger default size (750x450), and registers Appearance/EventAnalyzer panels.
- [Fix] **Game Root Paths**: Replaced hardcoded `./www/cheat-settings` with `getGameRootDir()` across SpeedCheat, diagnostics, shortcuts, storage, and translation settings for correct MV (`www/`) vs MZ (`/`) resolution.
- [Chore] **Ignore Opencode**: Added `.opencode/` to `.gitignore`.
- [Tweak] **Version Bump**: Bumped version to `1.6.0`.

---

## v1.5.5

### Battle, UI & Panel Enhancements
- [Feat] **One-Hit Kill**: Added a One-Hit Kill toggle to the Battle panel that forces all player hits to instantly defeat enemies.
- [Feat] **Sidebar Visibility Toggle**: Added a toggle to show/hide the CheatModal sidebar, giving more screen space during gameplay.
- [Feat] **Teleport to Map Center**: Added an option in the Teleport panel to instantly warp the player to the center of the current map.
- [Feat] **Hide Nameless Items Default**: Items panel now hides nameless entries by default, with the setting persisted across tab switches.
- [Feat] **Variable Value Type Filter**: Added filter controls in the Variables panel to show only positive, negative, or zero/unset values.
- [Tweak] **Version Bump**: Bumped version to `1.5.5`.

---

## v1.5.4

### Nameless Filter Fix
- [Fix] **Variables Hide Nameless**: Fixed Issue #3 where enabling Hide Nameless in the Variables panel hid every variable.
- [Fix] **Switches Hide Nameless**: Fixed the sibling Switches panel behavior so placeholder names stay visible while truly nameless switches can be hidden.
- [Chore] **Test Folder Placeholders**: Added tracked `tests/MV` and `tests/MZ` placeholders without committing local game folders.
- [Tweak] **Version Bump**: Bumped version to `1.5.4`.

---

## v1.5.3

### Variable Editing Fix
- [Fix] **Variable Numeric Values**: Coerced numeric-looking values entered in the Variables panel before writing to `$gameVariables`, preventing game events from concatenating strings such as `99` + `10` into `9910`.
- [Docs] **Build Commands**: Added release package and Windows installer build commands to the README.
- [Tweak] **Version Bump**: Bumped version to `1.5.3`.

---

## v1.5.2

### Security Maintenance
- [Security] **CodeQL Hardening**: Restricted release workflow token permissions to least privilege.
- [Security] **Preview Server Path Safety**: Removed the manual preview file-open path that depended on request input.
- [Security] **Dummy Translator Responses**: Returned dummy translator output as plain text to avoid reflected HTML/script interpretation.
- [Security] **Dummy Translator Parser**: Replaced the Unicode escape regex with a linear parser to avoid ReDoS risk.
- [Security] **Vue Runtime Guard**: Blocked unsafe reactive keys such as `__proto__`, `constructor`, and `prototype` in the bundled Vue runtime.
- [Security] **Dependency Cleanup**: Removed unused Mermaid dependencies and moved the docs toolchain off vulnerable Vite 5.
- [Tweak] **Version Bump**: Bumped version to `1.5.2`.

---

## v1.5.1

### Watcher & Inventory Stability
- [Fix] **Inventory/Yanfly Compatibility**: Avoided observing live RPG Maker item database objects in Vue state, fixing Yanfly item category crashes in MV games.
- [Fix] **Separate Window Watcher**: Restored Watch panel behavior in pop-out window mode by bridging live RPG Maker globals, including self switches.
- [Fix] **Shared Watch Storage**: Moved Watch list persistence to shared `cheat-settings/watcher.json` with legacy localStorage migration.
- [Tweak] **Compact Watch Tables**: Reduced Facing Event and Nearby Map References table spacing for better visibility in the cheat window.
- [Tweak] **Version Bump**: Bumped version to `1.5.1`.

---

## v1.5.0

### Installer Save Editor
- [Feat] **Save File Editor**: Added a Save Editor to the Windows installer for RPG Maker MV/MZ local save files.
- [Feat] **Structured Save Editing**: Added human-friendly fields for gold, actor basics, actor parameter bonuses, and inventory quantities.
- [Feat] **Raw JSON Editor**: Added a raw JSON editor for advanced save edits while keeping structured editing available.
- [Fix] **Safe Save Writes**: Save edits now create a timestamped backup, flush changes to disk, and verify by reading the save back.
- [Tweak] **Version Bump**: Bumped version to `1.5.0`.

---

## v1.4.0

### Variable & Switch Watcher
- [Feat] **Watcher Panel**: Added a new Watcher panel for live tracking RPG Maker variables and switches while playing.
- [Feat] **Nearby Map References**: Added contextual discovery for map events that reference switches, variables, and self switches, sorted with the closest events first.
- [Feat] **Optional Watch Overlay**: Added a compact in-game overlay for watched values, disabled by default and only enabled when the user opts in.
- [Feat] **Variable/Switch Panel Integration**: Added watch-list buttons directly to the Variables and Switches panels.
- [Tweak] **Version Bump**: Bumped version to `1.4.0`.

---

## v1.3.4

### Mouse Controls & Dev Sync
- [Feat] **Enable Mouse Controls**: Added a General panel toggle that restores mouse/touch menu interaction and click-to-move in games that disable RPG Maker touch input.
- [Fix] **YEP TouchInput Disabler Compatibility**: Bypasses disabled `TouchInput` checks while mouse controls or mouse teleport are enabled, then restores the game's original behavior when disabled.
- [Fix] **Dev-Sync Windows Paths**: Fixed junction creation for test games whose folder paths contain shell-special characters such as `&`.
- [Tweak] **Version Bump**: Bumped version to `1.3.4`.

---

## v1.3.3

### Installer Patch
- [Fix] **Archive Extraction**: Fixed installer rejection of valid release archives containing a root `.` tar entry.
- [Tweak] **Version Bump**: Bumped version to `1.3.3`.

---

## v1.3.2

### Windows Installer
- [Feat] **Installer GUI**: Added a Tkinter-based installer for RPG Maker MV/MZ games with game detection, install, status, restore, and uninstall actions.
- [Feat] **Portable Windows Package**: Added a PyInstaller build that creates `RPGMakerCheatInstaller-v{version}-windows.zip` with the installer EXE and MV/MZ release archives.
- [Feat] **Installer Backups**: Added separate `original-game` and `plugin-version` backups so uninstall restores original game files while Restore Old Plugin can roll back plugin updates.
- [Fix] **Safe Uninstall Fallback**: If no original backup exists, uninstall disables the cheat loader while keeping the patched game bootable.
- [Fix] **Installer Version Metadata**: Installer, deploy, and dev-sync now normalize version metadata with a `v` prefix.
- [Tweak] **Version Bump**: Bumped version to `1.3.2`.

---

## v1.3.1

### Inventory UI Improvements
- [Feat] **Inventory Price Toggle**: Added an optional `Price` column for item, weapon, and armor tables.
- [Feat] **Inventory Detail Columns**: Added optional `Effects` and `Params` columns with compact two-line previews and tooltips.
- [Fix] **Inventory Sorting**: Improved `Effects` and `Params` sorting so high-value entries sort by numeric strength instead of raw text.
- [Tweak] **Version Bump**: Bumped version to `1.3.1`.

---

## v1.3.0

### Stability & Compatibility
- [Fix] **RPG Maker MV Compatibility**: Restored support for older MV NW.js runtimes by removing parser-incompatible syntax and hardening legacy bootstrap behavior.
- [Fix] **Overlay Reliability**: Restored cheat modal shortcut wiring and improved overlay startup behavior across MV and MZ games.
- [Fix] **Panel Stability**: Fixed General panel runtime sync issues and stopped Save Recall from triggering live translation requests on open.
- [Fix] **Shortcuts & Scene Safety**: Improved save/load and general shortcut behavior during scene transitions and busy runtime states.

### Diagnostics & Tooling
- [Feat] **About Panel**: Added a runtime diagnostics panel with cheat, game, engine, translation, and environment details.
- [Feat] **Diagnostics Logging**: Added runtime logging, session diagnostics, and support-oriented troubleshooting details.
- [Feat] **Repository Checks**: Added MV compatibility scanning, smoke-testing guidance, and a combined repo verification workflow.
- [Feat] **Deploy Validation**: Added deploy/dev-sync validation checks and improved packaging/version handling.

### Architecture & Maintainability
- [Refactor] **Translation Runtime**: Split translation runtime into focused modules and organized in-game translation files under the translation domain.
- [Refactor] **Cheat & Shortcut Domains**: Organized cheat actions, shortcuts, runtime, storage, and UI helpers into clearer subsystem folders.
- [Refactor] **Panel State Layer**: Introduced dedicated state modules for major panels and clarified the panel view/state architecture.

---

## v1.2.2

### Metadata & Maintenance
- [Tweak] **Project Keywords**: Added `"translation-tool"` and `"cheat-engine-program"` for better discoverability.
- [Misc] **Version Bump**: Bumped version to `1.2.2`.

---

## v1.2.1

### dev-sync & maintenance
- [Fix] **Prettier Configuration**: Formalized project-wide formatting (2-space, semi, double quote) with `.prettierrc` and a simplified `pnpm run format` command.
- [Feat] **dev.py versioning**: Added `--version` flag to `dev.py` to allow custom strings in `cheat-version-description.json`.

### Bug Fixes
- [Fix] **Quick Save/JsonEx Crash**: Resolved a critical crash (`TypeError: Cannot read properties of undefined (reading 'name')`) that occurred during saving when Vue reactivity watchers were accidentally injected into RPG Maker's `Game_Actor` or `Game_Enemy` instances.

---

## v1.2.0

### What's New in v1.2.0
**Features**
- [Feat] **Map Events Panel**: Full visual map overlay showing player, events, enemies, and treasures.  (Credits: @Justype)
- [Feat] **Click to Teleport**: Instant movement by clicking any walkable tile on the map overlay.
- [Feat] **Map Intel**: Real-time hover details for coordinates, passability, and event identity.
- [Feat] **Toast Notifications**: Added interactive feedback/toasts for No Clip, Force Save, and Encounter toggles.
- [Feat] **Fullscreen Window mode**: Added `isWindow` prop to `CheatModal` for better fullscreen pop-out support.
- [Feat] **Dynamic View & Zoom**: Toggle between 25x25 local tracking and full map view with adjustable zoom slider.

**Bug Fixes**
- [Fix] **Ultimate Force Save**: Enhanced save scene guard and visibility for bypassing restricted game saves.
- [Fix] **TP Recovery**: Disabled automatic TP recovery in battle to prevent conflicts with custom TP-based mechanics. (Credits: @Justype)
- [Fix] **UI Alignment**: Standardized all panel components with `dense` styling for pixel-perfect vertical alignment.
- [Fix] **Table Stability**: Fixed re-sorting and focus issues, and updated all item tables with **Pagination** support.
- [Fix] **CI/CD**: Migrated GitHub Actions to use `pnpm` for faster, more reliable builds.

**Modern Documentation**
- [Docs] **VitePress Overhaul**: Complete documentation restructure with setup guides, visuals, and development workflows.
- [Docs] **Dev-Sync 2.0**: Improved scanning for local test games and interactive selection in `dev.py`.

**Internationalization**
- [I18n] Completed 100% English translation of all remaining UI strings, including the new Map Panel.

---

## v1.1.2

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
- **Repo URL Correction**: Fixed the GitHub API path for version checking (Eduwill -> Eduwilll).
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
- Added game speed acceleration (x0.1 ~ x10)
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
