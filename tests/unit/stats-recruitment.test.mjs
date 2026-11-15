import test from "node:test";
import assert from "node:assert/strict";
import { createActorActions } from "../../cheat-engine/www/cheat/js/runtime/ActorActions.js";

function makeGame(ids = []) {
  const database = [
    null,
    { id: 1, name: "Harold", faceName: "Actor1", faceIndex: 0 },
    { id: 2, name: "Therese", faceName: "Actor1", faceIndex: 1 },
    { id: 3, name: "Marsha", faceName: "Actor1", faceIndex: 2 },
    null,
  ];
  const liveActors = database.map(
    (row) =>
      row && {
        _actorId: row.id,
        _paramPlus: [0, 0],
        level: 7,
        actorId: () => row.id,
        name: () => row.name,
        currentExp: () => 123,
        param: (index) => [300, 80][index],
      },
  );
  const roster = ids.slice();
  const additions = [];
  const game = {
    $dataActors: database,
    $dataSystem: { terms: { params: ["Max HP", "Max MP"] } },
    $gameActors: { actor: (id) => liveActors[id] },
    $gameParty: {
      _actors: roster,
      members: () => roster.map((id) => liveActors[id]),
      inBattle: () => false,
      addActor(id) {
        additions.push(id);
        roster.push(id);
      },
    },
    $gameMap: { isEventRunning: () => false },
    $gameMessage: { isBusy: () => false },
    $gamePlayer: { isTransferring: () => false },
    SceneManager: { isSceneChanging: () => false },
  };
  game.__cheatFeatures = { actors: createActorActions(game) };
  return { game, roster, additions, liveActors };
}

