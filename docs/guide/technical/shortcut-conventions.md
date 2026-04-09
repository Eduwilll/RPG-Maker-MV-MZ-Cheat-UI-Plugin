# Shortcut Conventions

This page defines the current shortcut pattern for contributor work. The goal is to keep global shortcut behavior predictable and keep panel-side shortcut editing separate from gameplay actions.

## Core rules

- Define shortcut metadata in `shortcuts/ShortcutConfig.js`.
- Keep runtime shortcut persistence and migration in the shortcut subsystem, not in panels.
- Make shortcut actions call cheat helpers such as `GeneralCheat`, `BattleCheat`, or `SceneCheat`, not Vue panel methods.
- Keep parameter validation next to the shortcut parameter definition.
- Let `GlobalShortcut.js` remain the runtime coordinator for loading, binding, and updating shortcuts.

## Shortcut layers

Current shortcut responsibilities are split like this:

- [ShortcutConfig.js](C:\Users\Eduardo\Documents\MV-MZ-PLUGINS\RPG-Maker-MV-MZ-Cheat-UI-Plugin-Translate\cheat-engine\www\cheat\js\shortcuts\ShortcutConfig.js)
  - shortcut catalog
  - parameter descriptions
  - parameter validation and conversion
  - bound enter, repeat, and leave actions
- [ShortcutMigration.js](C:\Users\Eduardo\Documents\MV-MZ-PLUGINS\RPG-Maker-MV-MZ-Cheat-UI-Plugin-Translate\cheat-engine\www\cheat\js\shortcuts\ShortcutMigration.js)
  - migration for older settings files
  - conflict cleanup for stale bindings
- [ShortcutStorage.js](C:\Users\Eduardo\Documents\MV-MZ-PLUGINS\RPG-Maker-MV-MZ-Cheat-UI-Plugin-Translate\cheat-engine\www\cheat\js\shortcuts\ShortcutStorage.js)
  - persisted shortcut settings I/O
- [GlobalShortcut.js](C:\Users\Eduardo\Documents\MV-MZ-PLUGINS\RPG-Maker-MV-MZ-Cheat-UI-Plugin-Translate\cheat-engine\www\cheat\js\GlobalShortcut.js)
  - runtime coordinator
  - keymap registration
  - conflict checks
  - write-through updates for shortcut edits
- [ShortcutPanelState.js](C:\Users\Eduardo\Documents\MV-MZ-PLUGINS\RPG-Maker-MV-MZ-Cheat-UI-Plugin-Translate\cheat-engine\www\cheat\js\shortcuts\ShortcutPanelState.js)
  - panel-safe view-state building for shortcut rows and parameters

## Action rule

Shortcut actions should reuse cheat helpers instead of duplicating behavior.

Good examples:

- `GeneralCheat.toggleNoClip()`
- `BattleCheat.recoverAllParty()`
- `SceneCheat.quickSave(slot)`
- `SpeedCheat.setSpeed(speed)`

Avoid:

- calling panel methods from the shortcut catalog
- reading Vue component state from shortcut actions
- placing shortcut action logic inside `ShortcutPanel.js`

## Parameter rule

When a shortcut needs editable parameters:

1. define the parameter schema in `ShortcutConfig.js`
2. keep validation in `isInvalidValue(...)`
3. keep normalization in `convertValue(...)`
4. let `GlobalShortcut.setParam(...)` write the final value

That keeps the panel simple and keeps runtime behavior consistent even if another editor for shortcuts is added later.

## Panel rule

`ShortcutPanel.js` should treat shortcut settings as view-state, not as the source of truth.

Current shared helper:

- [ShortcutPanelState.js](C:\Users\Eduardo\Documents\MV-MZ-PLUGINS\RPG-Maker-MV-MZ-Cheat-UI-Plugin-Translate\cheat-engine\www\cheat\js\shortcuts\ShortcutPanelState.js)

Current pattern:

- build panel rows from `GLOBAL_SHORTCUT.shortcutSettings` and `GLOBAL_SHORTCUT.shortcutConfig`
- edit through `GLOBAL_SHORTCUT.setShortcut(...)`
- edit parameters through `GLOBAL_SHORTCUT.setParam(...)`
- reload panel rows from the runtime coordinator after changes

## What not to do

- do not duplicate shortcut-row shaping logic inside panels
- do not bypass `GlobalShortcut` when writing shortcut changes
- do not spread shortcut validation across multiple files
- do not make shortcut actions depend on currently-open panels

## Current exemplars

- [GlobalShortcut.js](C:\Users\Eduardo\Documents\MV-MZ-PLUGINS\RPG-Maker-MV-MZ-Cheat-UI-Plugin-Translate\cheat-engine\www\cheat\js\GlobalShortcut.js)
- [ShortcutConfig.js](C:\Users\Eduardo\Documents\MV-MZ-PLUGINS\RPG-Maker-MV-MZ-Cheat-UI-Plugin-Translate\cheat-engine\www\cheat\js\shortcuts\ShortcutConfig.js)
- [ShortcutPanel.js](C:\Users\Eduardo\Documents\MV-MZ-PLUGINS\RPG-Maker-MV-MZ-Cheat-UI-Plugin-Translate\cheat-engine\www\cheat\panels\ShortcutPanel.js)
