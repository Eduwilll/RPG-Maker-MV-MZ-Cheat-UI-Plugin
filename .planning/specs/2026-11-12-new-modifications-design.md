# New Modifications Design

Status: approved by the user on 2026-11-12; implementation in progress.
Source: `TODO.md`, `# new modifications`, lines 119 onward.
Date: 2026-11-12.

## Intent and Scope

Implement all seven feature groups in the referenced section: feature finder,
enemy editing and summoning, skill and class editing, detailed tooltips, locks
and favorites, dialogue history, and game options with portable settings backup.
Keep the familiar panel UI while making powerful changes inspectable and reversible.

The older `Others modifications` section is outside this batch. No release,
version bump, framework migration, or replacement of the vendored libraries is
part of this work. Do not write to the game's original database JSON files.

## Approaches

1. Extend the existing Vue 2/Vuetify 2 panels and shared state modules, with
   save-specific database overrides and game-owned runtime hooks. Recommended:
   preserves established engine integration and avoids mixing a framework
   migration with seven behavior changes. The user selected this direction.
2. Rewrite the UI first using a newer framework. Better long-term maintenance
   potential, but increases compatibility risk and delays these features.
3. Edit database files on disk. Makes changes global across save slots and risks
   game-update conflicts. Rejected in favor of save-specific overrides.

## Existing Constraints

- Views live in `cheat/panels`; shared state and mutations live under
  `cheat/js/panels`. Shared reusable visual elements live in `cheat/components`.
- Source runs directly in older MV NW.js, including Chromium 65. Avoid unsupported
  syntax and APIs; do not assume modern CSS features or a production bundler.
- The overlay and `js/window-init.js` pop-out evaluate separate module instances.
  The existing explicit `window.__cheatOpener` reference is the connection to the
  game window. Bridged globals must remain live across load/new-game operations.
- Never put live engine/database objects in reactive Vue state. Return detached
  display/edit snapshots, retain IDs, and resolve the live object at mutation time.
- Mutated arrays and engine instances must be created in the game window, not
  the pop-out realm. Some MV plugins depend on game-realm prototype extensions.
- Existing runtime patches, translation hooks, shortcut customization, and
  plugin-owned metadata must be preserved rather than overwritten wholesale.

## Runtime and Storage Design

### Game-Owned Runtime

Introduce a game-owned feature runtime, initialized once from the overlay setup
after engine globals exist. Panel helpers in either window resolve this runtime
through the game window. Pop-out setup must not install duplicate engine hooks.
Keep persistence, database editing, locks, history, and option discovery in focused
modules behind this small shared entry point, not in a new monolithic helper.

Mutations return detached snapshots or explicit validation errors. Notifications
go to the window that initiated the action. Closing the pop-out must not stop
locks or history collection. New-game/load transitions invalidate old UI snapshots.

### Persistence Matrix

| Data | Storage and lifecycle | Portable settings profile |
| --- | --- | --- |
| Enemy, skill, class overrides | Versioned extra field in normal game saves | Excluded |
| Custom encounter roster | Temporary runtime state for that battle | Excluded |
| Locks and favorites | Separate game-local cheat settings file | Excluded |
| Dialogue history | Bounded session memory, explicitly clearable | Excluded |
| Game options edited here | Allowlisted, versioned portable profile | Included |
| Existing appearance/shortcut preferences | Explicitly supported profile fields | Included |

Each game installation already has its own cheat-settings directory. That is the
game-local identity for locks/favorites; do not use a single machine-wide file.
Normal installer rollback backups are distinct from portable settings profiles
and should remain complete; do not silently weaken installer recovery.

### Save-Specific Database Overrides

Hook `DataManager.makeSaveContents`, `extractSaveContents`, and new-game lifecycle
without replacing existing plugin behavior. Store a schema version and validated
overrides by database kind and numeric ID. Older saves without this field work.

Capture baseline values before the first edit, after plugin database processing.
Restore only fields this feature changed, preserving record identity and unrelated
plugin metadata. Switching slots and starting a new game must first undo the
previous slot's overrides. Apply the target slot's overrides before actor/party
refresh or other steps that read class/skill/enemy definitions.

