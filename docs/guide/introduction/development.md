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
- `types/` contains local declarations for RPG Maker globals, cheat-specific globals, and environment assumptions.
- `@ts-check` is enabled file-by-file so we can improve safety incrementally instead of flooding the repo with errors all at once.
- `pnpm run typecheck` is the main verification step for this foundation.

The translation subsystem was also split into smaller contributor-focused modules during this phase:

- `TranslateHelper.js` now acts as the coordinator instead of owning every translation responsibility directly.
- `TranslationConfig.js`, `TranslationBank.js`, `TranslateSettings.js`, and `TranslateProgress.js` hold the reusable translation state and config pieces.

## Workflow 1: browser preview

Use this when you are changing layout, panel interactions, or other UI behavior that does not require the full game engine.

### Start the preview server

::: code-group
```sh [.py]
.venv\Scripts\python.exe start-preview.py
```
:::

Then open:

```text
http://localhost:8080/preview/index.html
```

### What preview mode gives you

- Fast reloads with cache disabled
- A browser-based rendering surface for the cheat UI
- Mocked RPG Maker objects and helper services
- No need to relaunch a full game for every CSS or panel tweak

### Limitations of preview mode

Preview mode is not a replacement for in-game testing.

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

### What dev-sync does

- Detects whether the target is MV or MZ
- Copies the correct injected `main.js`
- Merges support files into the target game
- Links the source `cheat/` folder into the game
- Writes a development version descriptor

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

## Related technical references

- [Architecture](/guide/technical/architecture)
- [Repository Structure](/guide/technical/repository-structure)
- [Runtime and Data Flow](/guide/technical/runtime-and-data-flow)
- [Build and Release](/guide/technical/build-and-release)
