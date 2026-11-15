// @ts-check

import { GeneralCheat } from "../../cheats/GeneralCheat.js";
import { GameSpeedCheat, SpeedCheat } from "../../cheats/SpeedCheat.js";

export function readGeneralGold() {
  if (typeof $gameParty === "undefined" || !$gameParty) return 0;
  return Number(/** @type {any} */ ($gameParty)._gold || 0);
}

export function isGeneralGameReady() {
  return (
    typeof $gamePlayer !== "undefined" &&
    !!$gamePlayer &&
    typeof $gamePlayer.moveSpeed === "function" &&
    typeof $gameParty !== "undefined" &&
    !!$gameParty
  );
}

export function readGeneralPanelState() {
  const rawPlayer =
    typeof $gamePlayer === "undefined"
      ? null
      : /** @type {any} */ ($gamePlayer);
  const gameSpeedSceneOption = GameSpeedCheat.getSceneOption();
  const isAllGameSpeed =
    gameSpeedSceneOption === GameSpeedCheat.sceneOptions().all;

  return {
    gameReady: isGeneralGameReady(),
    noClip: !!(rawPlayer && rawPlayer._through),
    gold: readGeneralGold(),
    // When fixed, show the cheat's target speed: heavy plugins constantly
    // reset the live player speed (usually back to 4.0), which made the UI
    // flicker back to the game default.
    moveSpeed: SpeedCheat.isFixed()
      ? /** @type {number} */ (SpeedCheat.fixedSpeed)
      : rawPlayer && typeof rawPlayer.moveSpeed === "function"
        ? rawPlayer.moveSpeed()
        : 4,
    fixSpeed: SpeedCheat.isFixed(),
    forceSave: GeneralCheat.isForceSaveEnabled(),
    mouseMove: GeneralCheat.isMouseMoveEnabled(),
    mouseTeleport: GeneralCheat.isMouseTeleportEnabled(),
    gameSpeed: GameSpeedCheat.getRate(),
    applyAllForGameSpeed: isAllGameSpeed,
    applyBattleForGameSpeed:
      isAllGameSpeed ||
      gameSpeedSceneOption === GameSpeedCheat.sceneOptions().battle,
  };
}
