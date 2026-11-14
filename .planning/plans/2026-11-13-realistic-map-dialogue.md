# Realistic Map And Readable Dialogue

Approved scope: actual tiles in Map Events by default, optional radar, live markers,
unchanged click-to-teleport; readable captured dialogue with speaker and face.

## Implementation
1. Add failing regressions for escape decoding, metadata, layered rendering,
   full-map fit and viewport hit testing.
2. Decode known MV/MZ/YEP controls without evaluating scripts or creating actors.
   Snapshot speaker and face metadata, display portraits via game ImageManager.
3. Adapt the game's Tilemap drawing methods to a bounded cached canvas. Preserve
   all tile layers, autotile shapes, shadows and table edges. Resolve the actual
   game window in pop-outs, keep game objects outside Vue observation.
4. Default Map Events to realistic rendering, keep radar and shared viewport
   calculations for drawing, hover and teleport. Refresh all event positions.
5. Run unit, browser, type and old-MV syntax checks; document verified behavior.

## Decisions
- A name mentioned in narration is not a speaker. Prefer explicit MZ/YEP names,
  then an unambiguous actor portrait match; never infer from prose alone.
- Portraits use game loaders for encrypted assets. Missing portraits are optional.
- The rendered map shows tile art and live markers, not viewport-only effects,
  lighting plugins or a full game-screen screenshot.
- No commit, release or changes to game files in this task.
- Do not guess/load an actor's default face just from a speaker name. Games using
  bust plugins may leave nonexistent default face files in Actors.json. Use the
  captured message face (including explicit AF/PF codes), otherwise a placeholder.

## Verification Ledger
- Implemented all five steps. Initial new decoder/viewport/artwork regressions
  failed before implementation, then passed.
- Unit suite: 76 passed; browser suite: 52 checks passed, including actual
  separate-window initialization, shared artwork and portrait crop pixels.
- TypeScript and MV compatibility scan (114 files) passed; docs build passed.
- Read-only VM checks with local MV and MZ core Tilemap implementations passed
  normal tiles and A1/A2/A3/A4 quadrant rendering (18 image draws per engine).
- Reviewed cache bounds, late image recovery, game-realm ownership, literal HTML,
  cyclic substitutions and actor-construction safety. No subagent review available
  after the earlier session's usage limit; reviewed these changes locally.
- Actual NW.js/game executable interaction remains a manual verification step.
  No game files or saves changed; no commit or release created.
