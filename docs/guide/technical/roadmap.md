# Roadmap

This page describes the current maintainability roadmap for the fork.

The original project was functional but under-documented, tightly coupled, and hard to extend safely. The current roadmap focuses on improving contributor experience without rewriting the runtime into a different architecture.

## Current status

- Phase 1 is complete: static checking, local typings, and JSDoc foundations are in place.
- Phase 2 is complete: large shared files were split into more focused modules for translation, shortcuts, cheat helpers, and runtime hooks.
- Phase 3 is complete:
  - Phase 3A finished the structure and typing pass for translation, shortcuts, runtime, and storage.
  - Phase 3B established panel and shortcut contributor conventions with shared helper layers.
- Phase 4 is complete enough for normal development: diagnostics, validation, compatibility scanning, and smoke-testing workflows are now in place.
- Phase 5 is next: type and domain alignment.

## Why the plan changed

The original Phase 3 was focused mainly on panel conventions and an internal framework.

That is still important, but Phase 2 changed the codebase enough that there is now a better order:

1. Move the already-split modules into clearer folders.
2. Strengthen editor support with a development-only RPG Maker typing package.
3. Define contributor conventions on top of that cleaner structure.
4. Add targeted reliability checks after the structure is easier to reason about.

This updated order reduces churn and makes each later refactor easier to review.

## Phase 3A: Structure and Typing

Goal: make the codebase easier to navigate and safer to edit before introducing broader conventions.

### Main work

- Move focused helper modules out of the flat `cheat-engine/www/cheat/js/` layout into clearer folders such as:
  - `translation/`
  - `shortcuts/`
  - `runtime/`
  - `compat/`
  - `storage/` if the storage layer grows further
- Keep compatibility barrels where needed so runtime imports can be migrated safely.
- Keep `@fenixengine/rmmz-ts` in place as the development-only typing aid for MZ APIs and continue making that integration more explicit.
- Keep local `types/` files for:
  - MV gaps
  - project-specific globals
  - preview/runtime-specific declarations
- Update docs so the new structure is discoverable.

### Current checkpoint

The translation, shortcut, runtime, and storage subsystems now have dedicated implementation folders:

- `cheat-engine/www/cheat/js/translation/`
- `cheat-engine/www/cheat/js/shortcuts/`
- `cheat-engine/www/cheat/js/runtime/`
- `cheat-engine/www/cheat/js/storage/`

Current coordinator modules import through those folders first, while the original top-level module paths remain available as compatibility re-exports to limit churn.

### Why this comes first

- Phase 2 already separated responsibilities logically.
- The remaining pain is now discoverability and safe editing.
- Folder-level organization will make later panel and helper conventions much easier to apply.

### Important constraint

`@fenixengine/rmmz-ts` is not a runtime dependency.

It should be used only for:

- editor autocomplete
- `checkJs`
- JSDoc references
- safer refactors in MZ-oriented code

Current setup:

- MZ engine declarations come from `@fenixengine/rmmz-ts`
- local declarations in `types/` fill MV and project-specific gaps
- local declarations also augment engine data shapes with cheat-specific translation metadata where needed

The project still needs local type declarations because this fork supports both MV and MZ and has its own globals and runtime patches.

## Phase 3B: Panel Conventions

Goal: make feature work predictable instead of panel-specific and ad hoc.

### Main work

- Define a standard panel pattern for:
  - local UI state
  - derived display state
  - reads from RPG Maker globals
  - writes back into game state
  - optional persistence
  - optional shortcut integration
- Create shared helper APIs for common panel tasks such as:
  - reading actors, items, variables, and switches
  - validating panel inputs
  - safe writes to RPG Maker state
  - common list/table behavior when appropriate
- Standardize how panel actions and shortcut actions share logic.
- Document the rules contributors should follow when changing runtime state.

### Good candidate panels for the first pass

- `GeneralPanel.js`
- `StatsSettingPanel.js`
- `TeleportPanel.js`

These cover several common patterns:

- direct game actions
- editable numeric state
- map lookup and data traversal

### Expected result

After this phase, contributors should be able to open an existing panel and quickly understand:

- where state belongs
- how data is loaded
- how changes are applied safely
- where shared behavior should be reused instead of copied

