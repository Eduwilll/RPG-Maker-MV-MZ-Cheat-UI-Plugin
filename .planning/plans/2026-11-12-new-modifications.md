# New Modifications Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development for independent feature slices and test-first implementation. Do not commit or deploy without a separate user request.

**Goal:** Implement the seven approved TODO feature groups without changing original game database files.

**Architecture:** One game-window-owned feature runtime holds save overrides, locks, history, battle actions, and options. Both Vue UI modes consume detached snapshots through the same runtime. Existing panel/state folders and shortcut infrastructure remain in use.

**Tech Stack:** Plain JavaScript with JSDoc, Vue 2, Vuetify 2, RPG Maker MV/MZ, Node built-in tests.

**Spec:** `.planning/specs/2026-11-12-new-modifications-design.md` (approved by user on 2026-11-12).

## Global Constraints

- Preserve Chromium 65 compatibility and never observe live engine objects in Vue.
- Game-realm objects/arrays must be created in the game window.
- Do not overwrite unrelated plugin hooks, original database files, or user TODO edits.
- No framework migration, release, version bump, or deployment.
- Factories accept the game window and are called once by `initializeFeatureRuntime`.
- Runtime accessor: `getFeatureRuntime(viewWindow = window)` resolves `__cheatOpener`/opener and returns the game's `__cheatFeatures` or null.
- Test files live in `tests/unit/*.test.mjs`; execute with `node --test tests/unit/*.test.mjs`.

## Review Focus

- Loading old saves/new games after edited slots restores only this feature's changed fields.
- Pop-out arrays never leak into plugin-owned engine/database structures.
- Malformed import/save data cannot write arbitrary keys or execute preview formulas.
- Reentrant locks, stale targets, and game-object replacement do not crash or poll constantly.
- New shortcuts/dialogs work in both window modes without browser Print/History actions.

## Task 1: Shared Runtime and Save Isolation (Controller)

Files: `js/runtime/FeatureRuntime.js`, `js/runtime/DatabaseOverrides.js`, `tests/unit/database-overrides.test.mjs`, bootstrap and window bridge integrations.

Interface: `createDatabaseOverrides(game)` returns `list(kind)`, `read(kind,id)`, `apply(kind,id,patch)`, `reset(kind,id)`, `resetAll()`, `isEdited(kind,id)`, `install()`; kinds are `enemy`, `skill`, `class`. Rows and record reads are detached JSON data. `apply` returns a detached updated record and throws validation errors. Save payload key `cheatDatabaseOverrides` is versioned. `initializeFeatureRuntime(game)` assembles all factories and publishes once on `game.__cheatFeatures`.

- [ ] Write/run failing tests for slot isolation, field allowlisting, reset, malformed save handling, and record identity preservation.
- [ ] Implement validated field patches, baseline restoration, and chained save/new-game hooks.
- [ ] Implement accessor and initialize once in the game; add any required live bridge globals.
- [ ] Run unit tests and typecheck before integrating dependent editors.

## Task 2: Database Editors and Battles (Worker)

Files: `panels/DatabaseEditorPanel.js`, `js/panels/database/DatabaseEditorState.js`, `components/DatabaseRowsEditor.js`, `js/runtime/BattleActions.js`, `tests/unit/battle-actions.test.mjs`, `tests/unit/database-editor.test.mjs`.

Consumes runtime.database from Task 1. Produces `createBattleActions(game)` with `startTroop(troopId)`, `startEnemies(enemyIds)`, `summon(enemyId)`, `availability()` returning start/summon reasons. The editor accepts a `kind` prop and uses structured fields, editable rule/effect/trait rows, and class parameter curves/EXP curves. Includes Apply/Discard/Reset. No raw JSON as the primary UI. Parent registers three routes using the kind prop.

- [ ] Test validation/view-state and battle scene guards against representative engine contracts before implementation.
- [ ] Implement enemy action rules, skills, classes, and helper-based safe encounter/summon mutations.
- [ ] Test malformed IDs, missing engine methods, repeated enemies, ended battle, and temporary troop restoration.
- [ ] Return integration notes and precise export names; do not edit shared navigation/bootstrap.

## Task 3: Finder and Dialogue History (Worker)

Files: `js/ui/FeatureCatalog.js`, `components/FeatureFinder.js`, `panels/MessageLogPanel.js`, `js/panels/history/MessageLogPanelState.js`, `js/runtime/MessageHistory.js`, `tests/unit/feature-catalog.test.mjs`, `tests/unit/message-history.test.mjs`.

Produces `createMessageHistory(game)` with `list(query)`, `clear()`, `install()`, `exportText()`, bounded to 1000 entries. Catalog exports search and a list of panel/setting/shortcut entries with `panel`, `anchor`, and optional `kind`. Finder emits `navigate` with selected entry. Panel state resolves runtime.history through the shared accessor.

- [ ] Failing tests for ranked search, configured shortcut labels, bounded message capture once per enqueue, and reset.
- [ ] Implement queue hooks preserving originals, detached history snapshots, clear and text export UI.
- [ ] Build keyboard-accessible palette with scoped navigation event; parent integrates Ctrl+P/H in shortcut system and both roots.

## Task 4: Locks and Favorites (Worker)

