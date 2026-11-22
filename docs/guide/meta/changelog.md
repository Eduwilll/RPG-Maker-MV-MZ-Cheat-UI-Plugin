# Changelog

## v1.11.0 - Latest

### Connected Map and Event Workflows
- [Feat] **Interactive Destination Previews**: Teleport and Save Locations now pair searchable lists with sharper map previews, pan/zoom, tile selection, compact coordinates and explicit teleport actions. Selecting Map center does not transfer the player until confirmed with Teleport.
- [Feat] **Shared Saved Points**: Save tagged points from the map or destination preview, see their distinct pins, preview or copy saved locations, and delete with confirmation. Existing saved locations remain compatible.
- [Feat] **Focused Event Analyzer**: Find Facing, Nearby or Browse events, then inspect Details, Switches & variables or Commands. Nearby map references move out of Watch; command execution stays behind explicit advanced controls and confirmations.
- [Feat] **Connected Actor and Event Navigation**: Jump between map selections, actor records and Event Analyzer. The controlled actor keeps its arrow without a duplicate badge; a searchable actor picker supports events without an explicit actor association.
- [Feat] **880 x 660 Default Window**: Overlay and separate-window modes share the larger default while respecting saved sizes and smaller screens.

### Actor, Enemy, Skill and Class Panels
- [Feat] **Compact Record Inspectors**: Searchable lists and focused sections replace long mixed forms. Database drafts show unapplied changes and retain edits when switching sections; initialization failures have a visible Retry action.
- [Feat] **Direct Skill Learning**: Search skills by name or ID, filter All, Available or Learned, and use Learn or Forget directly. Learning preserves list position without requiring a second dropdown.
- [Feat] **Skill Switch Review**: Review native event links and conservative name matches, current switch values and source evidence. An optional cancellable all-map scan never enters maps or runs their events. Broader learning-path conditions stay secondary to close name matches.
- [Fix] **Safe Global Switch Changes**: Learning and scanning never activate switches automatically. Individual edits require confirmation and reject changed values or loaded sessions. Related flags are not guaranteed prerequisites; plugin scripts may not be traceable.

### Compatibility and Validation
- [Test] **Connected Workflow Coverage**: Added native event-command, branch-isolation, evidence-priority, scan-cancellation, stale-confirmation and direct skill-action regressions in overlay and separate-window modes. Verified compact Offline/Online packages and isolated MV/MZ runtimes.
- [Docs] **Updated Feature Guides**: Documented map previews, saved points, event inspection, record sections and safe skill-switch review.

---

## v1.10.0

### Offline and Online Editions
- [Feat] **Installer Edition Choice**: Choose Offline or Online (cached), with automatic MV/MZ package detection. Offline is the default and includes all dependencies; Online downloads verified dependencies once and then works offline.
- [Feat] **Compact Release Files**: Both editions use `cheat-bundle.js` and `cheat-bundle.css`, with small startup, metadata and license files instead of the editable source tree. Overlay and separate-window modes share the same runtime code.
- [Feat] **Verified Shared Cache**: Online dependencies use immutable download sources, exact sizes and SHA-256 checks. The per-user cache is reused across games and updates, repairs missing or damaged files, and is kept on uninstall.
- [Feat] **Four Engine Packages**: Releases include Offline and Online archives for both MV and MZ. The Windows installer ZIP includes all four packages; existing legacy archives, backups, restore and uninstall remain supported.

### Startup and Scrolling Fixes
- [Fix] **Save Safety During Startup**: Save hooks install independently of UI downloads, including when MZ defines its save manager later. Existing database edits survive loading and saving before the UI is ready.
- [Fix] **Late-Loaded Sidebar Scrolling**: Mouse-wheel input inside the cheat no longer reaches the game's previously bound wheel handler, restoring sidebar scrolling without changing wheel input outside the cheat.
- [Fix] **Native Startup Readiness**: Wait for local styles and game scripts before mounting, preserve delayed game-window linking, and use the HTTPS API supported by older MV Node runtimes.

