# Development and Test

This fork includes its own contributor tooling because testing inside RPG Maker alone is slow. Use this page as the practical starting point for local development.

## Tooling overview

There are two main workflows:

- Browser preview for fast UI iteration.
- Dev-sync into a real MV or MZ game for runtime validation.

You will usually use both.

## Prerequisites

### Node and pnpm

Needed for the documentation site and repo formatting tasks.

::: code-group
```sh [pnpm]
pnpm install
```
:::

### Python virtual environment

Used for preview, packaging, and dev-sync scripts.

::: code-group
```sh [.py]
.venv\Scripts\python.exe --version
```
:::

### Static-checking foundation

Phase 1 uses a lightweight TypeScript configuration for JavaScript projects:

- `tsconfig.json` provides editor and `checkJs` groundwork without changing runtime packaging.
- `@fenixengine/rmmz-ts` is already wired in as a development-only source of RPG Maker MZ engine declarations.
- `types/` contains the local layer on top of that:
  - MV compatibility gaps
  - cheat-specific globals
  - project-specific data augmentations used by translation and runtime patches
- `@ts-check` is enabled file-by-file so we can improve safety incrementally instead of flooding the repo with errors all at once.
- `pnpm run typecheck` is the main verification step for this foundation.
- `pnpm run check:mv-compat` scans the cheat runtime for newer syntax and array helpers that have caused older MV NW.js regressions before.
- `pnpm run test:unit` runs the behavioral runtime tests (Node 22.14 or newer).
- `pnpm run check:repo` runs unit tests, typecheck, MV compatibility scan, and docs build.

### Automated UI smoke tests

```sh
pnpm run test:browser
```

This launches an installed Chromium/Edge in an isolated headless profile and serves
local fixtures over loopback. On other installations, set `CHEAT_TEST_BROWSER` to
the browser executable. It exercises rendered Vue panels plus the real pop-out
bootstrap in a separate browser realm, without changing any game installation or
save. The temporary browser profile is removed when unlocked. A sandbox may require
permission to launch the browser process.

These checks complement, but do not replace, manual MV/MZ NW.js testing, particularly
for third-party battle systems, filesystem persistence, and game-specific options.

The translation subsystem was also split into smaller contributor-focused modules during this phase:

- `TranslateHelper.js` now acts as the coordinator instead of owning every translation responsibility directly.
- `TranslationConfig.js`, `TranslationBank.js`, `TranslateSettings.js`, `TranslateProgress.js`, and `TranslationExtractors.js` hold the reusable translation state and config pieces.
- `RuntimeEnv.js` is the new home for small shared MV/MZ and NW.js environment helpers.

## Workflow 1: browser preview

Use this when you are changing layout, panel interactions, or other UI behavior that does not require the full game engine.

### Start the preview server

::: code-group
```sh [.py]
py -3 start-preview.py
```
:::

Then open:

```text
http://localhost:8080/preview/index.html
```

### What preview mode gives you

- Automatic reload after JS/CSS/HTML/JSON changes, plus cache-disabled responses
- A browser-based rendering surface for the cheat UI
- Mocked RPG Maker objects and helper services
- No need to relaunch a full game for every CSS or panel tweak
- Representative original map tiles, NPC sprites, portraits, icons, inventory,
  multipart enemy encounters and selected dialogue responses
- A developer toolbar for any current panel, MV/MZ UI branches, and exploration,
  battle or title/no-save scenes
- Current-panel URL persistence, an **Add dialogue** button and visible Vue errors

The launcher uses the Python standard library, so a virtual environment is optional.
To use your existing virtual environment, run `.venv\Scripts\python.exe start-preview.py`.

```powershell
py -3 start-preview.py --port 8081 --no-browser
py -3 start-preview.py --no-reload
```

`--port 0` selects a free port and prints its URL. Stop with Ctrl+C. The server is
loopback-only and exposes preview, cheat UI and public documentation assets, not
test games, hidden files or arbitrary repository paths. Reload detection scans
only preview/UI source metadata with a bounded, cached fingerprint.

