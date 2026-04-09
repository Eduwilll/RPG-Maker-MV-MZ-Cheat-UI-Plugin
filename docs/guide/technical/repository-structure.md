# Repository Structure

This page maps the main folders in the repo and explains what each one is responsible for. Use it when you are trying to find where a feature lives before editing code.

## Top-level layout

| Path | Purpose |
| --- | --- |
| `cheat-engine/` | Main runtime source that gets packaged into games |
| `deploy/` | Python tooling for release packaging and dev-sync into test games |
| `preview/` | Browser preview shell and RPG Maker mocks for faster UI iteration |
| `docs/` | VitePress documentation site |
| `tests/` | Local test game folders used by the dev-sync workflow |
| `dummy-translator/` | Minimal translator helper artifacts for local experimentation |
| `.github/workflows/` | CI for release archives and docs deployment |

## Runtime source tree

Most contributor work happens under `cheat-engine/www/`.

| Path | Purpose |
| --- | --- |
| `cheat-engine/www/cheat/` | Main cheat UI app |
| `cheat-engine/www/cheat/panels/` | Individual UI panels and panel-specific logic |
| `cheat-engine/www/cheat/js/` | Shared helpers, storage, shortcuts, translation, alerts, and runtime glue |
| `cheat-engine/www/cheat/js/cheats/` | Cheat action modules split by domain such as scene actions and battle actions |
| `cheat-engine/www/cheat/js/panels/` | Shared panel-safe state, search, refresh, and translation display helpers |
| `cheat-engine/www/cheat/js/panels/about/` | Feature-specific support modules for the About panel |
| `cheat-engine/www/cheat/js/translation/` | Home of the translation subsystem implementation files |
| `cheat-engine/www/cheat/js/translation/in-game/` | Runtime cache-application helpers used after bulk translation completes |
| `cheat-engine/www/cheat/js/shortcuts/` | Home of the shortcut subsystem implementation files |
| `cheat-engine/www/cheat/js/runtime/` | Home of shared runtime and MV/MZ environment helpers |
| `cheat-engine/www/cheat/js/storage/` | Home of shared persistence helpers |
| `cheat-engine/www/cheat/js/ui/` | Small UI-facing services that bridge components and panel actions |
| `cheat-engine/www/cheat/init/` | App bootstrapping and RPG Maker customization hooks |
| `cheat-engine/www/cheat/components/` | Shared Vue UI components such as dialogs and snackbars |
| `cheat-engine/www/cheat/libs/` | Bundled front-end libraries used directly without a build step |
| `cheat-engine/www/_cheat_initialize/` | Engine-specific bootstrap templates merged into release packages |

## Files contributors will touch most often