### Validation and Build Tools
- [Test] **Edition Regression Coverage**: Added shared-cache integrity and concurrency tests, installer preparation-failure checks, real mouse-wheel tests for both editions on MV/MZ, and isolated native NW.js checks. Packaging preserves unrelated test diagnostics.
- [Docs] **Build and Installation Guides**: Updated commands, edition behavior, shared-cache recovery, package layouts and dependency license notices.

---

## v1.9.4

### Performance & Offline
- [Feat] **Bundled Overlay Startup**: The overlay entry now ships as `cheat/init/setup.bundle.js`, replacing roughly 150 source-module requests with one minified script for the plugin code itself. Vue, Vuetify, CSS and fonts remain separate cached files, and `pnpm run build:cheat` regenerates the bundle from the editable source modules.
- [Feat] **Bundled Pop-out Startup**: The separate cheat window now loads `cheat/js/window-init.bundle.js` instead of fetching every source module after it bridges the game globals. Both bundles are built by the same command and covered by the same manifest.
- [Feat] **Vue 2.7**: The vendored runtime moved from Vue 2.6.14 to 2.7.16, the last 2.x release. The app keeps the Options API, so this is a drop-in upgrade that unblocks `setup()`-based work later. Vue 2.7 keeps `id` attributes on the rendered root, so the pop-out now reveals itself with a `cheat-window-ready` class instead of an inline `display` style on a mount node that no longer exists after the upgrade.
- [Feat] **Panel Snapshot Helper**: Panels rebuilt their local state with a hand-written field-by-field copy from a game snapshot. `applyPanelSnapshot(panel, snapshot)` in `PanelGameState.js` does that copy in one call and skips values that did not change, so polling panels (`GeneralPanel` every 500 ms, `LocksPanel` every second) no longer rewrite identical fields. Adopted by general, health, stats, inventory table, actor and translation settings.
- [Feat] **Vendored Production Libraries**: Vue and Vuetify ship as minified production builds instead of development builds, removing about 1.4 MB of JavaScript and the development-mode startup warnings.
- [Feat] **Offline Skins and Fonts**: Vuetify CSS, Material Design Icons and Roboto are bundled under `cheat/libs` and loaded locally, so the cheat UI no longer depends on Google Fonts or jsDelivr.
- [Feat] **Icon Subset**: The MDI stylesheet and font are generated from the icons the UI actually uses (134 icons), shrinking roughly 700 KB of icon assets to about 16 KB.

### Event Analyzer
- [Fix] **Event Analyzer Parsing**: Corrected four parsing bugs: stray top-level block-end causing infinite loop; code 0 at deeper indent truncating 21% of pages; Battle Processing (301) blocks with 601/602/603/604 outcome sections flattened, losing 5% of pages; block-end indented deeper than its branch stalling the enclosing block. Covered by 34 new unit tests plus a sweep parsing all 67,434 pages in test games.

### Architecture & Testability
- [Feat] **Testable Bootstrap Seams**: Pop-out global list and its live `Object.defineProperty` bridge moved to `js/runtime/RpgMakerGlobals.js`, shared Vue root to `js/ui/CheatApp.js`, and packaged-version read to `js/runtime/CheatVersion.js`. `import.js` stays a classic script, so boot order is unchanged.
- [Feat] **Feature Runtime Injection**: Panels and components now read the feature runtime from `this.cheatRuntime` (injected by `CheatApp`) instead of reaching through `window.__cheatFeatures`. `js/panels/**/*State.js` take the runtime as a parameter, and `getFeatureRuntime` accepts an explicit one, so panel state helpers can be unit-tested with a fake instead of a fake window. The locator stays as the fallback for the preview and pop-out.
- [Refactor] **Panel State Snapshot Merge**: Merged panel state snapshots through a single helper (`applyPanelSnapshot` in `PanelGameState.js`), reducing boilerplate and duplicate field copies across panels.

