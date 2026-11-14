export function createActorActions(game) {
  return {
    setPartyMember(id, include) {
      const party = game.$gameParty;
      if (
        !Number.isInteger(id) ||
        id < 1 ||
        !game.$dataActors ||
        !game.$dataActors[id]
      )
        throw Error("Invalid actor ID.");
      if (!party || !Array.isArray(party._actors))
        throw Error("No active party.");
      if (
        (game.$gamePlayer &&
          game.$gamePlayer.isTransferring &&
          game.$gamePlayer.isTransferring()) ||
        (game.SceneManager &&
          game.SceneManager.isSceneChanging &&
          game.SceneManager.isSceneChanging())
      )
        throw Error("Wait for the map transfer or scene change to finish.");
      if (
        (party.inBattle && party.inBattle()) ||
        (game.$gameMap &&
          game.$gameMap.isEventRunning &&
          game.$gameMap.isEventRunning()) ||
        (game.$gameMessage &&
          game.$gameMessage.isBusy &&
          game.$gameMessage.isBusy())
      )
        throw Error("Wait until the battle or event has finished.");
      const present = party._actors.indexOf(id) >= 0;
      if (present === include) return;
      if (!include && party._actors.length <= 1)
        throw Error("Cannot remove the last party member.");
      const method = include ? "addActor" : "removeActor";
      if (typeof party[method] !== "function")
        throw Error("Party editing is unavailable.");
      party[method](id);
      if (party._actors.indexOf(id) >= 0 !== include)
        throw Error("The game's party plugin rejected this change.");
    },
  };
}
