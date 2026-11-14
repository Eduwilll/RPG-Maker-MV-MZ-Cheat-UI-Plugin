import test from "node:test";
import assert from "node:assert/strict";

async function withEngine(values, run) {
  const globals = {
    Utils: { RPGMAKER_NAME: "MV", isNwjs: () => false },
    localStorage: { getItem: () => null, setItem() {} },
    window: { dispatchEvent() {} },
    // State reads do not exercise SpeedCheat's deferred settings I/O.
    setInterval: () => 0,
    ...values,
  };
  const previous = Object.keys(globals).map((key) => [
    key,
    Object.getOwnPropertyDescriptor(globalThis, key),
  ]);
  try {
    for (const key of Object.keys(globals))
      Object.defineProperty(globalThis, key, {
        configurable: true,
        writable: true,
        value: globals[key],
      });
    const state =
      await import("../../cheat-engine/www/cheat/js/panels/general/GeneralPanelState.js");
    return await run(state);
  } finally {
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
}

test("opening General before a save is loaded returns a safe not-ready snapshot", async () => {
  await withEngine(
    { $gamePlayer: null, $gameParty: null },
    ({ readGeneralPanelState, readGeneralGold }) => {
      const state = readGeneralPanelState();
      assert.equal(state.gameReady, false);
      assert.equal(state.noClip, false);
      assert.equal(state.gold, 0);
      assert.equal(state.moveSpeed, 4);
      assert.equal(state.gameSpeed, 1);
      assert.equal(readGeneralGold(), 0);
    },
  );
});

test("General state tolerates engine globals not defined yet", async () => {
  await withEngine(
    { $gamePlayer: undefined, $gameParty: undefined },
    ({ readGeneralPanelState }) => {
      const state = readGeneralPanelState();
      assert.equal(state.gameReady, false);
      assert.equal(state.gold, 0);
      assert.equal(state.moveSpeed, 4);
    },
  );
});

test("General state reads fresh game objects through title-to-game-to-title transitions", async () => {
  await withEngine(
    { $gamePlayer: null, $gameParty: null },
    ({ readGeneralPanelState }) => {
      assert.equal(readGeneralPanelState().gameReady, false);
      globalThis.$gamePlayer = { _through: true, moveSpeed: () => 5.5 };
      globalThis.$gameParty = { _gold: 123 };
      assert.equal(readGeneralPanelState().gameReady, true);
      assert.equal(readGeneralPanelState().moveSpeed, 5.5);
      assert.equal(readGeneralPanelState().gold, 123);
      assert.equal(readGeneralPanelState().noClip, true);
      globalThis.$gamePlayer = null;
      globalThis.$gameParty = null;
      assert.equal(readGeneralPanelState().gameReady, false);
      assert.equal(readGeneralPanelState().gold, 0);
    },
  );
});

test("gameplay mutations are guarded if the session disappears before a click is handled", async () => {
  await withEngine({ $gamePlayer: null, $gameParty: null }, async () => {
    const { default: component } =
      await import("../../cheat-engine/www/cheat/panels/GeneralPanel.js");
    const panel = component.data();
    for (const [name, method] of Object.entries(component.methods))
      panel[name] = method.bind(panel);
    panel.gameReady = true;
    for (const name of [
      "onNoClipChange",
      "onSpeedChange",
      "onGoldChange",
      "onGameSpeedChange",
      "onForceSaveChange",
      "onMouseMoveChange",
      "onMouseTeleportChange",
      "toggleSaveScene",
      "openDebugMenu",
    ])
      assert.doesNotThrow(() => panel[name](), name);
    assert.equal(panel.gameReady, false);
    assert.equal(panel.gold, 0);
  });
});
