/**
 * RPG Maker MV/MZ Mocks for Web Preview (Updated)
 * This file simulates the game engine environment so the Cheat UI can run in a browser.
 */

// --- Basic Utility Mocks ---
window.Utils = {
  isNwjs: () => false,
  isMobileDevice: () => false,
  isAndroidChrome: () => false,
  RPGMAKER_NAME: "MZ", // Default to MZ for preview
};

window.Graphics = {
  width: 1280,
  height: 720,
};

// --- Game Object Mocks ---
class MockActor {
  constructor(id, name, level) {
    this._actorId = id;
    this._name = name;
    this._level = level;
    this._exp = { 1: 0 }; // Default class exp
    this._classId = 1;
    this._paramPlus = new Array(8).fill(0);
    this.hp = 100;
    this.mhp = 1000;
    this.mp = 50;
    this.mmp = 500;
    this.tp = 0;
  }
  name() {
    return this._name;
  }
  level() {
    return this._level;
  }
  maxTp() {
    return 100;
  }
  param(id) {
    return (this._paramPlus[id] || 0) + 10;
  }
  addParam(id, v) {
    this._paramPlus[id] = (this._paramPlus[id] || 0) + v;
  }
  currentExp() {
    return this._exp[this._classId] || 0;
  }
  changeLevel(n, show) {
    this._level = n;
  }
  changeExp(n, show) {
    this._exp[this._classId] = n;
  }
  gainHp(v) {
    this.hp = Math.min(this.mhp, Math.max(0, this.hp + v));
  }
  setHp(v) {
    this.hp = v;
  }
  gainMp(v) {
    this.mp = Math.min(this.mmp, Math.max(0, this.mp + v));
  }
  setMp(v) {
    this.mp = v;
  }
  setTp(v) {
    this.tp = v;
  }
  deathStateId() {
    return 1;
  }
  addNewState() {}
  isActor() {
    return true;
  }
}

window.Game_Actor = MockActor;

window.$gameActors = {
  _data: [
    null,
    new MockActor(1, "Lead Hero", 10),
    new MockActor(2, "Sidekick", 8),
  ],
  actor: (id) => window.$gameActors._data[id],
};

window.$gameParty = {
  _gold: 12345,
  gold: () => window.$gameParty._gold,
  gainGold: (v) => {
    window.$gameParty._gold += v;
  },
  loseGold: (v) => {
    window.$gameParty._gold -= v;
  },
  members: () => [window.$gameActors.actor(1), window.$gameActors.actor(2)],
  allMembers: () => [window.$gameActors.actor(1), window.$gameActors.actor(2)],
  gainItem: (item, amount) => {
    console.log("Gained item:", item.name, amount);
  },
  numItems: (item) => 5,
};

window.$gamePlayer = {
  _x: 10,
  _y: 20,
  _through: false,
  _moveSpeed: 4,
  x: 10,
  y: 20,
  moveSpeed: () => window.$gamePlayer._moveSpeed,
  setMoveSpeed: (v) => {
    window.$gamePlayer._moveSpeed = v;
  },
  locate: (x, y) => {
    window.$gamePlayer.x = x;
    window.$gamePlayer.y = y;
  },
  isDebugThrough: () => true,
  setTransparent: (v) => {
    console.log("Player transparency set to:", v);
  },
};

window.$gameSystem = {
  _saveEnabled: true,
  isSaveEnabled: () => window.$gameSystem._saveEnabled,
  enableSave: () => {
    window.$gameSystem._saveEnabled = true;
  },
  disableSave: () => {
    window.$gameSystem._saveEnabled = false;
  },
  onBeforeSave: () => {},
};

window.$gameVariables = {
  _data: new Array(100).fill(0),
  value: (id) => window.$gameVariables._data[id] || 0,
  setValue: (id, v) => {
    window.$gameVariables._data[id] = v;
  },
};

window.$gameSwitches = {
  _data: new Array(100).fill(false),
  value: (id) => !!window.$gameSwitches._data[id],
  setValue: (id, v) => {
    window.$gameSwitches._data[id] = !!v;
  },
};

window.$gameTemp = {
  isPlaytest: () => true,
};

window.$gameMap = {
  mapId: () => 1, // Fix: Game map needs mapId as a function
  canvasToMapX: (x) => Math.floor(x / 48),
  canvasToMapY: (y) => Math.floor(y / 48),
  displayName: () => "Mock Forest Map",
};

