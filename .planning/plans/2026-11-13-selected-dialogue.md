# Selected Dialogue Implementation Plan

**Goal:** Log only confirmed player responses, attributed to the current party
leader, and retain authored decorative names and safe game font presentation.

**Approved behavior:** The user chose only the response selected, not all options.
Normal narration remains unattributed. A missing protagonist becomes Player with
no invented portrait. Selection entries are labeled Chosen response because not
every game choice is spoken dialogue.

**Architecture:** Keep choice lifecycle hooks in MessageChoices.js, name decoding
in MessageText.js, and safe font snapshots in MessagePresentation.js. History
stores primitive snapshots, never game objects. Vue renders text and icons, not
HTML or arbitrary escape commands. Keep the existing checkout and all prior work;
do not commit or release.

## Tasks

- [x] Add failing tests for confirmation-only capture, player identity, cancellation,
  prompt replacement/clear, repeated callbacks, and callback preservation.
- [x] Implement choice capture through setChoices/onChoice; do not log menus before
  confirmation or change game selection/callback behavior.
- [x] Add failing tests for retained decorative initials and safe font/outline
  snapshots; implement primitive metadata and scoped rendering.
- [x] Verify unit, TypeScript, MV syntax, browser overlay and separate-window paths.
  Update the feature guide and record any runtime testing limits.

## Constraints And Review Focus

- Chromium 65 / Node 9 production syntax; no new runtime dependencies.
- Clear pending choices on engine clear and history reset/load; consume once.
- Do not borrow the NPC's face/name for player choices or instantiate actors just
  to obtain their metadata. Preserve original method return values and exceptions.
- Capture style from the normal message window only; do not run plugin converters
  or game scripts again. Validate every CSS property before binding it.
- Decorative initials are display-only; full names remain available to search,
  export and accessibility. Keep game data out of Vue observation.

## Implementation Notes

Choice entries reserve their order, protagonist and map metadata before the
engine callback and commit only after it succeeds. A session reset invalidates
the reservation. This preserves callback-added dialogue order and prevents stale
responses from reappearing after loading or clearing history.

The protagonist follows the party's first actor ID without calling the actor
factory. This is a fallback convention, not an assertion that every game's party
leader is permanently its story protagonist. No arbitrary NPC/narrator attribution
was added. Base font styling is copied; arbitrary plugin escape evaluators are
never invoked a second time.

## Verification

135 unit tests passed; 93 browser checks passed with no reported errors across
overlay and separate-window paths. TypeScript passed and MV syntax validation
passed for 133 files. Whitespace checks passed excluding unrelated pre-existing
TODO.md changes. Focused presentation review found no P1/P2 issues. Actual game
NW.js playback and visual confirmation remain manual checks. No commit or release.