You can open a panel directly:

```text
http://localhost:8080/preview/index.html?panel=map-event-panel
http://localhost:8080/preview/index.html?panel=message-log-panel&engine=MV
```

**Reload demo** resets simulated game data, not stored browser display preferences.
Preview key/value settings use their own browser namespace. The real cheat UI is
mounted, including floating minimap and font/size controls; no game is installed,
launched or read. Translation requests use placeholder responses.

```powershell
pnpm run test:preview
py -3 -B -m unittest discover -s tests -p test_start_preview.py
```

The preview regression loads the actual preview entry point and mounts all current
panels in both engine UI modes. As with the regular smoke runner, it omits remote
skin stylesheets to avoid a network-dependent test. Full visual styling still
uses the Vuetify, icon and font CDNs in your normal browser.

### Limitations of preview mode

Preview mode is not a replacement for in-game testing.
The engine selector changes mock UI contracts, not a complete MV/MZ engine.

Use a real game when your change affects:

- engine patches
- keyboard handling in NW.js
- translation hooks
- file-system-backed persistence
- boot or packaging behavior

## Workflow 2: dev-sync into a real game

Use this when you need to validate behavior inside an actual RPG Maker MV or MZ runtime.

### Sync with a known game path

::: code-group
```sh [.py]
.venv\Scripts\python.exe deploy\dev.py --game-path "C:/Games/MyTestGame"
```
:::

### Sync with test games in the repo

::: code-group
```sh [.py]
.venv\Scripts\python.exe deploy\dev.py --mv
.venv\Scripts\python.exe deploy\dev.py --mz
```
:::

### Validate an existing dev-sync target

Use this when you want to confirm that a game still has the expected cheat bootstrap files without rewriting the target.

::: code-group
```sh [.py]
.venv\Scripts\python.exe deploy\dev.py --game-path "C:/Games/MyTestGame" --validate-only
```
:::

### What dev-sync does

- Detects whether the target is MV or MZ
- Copies the correct injected `main.js`
- Merges support files into the target game
- Links the source `cheat/` folder into the game
- Writes a development version descriptor
- Validates that the cheat bootstrap files are reachable after sync

### Typical edit loop

1. Run `deploy/dev.py` once for the target game.
2. Edit files under `cheat-engine/www/cheat/`.
3. Save changes.
4. Press <kbd>F5</kbd> inside the game to reload.

## Where to make changes

| Area | Path |
| --- | --- |
| Main overlay lifecycle | `cheat-engine/www/cheat/MainComponent.js` |
| Navigation and panel mounting | `cheat-engine/www/cheat/CheatModal.js` |
| Feature panels | `cheat-engine/www/cheat/panels/` |
| Shared helpers and storage | `cheat-engine/www/cheat/js/` |
| Bootstrapping and engine patches | `cheat-engine/www/cheat/init/` |
| Browser preview bridge | `preview/` |
| Packaging scripts | `deploy/` |

## Contributor habits that help

- Test UI changes in preview mode first.
- Test engine or translation changes in a real game before merging.
- Keep MV and MZ compatibility in mind when touching bootstrap or path logic.
- Avoid introducing state patterns that store live RPG Maker objects inside Vue reactivity.
- Update docs when behavior or workflow changes.

## Smoke testing before shipping

Phase 4 adds a lightweight regression workflow:

1. Run `pnpm run check:repo`.
2. Smoke-test one MV game and one MZ game when runtime behavior changed.
3. Verify overlay open, About panel, and relevant shortcuts.
4. If translation changed, verify translation startup in a real game.

See [Smoke Testing](/guide/technical/smoke-testing) for the current checklist.

## Related technical references

- [Architecture](/guide/technical/architecture)
- [Repository Structure](/guide/technical/repository-structure)
- [Runtime and Data Flow](/guide/technical/runtime-and-data-flow)
- [Build and Release](/guide/technical/build-and-release)
- [Smoke Testing](/guide/technical/smoke-testing)
