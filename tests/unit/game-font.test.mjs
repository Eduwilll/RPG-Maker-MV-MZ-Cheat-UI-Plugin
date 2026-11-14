import test from "node:test";
import assert from "node:assert/strict";

test("popup font registration resolves game stylesheet URLs and scopes preference to the cheat root", async () => {
  const { applyGameFont } =
    await import("../../cheat-engine/www/cheat/js/ui/GameFont.js");
  const appended = [];
  const props = {};
  const classes = {};
  const doc = {
    getElementById: () => null,
    createElement: () => ({}),
    head: { appendChild: (node) => appended.push(node) },
  };
  const game = {
    location: { href: "file:///game/www/index.html" },
    document: {
      styleSheets: [
        {
          href: "file:///game/www/css/game.css",
          cssRules: [
            {
              type: 5,
              cssText:
                '@font-face{font-family:GameFont;src:url("../fonts/custom.ttf")}',
            },
          ],
        },
      ],
    },
  };
  const root = {
    ownerDocument: doc,
    classList: { toggle: (key, enabled) => (classes[key] = enabled) },
    style: {
      setProperty: (key, value) => (props[key] = value),
      removeProperty: (key) => delete props[key],
    },
  };
  applyGameFont(root, game, true);
  assert.match(
    appended[0].textContent,
    /file:\/\/\/game\/www\/fonts\/custom.ttf/,
  );
  assert.match(props["--cheat-game-font"], /GameFont/);
  assert.equal(classes["cheat-game-font"], true);
  applyGameFont(root, game, false);
  assert.equal(classes["cheat-game-font"], false);
  assert.equal(props["--cheat-game-font"], undefined);
});

test("MZ FontManager sources are registered in the popup document", async () => {
  const { applyGameFont } =
    await import("../../cheat-engine/www/cheat/js/ui/GameFont.js");
  let style;
  const doc = {
    getElementById: () => null,
    createElement: () => ({}),
    head: { appendChild: (node) => (style = node) },
  };
  const game = {
    location: { href: "file:///game/index.html" },
    document: { styleSheets: [] },
    $gameSystem: { mainFontFace: () => "rmmz-mainfont" },
    FontManager: { _urls: { "rmmz-mainfont": "fonts/Custom.woff" } },
  };
  applyGameFont(
    {
      ownerDocument: doc,
      classList: { toggle() {} },
      style: { setProperty() {} },
    },
    game,
    true,
  );
  assert.match(style.textContent, /rmmz-mainfont/);
  assert.match(style.textContent, /file:\/\/\/game\/fonts\/Custom.woff/);
});
