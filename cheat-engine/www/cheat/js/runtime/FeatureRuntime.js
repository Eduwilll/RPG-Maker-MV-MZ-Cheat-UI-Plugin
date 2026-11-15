import { createDatabaseOverrides } from "./DatabaseOverrides.js";
import { createBattleActions } from "./BattleActions.js";
import { createMessageHistory } from "./MessageHistory.js";
import { createValueLocks } from "./ValueLocks.js";
import { createGameOptions } from "./GameOptions.js";
import { createGameAssets } from "./GameAssets.js";
import { createActorActions } from "./ActorActions.js";
import { createMapPreviews } from "./MapPreviews.js";
import { createMapLayers } from "./MapLayers.js";
import { createMessageLogPreferences } from "../panels/history/MessageLogPreferences.js";
import {
  KEY_VALUE_STORAGE,
  KeyValueStorage,
} from "../storage/KeyValueStorage.js";

export function getGameWindow(viewWindow) {
  const view = viewWindow || (typeof window !== "undefined" ? window : null);
  if (!view) return null;
  try {
    return (
      view.__cheatOpener ||
      (view.opener && view.opener.__cheatFeatures ? view.opener : view)
    );
  } catch (error) {
    return view;
  }
}
export function getFeatureRuntime(viewWindow) {
  const game = getGameWindow(viewWindow);
  return game && game.__cheatFeatures ? game.__cheatFeatures : null;
}
export function initializeFeatureRuntime(game, dependencies) {
  if (!game) return null;
  if (game.__cheatFeatures) return game.__cheatFeatures;
  const deps = dependencies || {};
  const root = game.Utils && game.Utils.RPGMAKER_NAME === "MV" ? "www" : ".";
  const runtime = {
    messageLogPreferences: createMessageLogPreferences(
      deps.settingsStorage || KEY_VALUE_STORAGE,
    ),
    mapLayers: createMapLayers(deps.settingsStorage || KEY_VALUE_STORAGE),
    assets: createGameAssets(game, deps.assetLoader),
    actors: createActorActions(game),
    previews: createMapPreviews(game),
    database: createDatabaseOverrides(game),
    battle: createBattleActions(game),
    history: createMessageHistory(game),
    locks: createValueLocks(
      game,
      deps.lockStorage ||
        new KeyValueStorage("./" + root + "/cheat-settings/value-locks.json"),
    ),
    options: createGameOptions(
      game,
      deps.settingsStorage || KEY_VALUE_STORAGE,
      deps,
    ),
  };
  game.__cheatFeatures = runtime;
  runtime.history.install();
  runtime.locks.install();
  runtime.database.install();
  return runtime;
}
