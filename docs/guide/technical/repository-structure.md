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
| `cheat-engine/www/cheat/js/TranslateHelper.js` | Change endpoints, extraction logic, translation batching, or metrics |
| `cheat-engine/www/cheat/js/InGameTranslator.js` | Change how cached translations are applied at runtime |
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