### Fixes & Quality
- [Fix] **Browser Regression CI**: Local and Windows CI checks now use the same pinned Chromium browser and wait for explicit suite completion instead of a fixed virtual-time DOM dump. Browser checks also run before releases on pull requests and `main`, and failures retain reports, screenshots and traces for troubleshooting.
- [Fix] **Version Comparison**: Update check compared dotted versions as strings (`"1.8.0" < "v1.9.0"` always true). `CheatVersion.js` now compares numeric segments and ignores the release tag's `v` prefix.
- [Feat] **Stale-Bundle Guard**: A committed manifest records bundle and source hashes; `pnpm run test:unit` fails when runtime code changed without rebuilding shipped bundles.
- [Fix] **Locks & Favorites Icon**: Sidebar entry used a non-existent `mdi-lock-star` glyph, rendering blank; now uses a shipped icon.
- [Fix] **Map Dropdowns Z-Index**: Map dropdowns now stay above the cheat overlay.
- [Fix] **Architecture Refactor Regressions**: Corrected regressions from the recent architecture refactor.

---

## v1.9.3

### Message Log
- [Feat] **Follow New Dialogue**: Message Log now automatically follows newly captured dialogue while preserving your reading position when you scroll up.

### UI & Teleport
- [Fix] **Teleport Panel Registration**: TeleportPanel is now properly registered in the CheatModal shell, restoring teleport functionality.

### Runtime & MV Compatibility
- [Fix] **MV Settings & Logs**: Settings and diagnostic logs for RPG Maker MV games are now correctly kept inside the `www/` folder.

### Refactoring & Architecture
- [Refactor] **GeneralCheat Split**: Split the monolithic `GeneralCheat` into focused modules for movement (No Clip), god mode, and persistence, improving maintainability.
- [Feat] **CheatModal Shell Deepening**: Refactored the CheatModal shell into `NavigationModule`, `PanelRegistryModule`, and `ProfileSyncModule` for cleaner separation of concerns.

### Profile & Sidebar Fixes
- [Fix] **Reactive Profile State**: Profile state is now Vue-reactive, so the sidebar toggle works correctly.
- [Fix] **Profile Null Safety**: Added null checks for profile in templates and `ProfileSyncModule`; handle null in `effectiveOpacity` and `getGameWindow`.
- [Fix] **ProfileSyncModule Initialization**: Moved `ProfileSyncModule` creation to `mounted()` where `this` is available.

### Database Panels
- [Fix] **Troop Artwork**: Composite full troop artwork in database panels.
- [Fix] **Database Performance**: Sped up database panels, repaired artwork rendering, and fixed log/theme chrome issues.
- [Fix] **Windowed Lists**: Database lists now use windowed rendering for better performance with large datasets.

### Performance
- [Perf] **Static Panel Config**: Froze static panel configuration and removed dead polish leftovers for leaner runtime.

---

## v1.9.2

### Installer
- [Fix] **Tcl/Tk 9 Startup**: Detect the Tcl/Tk 9 data archives shipped with Python 3.14+, extract them into the one-file installer, and fail the build if the `_tcl_data` / `_tk_data` scripts are missing. This fixes the startup error in `RPGMakerCheatInstaller.exe`.

---

## v1.9.1

### Installer
- [Feat] **About And Credits**: The installer sidebar now opens an About page with the detected version, GitHub and documentation links, an issue-chooser shortcut, credits for paramonos, sieucapoccho3717, Justype and Eduwilll plus all contributors, and the MIT license.
- [Fix] **Frozen Builds**: Bundle Tcl/Tk data so the packaged installer starts on machines without a separate Python/Tk installation.

