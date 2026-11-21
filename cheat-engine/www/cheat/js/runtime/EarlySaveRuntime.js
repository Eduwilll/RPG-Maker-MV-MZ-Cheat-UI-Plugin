import { createDatabaseOverrides } from "./DatabaseOverrides.js";

// Saves must not depend on Vue, a mounted overlay, or network availability.
export function ensureSaveRuntime(game) {
  if (!game) return null;
  if (!game.__cheatSaveRuntime) {
    game.__cheatSaveRuntime =
      (game.__cheatFeatures && game.__cheatFeatures.database) ||
      createDatabaseOverrides(game);
  }
  game.__cheatSaveRuntime.install();
  return game.__cheatSaveRuntime;
}

export function watchSaveRuntime(game) {
  const runtime = ensureSaveRuntime(game);
  if (!game || game.__cheatSaveWatch) return runtime;
  const ready = () =>
    game.DataManager &&
    ["makeSaveContents", "extractSaveContents", "setupNewGame"].every(
      (name) => typeof game.DataManager[name] === "function",
    );
  if (ready()) return runtime;
  const poll = game.setInterval || setInterval;
  const clear = game.clearInterval || clearInterval;
  let timer;
  function dispose() {
    clear.call(game, timer);
    if (game.document) game.document.removeEventListener("load", install, true);
    if (game.removeEventListener) game.removeEventListener("unload", dispose);
    delete game.__cheatSaveWatch;
  }
  function install() {
    if (!ready()) return;
    ensureSaveRuntime(game);
    dispose();
  }
  game.__cheatSaveWatch = { dispose };
  // Capture script load before MZ's own onload handler can start gameplay.
  if (game.document) game.document.addEventListener("load", install, true);
  if (game.addEventListener)
    game.addEventListener("unload", dispose, { once: true });
  timer = poll.call(game, install, 20);
  return runtime;
}
