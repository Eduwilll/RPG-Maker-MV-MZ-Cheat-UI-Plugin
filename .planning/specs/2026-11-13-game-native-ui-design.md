# Game-Native UI And Contextual Actions

Status: approved by the user and implemented. Both standalone battles and original
map-event execution are available when supported. See the implementation plan's
verification ledger for automated coverage and remaining in-game checks.

## Intent

Use the running game's assets and data throughout the existing cheat UI, make
portraits useful navigation shortcuts, improve actor/enemy management, preview
teleport destinations, and let users arrange the overlay and minimap themselves.

This is an extension of the current Vue 2/Vuetify 2 plugin, not a framework rewrite.
It must work in the embedded overlay and the separate cheat window on MV and MZ,
including older MV NW.js/Chromium runtimes.

## Current Foundation

- `MessagePortrait` already paints message faces using the game's ImageManager.
- `DatabaseTooltip` already shows text details; enemy rewards currently show only
  base EXP/gold, not artwork or the drop table.
- `ActorSettingPanel` already edits stats, skills and status effects, and groups
  actors by party membership. It does not expose party add/remove controls.
- `BattleActions` already starts troops, creates temporary enemy encounters and
  adds reinforcements. It does not activate original map events.
- `MapArtwork` renders the currently loaded map using MV/MZ Tilemap methods.
- Teleport already reads a destination's JSON for its center operation, but has
  no artwork preview.
- The overlay is fixed at 750x450; the separate NW.js window starts at 700x800.
- Minimap settings already contain custom X/Y coordinates, but no drag control.

## Approaches

1. **Extend the existing panels through shared modules (recommended).** One asset
   rendering module, one record-navigation mechanism and game-owned mutation
   helpers serve existing views. Reuse previous work and preserve MV compatibility.
2. Add images/actions independently to each panel. Smaller initial edits, but
   repeats cross-window, encryption and loading logic and creates inconsistent UI.
3. Replace the UI framework. Much larger migration with substantial compatibility
   risk and no requirement that needs it. Out of scope.

The user approved approach 1 and this design before implementation.

## Shared Game Assets

- Add a game-owned asset module and reusable view for face frames, actor character
  sprite frames, enemy battlers and IconSet cells. Pass primitive descriptors/IDs,
  never live Bitmap, actor or database records through reactive Vue state.
- Resolve ImageManager, engine image sizes and assets from the game window, not
  from the popup's relative URL. Respect normal MV/MZ encrypted-asset loading.
- Cache loaded assets, reserve image space and paint only visible/requested assets.
  Handle load failure without poisoning the game's shared image cache or creating
  an endless game resource-error/retry screen for an optional UI preview.
- Actor portraits fall back to available character sprites, then a neutral avatar.
  Do not invent icon indices or assume every database actor has a usable face file.
- Add an optional **Use game font** preference under Appearance. Apply it only to
  the cheat root, not the game's document. Keep the existing readable UI font as
  default/fallback. A popup needs the game's font resource/face registration, not
  merely its font-family name copied into another document.
- Keep names as text next to icons. Do not use artwork as the only identifier.

## Record Navigation

- A portrait button for a known actor routes to Stats and selects that actor ID.
- Use the same navigation mechanism for actor references in health/battle views,
  message history and other panels that expose a confirmed actor identity.
- Store IDs and pending selection, synchronize the sidebar, and select after the
  destination panel mounts. Support the same operation in a popup.
- Do not guess an actor from narrative mentions or ambiguous portrait matches.
  Unknown NPC portraits remain display-only; do not navigate to the wrong actor.
- Provide keyboard activation and descriptive button labels.

## Enemy Browser And Both Fight Actions

- Extend the existing enemy list rather than introducing a second database editor.
  Show name, ID and an available description. Standard RPG Maker enemy records do
  not guarantee a description; absent descriptions remain absent. Do not display
  executable/raw plugin notes as a fabricated description.
- Hover/focus opens a bounded card with battler artwork, labeled parameters,
  actions/skills, traits, base EXP/gold and item/weapon/armor drops with base chances.
  Label base values clearly: difficulty, party traits and custom plugins can change
  actual rewards. A button can keep details open without requiring mouse hover.
- **Start Battle:** create a standalone encounter from the selected enemy/roster
  at the player's current location, using the existing temporary encounter helper.
  Do not move the player, trigger the original map event, or copy its event pages.
  Normal combat can still cause defeat, rewards and plugin-specific side effects.
- **Run Map Event:** display matching events on the current map with event ID/name,
  their known troop/enemies, and why a link is known. Start the original active
  event through the game's normal event interpreter; preserve dialogue, branches,
  victory/escape/defeat callbacks, self-switches and other authored behavior.
- Require explicit confirmation for Run Map Event: it can advance quests, alter
  flags, consume items, move the player, or run non-combat commands as well.
