import test from "node:test";
import assert from "node:assert/strict";

test("renderer capture preserves literal backslashes instead of inventing a speaker", async () => {
  const { createMessageHistory } =
    await import("../../cheat-engine/www/cheat/js/runtime/MessageHistory.js");
  class Game_Message {
    constructor() {
      this._texts = [];
    }
    add(text) {
      this._texts.push(text);
    }
  }
  class Window_Message {
    startMessage() {
      this._textState = { text: "\\N<Marina> is literal text." };
    }
  }
  const game = {
    Game_Message,
    Window_Message,
    $gameMessage: new Game_Message(),
    $dataActors: [null, { name: "Marina", faceName: "Actor1", faceIndex: 2 }],
    Date,
  };
  const history = createMessageHistory(game);
  history.install();
  game.$gameMessage.add("\\\\N<Marina> is literal text.");
  new Window_Message().startMessage();
  const row = history.list()[0];
  assert.equal(row.text, "\\N<Marina> is literal text.");
  assert.equal(row.speaker, "");
  assert.equal(row.actorId, 0);
});

test("styled headings retain their resolved name or unknown icon in explicit speaker fields and nameboxes", async () => {
  const { createMessageHistory } =
    await import("../../cheat-engine/www/cheat/js/runtime/MessageHistory.js");
  const { decodeMessage, messageMetadata } =
    await import("../../cheat-engine/www/cheat/js/runtime/MessageText.js");
  const heading = "\\>\\i[76]\\}ARINA\\{\\<";
  class Game_Message {
    constructor() {
      this._texts = [];
    }
    add(text) {
      this._texts.push(text);
    }
  }
  class Window_Message {
    startMessage() {
      this._textState = { text: "Hello." };
      this._nameBoxWindow = { _name: heading };
    }
  }
  const game = {
    Game_Message,
    Window_Message,
    $gameMessage: new Game_Message(),
    $dataActors: [null, { name: "Marina", faceName: "Actor1", faceIndex: 2 }],
    Date,
  };
  const metadata = messageMetadata(
    game,
    { _speakerName: heading },
    decodeMessage(game, "Hello."),
  );
  assert.equal(metadata.speaker, "Marina");
  assert.equal(metadata.actorId, 1);
  assert.equal(metadata.faceName, "Actor1");
  const unknown = messageMetadata(
    game,
    { _speakerName: "\\>\\i[70]\\}IRL WITH PIGTAILS\\{\\<" },
    decodeMessage(game, "Hello."),
  );
  assert.equal(unknown.speaker, "IRL WITH PIGTAILS");
  assert.equal(unknown.speakerIcon, 70);
  assert.equal(unknown.actorId, 0);
  const history = createMessageHistory(game);
  history.install();
  game.$gameMessage.add("Hello.");
  new Window_Message().startMessage();
  assert.equal(history.list()[0].speaker, "Marina");
  assert.equal(history.list()[0].actorId, 1);
});

test("Termina's actual icon-letter name headings produce Marina and her face, not a narration fragment", async () => {
  const { createMessageHistory } =
    await import("../../cheat-engine/www/cheat/js/runtime/MessageHistory.js");
  class Game_Message {
    constructor() {
      this._texts = [];
      this._faceName = "";
      this._faceIndex = 0;
    }
    add(text) {
      this._texts.push(text);
    }
  }
  const game = {
    Game_Message,
    $gameMessage: new Game_Message(),
    $dataActors: [
      null,
      null,
      null,
      { name: "Marina", faceName: "Actor1", faceIndex: 2 },
    ],
    $gameActors: {
      _data: [],
      actor() {
        throw Error("must not instantiate actors");
      },
    },
    Date,
  };
  const history = createMessageHistory(game);
  history.install();
  game.$gameMessage.add("\\>\\i[76]\\}ARINA\\{\\<");
  game.$gameMessage.add('"Hello."');
  const rows = history.list();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].speaker, "Marina");
  assert.equal(rows[0].actorId, 3);
  assert.equal(rows[0].faceName, "Actor1");
  assert.equal(rows[0].faceIndex, 2);
  assert.equal(rows[0].text, '"Hello."');
  game.$gameMessage._texts = [];
  game.$gameMessage.add("Marina is not in the party.");
  assert.equal(history.list()[1].speaker, "");
});

test("KC virtual face proxies use the game's generated bitmap, not a missing physical file", async () => {
  const { createGameAssets } =
    await import("../../cheat-engine/www/cheat/js/runtime/GameAssets.js");
  let disk = 0,
    generated = 0;
  const draws = [];
  const bitmap = { isReady: () => true, canvas: { width: 800, height: 600 } };
  const kc = {
    faceLayers: { VirtualFace: [{ filename: "layer", index: 0 }] },
    FACE_PREFIX: "FACE_",
    cache: new Map([["FACE_VirtualFace", { bitmap }]]),
  };
  const assets = createGameAssets(
    {
      KCDev: { CompositeBitmaps: kc },
      ImageManager: {
        faceWidth: 144,
        faceHeight: 144,
        loadFace() {
          generated++;
          return bitmap;
        },
      },
    },
    () => {
      disk++;
      return Promise.reject(Error("no proxy file"));
    },
  );
  const canvas = {
    width: 56,
    height: 56,
    getContext: () => ({
      clearRect() {},
      drawImage(...args) {
        draws.push(args);
      },
    }),
  };
  assert.equal(
    await assets.paint(canvas, { type: "face", name: "VirtualFace", index: 5 }),
    true,
  );
  assert.equal(disk, 0);
  assert.equal(generated, 0);
  assert.equal(draws[0][1], 200);
  assert.equal(draws[0][2], 300);
  assert.equal(draws[0][3], 200);
  assert.equal(draws[0][4], 300);
});

