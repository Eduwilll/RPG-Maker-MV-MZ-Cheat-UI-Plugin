import test from "node:test";
import assert from "node:assert/strict";

const load = () =>
  import("../../cheat-engine/www/cheat/js/runtime/MessageHistory.js");

function makeGame() {
  class Game_Message {
    constructor() {
      this.clear();
    }
    clear() {
      this._texts = [];
      this._speakerName = "";
      this._scrollMode = false;
    }
    add(text) {
      this._texts.push(text);
      return "delivered";
    }
    newPage() {
      if (this._texts.length) this._texts[this._texts.length - 1] += "\f";
      return "page";
    }
    setScroll() {
      this._scrollMode = true;
      return "scroll";
    }
    scrollMode() {
      return this._scrollMode;
    }
    speakerName() {
      return this._speakerName;
    }
    allText() {
      return this._texts.join("\n");
    }
  }
  return {
    Game_Message,
    $gameMessage: new Game_Message(),
    $gameMap: {
      mapId() {
        return 7;
      },
      displayName() {
        return "Harbor";
      },
    },
    $dataMapInfos: [null],
    Date,
  };
}

test("captures each enqueue once with detached speaker/map/timestamp primitives", async () => {
  const { createMessageHistory } = await load();
  const game = makeGame();
  const history = createMessageHistory(game);
  history.install();
  history.install();
  game.$gameMessage._speakerName = "Ada";
  assert.equal(game.$gameMessage.add("Hello"), "delivered");
  game.$gameMessage.add("Hello");
  for (let i = 0; i < 10; i++) game.$gameMessage.allText();
  const rows = history.list();
  assert.equal(rows.length, 2);
  assert.equal(rows[0].text, "Hello");
  assert.equal(rows[0].speaker, "Ada");
  assert.equal(rows[0].mapId, 7);
  assert.equal(rows[0].mapName, "Harbor");
  assert.equal(rows[0].type, "message");
  assert.ok(Number.isFinite(Date.parse(rows[0].timestamp)));
  assert.notEqual(rows[0].id, rows[1].id);
  assert.ok(
    Object.values(rows[0]).every(
      (value) =>
        value === null ||
        ["string", "number", "boolean"].includes(typeof value),
    ),
  );
  rows[0].text = "mutated UI";
  assert.equal(history.list()[0].text, "Hello");
  assert.equal(game.$gameMessage._texts[0], "Hello");
});

test("newPage updates the queued line without duplicating it; scrolling enqueues are marked", async () => {
  const { createMessageHistory } = await load();
  const game = makeGame();
  const history = createMessageHistory(game);
  history.install();
  game.$gameMessage.newPage();
  assert.equal(history.list().length, 0);
  game.$gameMessage.add("First page");
  assert.equal(game.$gameMessage.newPage(), "page");
  game.$gameMessage.add("Second page");
  assert.deepEqual(
    history.list().map((row) => row.text),
    ["First page\f", "Second page"],
  );
  game.$gameMessage.clear();
  assert.equal(game.$gameMessage.setScroll(2, true), "scroll");
  game.$gameMessage.add("Credits");
  assert.equal(history.list()[2].type, "scroll");
  assert.equal(history.list()[0].text, "First page\f");
});

test("retains the newest 1000 enqueues and searches text, speaker and map", async () => {
  const { createMessageHistory } = await load();
  const game = makeGame();
  const history = createMessageHistory(game);
  history.install();
  for (let i = 0; i < 1005; i++) game.$gameMessage.add("Line " + i);
  const rows = history.list();
  assert.equal(rows.length, 1000);
  assert.equal(rows[0].text, "Line 5");
  assert.equal(rows[999].text, "Line 1004");
  assert.equal(history.list("LINE 1004").length, 1);
  assert.equal(history.list("harbor 7").length, 1000);
  game.$gameMessage._speakerName = "Ada";
  game.$gameMessage.add("Welcome");
  assert.equal(history.list("ada welcome").length, 1);
});

