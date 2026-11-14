/** Development-only engine contracts for preview and isolated UI smoke tests. */
export function installBrowserFixture(game) {
  const actorPrototype = game.Game_Actor.prototype;
  actorPrototype.faceName = () => "Actor1";
  actorPrototype.faceIndex = function () {
    return this._actorId - 1;
  };
  actorPrototype.characterName = () => "$Hero";
  actorPrototype.characterIndex = () => 0;
  game.$dataActors[3] = Object.assign({}, game.$dataActors[1], {
    id: 3,
    name: "Recruit",
  });
  game.$gameActors._data[3] = new game.Game_Actor(3, "Recruit", 1);
  game.$gameParty._actors = [1, 2];
  game.$gameParty.members = game.$gameParty.allMembers = () =>
    game.$gameParty._actors.map((id) => game.$gameActors.actor(id));
  game.$gameParty.addActor = (id) => {
    if (game.$gameParty._actors.indexOf(id) < 0)
      game.$gameParty._actors.push(id);
  };
  game.$gameParty.removeActor = (id) => {
    const i = game.$gameParty._actors.indexOf(id);
    if (i >= 0) game.$gameParty._actors.splice(i, 1);
  };
  actorPrototype.actorId = function () {
    return this._actorId;
  };
  actorPrototype.currentClass = function () {
    return game.$dataClasses[this._classId];
  };
  actorPrototype.nickname = function () {
    return this._nickname || "";
  };
  actorPrototype.profile = function () {
    return this._profile || "";
  };
  actorPrototype.skills = function () {
    return [game.$dataSkills[1]];
  };
  actorPrototype.states = function () {
    return (this._states || [])
      .map((id) => game.$dataStates[id])
      .filter(Boolean);
  };
  actorPrototype.isStateAffected = function (id) {
    return (this._states || []).includes(id);
  };
  actorPrototype.addState = function (id) {
    if (!this.isStateAffected(id))
      this._states = (this._states || []).concat([id]);
  };
  actorPrototype.removeState = function (id) {
    this._states = (this._states || []).filter((value) => value !== id);
  };
  actorPrototype.clearStates = function () {
    this._states = [];
  };
  actorPrototype.refresh = function () {};
  Object.defineProperty(actorPrototype, "level", {
    configurable: true,
    get() {
      return this._level;
    },
  });
  game.$dataStates = [
    null,
    { id: 1, name: "Death", traits: [] },
    { id: 2, name: "Poison", traits: [] },
  ];
  game.$gameActors.actor(1)._states = [2];
  game.$gameParty.leader = () => game.$gameActors.actor(1);
  game.$dataItems[0] = null;
  game.$dataWeapons[0] = null;
  game.$dataArmors[0] = null;
  [game.$dataItems, game.$dataWeapons, game.$dataArmors].forEach((table) =>
    table.filter(Boolean).forEach((row) =>
      Object.assign(row, {
        description: "A long test description for bounded cards.",
        price: 100,
        effects: [],
        traits: [],
        params: [0, 0, 3, 2, 0, 0, 0, 0],
      }),
    ),
  );
  game.$dataEnemies[1] = {
    id: 1,
    name: "Slime",
    description: "Forest guardian",
    battlerName: "Slime",
    dropItems: [{ kind: 1, dataId: 1, denominator: 4 }],
    params: [50, 10, 10, 10, 10, 10, 10, 10],
    gold: 5,
    exp: 10,
    actions: [
      {
        skillId: 1,
        rating: 5,
        conditionType: 0,
        conditionParam1: 0,
        conditionParam2: 0,
      },
    ],
    traits: [],
  };
  game.$dataSkills[1] = {
    id: 1,
    name: "Fire",
    mpCost: 5,
    tpCost: 0,
    successRate: 100,
    repeats: 1,
    speed: 0,
    tpGain: 0,
    scope: 1,
    hitType: 1,
    damage: {
      type: 1,
      elementId: 1,
      formula: "a.mat * 2",
      variance: 20,
      critical: false,
    },
    effects: [],
  };
  game.$dataClasses[1] = {
    id: 1,
    name: "Mage",
    params: Array.from({ length: 8 }, () =>
      Array.from({ length: 100 }, (_, i) => 10 + i),
    ),
    expParams: [30, 20, 30, 30],
    learnings: [{ level: 2, skillId: 1, note: "" }],
    traits: [],
  };
  Object.assign(game.$dataSystem, {
    elements: ["", "Fire"],
    skillTypes: ["", "Magic"],
    weaponTypes: ["", "Sword"],
    armorTypes: ["", "Light"],
    equipTypes: ["", "Weapon", "Armor"],
  });
  const counts = new Map();
  game.$gameParty.numItems = (item) =>
    counts.has(item) ? counts.get(item) : 5;
  game.$gameParty.gainItem = function (item, amount) {
    counts.set(item, Math.max(0, Math.min(99, this.numItems(item) + amount)));
  };
  game.$gameParty.maxItems = () => 99;
  game.$gameParty.maxGold = () => 99999999;
  game.$gameParty.inBattle = () => false;
  game.$gameTimer = {
    _frames: 600,
    _working: true,
    start(frames) {
      this._frames = frames;
      this._working = true;
    },
    stop() {
      this._working = false;
    },
    isWorking() {
      return this._working;
    },
    update() {
      if (this._working) this._frames--;
    },
  };
  game.Game_Message = class {
    constructor() {
      this._texts = [];
      this._speakerName = "Guide";
    }
    add(text) {
      this._texts.push(text);
    }
    clear() {
      this._texts = [];
      this._choices = [];
      this._speakerName = "";
      this._faceName = "";
      this._choiceCallback = null;
    }
    setChoices(values) {
      this._choices = values;
    }
    choices() {
      return this._choices;
    }
    onChoice(index) {
      if (this._choiceCallback) this._choiceCallback(index);
    }
    newPage() {
      if (this._texts.length) this._texts[this._texts.length - 1] += "\f";
    }
    speakerName() {
      return this._speakerName;
    }
  };
  game.$gameMessage = new game.Game_Message();
  game.Window_Message = class {
    startMessage() {
      this.contents = {
        fontFace: "GameFont",
        fontSize: 28,
        fontBold: false,
        fontItalic: false,
        textColor: "#ffffff",
        outlineColor: "rgba(0,0,0,0.8)",
        outlineWidth: 4,
      };
      this._textState = {
        text: game.$gameMessage._texts.join("\n").replace(/\\/g, "\x1b"),
      };
    }
  };
  const tiles = game.document.createElement("canvas");
  tiles.width = 768;
  tiles.height = 768;
  const tileContext = tiles.getContext("2d");
  tileContext.fillStyle = "#229944";
  tileContext.fillRect(48, 0, 48, 48);
  const faces = game.document.createElement("canvas");
  faces.width = 576;
  faces.height = 288;
  const faceContext = faces.getContext("2d");
  faceContext.fillStyle = "#2244cc";
  faceContext.fillRect(0, 0, 576, 288);
  faceContext.fillStyle = "#cc4422";
  faceContext.fillRect(288, 0, 144, 144);
  game.ImageManager.loadFace = () => ({ isReady: () => true, canvas: faces });
  game.Bitmap = {
    load: (url) => ({
      isReady: () => true,
      canvas: url.indexOf("/faces/") >= 0 ? faces : tiles,
    }),
  };
  game.ImageManager.loadTileset = () => ({
    isReady: () => true,
    canvas: tiles,
  });
  game.Tilemap = function () {};
  game.Tilemap.prototype._addTile = function (layer, id, x, y) {
    if (id) layer.addRect(5, (id % 8) * 48, 0, x, y, 48, 48);
  };
  game.Tilemap.prototype._addShadow = function (layer, bits, x, y) {
    if (bits) layer.addRect(-1, 0, 0, x, y, 48, 48);
  };
  game.$dataTilesets = [
    null,
    { tilesetNames: ["", "", "", "", "", "Mock"], flags: [] },
  ];
  game.$dataMap = {
    width: 30,
    height: 10,
    data: new Array(300).fill(1),
    events: [null, { id: 1, name: "Door", x: 5, y: 4, pages: [] }],
  };
  Object.assign(game.$gameMap, {
    tilesetId: () => 1,
    tileWidth: () => 48,
    tileHeight: () => 48,
    isPassable: () => true,
    _events: [
      null,
      { _eventId: 1, x: 5, y: 4, _realX: 5, _realY: 4, _moveType: 0 },
    ],
    events() {
      return this._events.filter(Boolean);
    },
  });
  Object.assign(game.$gamePlayer, {
    x: 3,
    y: 3,
    setPosition(x, y) {
      this.x = x;
      this.y = y;
    },
    center() {},
    makeEncounterCount() {},
  });
  const battlePage = {
    list: [
      { code: 301, parameters: [0, 1, true, false] },
      { code: 0, parameters: [] },
    ],
  };
  Object.assign(game.$gameMap._events[1], {
    _pageIndex: 0,
    page: () => battlePage,
    event: () => ({ name: "Guard event" }),
    start() {
      game.__fixtureEventStarts = (game.__fixtureEventStarts || 0) + 1;
    },
  });
  game.$dataTroops = [
    null,
    { id: 1, name: "Guard troop", members: [{ enemyId: 1 }], pages: [] },
  ];
  game.$gameTroop.troop = function () {
    return game.$dataTroops[this._troopId];
  };
  game.BattleManager.setup = function (id) {
    game.$gameTroop._troopId = id;
    game.$gameTroop._enemies = [];
    game.__fixtureBattleStarts = (game.__fixtureBattleStarts || 0) + 1;
  };
  game.ConfigManager = {
    alwaysDash: false,
    commandRemember: false,
    bgmVolume: 80,
    bgsVolume: 80,
    meVolume: 80,
    seVolume: 80,
    customOption: false,
    save() {},
  };
  game.Rectangle = class {
    constructor(x, y, width, height) {
      Object.assign(this, { x, y, width, height });
    }
  };
  game.Window_Options = class {
    constructor() {
      this._list = [
        { name: "Custom Game Toggle", symbol: "customOption", enabled: true },
      ];
    }
    getConfigValue(symbol) {
      return game.ConfigManager[symbol];
    }
    changeValue(symbol, value) {
      game.ConfigManager[symbol] = value;
    }
    deactivate() {}
    destroy() {}
  };
  game.DataManager.makeSaveContents = () => ({ gold: game.$gameParty.gold() });
  game.DataManager.extractSaveContents = () => {};
  game.DataManager.setupNewGame = () => {};
}
