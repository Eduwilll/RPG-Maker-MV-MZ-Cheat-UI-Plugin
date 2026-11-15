import test from "node:test";
import assert from "node:assert/strict";
test("party changes use engine methods, reject final removal and validate actual membership", async () => {
  const { createActorActions } =
    await import("../../cheat-engine/www/cheat/js/runtime/ActorActions.js");
  const roster = [1];
  const game = {
    $dataActors: [null, {}, {}],
    $gameParty: {
      _actors: roster,
      inBattle: () => false,
      addActor(id) {
        this._actors.push(id);
      },
      removeActor(id) {
        this._actors.splice(this._actors.indexOf(id), 1);
      },
    },
    $gameMap: { isEventRunning: () => false },
    $gameMessage: { isBusy: () => false },
  };
  const actions = createActorActions(game);
  assert.throws(() => actions.setPartyMember(1, false), /last/i);
  actions.setPartyMember(2, true);
  assert.equal(game.$gameParty._actors, roster);
  assert.deepEqual(roster, [1, 2]);
  actions.setPartyMember(1, false);
  assert.deepEqual(roster, [2]);
  assert.throws(() => actions.setPartyMember(99, true), /actor/i);
  game.$gameParty.addActor = () => {};
  assert.throws(() => actions.setPartyMember(1, true), /rejected/i);
});