test("clear resets session history without clearing the game's current queue", async () => {
  const { createMessageHistory } = await load();
  const game = makeGame();
  const history = createMessageHistory(game);
  history.install();
  game.$gameMessage.add("Before load");
  const oldId = history.list()[0].id;
  history.clear();
  assert.deepEqual(history.list(), []);
  assert.equal(history.exportText(), "");
  assert.equal(game.$gameMessage.allText(), "Before load");
  game.$gameMessage.newPage();
  assert.deepEqual(history.list(), []);
  game.$gameMessage = new game.Game_Message();
  game.$gameMessage.add("After load");
  assert.equal(history.list().length, 1);
  assert.ok(history.list()[0].id > oldId);
});

test("chains translation hooks before and after install and preserves errors and arguments", async () => {
  const { createMessageHistory } = await load();
  const game = makeGame();
  const original = game.Game_Message.prototype.add;
  game.Game_Message.prototype.add = function (text, marker) {
    assert.equal(marker, 42);
    if (text === "throw") throw new Error("engine failed");
    return original.call(this, "translated: " + text);
  };
  const history = createMessageHistory(game);
  history.install();
  const installed = game.Game_Message.prototype.add;
  game.Game_Message.prototype.add = function (text, marker) {
    return installed.call(this, text.toUpperCase(), marker);
  };
  history.install();
  assert.equal(game.$gameMessage.add("hello", 42), "delivered");
  assert.equal(history.list()[0].text, "translated: HELLO");
  game.Game_Message.prototype.add = installed;
  assert.throws(() => game.$gameMessage.add("throw", 42), /engine failed/);
  assert.equal(history.list().length, 1);
});

test("missing optional engine methods and map metadata do not interrupt message delivery", async () => {
  const { createMessageHistory } = await load();
  const game = makeGame();
  delete game.Game_Message.prototype.speakerName;
  delete game.Game_Message.prototype.scrollMode;
  delete game.$gameMap;
  const history = createMessageHistory(game);
  history.install();
  game.$gameMessage._speakerName = "MV plugin name";
  game.$gameMessage._scrollMode = true;
  game.$gameMessage.add("Text");
  assert.equal(history.list()[0].speaker, "MV plugin name");
  assert.equal(history.list()[0].mapId, 0);
  assert.equal(history.list()[0].type, "scroll");
  assert.doesNotThrow(() => createMessageHistory({}).install());
});

test("text export includes readable metadata, literal text and page boundaries", async () => {
  const { createMessageHistory } = await load();
  const game = makeGame();
  const history = createMessageHistory(game);
  history.install();
  game.$gameMessage._speakerName = "Ada";
  game.$gameMessage.add("<script>literal</script>");
  game.$gameMessage.newPage();
  const text = history.exportText();
  assert.match(text, /Harbor/);
  assert.match(text, /7/);
  assert.match(text, /Ada/);
  assert.match(text, /<script>literal<\/script>/);
  assert.equal(text.includes("\f"), false);
});

test("resolves Marina and presentation codes without attributing narration or creating actors", async () => {
  const { createMessageHistory } = await load();
  const game = makeGame();
  game.$dataActors = [
    null,
    null,
    null,
    { name: "Marina", faceName: "Actor1", faceIndex: 2 },
  ];
  game.$gameActors = {
    _data: [],
    actor() {
      throw new Error("must not create actors");
    },
  };
  game.$gameVariables = { value: (id) => (id === 4 ? 12 : 0) };
  game.$dataSystem = { currencyUnit: "Gold" };
  const history = createMessageHistory(game);
  history.install();
  const raw = "\\N[3] cannot hold \\c[2]Rifle\\c[0]! \\V[4] \\G\\.!";
  game.$gameMessage.add(raw);
  const row = history.list()[0];
  assert.equal(row.text, "Marina cannot hold Rifle! 12 Gold!");
  assert.equal(row.speaker, "");
  assert.equal(row.rawText, raw);
  assert.equal(history.list("Marina").length, 1);
  assert.equal(game.$gameMessage._texts[0], raw);
});

