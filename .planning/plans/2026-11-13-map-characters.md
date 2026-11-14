# Visible Map Characters And Combined Controls

The user reports that NPCs still do not appear and asks whether Map Events and
Minimap can be combined. Evidence: both renderers currently draw colored markers
only. Event snapshots omit character index/pattern and no character image is
drawn. Classification toggles alone cannot render an NPC.

Fix: share a game-owned character painter between the full map and floating
minimap. Prefer the live Sprite_Character bitmap/frame so loaded encrypted or
composite artwork stays compatible. Fall back to private, bounded character-sheet
previews without painting asynchronously into stale map canvases. Keep live engine
objects out of Vue. Add a sprites/markers preference, defaulting to sprites.

Combine navigation into Map / Minimap with the existing minimap settings embedded
under the full map. Preserve the legacy minimap route and shortcut so saved links
continue to work; avoid duplicate layer controls in the embedded settings.

- [x] RED/green regression: an actual NPC image, not just a colored marker, is
  drawn through the public minimap renderer and full map browser paths.
- [x] Cover sheet index, facing/animation, transparency/opacity, map changes,
  missing art and bounded fallback caching without observing engine objects.
- [x] Consolidate settings and sidebar navigation while preserving legacy routes.
- [x] Verify unit, browser (including separate window), types and MV syntax.

Do not change the actual game scene or inject/install into game copies. Custom
plugin-only child effects and exact roof occlusion are not guaranteed. No commit
or release requested.

## Review Fixes

Three review findings were reproduced with failing tests before fixing them:
reading existing MV pixels now avoids lazy canvas getters that replace textures;
graphicless events retain marker fallback while tile events use valid live frames;
successful optional composite frames refresh and caches clear on scene changes.
Async image completion only updates private cache entries, never an old map canvas.

The floating minimap character/event switch now defaults on for new settings,
without changing an explicitly saved off preference. Its label makes the sprite
gate clear. Full map sprites are enabled by default and can be switched to markers.

Final verification: 149 unit tests and 111 browser checks passed, including actual
NPC image pixels in the full map, floating minimap and separate-window renderer.
TypeScript passed; MV syntax passed for 138 files; documentation build passed.
Whitespace checks passed excluding unrelated pre-existing TODO.md changes. Review
rechecks found no remaining issues in the corrected helper. The MV regression
also covers its inherited private _canvas accessor backed by __canvas, using the
local Termina core implementation as reference. Full-game NW.js playback remains
a manual test; no game copy was modified or launched by this task.
