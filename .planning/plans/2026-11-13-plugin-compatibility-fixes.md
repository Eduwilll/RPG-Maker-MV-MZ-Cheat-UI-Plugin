# Plugin Compatibility Follow-Up

## Evidence And Scope

The local Termina MV data uses authored troops for multipart encounters, not a
universal Yanfly parent property. Marina's message heading uses IconSet glyph 76
as the initial M followed by ARINA. Loading a font alone cannot reconstruct it.
Elderfield MZ uses FOSSIL alongside KC composite images and picture-based NPC
portraits; Sam is not a database actor.

## Implemented

- Default encounter browser groups complete authored troops, retaining hidden
  parts, placements, variants and battle-event pages. Individual record editing
  remains available. Starting a battle requires confirmation.
- Stats offers direct, confirmed recruitment through the game-owned actor API.
- Message history preserves styled speaker metadata, resolves unique actor
  suffixes, and retains unknown icon initials rather than fabricating names.
- Normal renderer capture observes localized text without evaluating plugin
  commands again or treating literal backslashes as fresh escape sequences.
- The log uses game fonts. Portrait rendering supports cached KC virtual images,
  safe private face composition, and narrowly matched visible NPC picture paths.
- Data presented to Vue stays detached; engine objects and bitmaps remain private
  to the game runtime. Overlay and separate-window paths share the same runtime.

## Verification And Limits

Regression coverage includes the actual Termina heading, literal escaped names,
styled explicit speaker/namebox fields, NPC picture matching, generated KC sheets,
missing/cyclic composite layers, full encounter actions, and direct recruitment.
Browser fixtures cover both overlay and separate-window bootstrap.

Final automated results: 125 unit tests passed; 86 browser checks passed with no
reported errors; TypeScript passed; MV syntax validation passed for 131 files;
documentation build passed. Whitespace validation passed excluding the unrelated,
pre-existing TODO.md changes. Review findings were reproduced with failing tests
before their fixes, then covered by passing regressions.

Actual NW.js 0.29 gameplay and visual testing in both complete games is still
required. These adapters do not claim universal support for every Yanfly, FOSSIL,
VisuStella or custom rendering plugin. Unknown scripted battles are not inferred.
