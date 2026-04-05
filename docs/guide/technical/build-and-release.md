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
- Confirm MV and MZ packaging still complete successfully.
- Confirm installation docs still match the archive layout.
- Test at least one real game if the release changes bootstrap or engine patching.
- Review the generated draft release notes and replace placeholders.
