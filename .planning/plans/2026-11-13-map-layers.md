# Map Layers

Goal: saved shared controls for map shadows/upper tiles and NPC, enemy,
item/treasure, other event, player, labels, grid and background visibility.
Changes affect cheat views only. Do not alter game map flags or plugin effects.

Use a game-owned preferences store, a shared Vue MapLayers component and detached
event snapshots. Active battle/reward commands identify marker categories; moving
characters alone must not become enemies. Unsupported scripted pickups remain
other events. Bound command traversal and never execute scripts.

- [x] RED tests for independently disabled tile shadows/upper tiles and cache keys.
- [x] RED tests for settings persistence, marker categories and visibility.
- [x] Implement shared runtime state, classification and UI controls in Map Events
  and Minimap. Apply settings in both renderers and separate-window paths.
- [x] Verify unit, browser, TypeScript and MV compatibility; document limits.

Tile shadows default on. Upper tiles default on. Grid/labels default off.
Existing floating-minimap master event switch is retained. Category toggles refine
it and do not silently enable the minimap or its event switch.

## Verification

140 unit tests and 102 browser checks passed with no browser errors. TypeScript
passed and MV syntax validation passed for 137 files. Focused read-only review
found no P1/P2 issues. Whitespace checks passed excluding unrelated pre-existing
TODO.md changes. Full-game NW.js visual/playback testing remains manual.

Active-page classification replaces the old broad filename/movement heuristics.
Category hints refresh with page and position changes. Names, notes and scripts
are not treated as executable classification instructions. Tile graphics with
baked-in shading, unmarked roofs and plugin-specific lighting cannot be removed.
No commits, releases or changes to installed game copies were performed.
