// @ts-check

import { GeneralCheat } from "../../cheats/GeneralCheat.js";
import { extractActorParamValues } from "../PanelGameState.js";

/**
 * Read-only snapshot helpers for the Actors panel.
 * MV-safe: no optional chaining / nullish coalescing.
 */

function safeDataArray(globalName) {
  try {
    var arr = window[globalName];
    if (Array.isArray(arr)) {
      return arr;
    }
  } catch (e) {
    // ignore - game globals may be unavailable in preview
  }
  return [];
}

function safeActorById(actorId) {
  try {
    if (typeof $gameActors !== "undefined" && $gameActors) {
      return $gameActors.actor(actorId);
    }
  } catch (e) {
    // ignore
  }
  return null;
}

function skillName(skillId) {
  var skills = safeDataArray("$dataSkills");
  var skill = skills[skillId];
  if (skill && skill.name) {
    return skill.name;
  }
  return "Skill " + skillId;
}

function stateName(stateId) {
  var states = safeDataArray("$dataStates");
  var state = states[stateId];
  if (state && state.name) {
    return state.name;
  }
  return "State " + stateId;
}

function className(classId) {
  var classes = safeDataArray("$dataClasses");
  var klass = classes[classId];
  if (klass && klass.name) {
    return klass.name;
  }
  return "Class " + classId;
}

/**
 * @param {Game_Actor} actor
 */
export function extractActorListRow(actor) {
  var raw = /** @type {any} */ (actor);
  var classId = 0;
  try {
    var current = actor.currentClass();
    if (current && current.id) {
      classId = current.id;
    }
  } catch (e) {
    classId = 0;
  }
  return {
    id: actor.actorId(),
    name: actor.name(),
    nickname: "",
    level: actor.level,
    classId: classId,
    className: className(classId),
    isBattleMember: false,
  };
}

/**
 * Full editable snapshot for the selected actor.
 * @param {number} actorId
 */
export function readActorDetail(actorId) {
  var actor = safeActorById(actorId);
  if (!actor) {
    return null;
  }
  var raw = /** @type {any} */ (actor);

  var nickname = "";
  try {
    nickname = actor.nickname() || "";
  } catch (e) {
    nickname = "";
  }

  var profile = "";
  try {
    profile = actor.profile() || "";
  } catch (e) {
    profile = "";
  }

  var classId = 0;
  try {
    var current = actor.currentClass();
    if (current && current.id) {
      classId = current.id;
    }
  } catch (e) {
    classId = 0;
  }

  var learned = [];
  try {
    var skills = actor.skills() || [];
    for (var i = 0; i < skills.length; i++) {
      var skill = skills[i];
      if (skill && typeof skill.id === "number") {
        learned.push({ id: skill.id, name: skill.name || skillName(skill.id) });
      }
    }
  } catch (e) {
    learned = [];
  }

  var activeStates = [];
  try {
    var states = /** @type {any} */ (actor).states() || [];
    for (var s = 0; s < states.length; s++) {
      var st = states[s];
      if (st && typeof st.id === "number") {
        activeStates.push({ id: st.id, name: st.name || stateName(st.id) });
      }
    }
  } catch (e) {
    activeStates = [];
  }

  // Raw vitals - direct property reads are safe on Game_BattlerBase
  var hp = typeof raw.hp === "number" ? raw.hp : 0;
  var mp = typeof raw.mp === "number" ? raw.mp : 0;
  var tp = typeof raw.tp === "number" ? raw.tp : 0;
  var mhp = 0;
  var mmp = 0;
  try {
    mhp = /** @type {any} */ (actor).param(0);
  } catch (e) {
    mhp = 0;
  }
  try {
    mmp = /** @type {any} */ (actor).param(1);
  } catch (e) {
    mmp = 0;
  }

  return {
    id: actor.actorId(),
    name: actor.name(),
    nickname: nickname,
    profile: profile,
    level: actor.level,
    exp: actor.currentExp(),
    classId: classId,
    hp: hp,
    mp: mp,
    tp: tp,
    mhp: mhp,
    mmp: mmp,
    param: extractActorParamValues(actor),
    godMode: GeneralCheat.isGodMode(actor),
    learnedSkills: learned,
    activeStates: activeStates,
  };
}