Invalid, unknown, or missing records are skipped with diagnostics, not a failed
game boot. Provide per-record reset and reset-all-edits actions. Reset becomes
permanent for that slot only after the user saves again. With the cheat uninstalled,
the original game still loads the save; edited database behavior is unavailable.

## Feature Designs

### 1. Feature Finder: Ctrl+P

- Add a compact command-palette dialog usable in both window modes.
- Search a shared catalog of panel names, setting names, descriptions, keywords,
  and configured shortcuts. Avoid scanning every mounted component or all game
  databases on each keystroke.
- Support keyboard selection, Enter, Escape, clickable results, and an empty state.
- Each result has a stable panel ID and optional control anchor. Selecting it
  opens the panel, scrolls to the relevant control, and briefly highlights it.
- Register the shortcut through the existing customizable shortcut system.
  Consume Ctrl+P so the embedded browser does not open Print. Respect normal text
  input handling except when the user intentionally invokes this shortcut.

### 2. Enemy Editor and Summoning

- Add a searchable enemy list and detached editor for the eight base parameters,
  rewards, traits, and action rules. Retain all untouched plugin fields.
- Action rows edit skill, rating, and engine-defined condition fields with labels
  and appropriate numeric/database selectors rather than raw JSON.
- Changes affect the selected database enemy definition, including future instances;
  refresh applicable live battlers without silently healing them. Do not promise
  retroactive changes to plugin-cached combat state.
- Let the user launch an existing troop or build a temporary roster from selected
  enemies. Preserve ordinary battle setup and results; do not modify $dataTroops
  permanently or overwrite an existing troop.
- Allow adding an enemy mid-battle through an MV/MZ-aware helper that registers
  its battler, sprite, unique name, and engine/plugin setup as needed.
- Gate actions by scene/phase: disallow starting battles during an existing battle,
  transfer, busy map event, or message. Disallow reinforcements after battle end
  or while processing an action. Show a reason rather than silently doing nothing.
- Confirm launching encounters and warn that plugin-specific battle systems may
  impose additional limitations. Feature-detect integrations and fail safely.

### 3. Skill and Class Editors

- Skills: MP/TP cost, success rate, repeats, speed, TP gain, scope, hit type,
  damage type/element/formula/variance/critical, effects, and traits where supported
  by that record type. Do not invent a traits field for standard skills.
- Damage formulas are normal RPG Maker expressions: save them as text and let
  the engine evaluate them during actions. Never execute a formula just to preview
  it; show that formulas are code and may fail at battle time.
- Classes: eight parameter curves by level, four EXP-curve parameters, level-up
  skill rows, and trait rows with code/data-ID/value controls.
- Use reusable trait/effect/action editors where structure is shared. Validate
  finite numbers, database references, and array shapes before applying an edit.
- Applying a class edit refreshes affected actors' derived values without resetting
  level, EXP, or learned skills. New level-up rules are prospective; an explicit
  learn action remains available in the existing actor editor.
- Provide Apply, Discard, and Reset to Original, plus a reminder to save the game.

### 4. Detailed Tooltips

- One shared tooltip-card view model supports items, weapons, armor, skills,
  classes, states, and enemies. Resolve labels through engine database terms.
- Show applicable description, parameters, traits, effects, costs, rewards, and
  price; omit non-applicable sections instead of presenting misleading zero values.
- Use a short hover delay and click/focus access. Cards must fit the cheat viewport
  with bounded width/height, wrapping, scrolling, and no off-screen overflow.
- Render text with Vue text bindings, never untrusted HTML. Do not clone or observe
  the complete live database merely to display a tooltip.

### 5. Locks and Favorites

- Lock an exact desired value for item/weapon/armor inventory quantities, gold,
  numeric/text/boolean variables, switches, actor status presence, or timer state.
- Use stable keys including kind and ID; status locks additionally include actor ID.
  Inventory locks mean inventory count, excluding equipped copies. Do not silently
  confiscate equipped items to satisfy a zero-inventory lock.
- Locks apply only while a valid game session is active. Hook normal engine setters
  for common mutations, plus one bounded, low-frequency reconciliation pass for
  plugin changes that bypass setters. Avoid per-frame database scans and disk writes.