test("uncached KC faces compose private layers, tolerate missing layers, and never request proxy files", async () => {
  const { createGameAssets } =
    await import("../../cheat-engine/www/cheat/js/runtime/GameAssets.js");
  const requested = [],
    layers = [],
    painted = [];
  const game = {
    ImageManager: { faceWidth: 144, faceHeight: 144 },
    document: {
      createElement: () => ({
        width: 0,
        height: 0,
        getContext: () => ({ drawImage: (...args) => layers.push(args) }),
      }),
    },
    KCDev: {
      CompositeBitmaps: {
        faceLayers: {
          Virtual: [
            { filename: "Base", index: -1 },
            { filename: "Missing", index: 0 },
            { filename: "Eyes", index: 2 },
          ],
        },
        FACE_PREFIX: "FACE_",
        cache: new Map(),
      },
    },
  };
  const assets = createGameAssets(game, (unused, asset) => {
    requested.push(asset.name);
    if (asset.name === "Missing") throw Error("Missing optional layer");
    return { canvas: { width: 576, height: 288 }, isReady: () => true };
  });
  const canvas = {
    width: 56,
    height: 56,
    getContext: () => ({
      clearRect() {},
      drawImage: (...args) => painted.push(args),
    }),
  };
  assert.equal(
    await assets.paint(canvas, { type: "face", name: "Virtual", index: 0 }),
    true,
  );
  assert.deepEqual(requested.sort(), ["Base", "Eyes", "Missing"]);
  assert.equal(layers.length, 9);
  assert.equal(painted.length, 1);
  assert.equal(game.KCDev.CompositeBitmaps.cache.size, 0);
});

test("cyclic KC layers fail locally without loading virtual proxy files", async () => {
  const { createGameAssets } =
    await import("../../cheat-engine/www/cheat/js/runtime/GameAssets.js");
  let disk = 0;
  const game = {
    ImageManager: {},
    document: {
      createElement: () => ({ getContext: () => ({ drawImage() {} }) }),
    },
    KCDev: {
      CompositeBitmaps: {
        faceLayers: {
          A: [{ filename: "B", index: 0 }],
          B: [{ filename: "A", index: 0 }],
        },
        cache: new Map(),
      },
    },
  };
  const assets = createGameAssets(game, () => {
    disk++;
    throw Error("must not load proxy");
  });
  assert.equal(
    await assets.paint({}, { type: "face", name: "A", index: 0 }),
    false,
  );
  assert.equal(disk, 0);
});

test("message history observes normal plugin-rendered text once and keeps choices separate", async () => {
  const { createMessageHistory } =
    await import("../../cheat-engine/www/cheat/js/runtime/MessageHistory.js");
  let starts = 0;
  class Game_Message {
    constructor() {
      this._texts = [];
    }
    add(text) {
      this._texts.push(text);
    }
    setChoices(values) {
      this._choices = values;
    }
    choices() {
      return this._choices;
    }
    onChoice() {}
  }
  class Window_Message {
    startMessage() {
      starts++;
      this._textState = { text: "Localized dialogue.\nSecond line." };
      this._nameBoxWindow = { _name: "Sam" };
      return "started";
    }
  }
  const game = {
    Game_Message,
    Window_Message,
    $gameMessage: new Game_Message(),
    Date,
  };
  const history = createMessageHistory(game);
  history.install();
  history.install();
  game.$gameMessage.add("\\CUSTOM[1]");
  game.$gameMessage.add("Second line.");
  game.$gameMessage.setChoices(["Yes", "No"]);
  assert.equal(new Window_Message().startMessage(), "started");
  game.$gameMessage.onChoice(1);
  const rows = history.list();
  assert.equal(starts, 1);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].text, "Localized dialogue.\nSecond line.");
  assert.equal(rows[0].speaker, "Sam");
  assert.equal(rows[1].type, "choice");
  assert.equal(rows[1].text, "No");
  assert.equal(rows[1].speaker, "Player");
});

test("Elderfield NPC portraits match a visible authored speaker picture and do not borrow unrelated pictures", async () => {
  const { messageMetadata, decodeMessage } =
    await import("../../cheat-engine/www/cheat/js/runtime/MessageText.js");
  const pics = [
    null,
    { _name: "Portraits/Sam", _opacity: 255 },
    { _name: "Portraits/Another NPC", _opacity: 255 },
  ];
  const game = {
    $gameScreen: { picture: (i) => pics[i], maxPictures: () => 2 },
  };
  const row = messageMetadata(
    game,
    { _speakerName: "Sam" },
    decodeMessage(game, "Hello."),
  );
  assert.equal(row.pictureName, "Portraits/Sam");
  assert.equal(row.actorId, 0);
  pics[1]._opacity = 0;
  assert.equal(
    messageMetadata(
      game,
      { _speakerName: "Sam" },
      decodeMessage(game, "Hello."),
    ).pictureName,
    "",
  );
});