## Phase 4: Reliability and Selective Modernization

Goal: improve release confidence and maintainability without forcing a full rewrite.

### Main work

- Add targeted regression checks around translation flows that have proven fragile.
- Add validation around packaging and dev-sync workflows:
  - `deploy/main.py`
  - `deploy/dev.py`
- Add tests or verification scripts for stable pure-logic modules where the return is high.
- Consider converting a few stable helper modules to TypeScript only if they clearly benefit from stronger contracts.

### Good candidates for selective stronger typing

- storage helpers
- translation config and endpoint parsing
- metrics/report helpers
- packaging validation scripts

### What this phase is not

This is not a plan to rewrite the runtime UI into a bundled app or migrate everything to TypeScript at once.

The intended end state is still:

- plain JavaScript runtime for the game
- stronger development tooling around it
- clearer contributor rules
- safer packaging and translation workflows

### Current checkpoint

Phase 4 now includes:

- diagnostics logging and About-panel support details
- deploy and dev-sync validation
- MV compatibility checks for older runtimes
- smoke-testing workflow documentation
- cleanup of temporary compatibility shims and leftover barrels

This means the main reliability goals are already met, and remaining work in this area should be small follow-up polish instead of more large restructuring.

## Phase 5: Type and Domain Alignment

Goal: finish the partial modernization work so the code structure, helper conventions, and typing layer describe the same architecture instead of drifting apart.

### Why this phase exists

The repo is much healthier than before, but there are still a few areas where the cleanup stopped halfway:

- `@fenixengine/rmmz-ts` is wired into the workspace, but it is not yet used consistently as a real development constraint across the runtime code.
- some files still mix responsibilities, especially cheat action modules such as `CheatBattle.js`
- the distinction between component panels and panel helper/state modules is real, but it is not yet formalized or applied everywhere
- the root `cheat-engine/www/cheat/js/` folder still contains a mix of domains that are harder to reason about than the newer foldered areas

### Main work

- Audit the remaining root-level modules in `cheat-engine/www/cheat/js/` and classify which should move into clearer domains.
- Strengthen typed JavaScript checking incrementally for stable helper modules instead of switching the whole runtime to strict checking at once.
- Split mixed-responsibility files such as `CheatBattle.js` into clearer scene-action and battle-action modules.
- Replace avoidable `any` usage with local type augmentations where the runtime intentionally uses MV/MZ internals.
- Finish documenting the two-panel-folder architecture:
  - `cheat-engine/www/cheat/panels/` for Vue component panels
  - `cheat-engine/www/cheat/js/panels/` for panel state, translation, and shared helper logic
- Migrate remaining panels that still only partially follow the shared helper pattern.

### Concrete first targets

- `cheat-engine/www/cheat/js/CheatBattle.js`
- `cheat-engine/www/cheat/js/CheatGeneral.js`
- `cheat-engine/www/cheat/js/CheatSpeed.js`
- `cheat-engine/www/cheat/js/panels/`
- `cheat-engine/www/cheat/panels/`
- local declarations in `types/`

### Constraints

This is still not a plan to rewrite the runtime into TypeScript or to bundle the in-game UI differently.

The intended outcome is:

- clearer domain boundaries
- fewer confusing runtime internals hidden behind `any`
- more useful help from `@fenixengine/rmmz-ts`
- more consistent panel architecture
- safer future cleanup without destabilizing MV support

## Phase 3 result

Phase 3 now leaves the repo in a much clearer state:

- implementation folders exist for translation, shortcuts, runtime, and storage
- `@fenixengine/rmmz-ts` is wired in as the MZ-side development typing source
- panel-side shared helpers now cover search, numeric coercion, refresh flows, map traversal, and translation-driven display updates
- shortcut-side shared helpers now cover runtime configuration, migration, storage, and panel-safe shortcut row shaping
- contributor docs now explain both panel and shortcut conventions explicitly

## Recommended next move

Start Phase 5 with a small, high-signal split:

- separate scene actions from battle actions in `CheatBattle.js`
- add the minimum local typings needed to remove the most confusing `any` casts there
- document the panel-layer architecture more explicitly while that cleanup is happening