- Reconcile only configured keys; report invalid/missing targets once and disable
  them. Clamp to engine limits and show the effective locked value.
- Timer locks retain running/stopped state and exact remaining frames. Status locks
  support present and absent states; death-state locks require an explicit warning.
- Expose lock/unlock and favorite actions alongside the corresponding editable rows.
  Add a Locks & Favorites panel for review, unlocking, and removal of stale entries.
- Favorites sort before normal rows while preserving the user's sort within each
  group. Search, filters, and pagination still apply; favorites do not bypass filters.
- Persist changes immediately per game, but exclude them from portable profiles.
  On loading a save, show/retain the game-local locks; make their active state clear.

### 6. Message Log: Ctrl+H

- Record new event dialogue and scrolling text at the message-queue entry points,
  not every render frame. Preserve message delivery and existing translation hooks.
- Entries contain text, speaker when available, map name/ID, and timestamp.
  Choice presentation/selection can be captured where engine hooks reliably expose
  them. Do not claim to capture arbitrary plugin-drawn UI text.
- Default to a ring buffer of 1,000 entries; clear on new game/load to avoid mixing
  different playthroughs. History starts when the cheat runtime initializes and
  cannot recover dialogue shown before that.
- Provide search, clear with confirmation, and text export. Escape closes the
  panel/dialog without dismissing the game's current message.
- Capture once in the game window. Both UIs read the same history even when closed.
- Register Ctrl+H in the existing shortcut system and suppress browser history.

### 7. Game Options and Portable Settings Profiles

- Add standard options for Always Dash, Command Remember, and BGM/BGS/ME/SE volume.
  Apply through ConfigManager and persist via its save path to honor plugin hooks.
- Discover game-specific options by constructing the game's Window_Options offscreen
  without inserting it into the visible scene, reading its command list and current
  values, and disposing it safely. Show supported custom options above standards.
- Support recognized boolean and numeric options. Use the actual option window's
  getter/setter behavior when available. Unsupported actions or complex custom
  values are read-only with an explanation, not guessed controls. Fall back to
  standard options if discovery fails. Never run unknown option commands to probe.
- Track only options the user changes through this panel, not the entire existing
  ConfigManager configuration. A portable profile exports this subset plus explicitly
  supported existing cheat preferences, with a schema version and size limits.
- Import previews recognized settings, ignores unavailable game-specific symbols
  with a summary, and applies changes only after confirmation. Validate symbols,
  primitive types, and ranges; never import arbitrary object keys or executable code.
- Restoring a profile must not replace unrelated game options, IDs, locks/favorites,
  logs, database edits, or installer backups. Provide reset/remove-from-profile actions.

## Delivery and Verification

Implement in reviewable increments, with all seven groups remaining in scope:

1. Runtime ownership, save overrides, profile format, and behavioral test harness.
2. Feature catalog, command palette, dialogue capture, and history panel.
3. Enemy/skill/class editing, summoning, and shared tooltip cards.
4. Locks/favorites and their existing-panel integrations.
5. Game option discovery, options UI, and profile import/export.
6. Cross-feature integration, documentation, and TODO verification status.

Tests must cover slot A -> slot B -> old save -> new game isolation; repeated hook
initialization; pop-out mutation after game-object replacement; game-realm arrays;
malformed save/profile payloads; lock reentrancy; favorite sorting; bounded history;
shortcut conflicts; and graceful absence of optional plugin/engine methods.

Use Node's built-in test runner for detached modules and representative fake engine
contracts, avoiding a new runtime framework dependency. These are not substitutes
for game smoke tests. Run typecheck, MV compatibility checks, documentation build,
and actual available MV/MZ smoke tests in both UI modes. Report anything that could
not be exercised, especially third-party battle systems and custom options windows.

Do not mark all TODO features complete based only on compilation or on fake-engine
tests. Track implementation and manual-verification status separately. No deployment
or signed release commit is authorized by approval of this design alone.

## Builder Discretion

Exact folder/file names, spacing, icon choices, validated numeric limits derived
from engine APIs, and test fixture organization are implementation choices.
Use the current visual language and avoid broad unrelated formatting/refactoring.
If a game-specific plugin cannot be supported safely, expose that limitation and
keep the remaining features working instead of replacing the plugin's behavior.
