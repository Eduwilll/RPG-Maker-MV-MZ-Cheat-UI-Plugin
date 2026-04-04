# Project Architecture Overview

This project provides a unified, cross-version (MV/MZ) cheat interface for RPG Maker games. It runs as an **NW.js overlay**, injecting a Vue.js-based UI directly into the game environment.

## ⚙️ Core System Hooking

The plugin initializes by patching the game's entry point (`js/main.js`). 
- **Template Injection**: The `_cheat_initialize` folder contains pre-configured `main.js` templates for both MV and MZ.
- **Boot Sequence**: The cheat engine hooks into `Scene_Boot` to initialize its reactive state alongside the game's core managers.

## 🖼️ UI Architecture

The interface is built using:
- **Vue.js 2**: Reactive state management.
- **Vuetify 2**: Material Design component library.
- **Shadow DOM / Overlay**: The UI is appended to the game window's document body, ensuring it renders on top of the PIXI.js canvas.

## 💾 Data Management & Persistence

### The JSON Serialization Rule
RPG Maker uses `JsonEx` to serialize the entire game state for save files. 
> [!CAUTION]
> **CRITICAL RULE**: Never store raw RPG Maker game object instances (e.g., `$gameParty.members()[0]`) directly in a Vue component's `data()` or `computed()` properties.
> 
> **Why?** Vue injects `__ob__` (observers) into these objects. When the game tries to save, `JsonEx` fails because it encounters properties with no constructor, causing a fatal crash.

**Standard Pattern:**
1. Store only primitive identifiers (e.g., `actorId`, `variableId`) in Vue state.
2. Perform dynamic lookups against the global game objects (`$gameParty`, `$gameVariables`, etc.) when reading or writing data.

### Storage
- **KeyValueStorage**: A wrapper around local files or `localStorage` to persist plugin settings (e.g., window size, positioning, enabled cheats) across sessions.

## 🛠️ Build & Deployment

The deployment process is automated via Python scripts in the `deploy/` directory:
- `dev.py`: Sets up a **junction (symlink)** between the source and a test game, enabling live hot-reloading (F5) during development.
- `main.py`: Packages the plugin for distribution, handling file minification and versioning.
- **CI/CD**: `.github/workflows/release.yml` automates the creation of GitHub releases when a new tag is pushed.

## 🌍 Version Compatibility (MV vs MZ)
The engine abstracts the differences between RPG Maker versions.
- **MV**: Uses `www/` as the root directory for most assets.
- **MZ**: Uses the project root directly.
- **Global Objects**: The project handles the evolution of objects (like the switch from `$gameParty` to `$gameTroop` lookups) through centralized helper methods.
