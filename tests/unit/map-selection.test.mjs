import test from "node:test";
import assert from "node:assert/strict";
import {
  selectMapPoint,
  teleportMapSelection,
} from "../../cheat-engine/www/cheat/js/panels/map/MapSelection.js";

test("selecting a visible marker produces plain metadata without triggering game actions", () => {
  const marker = {
    id: 5,
    x: 3.25,
    y: 2,
    name: "Marina",
    kind: "npc",
    event: { secret: true },
  };
  const selected = selectMapPoint(
    { x: 3.7, y: 2.5 },
    [marker],
    { npcs: true },
    7,
  );
  assert.deepEqual(selected, {
    x: 3,
    y: 2,
    id: 5,
    name: "Marina",
    kind: "npc",
    mapId: 7,
  });
  assert.equal(
    selectMapPoint({ x: 3.7, y: 2.5 }, [marker], { npcs: false }, 7).id,
    0,
  );
});

test("teleport is explicit, bounded, map-scoped and does not run the selected event", () => {
  let moved = null;
  class SceneMap {}
  const game = {
    Scene_Map: SceneMap,
    SceneManager: { _scene: new SceneMap() },
    $dataMap: { width: 10, height: 8 },
    $gameMap: { mapId: () => 7 },
    $gamePlayer: {
      setPosition: (x, y) => {
        moved = [x, y];
      },
    },
  };
  assert.equal(teleportMapSelection(game, { mapId: 6, x: 2, y: 2 }), false);
  assert.equal(teleportMapSelection(game, { mapId: 7, x: -1, y: 2 }), false);
  assert.equal(teleportMapSelection(game, { mapId: 7, x: 1.5, y: 2 }), false);
  assert.equal(moved, null);
  assert.equal(teleportMapSelection(game, { mapId: 7, x: 2, y: 3 }), true);
  assert.deepEqual(moved, [2, 3]);
  game.SceneManager._scene = {};
  assert.equal(teleportMapSelection(game, { mapId: 7, x: 1, y: 1 }), false);
});
