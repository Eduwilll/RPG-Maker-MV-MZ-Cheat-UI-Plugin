export const GAME_STARTUP_GLOBALS = [
  "Utils",
  "DataManager",
  "SceneManager",
  "TouchInput",
  "Window_Base",
  "Window_Message",
  "Window_ScrollText",
  "Window_BattleLog",
  "Window_ChoiceList",
  "Game_Actor",
  "Game_Enemy",
];

export function waitForEngine(game, timeout = 60000) {
  const deadline = Date.now() + timeout;
  return new Promise((resolve, reject) => {
    function check() {
      if (
        game.document &&
        game.document.readyState === "complete" &&
        GAME_STARTUP_GLOBALS.every((name) => !!game[name]) &&
        ["makeSaveContents", "extractSaveContents", "setupNewGame"].every(
          (name) => typeof game.DataManager[name] === "function",
        )
      )
        return resolve();
      if (Date.now() >= deadline)
        return reject(new Error("Game scripts did not finish loading"));
      setTimeout(check, Math.min(20, Math.max(1, deadline - Date.now())));
    }
    check();
  });
}
