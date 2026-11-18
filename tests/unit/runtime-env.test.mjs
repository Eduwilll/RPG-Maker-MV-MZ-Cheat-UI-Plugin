import test from "node:test";
import assert from "node:assert/strict";
import {
  getGameRootDir,
  isDesktopRuntime,
  isMvProject,
} from "../../cheat-engine/www/cheat/js/runtime/RuntimeEnv.js";

function withGlobals(t, { utils, pathname } = {}) {
  const previousUtils = globalThis.Utils;
  const previousWindow = globalThis.window;

  if (utils === undefined) delete globalThis.Utils;
  else globalThis.Utils = utils;

  if (pathname === undefined) {
    delete globalThis.window;
  } else {
    globalThis.window = { location: { pathname } };
  }

  t.after(() => {
    if (previousUtils === undefined) delete globalThis.Utils;
    else globalThis.Utils = previousUtils;
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  });
}

test("MV projects keep settings and logs inside www", (t) => {
  withGlobals(t, { utils: { RPGMAKER_NAME: "MV", isNwjs: () => true } });
  assert.equal(isMvProject(), true);
  assert.equal(getGameRootDir(), "www");
  assert.equal(isDesktopRuntime(), true);
});

test("MZ projects use the game root", (t) => {
  withGlobals(t, { utils: { RPGMAKER_NAME: "MZ", isNwjs: () => true } });
  assert.equal(isMvProject(), false);
  assert.equal(getGameRootDir(), ".");
});

test("the separate window falls back to its document path before Utils is bridged", (t) => {
  withGlobals(t, { pathname: "/C:/Games/Project/www/cheat/window.html" });
  assert.equal(isMvProject(), true, "MV window.html lives under www/cheat");
  assert.equal(getGameRootDir(), "www");
});

test("an MZ separate window path stays at the game root", (t) => {
  withGlobals(t, { pathname: "/C:/Games/Project/cheat/window.html" });
  assert.equal(isMvProject(), false);
  assert.equal(getGameRootDir(), ".");
});

test("the MV game page itself is not mistaken for the cheat window", (t) => {
  withGlobals(t, { pathname: "/C:/Games/Project/www/index.html" });
  assert.equal(isMvProject(), false, "no /www/cheat/ segment");
});

test("missing globals never throw and default to the game root", (t) => {
  withGlobals(t, {});
  assert.equal(isMvProject(), false);
  assert.equal(getGameRootDir(), ".");
  assert.equal(isDesktopRuntime(), false);
});

test("a throwing Utils implementation still resolves a root", (t) => {
  withGlobals(t, {
    utils: {
      get RPGMAKER_NAME() {
        throw new Error("not ready");
      },
      isNwjs() {
        throw new Error("not ready");
      },
    },
    pathname: "/C:/Games/Project/www/cheat/window.html",
  });
  assert.equal(isMvProject(), true);
  assert.equal(getGameRootDir(), "www");
  assert.equal(isDesktopRuntime(), false);
});

test("the fallback keys off the www/cheat layout, not the folder name", (t) => {
  withGlobals(t, { pathname: "/C:/Projects/www/cheat/window.html" });
  assert.equal(isMvProject(), true, "www/cheat is the MV cheat layout");

  withGlobals(t, { pathname: "/C:/Projects/www/cheat-debug/window.html" });
  assert.equal(isMvProject(), false, "only a real www/cheat segment counts");
});
