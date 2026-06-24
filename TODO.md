# 🚀 Future Feature Roadmap (v1.2.0+)

This document tracks planned features and enhancements for the RPG Maker MV/MZ Cheat UI + Translation project.

## 📋 Planned Features

### 🔍 1. Real-time Variable/Switch Watcher
- **Description**: A "Watch List" overlay to track specific hidden variables (like Affinity or Quest Progress) while playing.
- **Priority**: High
- **Status**: Shipped in v1.4.0

### 💾 2. Save File Editor in the RPGMakerCheatInstaller
- **Description**: Directly edit save slots, and make backup of the files before changing. I want the user be able to save edit the His save failes.
- **Priority**: Medium-High
- **Status**: Shipped in v1.5.0

### 📦 3. "Safe Patch" Export
- **Description**: Generate a standalone `data/` patch from translations that can be used without the full cheat engine installed.
- **Priority**: Medium
- **Status**: Tagged for v1.6.0

### 🗺️ 4. Interactive Mini-Map & Entity Radar
- **Description**: A top-down view of the current map highlighting NPCs, treasure chests, and active events.
- **Priority**: Medium
- **Status**: Tagged for v1.7.0

### ⚡ 5. Global Database Search
- **Description**: A universal search bar to instantly find any Item, Weapon, Enemy, or Skill across all database tabs.
- **Priority**: High
- **Status**: Tagged for v1.8.0

### 6. Add Create Item, Weapon, Armor, Skill, Enemy, Map, Event, etc.
- **Description**: Add a feature to create items, weapons, armor, skills, enemies, maps, events, etc.
- **Priority**: High
- **Status**: Tagged for v1.9.0

### 7. Create a realistc mini-map
- **Description**: Add a feature to add a mini-map realistic that can put in any place of the screen.
- **Priority**: High
- **Status**: Tagged for v1.10.0
---
*Note: These features were selected based on user feedback to prioritize development efficiency and player experience.*

TODAY:
- Be able to read all plugin in mz/mv games from the file plugins.js and edit the plugin is enable or disable

Discussion backlog:
- Wrapper older RMMV games with a newer stable NW.js runtime.
- Add a reliable console/logging option for older MV games when devtools are hard to open.
- Expand the cheat UI with an About panel that shows runtime and game diagnostics.
- Add exportable troubleshooting logs users can send to developers.

Maintainability planning:
- Phase 4 is effectively complete: diagnostics, validation, compatibility scanning, and smoke-testing are in place.
- Phase 5: Type and domain alignment.
- Audit remaining root-level files under `cheat-engine/www/cheat/js` and decide which belong in clearer domains.
- Split `CheatBattle.js` into scene-action and battle-action modules.
- Strengthen typed JavaScript checking incrementally instead of trying to enforce it everywhere at once.
- Add local type augmentations for intentional MV/MZ internals instead of relying on scattered `any`.
- Make the two panel layers explicit:
  - `cheat-engine/www/cheat/panels` = Vue component/view layer
  - `cheat-engine/www/cheat/js/panels` = shared panel state/helper layer
- Migrate remaining panels that still only partially follow the shared helper conventions.
