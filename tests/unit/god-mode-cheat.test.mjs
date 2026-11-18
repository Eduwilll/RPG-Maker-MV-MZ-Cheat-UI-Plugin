import test from "node:test";
import assert from "node:assert/strict";
import { createGodModeCheat } from "../../cheat-engine/www/cheat/js/cheats/actors/GodModeCheat.js";

function fakeActor(gameActor, id) {
  const actor = new gameActor();
  actor._actorId = id;
  actor.mhp = 100;
  actor.mmp = 50;
  actor.hp = 10;
  actor.mp = 5;
  actor.tp = 0;
  actor.maxTp = () => 100;
  actor.gainHp = function (value) {
    actor.hp = Math.min(actor.mhp, actor.hp + value);
  };
  actor.setHp = function (value) {
    actor.hp = value;
  };
  actor.gainMp = function (value) {
    actor.mp = Math.min(actor.mmp, actor.mp + value);
  };
  actor.setMp = function (value) {
    actor.mp = value;
  };
  actor.gainTp = function (value) {
    actor.tp = Math.min(actor.maxTp(), actor.tp + value);
  };
  actor.setTp = function (value) {
    actor.tp = value;
  };
  actor.paySkillCost = function () {
    actor.paidSkill = true;
  };
  return actor;
}

function setup() {
  class GameActor {}
  const module = createGodModeCheat({ getGameActor: () => GameActor });
  return { GameActor, module };
}

test("god mode locks HP/MP/TP to their maximum and blocks skill costs", (t) => {
  t.mock.timers.enable({ apis: ["setInterval"] });
  const { GameActor, module } = setup();
  const actor = fakeActor(GameActor, 1);

  module.godModeOn(actor);
  assert.equal(module.isGodMode(actor), true);

  actor.gainHp(-500);
  actor.setHp(1);
  actor.gainMp(-500);
  actor.setMp(1);
  actor.paySkillCost({});

  assert.equal(actor.hp, actor.mhp);
  assert.equal(actor.mp, actor.mmp);
  assert.equal(actor.paidSkill, undefined);
  assert.deepEqual(module.getGodModeOnActorIds(), [1]);
});

test("the god mode interval keeps refilling the actor", (t) => {
  t.mock.timers.enable({ apis: ["setInterval"] });
  const { GameActor, module } = setup();
  const actor = fakeActor(GameActor, 2);
  module.godModeOn(actor);

  actor.hp = 1;
  t.mock.timers.tick(1000);
  assert.equal(actor.hp, actor.mhp);
});

test("turning god mode off restores the original actor methods", (t) => {
  t.mock.timers.enable({ apis: ["setInterval"] });
  const { GameActor, module } = setup();
  const actor = fakeActor(GameActor, 3);
  const originalGainHp = actor.gainHp;

  module.toggleGodMode(actor);
  assert.equal(module.isGodMode(actor), true);

  module.toggleGodMode(actor);
  assert.equal(module.isGodMode(actor), false);
  assert.equal(actor.gainHp, originalGainHp);
  assert.deepEqual(module.getGodModeOnActorIds(), []);

  actor.hp = 10;
  actor.gainHp(5);
  assert.equal(actor.hp, 15, "damage applies again once god mode is off");
});

test("actors from another class are ignored", () => {
  const { module } = setup();
  const stranger = { _actorId: 9, mhp: 100 };
  module.godModeOn(stranger);
  assert.equal(module.isGodMode(stranger), false);
});

test("actor ids reported by god mode survive unrelated actors", (t) => {
  t.mock.timers.enable({ apis: ["setInterval"] });
  const { GameActor, module } = setup();
  const first = fakeActor(GameActor, 4);
  const second = fakeActor(GameActor, 5);

  module.godModeOn(first);
  module.godModeOn(second);
  module.godModeOff(first);

  assert.deepEqual(module.getGodModeOnActorIds(), [5]);
});
