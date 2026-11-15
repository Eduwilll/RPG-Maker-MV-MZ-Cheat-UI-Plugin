import { installDemoArt } from "./demo-art.js";

/** Additional human-preview data, kept separate from the deterministic smoke fixture. */
export function installDemoWorld(game) {
  const art = installDemoArt(game),
    names = ["Rowan", "Lyra", "Cass", "Mira"];
  names.forEach((name, index) => {
    const id = index + 1;
    game.$dataActors[id] = {
      id,
      name,
      nickname: id === 1 ? "The Wayfarer" : "",
      profile: "An original preview character for UI development.",
      classId: 1,
      initialLevel: 8 + id,
      faceName: "PreviewFaces",
      faceIndex: index,
      characterName: "PreviewPeople",
      characterIndex: index,
    };
    game.$gameActors._data[id] = new game.Game_Actor(id, name, 8 + id);
  });
  game.$gameActors.actor = function (id) {
    if (!this._data[id] && game.$dataActors[id])
      this._data[id] = new game.Game_Actor(id, game.$dataActors[id].name, 1);
    return this._data[id];
  };
  const actor = game.Game_Actor.prototype;
  Object.assign(actor, {
    faceName() {
      return "PreviewFaces";
    },
    faceIndex() {
      return this._actorId - 1;
    },
    characterName() {
      return "PreviewPeople";
    },
    characterIndex() {
      return this._actorId - 1;
    },
    setName(value) {
      this._name = String(value);
    },
    setNickname(value) {
      this._nickname = String(value);
    },
    setProfile(value) {
      this._profile = String(value);
    },
    changeClass(id) {
      this._classId = id;
    },
    skills() {
      return (this._skills || [1, 2])
        .map((id) => game.$dataSkills[id])
        .filter(Boolean);
    },
    isLearnedSkill(id) {
      return (this._skills || [1, 2]).includes(id);
    },
    learnSkill(id) {
      if (!this._skills) this._skills = [1, 2];
      if (!this._skills.includes(id)) this._skills.push(id);
    },
    forgetSkill(id) {
      this._skills = (this._skills || [1, 2]).filter((value) => value !== id);
    },
    recoverAll() {
      this.hp = this.mhp;
      this.mp = this.mmp;
      this._states = [];
    },
    isDead() {
      return this.hp <= 0;
    },
    isAlive() {
      return this.hp > 0;
    },
  });
  game.$gameParty.leader = () => game.$gameParty.members()[0] || null;
  game.$dataSkills[2] = Object.assign({}, game.$dataSkills[1], {
    id: 2,
    name: "Mending Light",
    iconIndex: 16,
    description: "Restore a little HP. A safe preview spell.",
    damage: {
      type: 3,
      elementId: 0,
      formula: "120",
      variance: 0,
      critical: false,
    },
  });
  game.$dataStates[2].name = "Poison";
  game.$dataStates[2].iconIndex = 18;
  game.$dataItems = [
    null,
    {
      id: 1,
      name: "Field Tonic",
      description:
        "Restores 40% HP. This longer description demonstrates wrapped tooltips and compact table columns.",
      price: 80,
      iconIndex: 1,
      itypeId: 1,
      effects: [{ code: 11, dataId: 0, value1: 0.4, value2: 0 }],
      params: [],
      traits: [],
    },
    {
      id: 2,
      name: "Moonseed",
      description: "A rare ingredient found near the northern lake.",
      price: 240,
      iconIndex: 2,
      itypeId: 1,
      effects: [{ code: 12, dataId: 0, value1: 0, value2: 30 }],
      params: [],
      traits: [],
    },
    {
      id: 3,
      name: "",
      description: "An intentionally nameless entry for filter design.",
      price: 0,
      iconIndex: 3,
      itypeId: 1,
      effects: [],
      params: [],
      traits: [],
    },
    {
      id: 4,
      name: "Gatehouse Key",
      description: "Opens the old gate.",
      price: 0,
      iconIndex: 4,
      itypeId: 2,
      effects: [],
      params: [],
      traits: [],
    },
  ];
  game.$dataWeapons = [
    null,
    {
      id: 1,
      name: "Copper Sabre",
      description: "A reliable blade.",
      iconIndex: 5,
      price: 400,
      wtypeId: 1,
      etypeId: 1,
      params: [0, 0, 14, 0, 0, 0, 2, 0],
      traits: [],
      effects: [],
    },
  ];
  game.$dataArmors = [
    null,
    {
      id: 1,
      name: "Traveller's Coat",
      description: "Keeps the evening chill away.",
      iconIndex: 6,
      price: 320,
      atypeId: 1,
      etypeId: 2,
      params: [40, 0, 0, 8, 0, 3, 0, 0],
      traits: [],
      effects: [],
    },
  ];
  game.DataManager.isItem = (row) => !!row && !!row.itypeId;
  game.DataManager.isWeapon = (row) => !!row && !!row.wtypeId;
  game.DataManager.isArmor = (row) => !!row && !!row.atypeId;
  const body = Object.assign({}, game.$dataEnemies[1], {
    id: 2,
    name: "Moss Guardian [body]",
    battlerName: "PreviewGuardian",
    description: "A multipart encounter for the root/limb browser.",
    params: [850, 60, 28, 21, 14, 18, 12, 8],
    gold: 90,
    exp: 180,
  });
  game.$dataEnemies[1] = Object.assign({}, game.$dataEnemies[1], {
    name: "Fern Slime",
    battlerName: "PreviewSlime",
    description: "A woodland slime. All artwork and data are preview fixtures.",
  });
  game.$dataEnemies.push(
    body,
    Object.assign({}, body, {
      id: 3,
      name: "Moss Guardian [head]",
      params: [180, 0, 8, 6, 18, 10, 10, 8],
    }),
    Object.assign({}, body, {
      id: 4,
      name: "Moss Guardian [arm]",
      params: [240, 0, 30, 14, 0, 8, 8, 4],
    }),
  );
  game.$dataTroops[2] = {
    id: 2,
    name: "Moss Guardian",
    members: [
      { enemyId: 2, x: 240, y: 320, hidden: false },
      { enemyId: 3, x: 240, y: 200, hidden: false },
      { enemyId: 4, x: 120, y: 300, hidden: false },
    ],
    pages: [],
  };
  const conditions = {
    actorValid: false,
    itemValid: false,
    selfSwitchValid: false,
    switch1Valid: false,
    switch2Valid: false,
    variableValid: false,
  };
  const page = (characterIndex, list) => ({
    conditions: Object.assign({}, conditions),
    image: {
      characterName: "PreviewPeople",
      characterIndex,
      direction: 2,
      pattern: 1,
      tileId: 0,
    },
    list,
    trigger: 0,
    priorityType: 1,
  });
  const end = { code: 0, indent: 0, parameters: [] };
  const definitions = [
    null,
    {
      id: 1,
      name: "Lyra - Lantern Keeper",
      x: 8,
      y: 8,
      pages: [
        page(1, [
          {
            code: 101,
            indent: 0,
            parameters: ["PreviewFaces", 1, 0, 2, "Lyra"],
          },
          { code: 401, indent: 0, parameters: ["The lantern is ready."] },
          { code: 121, indent: 0, parameters: [1, 1, 0] },
          end,
        ]),
      ],
    },
    {
      id: 2,
      name: "Supply Crate",
      x: 12,
      y: 10,
      pages: [
        page(4, [{ code: 126, indent: 0, parameters: [1, 0, 0, 1] }, end]),
      ],
    },
    {
      id: 3,
      name: "Guardian",
      x: 17,
      y: 6,
      pages: [
        page(6, [
          { code: 301, indent: 0, parameters: [0, 2, true, false] },
          end,
        ]),
      ],
    },
    {
      id: 4,
      name: "Mira - Scout",
      x: 6,
      y: 5,
      pages: [
        page(3, [{ code: 122, indent: 0, parameters: [1, 1, 1, 0, 1] }, end]),
      ],
    },
    {
      id: 5,
      name: "Gate Trigger",
      x: 20,
      y: 11,
      pages: [
        Object.assign(
          page(0, [{ code: 111, indent: 0, parameters: [0, 2, 0] }, end]),
          { image: { characterName: "", tileId: 0 } },
        ),
      ],
    },
  ];
  const width = 24,
    height = 16,
    data = new Array(width * height * 6).fill(0);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      data[i] = x < 3 ? 3 : y === 11 || x === 10 ? 4 : 1;
      if (y < 2 || x === 23) data[2 * width * height + i] = 7;
      if (x >= 6 && x <= 12 && y >= 3 && y <= 6)
        data[2 * width * height + i] = 2;
      if (x === 13 && y >= 3 && y <= 6) data[4 * width * height + i] = 15;
    }
  game.$dataMap = {
    width,
    height,
    data,
    events: definitions,
    tilesetId: 1,
    scrollType: 0,
    displayName: "Lantern Village",
  };
  game.$dataTilesets = [
    null,
    {
      id: 1,
      name: "Preview originals",
      tilesetNames: ["", "", "", "", "", "PreviewTiles"],
      flags: [],
    },
  ];
  game.$dataTilesets[1].flags[2] = 0x10;
  game.$dataTilesets[1].flags[7] = 0x10;
  game.$dataMapInfos = [
    null,
    { id: 1, name: "Lantern Village", parentId: 0 },
    { id: 2, name: "Quiet Clearing", parentId: 0 },
  ];
  const events = definitions.filter(Boolean).map((definition) => ({
    _eventId: definition.id,
    _pageIndex: 0,
    _characterName: definition.pages[0].image.characterName,
    _characterIndex: definition.pages[0].image.characterIndex || 0,
    _direction: 2,
    _pattern: 1,
    _opacity: 255,
    _moveType: definition.id === 4 ? 1 : 0,
    _realX: definition.x,
    _realY: definition.y,
    x: definition.x,
    y: definition.y,
    eventId() {
      return this._eventId;
    },
    event() {
      return definition;
    },
    page() {
      return definition.pages[this._pageIndex];
    },
    list() {
      return this.page().list;
    },
    pattern() {
      return this._pattern;
    },
    direction() {
      return this._direction;
    },
    characterName() {
      return this._characterName;
    },
    characterIndex() {
      return this._characterIndex;
    },
    tileId() {
      return 0;
    },
    isTransparent() {
      return false;
    },
    opacity() {
      return this._opacity;
    },
    shiftY() {
      return 0;
    },
    jumpHeight() {
      return 0;
    },
    isErased() {
      return !!this._erased;
    },
    start() {
      game.__previewNotice = "Simulated event: " + definition.name;
    },
  }));
  const sprites = events
    .filter((event) => event._characterName)
    .map((event) => ({
      _character: event,
      bitmap: art.bitmap(art.characters),
      _frame: {
        x: (event._characterIndex % 4) * 96 + 32,
        y: Math.floor(event._characterIndex / 4) * 128,
        width: 32,
        height: 32,
      },
      anchor: { x: 0.5, y: 1 },
      visible: true,
      opacity: 255,
    }));
  const mapScene = new game.Scene_Map();
  mapScene._spriteset = { _characterSprites: sprites };
  Object.assign(game.$gameMap, {
    _events: [null, ...events],
    mapId: () => 1,
    width: () => width,
    height: () => height,
    displayName: () => "Lantern Village",
    event: (id) => events.find((event) => event._eventId === id),
    events: () => events,
    eventsXy: (x, y) =>
      events.filter(
        (event) => Math.round(event.x) === x && Math.round(event.y) === y,
      ),
    roundXWithDirection: (x, d) => x + (d === 6 ? 1 : d === 4 ? -1 : 0),
    roundYWithDirection: (y, d) => y + (d === 2 ? 1 : d === 8 ? -1 : 0),
    isEventRunning: () => false,
    isValid: (x, y) => x >= 0 && y >= 0 && x < width && y < height,
    isPassable: (x, y) => x >= 3 && x < width && y >= 0 && y < height,
    requestRefresh() {},
    tileWidth: () => 48,
    tileHeight: () => 48,
  });
  Object.assign(game.$gamePlayer, {
    x: 8,
    y: 9,
    _realX: 8,
    _realY: 9,
    _direction: 8,
    direction() {
      return this._direction;
    },
    reserveTransfer(id, x, y) {
      this.setPosition(x, y);
      game.__previewNotice = "Simulated teleport to map " + id;
    },
    setPosition(x, y) {
      this.x = x;
      this.y = y;
      this._realX = x;
      this._realY = y;
    },
    isTransferring: () => false,
    isMoving: () => false,
    isInVehicle: () => false,
    canMove: () => true,
  });
  game.$gameVariables._data[1] = 3;
  game.$gameVariables._data[2] = 80;
  game.$gameVariables._data[3] = -5;
  game.$dataSystem.variables = [
    "",
    "Quest stage",
    "Lantern brightness",
    "Reputation",
    "Notes",
  ];
  game.$dataSystem.switches = [
    "",
    "Lantern lit",
    "Village gate open",
    "Supplies collected",
  ];
  game.$gameSwitches._data[1] = true;
  game.$gameSelfSwitches = {
    _data: {},
    value(key) {
      return !!this._data[key.join(",")];
    },
    setValue(key, value) {
      this._data[key.join(",")] = !!value;
    },
  };
  game.$dataCommonEvents = [
    null,
    {
      id: 1,
      name: "Light the lantern",
      trigger: 0,
      switchId: 1,
      list: [{ code: 121, indent: 0, parameters: [1, 1, 0] }, end],
    },
  ];
  game.$gameSystem.mainFontFace = () => "Georgia, serif";
  const startMessage = game.Window_Message.prototype.startMessage;
  game.Window_Message.prototype.startMessage = function () {
    startMessage.call(this);
    this.contents.fontFace = "Georgia, serif";
  };
  game.SceneManager.isSceneChanging = () => false;
  const battleMembers = [
    new game.Game_Actor(1, "Fern Slime", 1),
    new game.Game_Actor(2, "Moss Guardian", 8),
  ];
  battleMembers.forEach((enemy, index) => {
    enemy.isActor = () => false;
    enemy.enemyId = () => index + 1;
    enemy.enemy = () => game.$dataEnemies[index + 1];
    enemy.index = () => index;
  });
  game.$gameTroop.members = () => battleMembers;
  game.$gameTroop.aliveMembers = () =>
    battleMembers.filter((enemy) => enemy.hp > 0);
  const originalPush = game.SceneManager.push;
  game.SceneManager.push = (scene) => {
    if (scene === game.Scene_Battle) setScene("battle");
    else {
      game.__previewNotice = "Simulated scene: " + scene.name;
      originalPush(scene);
    }
  };
  const demoParty = game.$gameParty,
    demoPlayer = game.$gamePlayer;
  function setScene(mode) {
    game.SceneManager._scene =
      mode === "battle"
        ? new game.Scene_Battle()
        : mode === "title"
          ? new game.Scene_Title()
          : mapScene;
    game.$gameParty = mode === "title" ? null : demoParty;
    game.$gamePlayer = mode === "title" ? null : demoPlayer;
    demoParty.inBattle = () => mode === "battle";
    game.BattleManager._phase = mode === "battle" ? "input" : null;
  }
  function tick() {
    game.Graphics.frameCount = (game.Graphics.frameCount || 0) + 6;
    sprites.forEach((sprite) => {
      const event = sprite._character;
      event._pattern = Math.floor(game.Graphics.frameCount / 24) % 3;
      sprite._frame.x = (event._characterIndex % 4) * 96 + event._pattern * 32;
      if (event._moveType) {
        event._realX = 6 + Math.sin(game.Graphics.frameCount / 100);
        event.x = event._realX;
      }
    });
  }
  function seedDialogue() {
    const queue = game.$gameMessage;
    queue.clear();
    queue._faceName = "PreviewFaces";
    queue._faceIndex = 1;
    queue.add("\\>\\i[76]\\}YRA\\{\\<");
    queue.add("The lanterns are lit. Are you ready to leave the village?");
    new game.Window_Message().startMessage();
    queue.setChoices(["I am ready. Let's go.", "Not yet."]);
    queue.onChoice(0);
    queue.clear();
    queue._speakerName = "Mira";
    queue._faceName = "PreviewFaces";
    queue._faceIndex = 3;
    queue.add(
      "Take a field tonic. The road north is long, and the forest does not always welcome travellers.",
    );
    new game.Window_Message().startMessage();
    queue.clear();
    queue.add("The evening bells echo across Lantern Village.");
    new game.Window_Message().startMessage();
    queue.clear();
  }
  setScene("map");
  return { setScene, tick, seedDialogue };
}
