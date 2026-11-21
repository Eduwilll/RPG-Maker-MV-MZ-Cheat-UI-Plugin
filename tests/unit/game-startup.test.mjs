import test from "node:test";
import assert from "node:assert/strict";
import {
  waitForEngine,
  GAME_STARTUP_GLOBALS,
} from "../../cheat-engine/www/cheat/js/runtime/GameStartup.js";

test("deferred UI waits for engine scripts and document load, independently of vendor readiness", async () => {
  const game = { document: { readyState: "loading" } };
  let ready = false;
  const waiting = waitForEngine(game, 1000).then(() => {
    ready = true;
  });
  for (const name of GAME_STARTUP_GLOBALS) game[name] = {};
  game.DataManager = {
    makeSaveContents() {},
    extractSaveContents() {},
    setupNewGame() {},
  };
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(ready, false);
  game.document.readyState = "complete";
  await waiting;
  assert.equal(ready, true);
});

test("missing engine scripts fail UI readiness within a bounded wait", async () => {
  await assert.rejects(
    waitForEngine({ document: { readyState: "complete" } }, 10),
    /Game scripts/,
  );
});
