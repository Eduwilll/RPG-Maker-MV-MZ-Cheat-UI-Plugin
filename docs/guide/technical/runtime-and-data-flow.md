# Runtime and Data Flow

This page explains what happens from game launch to active overlay, and how the translation and storage systems move data around.

## Startup sequence

When the plugin is installed into a game, the startup path is:

1. The game launches the injected `main.js`.
2. That file loads `cheat/init/import.js` before the standard engine scripts.
3. `import.js` creates the app root, injects CSS and libraries, and loads `cheat/init/setup.js`.
4. `setup.js` mounts the Vue app and renders `MainComponent`.
5. `MainComponent` initializes RPG Maker customizations, registers keyboard listeners, and exposes helper actions.
6. `CheatModal` renders the active panel tree.

## UI flow

The top-level UI is intentionally simple:

- `MainComponent` owns visibility state and the current panel.
- `CheatModal` owns navigation and panel switching.
- Each panel is a plain JavaScript Vue component.
- Shared dialogs and snackbars are mounted once at the top level.

This structure keeps the app small enough to run directly inside the game without a bundling pipeline.

## Shortcut flow

Global shortcuts are handled centrally.

- Keydown and keyup events are captured by `MainComponent`.
- Events are normalized into the internal key model.
- `ShortcutConfig.js` defines the shortcut catalog, parameter rules, and bound actions.
- `ShortcutPanelState.js` shapes runtime shortcut data into panel-safe view rows.
- `ShortcutStorage.js` handles persisted shortcut settings.
- `GlobalShortcut.js` loads those mappings and decides whether a shortcut should fire.
- The target action can open the overlay, switch panels, or trigger a gameplay helper.

Because shortcuts are global, contributors should be careful to avoid conflicts with base game controls.

## Reading and writing game state

Panels interact with RPG Maker globals directly.

Common sources include:

- `$gameParty`
- `$gameActors`
- `$gameVariables`
- `$gameSwitches`
- `$dataItems`
- `$dataWeapons`
- `$dataArmors`
- `$dataSystem`
- `$gameMap`

Typical pattern:

1. Read a primitive identifier or display list for the UI.
2. Let the user choose an action.
3. Apply the change back into the relevant RPG Maker global.

Avoid storing live engine objects in Vue state when those objects can later be serialized by the game.

## Storage flow

Persistent plugin state is handled through `KeyValueStorage`.

Behavior differs by environment:

- In NW.js, JSON is read and written through Node's file system APIs.
- In browser preview mode, the same API falls back to `localStorage`.

This lets the same UI code run in both the game and the preview shell.

Typical stored data includes:

- Translation settings
- Translation bank cache
- Shortcuts
- Window and panel preferences

## Translation flow

The translation system is split into batch processing and runtime application.

### Phase 1: collect strings

`TranslateHelper.js` collects text from:

- database arrays such as items, skills, enemies, classes, and actors
- system terms and names
- variables and switches
- map metadata
- common events
- map event dialogue loaded from JSON files in the game's `data/` folder

### Phase 2: translate and cache

The translator:

- checks the selected endpoint
- removes already-cached strings
- builds one deduplicated uncached pool from the selected target groups
- runs category-by-category translation work while updating progress state
- batches the remaining strings through focused helpers
- sends requests to the configured service through endpoint-specific request modules
- stores the result in the translation bank

Key split modules in this flow:

- `TranslateHelper.js` coordinates the overall translation workflow.
- `TranslationBatching.js` handles chunk sizing, batch grouping, and recursive batch fallback.
- `TranslationBasicRequest.js`, `TranslationLingvaRequest.js`, and `TranslationLlmRequest.js` handle endpoint-family-specific requests.
- `TranslationPool.js` and `TranslationWorkflow.js` handle uncached-pool construction and per-target progress flow.

Supported endpoint families visible in the repo include:

- Lingva and local Lingva clusters
- Ollama
- OpenAI-compatible APIs
- Gemini-compatible APIs

### Phase 3: apply cached translations

`InGameTranslator.js` applies the cached results by:

- patching RPG Maker data arrays
- intercepting dialogue windows
- intercepting generic text draw calls
- patching names and menu commands where needed

This means translation during play is intended to be cache-first, not request-first.

## Preview flow

The preview environment is useful for UI work but behaves differently from the real game:

- `start-preview.py` serves the preview folder with cache disabled.
- `preview.js` mounts the same cheat UI in a browser page.
- `rpg-mocks.js` plus preview globals stand in for RPG Maker objects and services.

This is ideal for layout, navigation, and light interaction changes. It is not sufficient for validating every game integration patch or every translation hook.

## Dev-sync flow

When you need real-game testing:

1. Run `deploy/dev.py`.
2. The script detects MV or MZ structure.
3. It copies the right injected `main.js`.
4. It merges support files.
5. It creates a junction or symlink from your source `cheat/` folder into the target game.

After that, editing the source updates the game-linked folder immediately, and pressing <kbd>F5</kbd> in the running game refreshes the client.

## Release flow

Release packaging is handled by `deploy/main.py`:

1. Copy `cheat-engine/www/` to a temp folder.
2. Merge the correct MV or MZ initialization files.
3. Remove `_cheat_initialize/` from the packaged output.
4. Write `cheat-version-description.json`.
5. Produce `tar.gz` archives under `output/`.

GitHub Actions uses the same script when a version tag is pushed.

## Contributor checkpoints

Before merging a change, verify the right layer:

- UI-only changes: preview mode plus at least one in-game check.
- Engine patches: in-game verification on the affected engine.
- Translation changes: cache behavior, extraction behavior, and runtime display behavior.
- Packaging changes: output archive layout for both MV and MZ.
