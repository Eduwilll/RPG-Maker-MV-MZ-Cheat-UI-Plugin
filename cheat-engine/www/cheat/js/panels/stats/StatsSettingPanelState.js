// @ts-check

import { GeneralCheat } from "../../cheats/GeneralCheat.js";
import { extractActorParamValues } from "../PanelGameState.js";

/**
 * @param {Game_Actor} actor
 */
export function extractStatsActorData(actor) {
  return {
    id: actor.actorId(),
    name: actor.name(),
    godMode: GeneralCheat.isGodMode(actor),
    level: actor.level,
    exp: actor.currentExp(),
    param: extractActorParamValues(actor),
  };
}

export function readStatsSettingPanelState() {
  return {
    paramNames: $dataSystem.terms.params,
    actors: $gameParty
      .members()
      .map((actor) =>
        extractStatsActorData(/** @type {Game_Actor} */ (rawActor(actor))),
      ),
  };
}

/**
 * @param {Game_Battler} actor
 * @returns {Game_Actor}
 */
function rawActor(actor) {
  return /** @type {Game_Actor} */ (actor);
}
