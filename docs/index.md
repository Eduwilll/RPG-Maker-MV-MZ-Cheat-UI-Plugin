---
layout: home

hero:
  name: "RPG Cheat UI"
  text: "Plugin for RPG Maker MV/MZ"
  tagline: A clean, GUI-based cheat overlay. Toggle it in-game and edit anything — stats, items, variables, speed, and more.
  image:
    src: /images/cheatModal-open-focused.png
    alt: RPG Maker Cheat UI overlay preview
  actions:
    - theme: brand
      text: Install the Plugin
      link: /guide/introduction/getting-started
    - theme: alt
      text: Explore Features
      link: /guide/features/features
    - theme: alt
      text: Translation Guide
      link: /guide/translation/translation-usage

features:
  - title: Built for MV and MZ
    details: Install the same project into either engine and follow engine-specific copy paths for `main.js`, `js/`, and `cheat/`.

  - title: Overlay and Pop-Out UI
    details: Open the cheat menu in-game with a shortcut, or move it to a separate NW.js window for multi-monitor play and debugging.

  - title: Broad Cheat Coverage
    details: Adjust stats, items, weapons, armors, switches, variables, speed, battle state, movement tools, and save restrictions from dedicated panels.

  - title: Translation at Scale
    details: Translate items, maps, actors, system terms, and dialogue using Lingva, local services, or OpenAI-compatible LLM endpoints.

  - title: Cache-Backed Runtime Hooks
    details: Batch translation is done ahead of time, then cached results are applied to game data and text drawing hooks while you play.

  - title: Contributor Tooling Included
    details: The repo ships with a browser preview server, dev-sync scripts for test games, and technical docs for contributors.
---

## Start Here

<div class="doc-card-grid">
  <a class="doc-card" href="/RPG-Maker-MV-MZ-Cheat-UI-Plugin/guide/introduction/getting-started">
    <strong>Getting Started</strong>
    <span>Install the plugin, launch the game, and open the overlay for the first time.</span>
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

- Open the cheat UI with `Ctrl + C` and work from an in-game overlay or a separate window.
- Modify party stats, inventory, switches, variables, movement, saves, encounters, and battle flow.
- Translate game text with local or cloud endpoints and reuse cached results across sessions.
- Develop UI changes outside the game with the included preview server and sync tooling.

## Recommended Reading Path

1. Read [Getting Started](/guide/introduction/getting-started).
2. Jump to [Install on RPG Maker MV](/guide/installation/install-mv) or [Install on RPG Maker MZ](/guide/installation/install-mz).
3. Review [Features](/guide/features/features) and [Shortcuts](/guide/features/shortcuts).
4. If you need machine translation, continue with [Translation Usage](/guide/translation/translation-usage).
