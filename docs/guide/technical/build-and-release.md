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

## Runtime bundles

Both cheat surfaces ship as generated files:

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

The bundles are committed because installing and packaging must not require Node. Run the build after any runtime JavaScript change, then commit the bundles and manifest together with the source edit.

The build uses Vite in library mode with these deliberate constraints:

- `target: "chrome61"` matches the oldest NW.js version MV supports.
- Vue and Vuetify stay external relative imports for the overlay, and the pop-out reuses the host page's Vue/Vuetify globals, so neither bundle inlines them. The pinned versions are Vue 2.7.16 and Vuetify 2.6.3.
- `fs`, `path` and `nw.gui` stay external runtime `require()` calls. Without that, Vite would replace them with empty browser shims and break NW.js persistence.
- The pop-out keeps its intentional load ordering: it imports the UI only after it bridged the game globals. Its `import()` calls are inlined into a single file (`codeSplitting: false`), and no module touches RPG Maker globals at evaluation time, so eager evaluation is safe. A leftover dynamic import would point at a source module that bundle-only installs omit.

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

- `createCheatApp({ resolveRuntime })` registers a lazy `provide` mixin, so
  every component reads `this.cheatRuntime`. Lazy matters: `MainComponent`'s
  `created()` hook builds the runtime after the app is constructed.
- Components declare `inject: { cheatRuntime: { default: null } }` and use
  `this.cheatRuntime || getFeatureRuntime()`. The locator is the fallback for
  the preview and pop-out, not the only path.
- `js/panels/**/*State.js` take the runtime as a parameter:
  `readMapLayers(runtime = getFeatureRuntime())`. Panels pass
  `this.cheatRuntime`; tests pass a fake. No `window` mutation needed.
- `getFeatureRuntime(viewWindow, dependencies)` accepts an explicit runtime,
  which is what makes the state modules testable without a game window.

`pnpm run test:unit` fails when the manifest does not match the current sources or the committed artifacts. `pnpm run test:browser` boots both shipped bundles, so the artifacts that actually install are exercised.

## Local release packaging

Release archives are created with the Python script in `deploy/main.py`.

::: code-group
```sh [python]
.venv\Scripts\python.exe deploy\main.py --version 1.2.3
```
:::

That command builds two archives in `output/`:

- `rpg-mv-cheat-1.2.3-core.tar.gz`
- `rpg-mz-cheat-1.2.3-core.tar.gz`

## What the packaging script does

The release script:

1. Copies the runtime source tree from `cheat-engine/www/` into a temp directory.
2. Merges MV-specific or MZ-specific files from `_cheat_initialize/`.
3. Removes initialization-only folders from the final package.
4. Writes `cheat-version-description.json`.
5. Creates compressed archives for both engines.

The important architectural consequence is that the repo stores shared runtime code once, then merges engine-specific bootstrap files during packaging.

Packaging consumes the committed `setup.bundle.js` and `window-init.bundle.js`; it does not rebuild them. Run `pnpm run build:cheat` before packaging whenever runtime JavaScript changed.

## Release automation

The repo contains a GitHub Actions workflow at `.github/workflows/release.yml`.

It runs when a tag matching `v*` is pushed.

Workflow summary:

1. Checkout full git history.
2. Set up Python.
3. Extract the semantic version from the tag.
4. Run `python deploy/main.py --version ...`.
5. Create a draft GitHub Release.
6. Attach the generated MV and MZ archives.

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
