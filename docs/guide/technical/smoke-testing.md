# Smoke Testing

Phase 4 focuses on catching regressions quickly after runtime, translation, or shortcut changes. This page is the lightweight manual workflow we use before shipping or after risky edits.

## Fast repository checks

Run the full repository verification set from the repo root:

::: code-group
```sh [pnpm]
pnpm run check:repo
```
:::

That currently runs:

- `pnpm run typecheck`
- `pnpm run check:mv-compat`
- `pnpm run docs:build`

Use this after changes to shared helpers, bootstrap files, translation code, or panel conventions.

## Runtime smoke checklist

After repository checks pass, validate at least one MV game and one MZ game when the change can affect runtime behavior.

### MV checklist

Recommended local targets:

- `tests/MV/Dusk`
- `tests/MV/Fear.&.Hunger.2.Termina.v1.9.1`

Check:

1. The game boots without a plugin or cheat bootstrap error.
2. The overlay opens with the main shortcut.
3. The About panel renders and shows runtime details.
4. Save and load shortcuts still work.
5. If translation code changed, global translation can start without immediate request or parser errors.

### MZ checklist

Recommended local target:

- `tests/MZ`

Check:

1. The game boots cleanly.
2. The overlay opens normally.
3. The About panel shows the expected MZ runtime information.
4. Save and load shortcuts still behave correctly.
5. If translation code changed, translation startup still works and metrics still appear.

## When to run which checks

### Bootstrap or MV compatibility changes

Run:

- `pnpm run check:repo`
- MV smoke check
- MZ boot and overlay open check

### Translation changes

Run:

- `pnpm run check:repo`
- one MV smoke check
- one MZ smoke check
- translation start in at least one real game

### Panel-only UI changes

Run:

- `pnpm run typecheck`
- preview check if applicable
- one in-game overlay open check

## Diagnostics fallback

If a runtime test fails:

1. Open the About panel.
2. Copy the diagnostics summary.
3. Check the desktop log file path shown there.
4. Include the game engine type, game title, and the exact shortcut or action that failed.

This is especially useful for older MV games where DevTools may not be easy to open.
