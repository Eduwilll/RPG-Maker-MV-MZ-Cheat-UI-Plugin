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

 New Features & Enhancements
# 🌍 Advanced Translation System
6 Optimized Translation Services ranked by performance and reliability
- TranslateShellProxy (478 texts/sec) - Default ultra-fast service
- Lingva Translate (445 texts/sec) - Privacy-focused open-source alternative
- Google Translate (225 texts/sec) - Most reliable and accurate option
- LibreTranslate - Self-hosted unlimited usage with Docker support
- SugoiTranslator - Local Japanese specialist for anime/game content
- Mock Translator - Development and testing mode
- Real-time translation of variables, switches, maps, and game text
- Open-source integration with community-driven translation services
- DeepL 
🎨 Enhanced User Interface
- Modern Vuetify-based design with Material Design principles
- Minimizable interface - Clean, unobtrusive gameplay experience
- Smooth transitions and animations for better user interaction
- Responsive layout that adapts to different screen sizes
- Semi-transparent background when not in focus to avoid gameplay obstruction
- Improved accessibility with better contrast and readable fonts
- Advanced input validation with real-time feedback and error prevention
- Organized panel system with logical grouping of related features
🔧 Bug Fixes & Quality Improvements
- Fixed translation service timeouts and connection issues
- Resolved UI scaling problems on high-DPI displays
- Corrected shortcut conflicts with game controls
- Fixed save/load functionality reliability issues
- Improved variable search performance for large game databases
- Enhanced stability during rapid cheat toggling
- Better error messages with actionable troubleshooting steps
⚡ Performance Improvements
- Streamlined service selection (top 6 fastest services only)
- Optimized UI components with better responsiveness
- Enhanced error handling and recovery
- Improved memory management
📋 Original Features
- GUI based cheat interface for RPG Maker MV/MZ games
- Stats, gold, speed, items, variables, switches editing
- Game speed control (x0.1 ~ x10)
- No clip mode and god mode
- Random encounter disable
- Battle control (victory/defeat/escape/abort)
- Customizable shortcuts
- Save/load location system
- Developer tools integration




# Others modifications
- toggle to hide side bar
- option to teleport in the center of the map
- pre-load items
- hide nameless item default and persist that mode even when the user change tabs
- save location give the user give flags to his saves locations like boss area, shop, checkpoint etc.
- in variables possible to user filter them by value like positive, nagative, non-values etc.
- the toggle bar in items more compacts
- make an tab with only actors in a list and when click show besides all the var we can chage in him, if possible show what skills he can learn
- make the ui more compact in general
- Add game speed and with the ctrl keyboard butom holding foward the game speed 2x, with the possibility to chenge the speed value
- other cheats, one-hit kill, no random encounters. Check if i already have them
- List all communEv. And possibility to run;