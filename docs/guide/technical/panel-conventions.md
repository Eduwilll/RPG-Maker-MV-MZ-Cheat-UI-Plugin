# Panel Conventions

This page defines the current panel pattern for contributor work. The goal is not to force every panel into the same exact shape, but to make common behavior predictable and easier to extend safely.

## Core rules

- Keep panel-local UI state in `data()`.
- Derive display-only values in `computed` when possible.
- Read live RPG Maker objects as late as possible.
- Store lightweight identifiers or primitive values in Vue state instead of live engine objects.
- Prefer small shared helpers for repeated game-state reads over re-implementing the same lookup in every panel.
- After mutating engine state, reload panel state from the game when the panel depends on authoritative runtime values.

## Recommended panel structure

Use this order when practical:

1. `name`
2. `template`
3. `data`
4. lifecycle hooks such as `created`
5. `computed`
6. `methods`

That keeps the user-facing shape easy to scan.

## Read and write pattern

Recommended pattern:

- extract a lightweight row or view-model from the game object
- render and edit that lightweight state in the panel
- resolve the real game object again when applying a change
- refresh the panel state after writes when derived values may have changed

Why:

- it avoids leaking live RPG Maker objects into Vue reactivity
- it makes save serialization safer
- it reduces accidental coupling between the panel and engine internals

## Shared helper rule

If two or more panels need the same kind of game-state lookup, move that behavior into a shared helper.

Current examples:

- [PanelGameState.js](C:\Users\Eduardo\Documents\MV-MZ-PLUGINS\RPG-Maker-MV-MZ-Cheat-UI-Plugin-Translate\cheat-engine\www\cheat\js\panels\PanelGameState.js) centralizes:
  - party actor lookup by id
  - actor parameter extraction
  - general panel runtime snapshot reads
  - normalized panel search matching
  - shared numeric coercion for panel inputs
  - panel-safe state cloning for editable row models
  - shared refresh/reinitialize flow for panels that rebuild local state
  - safe map tree row building
  - safe map path building from map ids
- [PanelTranslation.js](C:\Users\Eduardo\Documents\MV-MZ-PLUGINS\RPG-Maker-MV-MZ-Cheat-UI-Plugin-Translate\cheat-engine\www\cheat\js\panels\PanelTranslation.js) centralizes:
  - cached text lookup for display rows
  - shared translated text fallback for simple label fields
  - shared translated name/description row building
  - common translation-finish refresh listener wiring

This should stay small and practical. It is a helper layer, not a new framework.

## Refresh-after-write rule

When a panel mutation should be followed by a full state refresh, prefer the shared helper:

- [PanelGameState.js](C:\Users\Eduardo\Documents\MV-MZ-PLUGINS\RPG-Maker-MV-MZ-Cheat-UI-Plugin-Translate\cheat-engine\www\cheat\js\panels\PanelGameState.js)

Current helper:

- `runPanelMutation(panel, mutate)`
- `refreshPanelState(panel, reset)`

Use it when the panel already follows the `initializeVariables()` refresh pattern and the write should be immediately reflected back into panel state.

## Current exemplar panels

The current first-pass examples are:

- [GeneralPanel.js](C:\Users\Eduardo\Documents\MV-MZ-PLUGINS\RPG-Maker-MV-MZ-Cheat-UI-Plugin-Translate\cheat-engine\www\cheat\panels\GeneralPanel.js)
- [StatsSettingPanel.js](C:\Users\Eduardo\Documents\MV-MZ-PLUGINS\RPG-Maker-MV-MZ-Cheat-UI-Plugin-Translate\cheat-engine\www\cheat\panels\StatsSettingPanel.js)
- [TeleportPanel.js](C:\Users\Eduardo\Documents\MV-MZ-PLUGINS\RPG-Maker-MV-MZ-Cheat-UI-Plugin-Translate\cheat-engine\www\cheat\panels\TeleportPanel.js)
- [ItemSettingPanel.js](C:\Users\Eduardo\Documents\MV-MZ-PLUGINS\RPG-Maker-MV-MZ-Cheat-UI-Plugin-Translate\cheat-engine\www\cheat\panels\ItemSettingPanel.js)
- [ArmorSettingPanel.js](C:\Users\Eduardo\Documents\MV-MZ-PLUGINS\RPG-Maker-MV-MZ-Cheat-UI-Plugin-Translate\cheat-engine\www\cheat\panels\ArmorSettingPanel.js)
- [WeaponSettingPanel.js](C:\Users\Eduardo\Documents\MV-MZ-PLUGINS\RPG-Maker-MV-MZ-Cheat-UI-Plugin-Translate\cheat-engine\www\cheat\panels\WeaponSettingPanel.js)

These show the intended pattern:

- build lightweight panel rows
- resolve live objects only when writing
- share repeated reads and normalization through a helper

## What not to do

- do not duplicate the same actor lookup logic across multiple panels
- do not keep stale references to live game objects in component state
- do not inline custom search normalization repeatedly when it can be shared
- do not assume map trees are always valid; guard missing or broken map metadata

## Next direction

Later Phase 3B work can extend this with:

- shared panel refresh helpers
- clearer conventions for shortcut-driven panel actions

Current progress already includes:

- shared numeric coercion reused by general, stats, health, item, and map-event style panels
- shared search matching reused by teleport, variable, switch, item-table, and shortcut panels