/**
 * Live actor lookup that works for party AND non-party actors.
 * @param {number} actorId
 */
export function findLiveActorById(actorId) {
  return safeActorById(actorId);
}

export function readActorPanelState() {
  var partyIds = {};
  var battleIds = {};
  var leaderId = 0;

  try {
    var allMembers = $gameParty.allMembers() || [];
    for (var a = 0; a < allMembers.length; a++) {
      partyIds[/** @type {any} */ (allMembers[a]).actorId()] = true;
    }
  } catch (e) {
    partyIds = {};
  }

  try {
    var battleMembers = $gameParty.members() || [];
    for (var b = 0; b < battleMembers.length; b++) {
      battleIds[/** @type {any} */ (battleMembers[b]).actorId()] = true;
    }
  } catch (e) {
    battleIds = {};
  }

  try {
    var leader = $gameParty.leader();
    if (leader) {
      leaderId = /** @type {any} */ (leader).actorId();
    }
  } catch (e) {
    leaderId = 0;
  }

  // List EVERY actor defined in the game database, flagged by roster status.
  var actors = [];
  var dataActors = safeDataArray("$dataActors");
  for (var id = 1; id < dataActors.length; id++) {
    var data = dataActors[id];
    if (!data || !data.name) {
      continue;
    }

    var live = safeActorById(id);
    var row = {
      id: id,
      name: data.name,
      nickname: "",
      level: 0,
      classId: 0,
      className: "",
      isLeader: id === leaderId,
      isInParty: !!partyIds[id],
      isBattleMember: !!battleIds[id],
    };

    if (live) {
      try {
        row.name = live.name();
      } catch (e) {
        row.name = data.name;
      }
      try {
        row.nickname = live.nickname() || "";
      } catch (e) {
        row.nickname = "";
      }
      try {
        row.level = live.level;
      } catch (e) {
        row.level = 0;
      }
      try {
        var current = live.currentClass();
        if (current && current.id) {
          row.classId = current.id;
        }
      } catch (e) {
        row.classId = 0;
      }
      row.className = className(row.classId);
    } else if (data.classId) {
      row.classId = data.classId;
      row.className = className(data.classId);
    }

    actors.push(row);
  }

  var paramNames = [];
  try {
    paramNames = $dataSystem.terms.params || [];
  } catch (e) {
    paramNames = ["MHP", "MMP", "ATK", "DEF", "MAT", "MDF", "AGI", "LUK"];
  }

  var classes = [];
  var dataClasses = safeDataArray("$dataClasses");
  for (var c = 1; c < dataClasses.length; c++) {
    var klass = dataClasses[c];
    if (klass && klass.name) {
      classes.push({ id: klass.id || c, name: klass.name });
    }
  }

  var allSkills = [];
  var dataSkills = safeDataArray("$dataSkills");
  for (var k = 1; k < dataSkills.length; k++) {
    var sk = dataSkills[k];
    if (sk && sk.name) {
      allSkills.push({ id: sk.id || k, name: sk.name });
    }
  }

  var allStates = [];
  var dataStates = safeDataArray("$dataStates");
  for (var t = 1; t < dataStates.length; t++) {
    var stt = dataStates[t];
    if (stt && stt.name) {
      allStates.push({ id: stt.id || t, name: stt.name });
    }
  }

  return {
    paramNames: paramNames,
    actors: actors,
    classes: classes,
    allSkills: allSkills,
    allStates: allStates,
  };
}

export function changeActorName(actorId, newName) {
  var actor = safeActorById(actorId);
  if (actor) {
    GeneralCheat.changeName(actor, newName);
  }
}

export function changeActorNickname(actorId, newNickname) {
  var actor = safeActorById(actorId);
  if (actor) {
    try {
      actor.setNickname(newNickname);
    } catch (e) {
      // ignore
    }
  }
}

export function changeActorProfile(actorId, newProfile) {
  var actor = safeActorById(actorId);
  if (actor) {
    try {
      actor.setProfile(newProfile);
    } catch (e) {
      // ignore
    }
  }
}
