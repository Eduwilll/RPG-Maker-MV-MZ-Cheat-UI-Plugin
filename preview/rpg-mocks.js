/**
 * RPG Maker MV/MZ Mocks for Web Preview
 * This file simulates the game engine environment so the Cheat UI can run in a browser.
 */

// --- Basic Utility Mocks ---
window.Utils = {
    isNwjs: () => false,
    isMobileDevice: () => false,
    isAndroidChrome: () => false,
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
        this.hp = 100;
        this.mhp = 1000;
        this.mp = 50;
        this.mmp = 500;
        this.tp = 0;
    }
    name() { return this._name; }
    level() { return this._level; }
    maxTp() { return 100; }
    gainHp(v) { this.hp = Math.min(this.mhp, Math.max(0, this.hp + v)); }
    setHp(v) { this.hp = v; }
    gainMp(v) { this.mp = Math.min(this.mmp, Math.max(0, this.mp + v)); }
    setMp(v) { this.mp = v; }
    setTp(v) { this.tp = v; }
    deathStateId() { return 1; }
    addNewState() {}
}

window.Game_Actor = MockActor;

window.$gameActors = {
    _data: [null, new MockActor(1, 'Lead Hero', 10), new MockActor(2, 'Sidekick', 8)],
    actor: (id) => window.$gameActors._data[id]
};

window.$gameParty = {
    _gold: 12345,
    gold: () => window.$gameParty._gold,
    gainGold: (v) => { window.$gameParty._gold += v; },
    loseGold: (v) => { window.$gameParty._gold -= v; },
    members: () => [window.$gameActors.actor(1), window.$gameActors.actor(2)],
    allMembers: () => [window.$gameActors.actor(1), window.$gameActors.actor(2)],
};

window.$gamePlayer = {
    _x: 10,
    _y: 20,
    _through: false,
    _moveSpeed: 4,
    x: 10,
    y: 20,
    moveSpeed: () => window.$gamePlayer._moveSpeed,
    setMoveSpeed: (v) => { window.$gamePlayer._moveSpeed = v; },
    locate: (x, y) => { window.$gamePlayer.x = x; window.$gamePlayer.y = y; },
};

window.$gameSystem = {
    _saveEnabled: true,
    isSaveEnabled: () => window.$gameSystem._saveEnabled,
    enableSave: () => { window.$gameSystem._saveEnabled = true; },
    disableSave: () => { window.$gameSystem._saveEnabled = false; },
    onBeforeSave: () => {},
};

window.$gameVariables = {
    _data: new Array(100).fill(0),
    value: (id) => window.$gameVariables._data[id] || 0,
    setValue: (id, v) => { window.$gameVariables._data[id] = v; },
};

window.$gameSwitches = {
    _data: new Array(100).fill(false),
    value: (id) => !!window.$gameSwitches._data[id],
    setValue: (id, v) => { window.$gameSwitches._data[id] = !!v; },
};

window.$gameTemp = {
    isPlaytest: () => true,
};

window.$gameMap = {
    canvasToMapX: (x) => Math.floor(x / 48),
    canvasToMapY: (y) => Math.floor(y / 48),
};

window.$gameTroop = {
    members: () => [new MockActor(10, 'Slime A', 1), new MockActor(11, 'Bat B', 1)],
};

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
    push: (sceneClass) => { console.log('Pushing scene:', sceneClass.name); },
    goto: (sceneClass) => { console.log('Going to scene:', sceneClass.name); },
    pop: () => { console.log('Popping scene'); },
};

window.DataManager = {
    maxSavefiles: () => 20,
    isTest: () => true,
    saveGame: (slot) => { console.log('Saving game to slot:', slot); return true; },
    loadGame: (slot) => { console.log('Loading game from slot:', slot); return true; },
};

window.TouchInput = { x: 0, y: 0 };
window.SoundManager = { playEscape: () => {} };
window.BattleManager = { 
    _phase: 'start', 
    processVictory: () => { console.log('Victory!'); },
    processDefeat: () => { console.log('Defeat!'); },
    processEscape: () => { console.log('Escaped!'); },
    processAbort: () => { console.log('Aborted!'); },
};

// --- Cheat Settings Mocks ---
// Mock KeyValueStorage to use localStorage instead of files
window.mockStorage = {};
// We will intercept the KeyValueStorage class in a real environment if needed, 
// but for the browser we can just mock it in the helper if we can.

console.log("RPG Maker Web Mocks Loaded!");
