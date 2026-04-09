// @ts-check

import { GeneralCheat } from "../../cheats/GeneralCheat.js";
import { GameSpeedCheat, SpeedCheat } from "../../cheats/SpeedCheat.js";

export function readGeneralGold() {
  return Number(/** @type {any} */ ($gameParty)._gold || 0);
}

export function readGeneralPanelState() {
  const rawPlayer = /** @type {any} */ ($gamePlayer);
  const runtimeWindow = /** @type {any} */ (window);
  const gameSpeedSceneOption =
    runtimeWindow.GameSpeedCheat && runtimeWindow.GameSpeedCheat.getSceneOption
      ? runtimeWindow.GameSpeedCheat.getSceneOption()
      : null;

  return {
    noClip: !!rawPlayer._through,
    gold: readGeneralGold(),
    moveSpeed: $gamePlayer.moveSpeed(),
    fixSpeed: SpeedCheat.isFixed(),
    forceSave: GeneralCheat.isForceSaveEnabled(),
    mouseTeleport: GeneralCheat.isMouseTeleportEnabled(),
    gameSpeed:
      runtimeWindow.GameSpeedCheat && runtimeWindow.GameSpeedCheat.getRate
        ? runtimeWindow.GameSpeedCheat.getRate()
        : 1,
    applyAllForGameSpeed:
      gameSpeedSceneOption === GameSpeedCheat.sceneOptions().all,
    applyBattleForGameSpeed:
      gameSpeedSceneOption === GameSpeedCheat.sceneOptions().battle,
  };
}