### Interface Polish
- [Tweak] **Theme Consistency**: Buttons, chips, status text, snackbars and focus rings follow Current/Legacy, dark/light and the chosen accent throughout the UI.
- [Tweak] **Shared Panel Headers**: Panels now use the same header structure and refresh action, so titles and controls stay in predictable places.

---

## v1.9.0

### Interface Refresh
- [Feat] **Compact Shell**: Grouped navigation, a single top bar with sidebar toggle and Find, consistent panel controls, tighter item filters, compact Teleport X/Y fields and a portrait-based party recruitment menu.
- [Feat] **Current And Legacy Themes**: Keep the new slate design or choose the older charcoal Material colors. Both support dark/light mode and saved accents; the Default swatch restores the released blue.
- [Tweak] **Readable Controls**: Overlay opacity defaults to 90%, Game Options toggles use less space, and Feature Finder adds result counts, type labels and keyboard hints.
- [Tweak] **Theme-Aware Panels**: Buttons, chips, status text, snackbars and focus rings follow Current/Legacy, dark/light and the chosen accent instead of fixed Material colors. Focus rings brighten or darken the accent to stay visible on both palettes.
- [Tweak] **Dialogue And Enemies Layout**: Message Log puts non-history controls on one compact toolbar and lets history fill the panel; enemy browsing is labeled **Troops** / **Enemies**, with head-first representative artwork.

### Interactive Map
- [Feat] **One Shared Map**: Full map and floating minimap share drag-to-pan, wheel/button zoom, Follow, Fit, event search and on-map settings for layers, sprites, shadows, labels, placement, size and opacity.
- [Feat] **Live Markers**: Directional animated player arrow, distinct category pins and live game sprites use frame-based updates with cached settings, artwork and event classification. Reduced-motion preferences stop the arrow pulse.
- [Fix] **Safe Selection**: Clicking inspects a location; Teleport is explicit. Dragging never teleports, stale search results are rejected after transfers, and compact Follow no longer compounds zoom. Separate-window behavior is preserved.

### Installer And Release Quality
- [Feat] **Simpler Installer**: Compact guided setup with automatic package detection, optional advanced controls, clear completion/progress, tooltips, maintenance actions and accessible activity logs.
- [Fix] **Save Editor Layout**: Scrollable structured fields and a roomier editor prevent actor parameters and inventory controls from being clipped; unsupported saves retain Raw JSON editing and backup-before-write behavior.
- [Dev] **Release Checks**: Runtime/type/MV checks gate package builds; Windows browser and installer tests gate publication. Release notes come from the matching changelog, and tag/package versions must agree.

---

## v1.8.0

### Features
- [Feat] **Feature Finder**: Find panels, settings and shortcuts with `Ctrl+P`.
- [Feat] **Database Editors**: Edit enemies, skills and classes with save-specific overrides; manage party members, skills and states directly from the UI.
- [Feat] **Encounter Roots**: Browse multipart enemies as complete authored encounters, start confirmed battles or matching map events, and summon supported enemies during battle.
- [Feat] **Locks & Favorites**: Lock supported values and pin frequently used rows; inspect the active locks in one panel.
- [Feat] **Message Log**: Search captured dialogue with `Ctrl+H`, including speaker portraits and only the chosen player responses. Game fonts remain the default, with readable 16px text, custom sizing and a plugin-font fallback.
- [Feat] **Map / Minimap**: Combined map controls, live NPC sprites, destination previews, movable minimap, and saved toggles for shadows, upper tiles, marker categories, labels and grid.
- [Feat] **Game-Native Details**: Item icons, actor portraits, detailed tooltips, resizable overlay, and game-specific options with portable settings.

### Compatibility And Developer Tools
- [Fix] **MV/MZ Plugin Compatibility**: Keep game data and bitmaps outside Vue observation, preserve game-realm actions in separate windows, and improve Yanfly/FOSSIL-style dialogue and composite artwork handling.
- [Dev] **Standalone UI Preview**: Updated MV/MZ demo data, scene/panel selectors, live reload and a localhost-only Python launcher; no game required for UI development.
- [Docs] **Public Documentation**: Updated feature/development guides and moved internal agent plans outside the VitePress website.

