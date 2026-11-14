# Game-Native UI Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline, task by task.

**Goal:** Implement the eight approved game-native UI improvements and both fight modes.
**Architecture:** Extend current views with shared game-owned asset/action modules,
primitive record navigation, detached map previews and persisted layout helpers.
**Tech Stack:** Plain JavaScript, Vue 2, Vuetify 2, MV/MZ NW.js, Node test runner.
**Spec:** `.planning/specs/2026-11-13-game-native-ui-design.md` (approved).

## Constraints
- Preserve existing uncommitted work; no commit/release or framework migration.
- Support older MV NW.js; no live engine records/arrays in Vue state.
- Resolve game-owned resources/actions in pop-outs; optional assets must not make
  game ImageManager readiness fail. No scripts evaluated for previews/discovery.

## Review Focus
- Missing/encrypted optional images, stale portrait callbacks: Task 1.
- Ambiguous actor identity and unavailable/last party member: Tasks 1/2.
- Stale map events, variable troop IDs, cyclic common events: Task 3.
- Preview reads changing the current map or racing another request: Task 4.
- Pointer leaks, viewport shrink, destroyed drag listeners: Task 5.

## Task 1: Shared Assets And Actor Navigation
Files: create `js/runtime/GameAssets.js`, `components/GameAsset.js`,
`js/ui/RecordNavigation.js`; update portraits, tooltips, actor/inventory/database
views, MessageText and CheatModal. Create `tests/unit/game-assets.test.mjs`.
- [x] Write/run failing descriptor, crop, loading and cache tests; cover navigation in browser tests.
- [x] Implement `createGameAssets(game, loader?)` with `describe(kind,id)`,
  `paint(canvas,descriptor)`; private engine Bitmaps, bounded cache, optional errors.
- [x] Export `assetFrame(descriptor,image,manager)` and `requestActorNavigation(id)`.
  Actor requests carry primitive IDs, route to Stats and select after mount.
- [x] Show icons/portraits in shared labels, actor rows and history; preserve
  confirmed actorId in message metadata. Add optional game font registration.
- [x] Run unit/browser cases including separate-window canvas and navigation.

## Task 2: Party Controls
Files: create `js/runtime/ActorActions.js`; update FeatureRuntime/ActorSettingPanel.
Test: `tests/unit/actor-actions.test.mjs`.
- [x] Write/run failing valid recruitment/removal and last-member validation tests.
- [x] Implement `createActorActions(game).setPartyMember(id,include)` using engine
  methods, validate session/IDs/party count and actual result; keep arrays intact.
- [x] Add confirmed recruitment/removal and status bulk-clear controls. Reuse
  existing skill/state operations; enhance their labels and game icons.
- [x] Verify party snapshots refresh without losing selected actor.

## Task 3: Enemy Cards And Both Fight Actions
Files: create `js/runtime/MapBattleEvents.js`; update BattleActions,
DatabaseDetails, DatabaseEditorPanel and MainComponent/window-init.
Test: `tests/unit/map-battle-events.test.mjs`.
- [x] Write/run failing variable troop, common-event cycle and stale/busy tests; browser covers direct troop.
- [x] Implement `createMapBattleEvents(game).list(enemyId)` and `.start(reference)`;
  inspect active event lists/common references without executing code, call the
  actual event's start method only after revalidation.
- [x] Extend enemy cards with images, available descriptions, base drop chances.
- [x] Add selected-enemy standalone fight and confirmed original-event action.
  Return focus/close overlay on successful action; retain existing troop/roster UI.
- [x] Verify standalone and original-event paths remain distinct.

## Task 4: Detached Map Previews
Files: refactor MapArtwork to explicit map context; create
`js/runtime/MapPreviews.js`, `components/MapPreview.js`; update TeleportPanel.
Test: `tests/unit/map-previews.test.mjs`.
- [x] Write/run failing detached-map cache tests; add failure/retry coverage.
- [x] Add `render(mapData?,mapId?)` to artwork without swapping live game globals.
  Implement `createMapPreviews(game).load(id)` using game-relative JSON requests.
- [x] Add Preview action/dialog with dimensions, selected destination marker,
  explicit transfer only, stale-request cancellation and missing-art fallback.
- [x] Verify full-map live renderer still works and current map/player are unchanged.

## Task 5: Resizing And Minimap Move Mode
Files: create `js/ui/LayoutGeometry.js`, `components/OverlayResize.js`;
update CheatModal, AppearancePanel, MainComponent, MinimapOverlay/Panel/State.
Test: `tests/unit/layout-geometry.test.mjs` and browser drag/resize checks.
- [x] Write/run failing geometry/viewport-clamp tests; browser covers persisted positions.
- [x] Implement bounded resize/position helpers and document-level pointer lifecycle.
  Persist at gesture end; provide numeric/reset alternatives and cleanup.
- [x] Persist native popup size on debounced NW.js resize, retain resizable frame.
- [x] Add explicit Move mode, input isolation, X/Y and reset in minimap controls.
- [x] Verify normal minimap is click-through, move mode consumes pointer input.

## Completion
- [x] Run all unit/browser checks, TypeScript, MV syntax scan, diff whitespace check.
- [x] Document functionality and actual-NW.js manual-test gaps. Update ledger below.

## Execution Ledger
- All five implementation tasks completed in the existing feature branch/workspace.
- Unit suite: 94 passed. Browser suite: 72 checks passed, including the actual
  separate-window bootstrap, actor selection, party changes, distinct fight paths,
  destination previews, font preference, resize persistence and minimap input.
- TypeScript and old-MV syntax scan (125 files) passed; docs build and whitespace
  checks passed. Initial focused regressions were observed failing before fixes.
- Fresh focused review found four blockers: asynchronous malformed encrypted-image
  errors, Move-mode canvas input leaks, interrupted drags and swallowed portrait
  row clicks. Added regressions and fixed all four. Reviewer recheck found no
  remaining P1/P2 blockers in those fixes.
- Optional encrypted success/corruption paths are covered with engine-contract
  fixtures; actual encrypted game files, native NW.js popup resizing, old-runtime
  focus/touch behavior and customized battle plugins still need in-game testing.
- The browser harness is intentionally isolated and omits CDN layout CSS; it is
  not a pixel-perfect visual/typography test. Off-screen inventory painting is
  exercised explicitly; real-game styling remains a manual check.
- No game files, saves, commits, releases or versions changed by this task.
