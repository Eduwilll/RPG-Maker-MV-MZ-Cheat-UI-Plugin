# Build and Release

This page documents how the project is packaged and published so contributors can maintain the fork confidently.

## Local documentation build

The docs site is a VitePress app.

::: code-group
```sh [pnpm]
pnpm install
pnpm run docs:dev
pnpm run docs:build
```
:::

The built site is emitted under `docs/.vitepress/dist`.

## Compact release editions

`pnpm run build:compact` generates `output/runtime/offline` and
`output/runtime/online` from the same source graph. Each contains two main
files, `cheat/cheat-bundle.js` and `cheat/cheat-bundle.css`, plus the classic
integration loader, pop-out HTML, dependency manifest and license notices.
Panel source files and source maps are not installed by compact releases.

- **Offline:** vendor JS is embedded in the JS bundle; CSS embeds fonts/icons.
  The installation is self-contained and portable.
- **Online (cached):** dependencies are downloaded from immutable revision-pinned
  sources, size/hash checked and published atomically to a shared user cache.
  A complete valid cache requires no CDN requests on subsequent starts.
- Windows cache: `%LOCALAPPDATA%/RPGMakerCheatUI/dependencies/<asset-set-id>/`.
  It is separate from game settings/backups and kept on uninstall.
- The installer prepares Online's cache before replacing files or resetting
  preferences. A failed preparation leaves the existing installation unchanged.
- Missing/damaged runtime cache triggers bounded repair. If repair fails, the
  game remains playable and the cheat displays a repair/reinstall message.

The compact JS installs database save hooks before awaiting dependencies, then
evaluates one deferred UI factory after vendor startup and game-window bridging.
This avoids losing save edits during a failed or slow dependency download.
The classic integration path remains `cheat/init/import.js` for MV/MZ/FOSSIL.

Production caching requires NW.js. Browser tests inject local dependency bytes
but still verify their release hashes. Test native NW.js separately, especially
old MV runtimes: a `chrome61` syntax target is not a complete compatibility test.

## Development and legacy runtime bundles

Source/dev-sync installations retain these generated files:

- Overlay source: `cheat-engine/www/cheat/init/setup.js` and the modules it imports.
  Output: `cheat-engine/www/cheat/init/setup.bundle.js`.
- Pop-out source: `cheat-engine/www/cheat/js/window-init.js` and the modules it
  imports. Output: `cheat-engine/www/cheat/js/window-init.bundle.js`.
- Manifest: `cheat-engine/www/cheat/init/bundle-manifest.json`.

Both surfaces run on the vendored Vue 2.7.16 build (`cheat/libs/vue.js`) and
Vuetify 2.6.3 (`cheat/libs/vuetify.js`). Vue stays an external file rather than
being inlined, so it keeps its own caching and the bundles stay small. Vue 2.7
is the last 2.x release and keeps the Options API, so the runtime code is
unchanged by the upgrade; what it does change is DOM behaviour, which is why the
pop-out reveals itself through a `cheat-window-ready` class rather than an inline
style on the mount node.

Regenerate both with:

::: code-group
```sh [pnpm]
pnpm run build:cheat
```
:::

These development bundles remain committed for dev-sync compatibility. Run the
build after runtime JavaScript changes and include the bundles/manifest with the
source edit. Compact release packaging instead consumes `build:compact` output;
the installed EXE and Python packaging do not require Node.

The build uses Vite in library mode with these deliberate constraints:

- `target: "chrome61"` matches the oldest NW.js version MV supports.
- Vue and Vuetify stay external relative imports for the overlay, and the pop-out reuses the host page's Vue/Vuetify globals, so neither bundle inlines them. The pinned versions are Vue 2.7.16 and Vuetify 2.6.3.
- `fs`, `path` and `nw.gui` stay external runtime `require()` calls. Without that, Vite would replace them with empty browser shims and break NW.js persistence.
- The pop-out bridges game globals before mounting. Its imports are inlined into
  one file. Compact startup additionally defers the entire UI graph until the
  explicit game reference is available, including globals read during evaluation.

### Bootstrap seams

The three startup files stay separate, because each runs in a different
context, but the parts that need testing no longer live inside them:

| Module | Owns | Called by |
| --- | --- | --- |
| `js/runtime/RpgMakerGlobals.js` | the 60-name global list and `bridgeGlobals(window, opener)` | `window-init.js` |
| `js/runtime/CheatVersion.js` | version file path, `readCheatVersion`, numeric `compareVersions` | `MainComponent.checkVersion()` |
| `js/ui/CheatApp.js` | `createCheatApp({ Vue, Vuetify, components, options })`, plus the lazy `cheatRuntime` provider | both `setup.js` and `window-init.js` |

