import { createMapBattleEvents } from "./MapBattleEvents.js";
/** Game-owned battle helpers. No globals are read and no hooks installed at import. */
export function createBattleActions(game) {
  const temporary = new WeakMap();
  function validId(id, table, label) {
    if (!Number.isInteger(id) || id < 1 || !table || !table[id])
      throw new Error("Invalid " + label + " ID.");
    return id;
  }
  function result(reason) {
    return { allowed: !reason, reason: reason || "" };
  }
  function availability() {
    try {
      const sm = game.SceneManager;
      const scene = sm && sm._scene;
      const bm = game.BattleManager;
      const party = game.$gameParty;
      const troop = game.$gameTroop;
      let start = "";
      let summon = "";
      if (!sm || !bm || !party || typeof party.inBattle !== "function")
        return {
          start: result("No active game session."),
          summon: result("No active game session."),
        };
      if (!game.Scene_Map || !(scene instanceof game.Scene_Map))
        start = "Return to the map to start an encounter.";
      else if (party.inBattle()) start = "A battle is already running.";
      else if (!game.$gameMap || !game.$gamePlayer || !game.$gameMessage)
        start = "No active map session.";
      else if (
        (sm.isSceneChanging && sm.isSceneChanging()) ||
        (scene.isBusy && scene.isBusy())
      )
        start = "The scene is busy or changing.";
      else if (
        game.$gamePlayer.isTransferring &&
        game.$gamePlayer.isTransferring()
      )
        start = "A map transfer is in progress.";
      else if (game.$gameMap.isEventRunning && game.$gameMap.isEventRunning())
        start = "A map event is running.";
      else if (game.$gameMessage.isBusy && game.$gameMessage.isBusy())
        start = "A message is open.";
      if (
        !start &&
        (typeof bm.setup !== "function" ||
          typeof sm.push !== "function" ||
          !game.Scene_Battle ||
          !troop ||
          typeof troop.troop !== "function")
      )
        start = "Battle setup is not supported by this engine.";
      if (
        !game.Scene_Battle ||
        !(scene instanceof game.Scene_Battle) ||
        !party.inBattle()
      )
        summon = "Reinforcements require an active battle.";
      else if (
        ["input", "turn"].indexOf(bm._phase) < 0 ||
        bm._action ||
        bm._subject ||
        bm._turnForced ||
        bm._processingForcedAction ||
        bm._aborting ||
        (bm.isBattleEnd && bm.isBattleEnd()) ||
        (bm.isAborting && bm.isAborting())
      )
        summon =
          "Wait for a safe input/turn phase; action or battle end is in progress.";
      else if (
        (sm.isSceneChanging && sm.isSceneChanging()) ||
        (scene.isBusy && scene.isBusy()) ||
        (game.$gameMessage &&
          game.$gameMessage.isBusy &&
          game.$gameMessage.isBusy())
      )
        summon = "The battle scene is busy.";
      const sprites = scene && scene._spriteset;
      const field = sprites && sprites._battleField;
      if (
        !summon &&
        (!troop ||
          !Array.isArray(troop._enemies) ||
          typeof troop.makeUniqueNames !== "function" ||
          typeof game.Game_Enemy !== "function" ||
          typeof game.Sprite_Enemy !== "function" ||
          !sprites ||
          !Array.isArray(sprites._enemySprites) ||
          typeof sprites.compareEnemySprite !== "function" ||
          !field ||
          typeof field.addChildAt !== "function" ||
          typeof field.removeChild !== "function")
      )
        summon = "This battle renderer does not support safe reinforcements.";
      return { start: result(start), summon: result(summon) };
    } catch (error) {
      return {
        start: result("Engine availability check failed: " + error.message),
        summon: result("Engine availability check failed: " + error.message),
      };
    }
  }
  function guard(kind) {
    const state = availability()[kind];
    if (!state.allowed) throw new Error(state.reason);
  }
  function launch(id) {
    game.BattleManager.setup(id, true, false);
    game.SceneManager.push(game.Scene_Battle);
  }
  function startTroop(id) {
    guard("start");
    validId(id, game.$dataTroops, "troop");
    launch(id);
    return { troopId: id };
  }
  function startEnemies(ids) {
    guard("start");
    if (!Array.isArray(ids) || ids.length < 1 || ids.length > 32)
      throw new Error("Choose between 1 and 32 enemies.");
    ids.forEach((id) => validId(id, game.$dataEnemies, "enemy"));
    if (
      !game.JSON ||
      typeof game.JSON.parse !== "function" ||
      !Array.isArray(game.$dataTroops)
    )
      throw new Error("Game-realm encounter creation is unavailable.");
    const table = game.$dataTroops;
    const id = table.length;
    const width = (game.Graphics && game.Graphics.boxWidth) || 816;
    const height = (game.Graphics && game.Graphics.boxHeight) || 624;
    const record = game.JSON.parse(
      JSON.stringify({
        id,
        name: "Cheat temporary encounter",
        pages: [],
        members: ids.map((enemyId, i) => ({
          enemyId,
          x: Math.round((width * (i + 1)) / (ids.length + 1)),
          y: Math.round(height * 0.55),
          hidden: false,
        })),
      }),
    );
    const troop = game.$gameTroop;
    // Keep troop() usable for battle events after removing the temporary database entry.
    // Instance-local chaining leaves global prototype hooks and future normal setups intact.
    if (!temporary.has(troop)) {
      const previous = troop.troop;
      const slot = { record: null, enemies: null, id: null };
      temporary.set(troop, slot);
      troop.troop = function () {
        if (
          slot.record &&
          this._enemies === slot.enemies &&
          this._troopId === slot.id
        )
          return slot.record;
        return previous.apply(this, arguments);
      };
    }
    const slot = temporary.get(troop);
    slot.record = null;
    table.push(record);
    try {
      game.BattleManager.setup(id, true, false);
      slot.record = record;
      slot.id = id;
      slot.enemies = troop._enemies;
    } finally {
      // Remove only our entry, even if a plugin appended another troop during setup.
      if (table[id] === record) {
        if (table.length === id + 1) table.pop();
        else delete table[id];
      }
    }
    game.SceneManager.push(game.Scene_Battle);
    return { enemyIds: ids.slice() };
  }
  function summon(id) {
    guard("summon");
    validId(id, game.$dataEnemies, "enemy");
    const troop = game.$gameTroop;
    const sprites = game.SceneManager._scene._spriteset;
    const field = sprites._battleField;
    const width = (game.Graphics && game.Graphics.boxWidth) || 816;
    const height = (game.Graphics && game.Graphics.boxHeight) || 624;
    const enemy = new game.Game_Enemy(
      id,
      Math.round(width * (0.2 + (troop._enemies.length % 5) * 0.12)),
      Math.round(height * 0.55),
    );
    const sprite = new game.Sprite_Enemy(enemy);
    const previousSprites = sprites._enemySprites.slice();
    const names = troop._enemies.map((member) => ({
      member,
      letter: member._letter,
      plural: member._plural,
    }));
    const namesCount =
      troop._namesCount && game.JSON.parse(JSON.stringify(troop._namesCount));
    try {
      troop._enemies.push(enemy);
      if (typeof enemy.onBattleStart === "function") enemy.onBattleStart();
      troop.makeUniqueNames();
      sprites._enemySprites.push(sprite);
      sprites._enemySprites.sort((a, b) => sprites.compareEnemySprite(a, b));
      // Insert before actor sprites; never recreate existing sprites/animations (MV and MZ).
      const children = field.children || [];
      let base = children.length;
      previousSprites.forEach((existing) => {
        const i = children.indexOf(existing);
        if (i >= 0) base = Math.min(base, i);
      });
      previousSprites.forEach((existing) => field.removeChild(existing));
      sprites._enemySprites.forEach((existing, i) =>
        field.addChildAt(existing, base + i),
      );
    } catch (error) {
      const i = troop._enemies.indexOf(enemy);
      if (i >= 0) troop._enemies.splice(i, 1);
      field.removeChild(sprite);
      sprites._enemySprites.splice(0, sprites._enemySprites.length);
      previousSprites.forEach((existing) =>
        sprites._enemySprites.push(existing),
      );
      names.forEach((saved) => {
        saved.member._letter = saved.letter;
        saved.member._plural = saved.plural;
      });
      if (namesCount) troop._namesCount = namesCount;
      throw new Error("Reinforcement failed: " + error.message);
    }
    return { enemyId: id, index: troop._enemies.indexOf(enemy) };
  }
  const events = createMapBattleEvents(game, () => availability().start);
  return {
    startTroop,
    startEnemies,
    summon,
    availability,
    mapEvents: events.list,
    mapEventsForTroop: events.listForTroop,
    startMapEvent: events.start,
  };
}
