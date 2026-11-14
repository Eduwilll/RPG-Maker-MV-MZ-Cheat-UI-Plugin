# Refresh Standalone UI Preview

Goal: start-preview.py launches a useful development UI without running or
modifying a game. Preserve the actual cheat components, not duplicate UI mockups.

Work locally in the current dirty checkout. No commit/release or game sync.

- [x] Update Python launcher with loopback-only serving, configurable port,
  no-browser option, useful startup errors, safe UI-only routes and cache headers.
  Add a version endpoint for bounded source-file change detection and Python tests.
- [x] Refresh the preview host around the real CheatModal, with responsive stage,
  small developer controls, query-selected panel, visible errors and auto reload.
- [x] Add preview-only generated artwork and representative NPCs, enemies, items,
  dialogue/choices, event references and destination preview data. No copyrighted
  game assets, game launch, or network translation calls.
- [x] Add browser coverage of the actual preview entry point, navigation to every
  current panel, map/NPC/dialogue rendering and developer controls.
- [x] Run Python tests, existing unit/browser suites, type/MV checks and document
  commands and limits. Network-hosted skin/icon/font CSS may require internet.

Boundaries: Python launcher/tests can be implemented independently while the main
agent handles JS/HTML preview content. Keep test fixture changes isolated from
human preview enhancements unless a missing engine contract is shared.

## Verification

64 actual-preview checks passed across MV and MZ UI branches, covering all current
panels, map/NPC graphics, message samples, detached map previews and simulated
scene readiness. Existing 118 browser checks and 152 unit tests passed. Python
launcher: 14 passed, one symlink test skipped for Windows privilege restrictions.
The HTTP suite was rerun outside the sandbox after sandbox temp-directory access
failed. TypeScript, MV syntax validation (139 files), docs build and whitespace
checks passed (excluding unrelated pre-existing TODO.md changes).

Focused read-only review reported no P1/P2 findings. The real preview stylesheet
uses the bundled Vuetify JS version (2.6.3); headless checks omit remote skins and
do not prove CDN availability or pixel-perfect styling. Browser-only fixture mode
is not a complete game engine. No game copies, commits, releases or persistent
servers were changed/left running.