- Identify matches from resolvable battle commands and bounded common-event
  references. Do not infer an exact battle from an event's image/name heuristic.
  Do not execute script commands just to discover a match. Unresolvable custom
  battle scripts have a clear unsupported/unknown status rather than a false match.
- Never activate an arbitrary event from another map or force an inactive page.
  A database enemy without a confirmed current-map event still supports standalone
  combat, but not an invented original-event action.
- Both actions recheck that the game is on a stable map, not already in battle,
  transferring, showing a message or running another event. Close the overlay and
  return focus to the game so the scene/interpreter can advance. Revalidate event
  ID, map ID and active page at execution time to reject stale selections.

## Actor Management

- Keep existing skill/status editing and give it clear labeled sections with game
  icons, search and confirmation for destructive bulk operations.
- Add **Add to Party** and **Remove from Party** for valid actor records through
  the game's own party methods, without replacing party arrays or save objects.
- Distinguish leader, battle members, reserves and non-party actors. Do not promise
  that adding a reserve overrides custom battle-party limits.
- Warn that forced recruitment may bypass story progression. Prevent removing the
  last member through this UI; do not bypass custom party plugins silently.
- Refresh snapshots after changes and support runtime object replacement on load.

## Destination Previews

- Add a Preview action to each Teleport row. Only load/render the requested map,
  not all maps at panel mount or every mouse movement.
- Render from detached destination JSON and that map's tileset using an explicit
  rendering context. Do not replace `$dataMap`, call game-map setup, enter a scene
  or run destination event scripts to obtain a preview.
- Keep a small bounded preview cache separate from the current live-map canvas.
  Reuse the tile painter, but destination tile dimensions must come from engine
  defaults/destination data, not an unrelated current-map-only override.
- Show map name/ID, dimensions and the proposed X/Y or center marker. Preview is
  informational; only an explicit Teleport button transfers the player.
- Handle missing files/images with a clear fallback. Ignore stale async responses
  when users switch destinations quickly or close the preview.
- Explain that destination previews cannot reproduce arbitrary dynamic lighting,
  event execution, weather or plugin pictures without entering that map.

## Resizing And Minimap Positioning

- Add a visible overlay resize handle with minimum dimensions, viewport clamping
  and persisted width/height. Keep navigation/content responsive at narrow sizes.
- Provide reset controls and keyboard/numeric size alternatives. On a smaller
  viewport, clamp saved dimensions instead of making the overlay inaccessible.
- Keep the popup native-resizable; persist its size through the correct NW.js
  lifecycle with debounced writes. Preserve full-window layout inside the popup.
- Add explicit minimap **Move mode** with a drag handle. Outside Move mode, the
  minimap remains click-through so it does not steal movement/menu input.
- In Move mode, suppress corresponding game pointer input, support mouse and touch,
  clamp to visible bounds, and save custom X/Y at drag end rather than every frame.
- Existing custom X/Y fields provide a non-drag alternative. Add reset and clamp
  placement after viewport/minimap-size changes. Remove listeners on teardown.

## Delivery Order

1. Shared game assets, actor identity snapshots and cross-panel navigation.
2. Apply artwork/icons throughout current lists/cards, plus optional game font.
3. Actor party controls and clearer existing skill/status controls.
4. Enemy card/rewards and the two separate fight actions.
5. Detached destination previews.
6. Overlay/popup resizing and minimap Move mode.

Each stage extends the existing view/state/runtime separation and gets focused
regression coverage before proceeding. No new UI framework or dependency is needed.

## Verification

- Unit tests for asset frame selection, fallback paths, navigation requests, party
  guards, drop chances and battle-event association without executing scripts.
- Battle tests prove standalone encounters do not run map events, while original
  event starts preserve engine processing and reject stale/busy/inactive cases.
- Tests prove preview work never changes current map/player state and that memory
  and async requests are bounded.
- Browser tests exercise portraits/icons and navigation, party edits, enemy cards,
  confirmations, preview failures, resize/drag persistence and pointer isolation.
- Repeat relevant browser cases through the real separate-window bootstrap.
- Run TypeScript, all unit/browser tests and the old-MV compatibility scan.
- Actual NW.js MV/MZ checks remain necessary for native window resizing, custom
  fonts, encrypted assets and heavily customized event/battle plugins.

## Non-Goals And Open Limitations

- No automatic encounter, event start, teleport or party edit on hover.
- No promise to understand arbitrary game scripts or reproduce their UI effects.
- No rewriting game assets, original database files or source scripts for previews.
- No commit, push, deployment or version bump unless separately requested.
- Existing uncommitted work must be preserved.

## Builder Review

Self-reviewed against current asset, navigation, battle, actor and map modules.
Key risks are optional-image cache errors, popup font registration, accidental
story execution, preview mutation of the live map and drag input leaking into the
game. The constraints above make these explicit acceptance criteria. Earlier
subagent usage limits prevented a fresh reviewer during initial design work.
The completed implementation subsequently received a fresh focused review and a
fix/recheck cycle; the implementation plan records the findings and verification.
