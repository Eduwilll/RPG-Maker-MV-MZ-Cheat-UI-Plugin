import test from "node:test";
import assert from "node:assert/strict";
test("destination preview loads cache separately and never replaces the live map", async () => {
  const { createMapPreviews } =
    await import("../../cheat-engine/www/cheat/js/runtime/MapPreviews.js");
  let calls = 0;
  const current = { width: 3 };
  const game = {
    $dataMap: current,
    location: { href: "file:///game/www/index.html" },
    XMLHttpRequest: class {
      open(method, url) {
        this.url = url;
      }
      overrideMimeType() {}
      send() {
        calls++;
        this.status = 200;
        this.responseText = JSON.stringify({
          width: 10,
          height: 8,
          tilesetId: 2,
          data: [],
        });
        this.onload();
      }
    },
  };
  const previews = createMapPreviews(game);
  const first = await previews.load(2);
  assert.equal(first.width, 10);
  assert.equal(await previews.load(2), first);
  assert.equal(calls, 1);
  assert.equal(game.$dataMap, current);
  await assert.rejects(previews.load(-1), /map/i);
});

test("failed destination reads can retry instead of caching a permanent failure", async () => {
  const { createMapPreviews } =
    await import("../../cheat-engine/www/cheat/js/runtime/MapPreviews.js");
  let attempts = 0;
  const game = {
    location: { href: "file:///game/index.html" },
    XMLHttpRequest: class {
      open() {}
      overrideMimeType() {}
      send() {
        attempts++;
        this.status = attempts === 1 ? 404 : 200;
        this.responseText = '{"width":2,"height":2,"data":[]}';
        this.onload();
      }
    },
  };
  const previews = createMapPreviews(game);
  await assert.rejects(previews.load(2), /unavailable/);
  assert.equal((await previews.load(2)).width, 2);
  assert.equal(attempts, 2);
});