window.$gameTroop = {
  members: () => [
    new MockActor(10, "Slime A", 1),
    new MockActor(11, "Bat B", 1),
  ],
};

window.$gameMessage = {
  add: (text) => console.log("Game Message:", text),
};

window.$gameEnemies = [];
window.$gameData = {};

// --- Manager Mocks ---
window.Scene_Base = class {};
window.Scene_Map = class extends window.Scene_Base {};
window.Scene_Battle = class extends window.Scene_Base {};
window.Scene_Title = class extends window.Scene_Base {};
window.Scene_Save = class extends window.Scene_Base {};
window.Scene_Load = class extends window.Scene_Base {};
window.Scene_Debug = class extends window.Scene_Base {};

window.SceneManager = {
  _scene: new window.Scene_Map(),
  push: (sceneClass) => {
    console.log("Pushing scene:", sceneClass.name);
  },
  goto: (sceneClass) => {
    console.log("Going to scene:", sceneClass.name);
  },
  pop: () => {
    console.log("Popping scene");
  },
};

window.DataManager = {
  maxSavefiles: () => 20,
  isTest: () => true,
  saveGame: (slot) => {
    console.log("Saving game to slot:", slot);
    return true;
  },
  loadGame: (slot) => {
    console.log("Loading game from slot:", slot);
    return true;
  },
};

window.TouchInput = { x: 0, y: 0 };
window.SoundManager = { playEscape: () => {}, playOk: () => {} };
window.ImageManager = {
  loadCharacter: () => ({ addLoadListener: (f) => f() }),
};
window.BattleManager = {
  _phase: "start",
  processVictory: () => {
    console.log("Victory!");
  },
  processDefeat: () => {
    console.log("Defeat!");
  },
  processEscape: () => {
    console.log("Escaped!");
  },
  processAbort: () => {
    console.log("Aborted!");
  },
};

// --- Spriteset Mock ---
window.Spriteset_Base = class {
  constructor() {}
};

// --- Database ($data*) Mocks ---
const mockItems = new Array(10).fill(null).map((_, i) => ({
  id: i,
  name: `Mock Item ${i}`,
  description: "A test item",
}));
const mockSwitches = new Array(20)
  .fill(null)
  .map((_, i) => (i === 0 ? null : `Switch ${i}`));
const mockVariables = new Array(20)
  .fill(null)
  .map((_, i) => (i === 0 ? null : `Variable ${i}`));

window.$dataActors = [
  null,
  { id: 1, name: "Hero" },
  { id: 2, name: "Sidekick" },
];
window.$dataClasses = [null, { id: 1, name: "Warrior" }];
window.$dataSkills = [null, { id: 1, name: "Attack" }];
window.$dataItems = mockItems;
window.$dataWeapons = new Array(10)
  .fill(null)
  .map((_, i) => ({ id: i, name: `Weapon ${i}` }));
window.$dataArmors = new Array(10)
  .fill(null)
  .map((_, i) => ({ id: i, name: `Armor ${i}` }));
window.$dataEnemies = [null, { id: 1, name: "Slime" }];
window.$dataTroops = [null, { id: 1, name: "2x Slime" }];
window.$dataStates = [null, { id: 1, name: "Poison" }];
window.$dataAnimations = [null, { id: 1, name: "Fire" }];
window.$dataTilesets = [null, { id: 1, name: "Default" }];
window.$dataCommonEvents = [null, { id: 1, name: "Event 1" }];
window.$dataSystem = {
  variables: mockVariables,
  switches: mockSwitches,
  locale: "en_US",
  currencyUnit: "G",
  terms: {
    basic: ["Level", "Lv", "HP", "HP", "MP", "MP", "TP", "TP", "EXP", "EXP"],
    params: [
      "Max HP",
      "Max MP",
      "Attack",
      "Defense",
      "M.Attack",
      "M.Defense",
      "Agility",
      "Luck",
    ],
    commands: [
      "Fight",
      "Escape",
      "Attack",
      "Guard",
      "Item",
      "Skill",
      "Equip",
      "Status",
      "Formation",
      "Options",
      "Save",
      "Game End",
    ],
  },
};
window.$dataMapInfos = [null, { id: 1, name: "Mock Map", parentId: 0 }];
window.$dataMap = { width: 100, height: 100, data: [] };

console.log("RPG Maker Web Mocks Expanded & Loaded!");
