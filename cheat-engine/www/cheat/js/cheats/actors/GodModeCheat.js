// @ts-check

/**
 * GodModeCheat - owns the per-actor HP/MP/TP interception seam.
 *
 * Keeps the original `Game_Actor` methods for each actor so god mode can be
 * switched off cleanly, and injects the actor class so the module is testable
 * without the game runtime.
 */

/**
 * @typedef {Object} GodModeGlobals
 * @property {() => any} getGameActor
 */

/** @returns {GodModeGlobals} */
function liveGlobals() {
  return {
    // eslint-disable-next-line no-undef
    getGameActor: () => Game_Actor,
  };
}

/**
 * @param {Partial<GodModeGlobals>} [overrides]
 * @returns {Object} God mode module
 */
export function createGodModeCheat(overrides = {}) {
  const globals = Object.assign(liveGlobals(), overrides);
  const godModeMap = new WeakMap();
  let trackedActors = [];

  function defaultData() {
    return {
      godMode: false,
      gainHp: null,
      setHp: null,
      gainMp: null,
      setMp: null,
      gainTp: null,
      setTp: null,
      paySkillCost: null,
      godModeInterval: null,
    };
  }

  function getGodModeData(actor) {
    if (!godModeMap.has(actor)) {
      godModeMap.set(actor, defaultData());
      trackedActors.push(actor);
    }
    return godModeMap.get(actor);
  }

  function getGodModeOnActorIds() {
    const ids = [];
    for (const actor of trackedActors) {
      const data = godModeMap.get(actor);
      if (data && data.godMode) ids.push(actor._actorId);
    }
    return ids;
  }

  function isGodMode(actor) {
    return getGodModeData(actor).godMode;
  }

  function isActor(actor) {
    const GameActor = globals.getGameActor();
    return typeof GameActor === "function" && actor instanceof GameActor;
  }

  function godModeOn(actor) {
    if (!isActor(actor) || isGodMode(actor)) return;

    const godModeData = getGodModeData(actor);
    godModeData.godMode = true;

    actor.gainHP_bkup = actor.gainHp;
    actor.gainHp = function (value) {
      value = actor.mhp;
      actor.gainHP_bkup(value);
    };

    actor.setHp_bkup = actor.setHp;
    actor.setHp = function (hp) {
      hp = actor.mhp;
      actor.setHp_bkup(hp);
    };

    actor.gainMp_bkup = actor.gainMp;
    actor.gainMp = function (value) {
      value = actor.mmp;
      actor.gainMp_bkup(value);
    };

    actor.setMp_bkup = actor.setMp;
    actor.setMp = function (mp) {
      mp = actor.mmp;
      actor.setMp_bkup(mp);
    };

    actor.gainTp_bkup = actor.gainTp;
    actor.gainTp = function (value) {
      value = actor.maxTp();
      actor.gainTp_bkup(value);
    };

    actor.setTp_bkup = actor.setTp;
    actor.setTp = function (tp) {
      tp = actor.maxTp();
      actor.setTp_bkup(tp);
    };

    actor.paySkillCost_bkup = actor.paySkillCost;
    actor.paySkillCost = function () {
      // God mode never charges skill costs.
    };

    godModeData.godModeInterval = setInterval(function () {
      actor.gainHp(actor.mhp);
      actor.gainMp(actor.mmp);
      actor.gainTp(actor.maxTp());
    }, 1000);
  }

  function godModeOff(actor) {
    if (!isActor(actor) || !isGodMode(actor)) return;

    const godModeData = getGodModeData(actor);
    godModeData.godMode = false;

    clearInterval(godModeData.godModeInterval);
    godModeData.godModeInterval = null;

    if (actor.gainHP_bkup) {
      actor.gainHp = actor.gainHP_bkup;
      actor.setHp = actor.setHp_bkup;
      actor.gainMp = actor.gainMp_bkup;
      actor.setMp = actor.setMp_bkup;
      actor.gainTp = actor.gainTp_bkup;
      actor.setTp = actor.setTp_bkup;
      actor.paySkillCost = actor.paySkillCost_bkup;
    }
  }

  function toggleGodMode(actor) {
    if (isGodMode(actor)) godModeOff(actor);
    else godModeOn(actor);
  }

  return Object.freeze({
    getGodModeData,
    getGodModeOnActorIds,
    isGodMode,
    godModeOn,
    godModeOff,
    toggleGodMode,
  });
}