| File or folder | Why you would edit it |
| --- | --- |
| `cheat-engine/www/cheat/CheatModal.js` | Add or reorganize navigation and panel wiring |
| `cheat-engine/www/cheat/MainComponent.js` | Change top-level app lifecycle or global keyboard behavior |
| `cheat-engine/www/cheat/panels/` | Build or update user-facing cheat features |
| `cheat-engine/www/cheat/js/TranslateHelper.js` | Change translation orchestration, extraction flow, or batch execution |
| `cheat-engine/www/cheat/js/translation/TranslationConfig.js` | Change built-in endpoints and chunking defaults |
| `cheat-engine/www/cheat/js/translation/TranslationBank.js` | Change cached translation storage or metrics collection |
| `cheat-engine/www/cheat/js/translation/TranslationBatching.js` | Change batch sizing, split fallback behavior, and Lingva batch concurrency |
| `cheat-engine/www/cheat/js/translation/TranslationBasicRequest.js` | Change the simple GET/POST request path for non-Lingva, non-LLM endpoints |
| `cheat-engine/www/cheat/js/translation/TranslationLingvaRequest.js` | Change the Lingva retry, fallback, and round-robin request path |
| `cheat-engine/www/cheat/js/translation/TranslationLlmRequest.js` | Change the LLM-backed translation request path and retry behavior |
| `cheat-engine/www/cheat/js/translation/TranslationExtractors.js` | Change database, common-event, and map-dialogue extraction rules |
| `cheat-engine/www/cheat/js/translation/TranslationPool.js` | Change how extracted strings are deduplicated into the uncached translation pool |
| `cheat-engine/www/cheat/js/translation/TranslationWorkflow.js` | Change how uncached target groups are translated and how progress updates are reported |
| `cheat-engine/www/cheat/js/translation/TranslateSettings.js` | Change persisted translation settings and target selection |
| `cheat-engine/www/cheat/js/runtime/RuntimeEnv.js` | Change shared MV/MZ path and environment helpers |
| `cheat-engine/www/cheat/js/storage/KeyValueStorage.js` | Change shared JSON/localStorage persistence behavior |
| `cheat-engine/www/cheat/js/shortcuts/GlobalShortcut.js` | Change runtime shortcut handling, binding, and persistence flow |
| `cheat-engine/www/cheat/js/shortcuts/ShortcutConfig.js` | Change shortcut definitions, parameter validation, and action bindings |
| `cheat-engine/www/cheat/js/shortcuts/ShortcutHelper.js` | Change low-level key table behavior used by the shortcut runtime |
| `cheat-engine/www/cheat/js/shortcuts/KeyCodes.js` | Change shared key parsing, labels, and normalized key-code handling |
| `cheat-engine/www/cheat/js/shortcuts/Tools.js` | Change small shortcut-support helpers such as object cloning |
| `cheat-engine/www/cheat/js/shortcuts/ShortcutMigration.js` | Change how older shortcut settings are migrated and conflicts are resolved |
| `cheat-engine/www/cheat/js/shortcuts/ShortcutPanelState.js` | Change how shortcut settings are shaped into panel-safe view rows |
| `cheat-engine/www/cheat/js/shortcuts/ShortcutStorage.js` | Change how shortcut mappings are loaded from and saved to disk or preview storage |
| `cheat-engine/www/cheat/js/cheats/GeneralCheat.js` | Change overlay toggles, save forcing, console/debug access, and movement helpers |
| `cheat-engine/www/cheat/js/cheats/SpeedCheat.js` | Change game-speed tuning and message-skip behavior |
| `cheat-engine/www/cheat/js/cheats/SceneCheat.js` | Change scene navigation, file scene toggles, and quick save/load behavior |
| `cheat-engine/www/cheat/js/cheats/BattleCheat.js` | Change battle-related cheat actions and encounter helpers |
| `cheat-engine/www/cheat/js/translation/in-game/InGameTranslationData.js` | Change how cached translations are written back into game data arrays |
| `cheat-engine/www/cheat/js/translation/in-game/InGameTranslationLists.js` | Change how runtime command lists are translated in choices and menus |
| `cheat-engine/www/cheat/js/translation/in-game/InGameTranslationText.js` | Change runtime text normalization and cache lookup for dialogue and rich text |
| `cheat-engine/www/cheat/js/translation/in-game/InGameTranslator.js` | Change how cached translations are applied at runtime |
| `cheat-engine/www/cheat/js/CheatHelper.js` | Thin compatibility barrel that re-exports split cheat helper modules |
| `cheat-engine/www/cheat/init/customize_functions.js` | Patch RPG Maker behavior or initialize runtime hooks |
| `cheat-engine/www/cheat/css/main.css` | Style the in-game overlay |

## Packaging and installation files

The packaging flow works by starting from `cheat-engine/www/` and then merging engine-specific files from `_cheat_initialize/`.

- `deploy/main.py` builds one archive for MV and one for MZ.
- The release artifacts are written to `output/`.
- The installer instructions in the docs mirror that package structure.

Important detail:

- MV packages are archived with a `www/` root.
- MZ packages are archived from the game root layout.

## Preview workflow files

The preview system exists so contributors can work on the UI without relaunching a game constantly.

| Path | Role |
| --- | --- |
| `start-preview.py` | Local HTTP server with no-cache headers and JS MIME handling |
| `preview/index.html` | Preview entry page |
| `preview/preview.js` | Preview boot bridge that mounts the cheat UI |
| `preview/rpg-mocks.js` | Browser-side RPG Maker mocks so panels do not crash |

This mode is useful for layout and interaction work, but it is not enough for validating every engine patch.

## Release and documentation automation

| Path | Role |
| --- | --- |
| `.github/workflows/release.yml` | Builds MV and MZ archives when a `v*` tag is pushed and opens a draft release |
| `.github/workflows/deploy-docs.yml` | Builds and deploys the VitePress site to GitHub Pages |
| `package.json` | VitePress and formatting scripts |

## How to navigate the repo quickly

If you are trying to find the right place to edit:

- New or changed cheat behavior: start in `cheat-engine/www/cheat/panels/`.
- Shared logic used by multiple panels: inspect `cheat-engine/www/cheat/js/`.
- Problems at startup or game integration time: inspect `cheat-engine/www/cheat/init/` and `_cheat_initialize/`.
- Preview-only issues: inspect `preview/` and `start-preview.py`.
- Packaging or release problems: inspect `deploy/` and `.github/workflows/`.
- Documentation work: inspect `docs/`.