test("captures YEP names and portraits for the whole queue, not the next message", async () => {
  const { createMessageHistory } = await load();
  const game = makeGame();
  game.$dataActors = [null, { name: "Marina" }];
  game.$gameMessage._faceName = "Actor1";
  game.$gameMessage._faceIndex = 2;
  const history = createMessageHistory(game);
  history.install();
  game.$gameMessage.add("\\NC<\\N[1]>Hello \\C[4]there\\C[0].");
  game.$gameMessage.add("Second line.");
  let rows = history.list();
  assert.equal(rows[0].text, "Hello there.");
  assert.equal(rows[0].speaker, "Marina");
  assert.equal(rows[1].speaker, "Marina");
  assert.equal(rows[0].faceName, "Actor1");
  assert.equal(rows[0].faceIndex, 2);
  game.$gameMessage.clear();
  game.$gameMessage._faceName = "";
  game.$gameMessage._faceIndex = 0;
  game.$gameMessage.add("Narration.");
  rows = history.list();
  assert.equal(rows[2].speaker, "");
  assert.equal(rows[2].faceName, "");
  assert.equal(rows[0].faceName, "Actor1");
});

test("preserves literal escapes and unknown codes, snapshots values, and never evaluates scripts", async () => {
  const { createMessageHistory } = await load();
  const game = makeGame();
  let value = "first";
  game.$gameVariables = { value: () => value };
  const history = createMessageHistory(game);
  history.install();
  game.$gameMessage.add(
    "\\\\N[3] \\V[1] \\UNKNOWN[7] <script>literal</script>",
  );
  value = "second";
  game.$gameMessage.newPage();
  assert.equal(
    history.list()[0].text,
    "\\N[3] first \\UNKNOWN[7] <script>literal</script>\f",
  );
  game.$gameMessage.add("\\V[1]");
  assert.equal(history.list()[1].text, "second");
});

test("uses unique captured actor faces, with live renamed actors and party substitutions", async () => {
  const { createMessageHistory } = await load();
  const game = makeGame();
  game.$dataActors = [
    null,
    { name: "Marina", faceName: "Actor1", faceIndex: 2 },
  ];
  game.$gameActors = {
    _data: [
      null,
      {
        name: () => "Marina renamed",
        faceName: () => "Actor1",
        faceIndex: () => 2,
      },
    ],
  };
  game.$gameParty = { _actors: [1] };
  const history = createMessageHistory(game);
  history.install();
  game.$gameMessage._speakerName = "Marina renamed";
  game.$gameMessage.add("\\P[1] greets \\N[1].");
  assert.equal(history.list()[0].text, "Marina renamed greets Marina renamed.");
  assert.equal(history.list()[0].faceName, "Actor1");
  game.$gameMessage.clear();
  game.$gameMessage._faceName = "Actor1";
  game.$gameMessage._faceIndex = 2;
  game.$gameMessage.add("Hello.");
  assert.equal(history.list()[1].speaker, "Marina renamed");
  game.$gameMessage.clear();
  game.$dataActors.push({
    name: "Shared face",
    faceName: "Actor1",
    faceIndex: 2,
  });
  game.$gameMessage.add("Ambiguous speaker.");
  assert.equal(history.list()[2].speaker, "");
});

test("cyclic variable escapes are bounded and unsupported controls stay readable", async () => {
  const { createMessageHistory } = await load();
  const game = makeGame();
  let reads = 0;
  game.$gameVariables = {
    value: () => {
      reads++;
      return "\\V[1]";
    },
  };
  const history = createMessageHistory(game);
  history.install();
  game.$gameMessage.add("\\V[1] \\CUSTOM[42]");
  assert.ok(reads <= 4);
  assert.equal(history.list()[0].text, "\\V[1] \\CUSTOM[42]");
});