---

## v1.7.1

### FOSSIL Support & Stability Fixes
- [Feat] **FOSSIL Game Support**: Games using the FOSSIL plugin boot from `FOSSILindex.html` instead of `js/main.js`, which silently bypassed the cheat. The installer now patches `index.html` (inherited automatically when FOSSIL regenerates its file) and any existing `FOSSILindex.html`; manual installs add one `<script>` tag to both files. See the install and troubleshooting guides.
- [Feat] **Startup Failure Warning**: If the cheat fails to inject or `setup.js` never reports a successful start, the game now shows a dismissible warning banner plus `[Cheat]` console output instead of failing silently. Duplicate bootstrap injection is guarded.
- [Fix] **Cursor Visibility**: The OS cursor is now forced back on inside the cheat UI (`#app`-scoped), so games with a custom transparent cursor no longer leave you pointer-less over the panel. The game's own cursor is untouched, and the click-to-teleport crosshair still works.
- [Fix] **Separate Window Boot**: The pop-out window no longer stalls at "Initializing…". Module-level `Utils` touches (diagnostics log path, settings storage) are resolved lazily so the fresh window can evaluate its imports, the game window passes an explicit opener reference, and `window.html` reports load failures instead of hanging.
- [Fix] **Separate Window Opacity**: The pop-out window is now always fully opaque; hover-fade only applies to the in-game overlay.
- [Fix] **Fixed Move Speed Enforcement**: "Fix speed" is re-applied every frame via a `Game_Player.update` hook instead of a 1s timer, so heavy plugins can no longer drag movement back to 4.0 between pulses (no more jerk/stutter). The panel also shows your target speed instead of flickering to the game default.
- [Tweak] **Version Bump**: Bumped version to `1.7.1`.

---

## v1.7.0

### Realistic Minimap
- [Feat] **Minimap Overlay**: Added a realistic minimap that renders actual map tile graphics (B–E/A5 exact, autotile textures approximated) with player dot and event markers, placeable in any corner or at custom X/Y.
- [Feat] **Minimap Settings**: Added Minimap panel with on/off, follow vs full-map mode, window size (96–320px), content zoom (50–400%), opacity, and event marker toggle, all persisted.
- [Feat] **Minimap Toggle**: Added `Alt+N` shortcut to show/hide the minimap in-game (remappable in Shortcuts).
- [Fix] **Tileset Resilience**: Empty tileset slots no longer block rendering, and slow/encrypted loads fall back to partial rendering after 8s instead of hiding the map forever.
- [Feat] **Minimap Diagnostics**: Added live status line in the panel plus `[minimap]` log stages for troubleshooting.
- [Tweak] **Off By Default**: Minimap and event markers now start disabled on fresh installs.
- [Tweak] **Version Bump**: Bumped version to `1.7.0`.

---

## v1.6.1

### Actors Tab & Old-Look Restore
- [Feat] **Actors Panel**: Added Actors tab listing every actor in the game database, grouped as Controlled (party leader), Party, and Other Actors, with side-by-side editing of name, nickname, class, level, EXP, HP/MP/TP, all 8 params, learnable/learned skills, and states.
- [Fix] **Dark Theme Default**: Overlay now boots with the saved Appearance theme (dark by default), matching the old version and the pop-out/preview windows.
- [Fix] **Idle Opacity Default**: Restored the old translucent idle look (30% opacity, opaque on hover) instead of 100%.
- [Fix] **Themed Scrollbars**: Restored `hide-scrollbar` on the sidebar and content panes so scrolling blends with the dark UI instead of showing native Windows bars.
- [Tweak] **Version Bump**: Bumped version to `1.6.1`.

---

## v1.6.0

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
