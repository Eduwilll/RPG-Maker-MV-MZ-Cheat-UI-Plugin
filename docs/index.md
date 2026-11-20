---
layout: home

hero:
  name: "RPG Cheat UI"
  text: "Plugin for RPG Maker MV/MZ"
  tagline: A compact, GUI-based cheat overlay. Toggle it in-game and edit stats, items, actors, enemies, switches, variables, speed, saves and more — without leaving the game.
  image:
    src: /images/overlay-general.png
    alt: RPG Maker Cheat UI overlay showing the compact General panel
  actions:
    - theme: brand
      text: Download
      link: https://github.com/Eduwilll/RPG-Maker-MV-MZ-Cheat-UI-Plugin/releases
    - theme: alt
      text: Install the Plugin
      link: /guide/introduction/getting-started
    - theme: alt
      text: Explore Features
      link: /guide/features/features
    - theme: alt
      text: Plugin Compatibility
      link: /guide/plugins/compatibility

features:
  - title: MV, MZ and FOSSIL
    details: Install from one package into either engine. The installer patches the right entry point and handles MZ FOSSIL games without extra steps.

  - title: Compact Overlay and Pop-Out
    details: Grouped navigation, dense controls, Find (Ctrl+P), a resizable overlay, and a separate NW.js window for multi-monitor play.

  - title: Live Game Editors
    details: Change stats, HP/MP/TP, gold, items, weapons, armor, skills, actors, enemies, troops, classes, switches and variables while the game runs.

  - title: Interactive Map and Minimap
    details: Live tile artwork, pan/zoom/follow, event, enemy and treasure markers, layered visibility, and explicit teleport actions.

  - title: Dialogue Log and Translation
    details: Capture and search the last 1,000 messages with speaker portraits, then batch-translate items, maps, terms and dialogue through Lingva or OpenAI-compatible endpoints.

  - title: Plugin-Aware by Design
    details: Tested alongside Yanfly, VisuStella, MOG, GALV, SRD, HIME and more. FOSSIL entry points are patched automatically.
---

## See the Current UI

<div class="shot-grid">
  <figure class="shot-card">
    <img src="/images/enemies-panel.png" alt="Enemy and troop editor with composite artwork">
    <figcaption>Troop artwork and battle actions</figcaption>
  </figure>
  <figure class="shot-card">
    <img src="/images/map-minimap-panel.png" alt="Interactive map with live tile artwork and event markers">
    <figcaption>Interactive map with live tiles</figcaption>
  </figure>
  <figure class="shot-card">
    <img src="/images/message-log-panel.png" alt="Message log with speaker portraits and search">
    <figcaption>Searchable dialogue history</figcaption>
  </figure>
  <figure class="shot-card">
    <img src="/images/actors-panel.png" alt="Actor editor with party roster and detailed stats">
    <figcaption>Actor and party editing</figcaption>
  </figure>
</div>

## Start Here

<div class="doc-card-grid">
  <a class="doc-card" href="/RPG-Maker-MV-MZ-Cheat-UI-Plugin/guide/introduction/getting-started">
    <strong>Getting Started</strong>
    <span>Install the plugin, launch the game, and open the overlay for the first time.</span>
  </a>
  <a class="doc-card" href="/RPG-Maker-MV-MZ-Cheat-UI-Plugin/guide/plugins/compatibility">
    <strong>Plugin Compatibility</strong>
    <span>Check tested plugin families and the manual FOSSIL entry-point steps.</span>
  </a>
  <a class="doc-card" href="/RPG-Maker-MV-MZ-Cheat-UI-Plugin/guide/translation/translation-usage">
    <strong>Translation Workflow</strong>
    <span>Set endpoints, choose targets, and run batch translation without guessing.</span>
  </a>
  <a class="doc-card" href="/RPG-Maker-MV-MZ-Cheat-UI-Plugin/guide/features/features">
    <strong>Feature Reference</strong>
    <span>See what each panel can do before you install or start tuning shortcuts.</span>
  </a>
  <a class="doc-card" href="/RPG-Maker-MV-MZ-Cheat-UI-Plugin/guide/introduction/development">
    <strong>Development Guide</strong>
    <span>Use the browser previewer and dev-sync setup for faster iteration.</span>
  </a>
</div>

## What You Can Do

- Open the cheat UI with `Ctrl + C` and work from a compact in-game overlay or a separate window.
- Modify party stats, inventory, switches, variables, movement, saves, encounters, battle flow, actors, enemies, skills and classes.
- Browse the map with live tiles, layer controls, event markers and one-click teleport actions.
- Read, search and export captured dialogue without touching the game's original message windows.
- Translate game text with local or cloud endpoints and reuse cached results across sessions.
- Install the same project into MV or MZ, including MZ games that boot through FOSSIL.

## Recommended Reading Path

1. Read [Getting Started](/guide/introduction/getting-started).
2. Jump to [Install on RPG Maker MV](/guide/installation/install-mv) or [Install on RPG Maker MZ](/guide/installation/install-mz).
3. Check [Plugin Compatibility](/guide/plugins/compatibility) if the game uses FOSSIL or a large plugin suite.
4. Review [Features](/guide/features/features) and [Shortcuts](/guide/features/shortcuts).
5. If you need machine translation, continue with [Translation Usage](/guide/translation/translation-usage).