`import.js` deliberately stays a classic script: it must run before any ES
module exists, so its watchdog and DOM injection are unchanged. `CheatApp` is
also the composition root for the feature runtime, which is why the popup and
overlay can no longer drift apart on their theme shell.

### Feature runtime injection

The runtime is still installed on the game window (`window.__cheatFeatures`),
because the pop-out must read the *game's* instance across realms. What changed
is that components no longer have to go through the global:

- `createCheatApp({ resolveRuntime })` registers a lazy root `provide`, so
  descendants can inject `this.cheatRuntime`. Lazy matters: `MainComponent`'s
  `created()` hook builds the runtime after the app is constructed.
- Components declare `inject: { cheatRuntime: { default: null } }` and use
  `this.cheatRuntime || getFeatureRuntime()`. The locator is the fallback for
  the preview and pop-out, not the only path.
- `js/panels/**/*State.js` take the runtime as a parameter:
  `readMapLayers(runtime = getFeatureRuntime())`. Panels pass
  `this.cheatRuntime`; tests pass a fake. No `window` mutation needed.
- `getFeatureRuntime(viewWindow, dependencies)` accepts an explicit runtime,
  which is what makes the state modules testable without a game window.

`pnpm run test:unit` fails when development bundles are stale.
`pnpm run test:browser` exercises those bundles; `pnpm run test:compact`
exercises the compact release outputs with external requests blocked.

## Local release packaging

Release archives are created with the Python script in `deploy/main.py`.

::: code-group
```sh [build]
pnpm run build:cheat
pnpm run build:compact
pnpm run check:dependency-sources
py -3 deploy\main.py --version 1.10.0
py -3 tools\installer\build_windows.py --version 1.10.0
```
:::

Packaging creates four archives in `output/`:

- `rpg-mv-cheat-1.10.0-core.tar.gz` (Offline)
- `rpg-mz-cheat-1.10.0-core.tar.gz` (Offline)
- `rpg-mv-cheat-1.10.0-online-core.tar.gz` (Online)
- `rpg-mz-cheat-1.10.0-online-core.tar.gz` (Online)

The Windows ZIP contains the EXE and all four archives. It is the complete
offline-capable distribution, not a reduced Online-only installer download.

## What the packaging script does

The release script:

1. Validates prebuilt `output/runtime/<edition>/` layouts and dependency identity.
2. Copies only the compact payload allowlist into a uniquely owned staging folder.
3. Adds the MV or MZ `main.js` from `_cheat_initialize/`.
4. Writes version, edition, engine and dependency identity metadata.
5. Creates four archives and cleans only its own staging folders.

The important architectural consequence is that the repo stores shared runtime code once, then merges engine-specific bootstrap files during packaging.

Python packaging does not rebuild JavaScript or copy source panels. Build compact
output first. `--runtime-root` and `--output-dir` allow alternate artifact paths.
Existing legacy archives remain supported by the installer as local/legacy.

## Release automation

The repo contains a GitHub Actions workflow at `.github/workflows/release.yml`.

It runs when a tag matching `v*` is pushed.

Workflow summary:

1. Validate the tag/version/changelog, runtime tests, types, MV scan and docs.
2. Build compact payloads, verify immutable sources and upload build artifacts.
3. Package both editions for both engines using those artifacts.
4. Run browser/preview and both compact edition suites, retaining failure artifacts.
5. Test/build the Windows installer ZIP containing all four archives.
6. Create a draft GitHub Release with its existing notes and all five assets.

The release is created as a draft so maintainers can edit the notes before publishing.

## Docs deployment

The documentation site is published by `.github/workflows/deploy-docs.yml`.

On pushes to `main`, the workflow:

1. Installs Node and pnpm.
2. Runs `pnpm install`.
3. Builds the docs with `pnpm run docs:build`.
4. Uploads the VitePress output.
5. Deploys to GitHub Pages.

## Maintainer checklist before publishing

- Confirm the docs still build.
- Rebuild the overlay bundle (`pnpm run build:cheat`) and confirm its manifest is current.
- Confirm MV and MZ packaging still complete successfully.
- Confirm installation docs still match the archive layout.
- Test at least one real game if the release changes bootstrap or engine patching.
- Review the generated draft release notes and replace placeholders.
