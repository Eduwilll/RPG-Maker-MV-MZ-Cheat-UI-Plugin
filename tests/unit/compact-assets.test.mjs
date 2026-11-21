import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {
  renderEdition,
  compactLoader,
  compactWindow,
} from "../../tools/vendor/build-compact.mjs";
import { shippedDependencies } from "../../tools/vendor/dependency-manifest.mjs";

test("compact Offline embeds dependencies and fonts, Online omits vendor payloads", () => {
  const deps = shippedDependencies();
  const offline = renderEdition({
    edition: "offline",
    core: "var CheatCore = { start: function(){} };",
    prelude: "",
    ...deps,
  });
  const online = renderEdition({
    edition: "online",
    core: "var CheatCore = { start: function(){} };",
    prelude: "",
    ...deps,
  });
  assert.match(offline.css, /data:font\/woff2;base64,/);
  for (const match of offline.css.matchAll(/url\(["']?([^)'"\s]+)["']?\)/g))
    assert.ok(match[1].startsWith("data:"));
  assert.match(offline.js, /function __cheatCoreFactory\(\)/);
  assert.match(offline.js, /Vue\.js|vue\.js/);
  assert.ok(online.js.length < offline.js.length / 2);
  assert.ok(online.css.length < offline.css.length / 2);
  assert.doesNotMatch(online.css, /libs\//);
  new vm.Script(offline.js);
  new vm.Script(online.js);
});

test("classic loader executes the local NW bundle synchronously and popout keeps a small document", () => {
  const loader = compactLoader();
  assert.match(loader, /readFileSync/);
  assert.match(loader, /cheat-bundle\.js/);
  assert.doesNotMatch(loader, /\bimport\s|\?\./);
  const html = compactWindow();
  assert.match(html, /__cheatCompactMode/);
  assert.match(html, /cheat-bundle\.js/);
  assert.doesNotMatch(html, /libs\/|window-init\.bundle/);
});

test("unsupported old NW.js is rejected before modern bundle evaluation without stopping the game", () => {
  const banners = [];
  const context = {
    window: {}, process: { versions: { nw: "0.25.0" } },
    require() { throw new Error("Unsupported runtime must not load the bundle"); },
    document: { body: { appendChild(node) { banners.push(node); } }, createElement() { return { style: {} }; } },
    console: { error() {} },
  };
  new vm.Script(compactLoader()).runInNewContext(context);
  assert.equal(banners.length, 1);
  assert.match(banners[0].textContent, /0\.26\.4/);
});
