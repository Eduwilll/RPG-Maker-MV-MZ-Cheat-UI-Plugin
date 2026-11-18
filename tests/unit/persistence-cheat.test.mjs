import test from "node:test";
import assert from "node:assert/strict";
import { createPersistenceCheat } from "../../cheat-engine/www/cheat/js/cheats/persistence/PersistenceCheat.js";

function setup() {
  class GameSystem {
    isSaveEnabled() {
      return false;
    }
  }
  class WindowMenuCommand {
    needsCommand() {
      return false;
    }
    findSymbol(symbol) {
      return (this._list || []).some((command) => command.symbol === symbol);
    }
    makeCommandList() {
      this._list = [{ symbol: "item" }, { symbol: "gameEnd" }];
    }
  }
  class SceneMenu {
    commandSave() {
      this.saved = true;
    }
  }
  class SceneSave {}
  const messages = [];
  const sceneManager = { pushed: [], push(scene) {
    this.pushed.push(scene);
  } };
  const gameSystem = { enabled: false, enableSave() {
    this.enabled = true;
  } };

  const module = createPersistenceCheat({
    getGameSystemPrototype: () => GameSystem.prototype,
    getWindowMenuCommand: () => WindowMenuCommand,
    getSceneMenu: () => SceneMenu,
    getGameSystem: () => gameSystem,
    getSceneManager: () => sceneManager,
    getSceneSave: () => SceneSave,
    getTextManager: () => ({ save: "Save" }),
    getAlert: () => ({
      success: (text) => messages.push(["success", text]),
      info: (text) => messages.push(["info", text]),
    }),
  });

  return { module, GameSystem, WindowMenuCommand, SceneMenu, SceneSave, messages, sceneManager, gameSystem };
}

test("force save enables saving anywhere and lists a Save command", () => {
  const { module, GameSystem, WindowMenuCommand, messages, gameSystem } = setup();

  assert.equal(module.isForceSaveEnabled(), false);
  module.forceEnableSave(true);

  assert.equal(module.isForceSaveEnabled(), true);
  assert.equal(new GameSystem().isSaveEnabled(), true);
  assert.equal(new WindowMenuCommand().needsCommand("save"), true);
  assert.equal(gameSystem.enabled, true);
  assert.deepEqual(messages.at(-1), ["success", "Force Save: Enabled"]);

  const menu = new WindowMenuCommand();
  menu.makeCommandList();
  assert.deepEqual(
    menu._list.map((command) => command.symbol),
    ["item", "save", "gameEnd"],
  );
});

test("the Save command is not duplicated when the menu is rebuilt", () => {
  const { module, WindowMenuCommand } = setup();
  module.forceEnableSave(true);

  const menu = new WindowMenuCommand();
  menu.makeCommandList();
  menu.makeCommandList();

  assert.equal(
    menu._list.filter((command) => command.symbol === "save").length,
    1,
  );
});

test("disabling force save restores the original save check", () => {
  const { module, GameSystem, messages } = setup();
  module.forceEnableSave(true);
  module.forceEnableSave(false);

  assert.equal(module.isForceSaveEnabled(), false);
  assert.equal(new GameSystem().isSaveEnabled(), false);
  assert.deepEqual(messages.at(-1), ["info", "Force Save: Disabled"]);
});

test("the menu save command pushes Scene_Save only while force save is on", () => {
  const { module, SceneMenu, SceneSave, sceneManager } = setup();
  module.forceEnableSave(true);

  new SceneMenu().commandSave();
  assert.deepEqual(sceneManager.pushed, [SceneSave]);

  module.forceEnableSave(false);
  const menu = new SceneMenu();
  menu.commandSave();
  assert.equal(menu.saved, true, "the original command runs again");
  assert.equal(sceneManager.pushed.length, 1);
});

test("force save tolerates a runtime without menu classes", () => {
  const messages = [];
  const module = createPersistenceCheat({
    getGameSystemPrototype: () => null,
    getWindowMenuCommand: () => null,
    getSceneMenu: () => null,
    getGameSystem: () => null,
    getSceneManager: () => null,
    getSceneSave: () => null,
    getTextManager: () => null,
    getAlert: () => ({
      success: (text) => messages.push(text),
      info: (text) => messages.push(text),
    }),
  });

  module.forceEnableSave(true);
  assert.equal(module.isForceSaveEnabled(), true);
  module.forceEnableSave(false);
  assert.equal(module.isForceSaveEnabled(), false);
  assert.deepEqual(messages, ["Force Save: Enabled", "Force Save: Disabled"]);
});