Files: `js/runtime/ValueLocks.js`, `js/panels/locks/LockPanelState.js`, `components/LockFavoriteControls.js`, `panels/LocksPanel.js`, `tests/unit/value-locks.test.mjs`.

Produces `createValueLocks(game,storage)` with `install()`, `list()`, `set(target,value)`, `remove(target)`, `isLocked(target)`, `setFavorite(target,enabled)`, `isFavorite(target)`, `sortFavorites(rows,targetForRow)`, `reconcile()`. Storage is `{getItem,setItem}` backed by a separate game-local file. Targets `{kind,id?,actorId?}` support item/weapon/armor/gold/variable/switch/state/timer. Controls accept target/value props and emit `change`; state presence is boolean and timer value is `{frames,working}`.

- [ ] Failing behavioral tests for setter enforcement, bounded reconciliation, inventory clamp, state present/absent, timer freeze, stale targets, save replacement, and favorite ordering.
- [ ] Implement hooked normal mutations plus low-frequency game-owned reconciliation, no per-frame file writes or scans.
- [ ] Implement review panel and reusable controls; parent integrates controls/sorting in existing tables, gold, states, and timer.

## Task 5: Game Options and Profiles (Worker)

Files: `js/runtime/GameOptions.js`, `js/storage/SettingsProfile.js`, `js/panels/options/GameOptionsPanelState.js`, `panels/GameOptionsPanel.js`, `tests/unit/game-options.test.mjs`, `tests/unit/settings-profile.test.mjs`.

Produces `createGameOptions(game,storage)` with `list()`, `set(symbol,value)`, `exportProfile()`, `previewProfile(text)`, `importProfile(text)`, `removeFromProfile(symbol)`; profile transfer returns validated JSON text and import summaries. Discover custom Window_Options controls safely and show supported ones first, then six standard controls. Keep options UI human-readable. Portable profiles contain only supported cheat preferences and options changed here, never locks/favorites, history, game database edits, or arbitrary ConfigManager keys.

- [ ] Failing tests for custom option discovery/fallback, actual getter/setter semantics, clamping, and ConfigManager.save.
- [ ] Implement versioned size-limited allowlisted profile serialization and preview/confirm/import UI.
- [ ] Test unknown symbols, malicious keys, wrong types/versions, and preservation of untouched game settings.

## Task 6: Detailed Tooltip Cards (Controller)

Files: `js/ui/DatabaseDetails.js`, `components/DatabaseTooltip.js`, existing inventory/actor panels and new editor; `tests/unit/database-details.test.mjs`.

- [ ] Test applicable sections and label resolution for seven database kinds.
- [ ] Implement bounded, text-only hover/focus/click cards and integrate without observing live records.
- [ ] Verify missing references and long descriptions remain readable.

## Task 7: Integration and Verification (Controller + Fresh Review)

Files: `CheatModal.js`, `MainComponent.js`, `js/window-init.js`, `js/shortcuts/ShortcutConfig.js`, existing affected panels, `package.json`, architecture/feature documentation, user TODO completion notes.

- [ ] Register all routes, dialog roots, configurable shortcuts, and stable setting anchors.
- [ ] Integrate lock/favorite controls and favorite-preserving table sorting; ensure filters still apply.
- [ ] Add `test:unit` script and run entire Node unit suite, typecheck, MV scan, docs build, and diff checks.
- [ ] Exercise UI in available preview/game surfaces and report manual gaps honestly.
- [ ] Fresh review for save isolation, realm safety, duplicate hooks, import validation, and shortcut interactions; fix findings and rerun checks.
- [ ] Update TODO with implementation and manual-verification states separately. No automatic commit/push/deploy.

## Execution Notes

2026-11-12: User approved design and requested execution. Independent tasks are delegated with disjoint file ownership; controller owns runtime foundation, tooltips, and all shared integration. Reuse current checkout. No signed commits until requested.

2026-11-12 execution progress:

- All seven feature groups are implemented on `codex/new-modifications`.
- Worker usage limits interrupted delegation; the controller completed and reviewed the remaining implementation locally.
- Behavioral tests and an isolated Edge smoke suite cover rendered panels and the actual pop-out bootstrap in a second JavaScript realm.
- Regression checks caught and fixed constructor-sensitive cross-window shortcuts, paginated finder navigation, sidebar synchronization, engine-limit changes, and failed-load/new-game rollback.
- No game installation/save files have been modified for tests. Actual MV/MZ NW.js gameplay and third-party battle plugin smoke tests remain pending.
- No commit, push, release, or deployment has been performed.

Final automated verification (2026-11-12):

- 58/58 Node behavioral tests passed.
- 37/37 rendered browser checks passed, including the actual separate-window bootstrap, cross-realm array safety, shared history, and shortcut rebinds.
- TypeScript check passed; MV compatibility scan passed for 110 runtime files.
- VitePress documentation build passed. Browser and Vite subprocesses required sandbox escalation on Windows.
- Source diff whitespace checks passed (the pre-existing TODO trailing whitespace was excluded).
- Test commands: `pnpm run test:unit`, `pnpm run test:browser`, `pnpm run check:repo`.
- Remaining verification: manual gameplay in actual MV/MZ NW.js and third-party plugin combinations. The automated fixtures are not a claim of plugin compatibility.
