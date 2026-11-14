# Message Log Text Preferences

User requests the original small log size by default, optional custom size, and
the plugin font as a fallback while retaining the game font as the default.

Use 16px default dialogue text independently of the captured game size. Add Default
and Custom size modes (12-40px) and Game font / Plugin font choices. Retain the
captured presentation metadata and decorative speaker glyphs. Preferences apply
to all displayed history, persist per game, and share the game-owned runtime
between overlay and separate window. Never change game fonts or clear history.

- [x] Failing unit tests for defaults, validation, persistence, and font/size overrides.
- [x] Pure preferences store and safe row-style helper, accessed through panel state.
- [x] Compact controls in the log, reset display only, and robust plugin font override
  even when global Appearance uses the game font.
- [x] Verify units, browser modes, types and MV syntax; document behavior.

Panel polling must not overwrite an unsubmitted custom-size draft. Synchronize
only when a preference revision changes. Preserve unrelated dirty work; no commit.

Verification: 152 unit tests and 118 browser checks passed, including native
Vuetify focus/input/blur persistence, default 16px display, plugin-font fallback
under global game-font appearance, shared popup preferences, draft preservation,
reopen persistence and display-only reset. TypeScript, documentation build and MV
syntax validation for 139 files passed. Whitespace checks passed excluding unrelated
pre-existing TODO.md changes. Focused read-only review found no P1/P2 issues.
Full-game NW.js visual testing remains manual; no game copies, commits or releases
were changed.
