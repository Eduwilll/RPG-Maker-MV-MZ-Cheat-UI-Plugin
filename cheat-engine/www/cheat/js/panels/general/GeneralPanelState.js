// @ts-check

import { GeneralCheat } from "../../cheats/GeneralCheat.js";
import { GameSpeedCheat, SpeedCheat } from "../../cheats/SpeedCheat.js";

export function readGeneralGold() {
  return Number(/** @type {any} */ ($gameParty)._gold || 0);
}

export function readGeneralPanelState() {
  const rawPlayer = /** @type {any} */ ($gamePlayer);
  const gameSpeedSceneOption = GameSpeedCheat.getSceneOption();
  const isAllGameSpeed =
    gameSpeedSceneOption === GameSpeedCheat.sceneOptions().all;

  return {
    noClip: !!rawPlayer._through,
    gold: readGeneralGold(),
    moveSpeed: $gamePlayer.moveSpeed(),
    fixSpeed: SpeedCheat.isFixed(),
    forceSave: GeneralCheat.isForceSaveEnabled(),
    mouseTeleport: GeneralCheat.isMouseTeleportEnabled(),
    gameSpeed: GameSpeedCheat.getRate(),
    applyAllForGameSpeed: isAllGameSpeed,
    applyBattleForGameSpeed:
      isAllGameSpeed ||
      gameSpeedSceneOption === GameSpeedCheat.sceneOptions().battle,
  };
}
