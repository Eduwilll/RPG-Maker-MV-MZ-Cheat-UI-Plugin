import test from "node:test";
import assert from "node:assert/strict";
import * as actors from "../../cheat-engine/www/cheat/js/panels/map/MapActors.js";
import { selectMapPoint } from "../../cheat-engine/www/cheat/js/panels/map/MapSelection.js";
import { createMapScene } from "../../cheat-engine/www/cheat/js/panels/map/MapScene.js";

test("the controlled actor remains selectable but is not drawn as a second badge", () => {
  const actor = { actorId: () => 1, name: () => "Hero" };
  const rows = actors.readMapActors({
    $gamePlayer: { x: 2, y: 3 },
    $gameParty: { leader: () => actor },
  });
  assert.equal(rows[0].isPlayer, true);
  let badges = 0,
    arrows = 0;
  const context = {
    clearRect() {},
    drawImage() {},
    fillRect() {},
    save() {},
    restore() {},
    translate() {},
    scale() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    closePath() {},
    fill() {},
    stroke() {},
    rotate() {},
    arc() {
      arrows++;
    },
    quadraticCurveTo() {
      badges++;
    },
    fillText() {},
    measureText() {
      return { width: 10 };
    },
  };
  const scene = createMapScene({
    getContext: () => context,
    ownerDocument: { createElement: () => ({ getContext: () => context }) },
  });
  scene.draw(null, {
    game: { $dataMap: {} },
    camera: {
      width: 100,
      height: 100,
      mapWidth: 10,
      mapHeight: 10,
      unit: 10,
      ox: 0,
      oy: 0,
    },
    layers: { player: true, sprites: false },
    markers: rows,
    player: { x: 2, y: 3, direction: 2 },
  });
  assert.equal(badges, 0);
  assert.ok(arrows > 0);
});

test("NPC/enemy actor links require explicit identity and preserve their event identity", () => {
  assert.equal(typeof actors.readEventActorId, "function");
  const game = {
    $dataActors: [null, { id: 1, name: "Hero" }, { id: 2, name: "Visitor" }],
  };
  assert.equal(actors.readEventActorId(game, { _actorId: 2 }, {}), 2);
  assert.equal(
    actors.readEventActorId(game, {}, { meta: { ActorId: "2" } }),
    2,
  );
  assert.equal(actors.readEventActorId(game, {}, { name: "Visitor" }), 0);
  assert.equal(actors.readEventActorId(game, { _actorId: 999 }, {}), 0);
  const selection = selectMapPoint(
    { x: 2.5, y: 3.5 },
    [{ id: 9, x: 2, y: 3, kind: "enemy", name: "Visitor", actorId: 2 }],
    {},
    1,
  );
  assert.equal(selection.actorId, 2);
  assert.equal(selection.id, 9);
  assert.equal(selection.kind, "enemy");
});

test("the actor picker includes non-party and unnamed database actors", () => {
  assert.equal(typeof actors.readActorChoices, "function");
  assert.deepEqual(
    actors.readActorChoices({
      $dataActors: [
        null,
        { id: 1, name: "Hero" },
        { id: 8, name: "NPC" },
        { id: 9, name: "" },
      ],
    }),
    [
      { id: 1, name: "Hero" },
      { id: 8, name: "NPC" },
      { id: 9, name: "Actor 9" },
    ],
  );
});
