// @ts-check

import { BattleCheat } from "../../cheats/BattleCheat.js";

/**
 * @param {Game_Battler} member
 * @param {number} id
 */
function buildHealthMemberRow(member, id) {
  const rawMember = /** @type {any} */ (member);

  return {
    id,
    name: member.name(),
    hp: { hp: rawMember.hp, mhp: rawMember.mhp },
    mp: { mp: rawMember.mp, mmp: rawMember.mmp },
  };
}

export function readHealthSettingPanelState() {
  return {
    enemy: $gameTroop
      .members()
      .map((member, index) => buildHealthMemberRow(member, index)),
    party: $gameParty
      .members()
      .map((member) =>
        buildHealthMemberRow(member, /** @type {any} */ (member).actorId()),
      ),
    disableRandomEncounter: BattleCheat.isDisableRandomEncounter(),
  };
}

/**
 * @param {"party" | "enemy"} type
 * @param {number} id
 * @returns {Game_Battler | null}
 */
export function findHealthPanelMember(type, id) {
  if (type === "party") {
    return (
      $gameParty
        .members()
        .find((member) => /** @type {any} */ (member).actorId() === id) || null
    );
  }

  return $gameTroop.members()[id] || null;
}
