# Contributing

This repository is a maintained fork of an older project. A lot of the contribution work here is not just adding features, but also making the behavior understandable and safer to maintain. Documentation improvements are first-class contributions.

## Good first contribution areas

- Clarify installation and troubleshooting steps
- Improve panel UX or layout polish
- Fix MV or MZ compatibility issues
- Improve translation target extraction or endpoint handling
- Expand contributor documentation
- Add safer tests or validation steps around packaging and release workflows

## Before you open a pull request

Read these pages first:

- [Development and Test](/guide/introduction/development)
- [Architecture](/guide/technical/architecture)
- [Repository Structure](/guide/technical/repository-structure)
- [Runtime and Data Flow](/guide/technical/runtime-and-data-flow)

## Reporting bugs

Open an issue on [GitHub](https://github.com/Eduwilll/RPG-Maker-MV-MZ-Cheat-UI-Plugin/issues) and include:

- game name
- engine version: MV or MZ
- plugin version
- expected behavior
- actual behavior
- reproduction steps
- screenshots if helpful
- console output from NW.js developer tools if available

## Development setup

### Docs

::: code-group
```sh [pnpm]
pnpm install
pnpm run docs:dev
```
:::

### Python tools

::: code-group
```sh [.py]
.venv\Scripts\python.exe start-preview.py
.venv\Scripts\python.exe deploy\dev.py --mz
```
:::

## Code contribution flow

1. Fork the repository.
2. Create a focused branch.
3. Make the smallest change that solves the problem cleanly.
4. Validate in preview mode, in a real game, or both, depending on the layer touched.
5. Update the docs if behavior, installation, or contributor workflow changed.
6. Open a pull request with clear context.

## What maintainers need in a pull request

- A short explanation of the problem
- A summary of the fix
- Notes about MV, MZ, or both
- How you validated the change
- Any known limitations or follow-up work

## Code style expectations

This repo intentionally stays close to its runtime constraints:

- plain JavaScript modules
- Vue 2 and Vuetify 2 without a bundler for the game runtime
- minimal complexity in boot and packaging code

Follow existing patterns unless there is a strong reason to refactor. When you do refactor, document the reasoning.

## Contributor safety rules

- Be careful when patching RPG Maker engine methods.
- Do not store live RPG Maker objects directly in Vue reactive state when they may be serialized by saves.
- Test MV and MZ assumptions when touching paths or bootstrap files.
- Treat translation as a cache-first system, not a draw-time network system.
- Keep installation docs aligned with the actual release archive layout.

## Documentation contributions

If you are unsure where to start, improving docs is always useful. This fork benefits a lot from:

- clearer mental models
- examples of safe modification patterns
- troubleshooting notes rooted in real repo behavior
- diagrams and repo maps for new contributors

## Maintainer note

Because this is a fork of an older project, contributor-facing clarity matters almost as much as feature work. If you find hidden behavior while debugging, document it before you forget it.