async function withGame(game, run) {
  const values = {
    window: {
      __cheatOpener: game,
      $dataActors: [null, { name: "Wrong window" }],
    },
    $dataSystem: game.$dataSystem,
    $gameParty: game.$gameParty,
    Utils: { RPGMAKER_NAME: "MV", isNwjs: () => false },
    localStorage: { getItem: () => null, setItem() {} },
    setInterval: () => 0,
  };
  const previous = Object.keys(values).map((key) => [
    key,
    Object.getOwnPropertyDescriptor(globalThis, key),
  ]);
  try {
    for (const key of Object.keys(values)) {
      Object.defineProperty(globalThis, key, {
        configurable: true,
        writable: true,
        value: values[key],
      });
    }
    const { default: Stats } =
      await import("../../cheat-engine/www/cheat/panels/StatsSettingPanel.js");
    assert.ok(
      Stats.components.PartyRecruitment,
      "Stats must expose direct recruitment even without actor tabs",
    );
    await run(Stats, Stats.components.PartyRecruitment);
  } finally {
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
}

function instance(component, emit = () => {}) {
  const ticks = [];
  const vm = Object.assign(component.data(), {
    $emit: emit,
    $nextTick: (callback) => ticks.push(callback),
  });
  for (const [name, method] of Object.entries(component.methods)) {
    vm[name] = method.bind(vm);
  }
  for (const [name, getter] of Object.entries(component.computed || {})) {
    Object.defineProperty(vm, name, { get: getter.bind(vm) });
  }
  component.created.call(vm);
  return { vm, flush: () => ticks.splice(0).forEach((callback) => callback()) };
}

test("Stats recruitment lists detached database rows from the game window, excluding reserves too", async () => {
  const { game } = makeGame([1, 2]);
  game.$gameParty.members = () => [game.$gameActors.actor(1)];
  await withGame(game, (Stats, Recruitment) => {
    const { vm } = instance(Recruitment);
    assert.deepEqual(vm.candidates, [{ id: 3, name: "Marsha" }]);
    vm.candidates[0].name = "Draft";
    assert.equal(game.$dataActors[3].name, "Marsha");
  });
});

for (const initialParty of [[], [1]]) {
  test(`Stats recruitment refreshes and selects the new actor with initial party ${JSON.stringify(initialParty)}`, async () => {
    const { game, roster, additions, liveActors } = makeGame(initialParty);
    await withGame(game, (Stats, Recruitment) => {
      const parent = instance(Stats);
      const events = [];
      const { vm } = instance(Recruitment, (event, id) => {
        events.push([event, id]);
        parent.vm.onPartyRecruitmentChange(id);
      });
      vm.selectedActorId = 3;
      vm.requestRecruitment();
      assert.equal(vm.partyConfirmation, true);
      assert.deepEqual(roster, initialParty);
      assert.deepEqual(events, []);
      vm.confirmRecruitment();
      parent.flush();
      assert.equal(game.$gameParty._actors, roster);
      assert.deepEqual(roster, initialParty.concat(3));
      assert.deepEqual(additions, [3]);
      assert.deepEqual(events, [["change", 3]]);
      assert.equal(parent.vm.actors[parent.vm.selectedTab].id, 3);
      assert.equal(parent.vm.actors[parent.vm.selectedTab].level, 7);
      assert.notEqual(parent.vm.actors[parent.vm.selectedTab], liveActors[3]);
      assert.notEqual(
        parent.vm.actors[parent.vm.selectedTab].param,
        liveActors[3]._paramPlus,
      );
      assert.equal(
        vm.candidates.some((row) => row.id === 3),
        false,
      );
      vm.confirmRecruitment();
      assert.deepEqual(
        additions,
        [3],
        "a repeated confirmation must not add twice",
      );
    });
  });
}

test("canceling recruitment leaves the party and Stats unchanged", async () => {
  const { game, roster, additions } = makeGame();
  await withGame(game, (Stats, Recruitment) => {
    const events = [];
    const { vm } = instance(Recruitment, (...event) => events.push(event));
    vm.selectedActorId = 2;
    vm.requestRecruitment();
    vm.cancelRecruitment();
    vm.confirmRecruitment();
    assert.equal(vm.partyConfirmation, false);
    assert.deepEqual(roster, []);
    assert.deepEqual(additions, []);
    assert.deepEqual(events, []);
  });
});

test("confirmation recruits the actor named in the dialog, not a later selector value", async () => {
  const { game, roster } = makeGame();
  await withGame(game, (Stats, Recruitment) => {
    const { vm } = instance(Recruitment);
    vm.selectedActorId = 2;
    vm.requestRecruitment();
    assert.equal(vm.pendingActorName, "Therese");
    vm.selectedActorId = 3;
    vm.confirmRecruitment();
    assert.deepEqual(roster, [2]);
  });
});

const guards = [
  [
    "battle",
    (game) => {
      game.$gameParty.inBattle = () => true;
    },
    /battle or event/i,
  ],
  [
    "event",
    (game) => {
      game.$gameMap.isEventRunning = () => true;
    },
    /battle or event/i,
  ],
  [
    "message",
    (game) => {
      game.$gameMessage.isBusy = () => true;
    },
    /battle or event/i,
  ],
  [
    "transfer",
    (game) => {
      game.$gamePlayer.isTransferring = () => true;
    },
    /transfer or scene/i,
  ],
  [
    "scene change",
    (game) => {
      game.SceneManager.isSceneChanging = () => true;
    },
    /transfer or scene/i,
  ],
  [
    "plugin rejection",
    (game) => {
      game.$gameParty.addActor = () => {};
    },
    /rejected/i,
  ],
];
for (const [name, block, error] of guards) {
  test(`Stats recruitment surfaces ${name} guard failures without emitting success`, async () => {
    const { game, roster } = makeGame([1]);
    await withGame(game, (Stats, Recruitment) => {
      const events = [];
      const { vm } = instance(Recruitment, (...event) => events.push(event));
      vm.selectedActorId = 2;
      vm.requestRecruitment();
      block(game);
      vm.confirmRecruitment();
      assert.deepEqual(roster, [1]);
      assert.match(vm.partyError, error);
      assert.deepEqual(events, []);
      assert.equal(vm.partyConfirmation, false);
    });
  });
}

test("stale choices cannot recruit an actor missing from the database", async () => {
  const { game, roster } = makeGame();
  await withGame(game, (Stats, Recruitment) => {
    const { vm } = instance(Recruitment);
    vm.selectedActorId = 3;
    game.$dataActors[3] = null;
    vm.requestRecruitment();
    assert.equal(vm.partyConfirmation, false);
    assert.deepEqual(roster, []);
  });
});
