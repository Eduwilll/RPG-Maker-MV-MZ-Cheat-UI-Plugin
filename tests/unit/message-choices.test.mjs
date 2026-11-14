import test from "node:test";
import assert from "node:assert/strict";
import { createMessageHistory } from "../../cheat-engine/www/cheat/js/runtime/MessageHistory.js";

function fixture() {
  class Game_Message {
    constructor() {
      this.clear();
    }
    clear() {
      this._texts = [];
      this._choices = [];
      this._choiceCallback = null;
    }
    add(text) {
      this._texts.push(text);
    }
    setChoices(values, defaultType, cancelType) {
      this._choices = values;
      this._cancelType = cancelType;
      return defaultType;
    }
    choices() {
      return this._choices;
    }
    onChoice(index, marker) {
      if (this._choiceCallback) this._choiceCallback(index, marker);
      return "chosen";
    }
  }
  const actor = {
    name: () => "Daan renamed",
    faceName: () => "Actor1",
    faceIndex: () => 4,
  };
  const game = {
    Game_Message,
    $gameMessage: new Game_Message(),
    $dataActors: [
      null,
      { name: "Daan", faceName: "Actor1", faceIndex: 1 },
      { name: "Marina", faceName: "Actor1", faceIndex: 2 },
    ],
    $gameActors: {
      _data: [null, actor],
      actor() {
        throw Error("must not construct an actor");
      },
    },
    $gameParty: { _actors: [1] },
    Date,
  };
  const history = createMessageHistory(game);
  history.install();
  history.install();
  return { game, history, queue: game.$gameMessage };
}

test("only the confirmed response is logged with the live protagonist, not the previous NPC", () => {
  const { game, history, queue } = fixture();
  queue._speakerName = "Marina";
  queue._faceName = "Actor1";
  queue._faceIndex = 2;
  queue.add("Hello.");
  assert.equal(
    queue.setChoices(["My hometown too.", "Where are you from?"], 1, -2),
    1,
  );
  assert.equal(history.list().length, 1);
  let callback = 0;
  queue._choiceCallback = (index, marker) => {
    callback++;
    assert.equal(index, 1);
    assert.equal(marker, 42);
    queue.clear();
    game.$gameParty._actors = [2];
  };
  assert.equal(queue.onChoice(1, 42), "chosen");
  const rows = history.list();
  assert.equal(rows.length, 2);
  assert.equal(callback, 1);
  assert.equal(rows[1].text, "Where are you from?");
  assert.equal(rows[1].speaker, "Daan renamed");
  assert.equal(rows[1].actorId, 1);
  assert.equal(rows[1].faceIndex, 4);
  assert.equal(rows[1].type, "choice");
  assert.equal(history.exportText().includes("My hometown too."), false);
  assert.ok(
    Object.values(rows[1]).every((value) =>
      ["string", "number", "boolean"].includes(typeof value),
    ),
  );
});

test("cancel, invalid indexes, unconfirmed prompts and engine clear never log options", () => {
  for (const index of [-2, -1, 2, "0", 0.5, NaN]) {
    const { queue, history } = fixture();
    queue.setChoices(["Yes", "No"]);
    queue.onChoice(index);
    assert.equal(history.list().length, 0);
  }
  const { queue, history } = fixture();
  queue.setChoices(["Old"]);
  queue.clear();
  queue.onChoice(0);
  assert.equal(history.list().length, 0);
});

test("replacement prompts and history clear cannot leave a stale or duplicate response", () => {
  const { queue, history } = fixture();
  queue.setChoices(["Old"]);
  queue.setChoices(["New"]);
  queue.onChoice(0);
  queue.onChoice(0);
  assert.equal(history.list().length, 1);
  assert.equal(history.list()[0].text, "New");
  queue.setChoices(["Pending"]);
  history.clear();
  queue.onChoice(0);
  assert.equal(history.list().length, 0);
});

test("missing protagonist is Player, not NPC; callback errors still propagate exactly once", () => {
  const { game, queue, history } = fixture();
  game.$gameParty._actors = [];
  queue._speakerName = "Marina";
  queue.setChoices(["Look around"]);
  queue.onChoice(0);
  assert.equal(history.list()[0].speaker, "Player");
  assert.equal(history.list()[0].actorId, 0);
  assert.equal(history.list()[0].faceName, "");
  const error = Error("plugin callback failed");
  let calls = 0;
  queue.setChoices(["Again"]);
  queue._choiceCallback = () => {
    calls++;
    throw error;
  };
  assert.throws(
    () => queue.onChoice(0),
    (caught) => caught === error,
  );
  assert.equal(calls, 1);
});

test("response text snapshots variables without leaking selection metadata into the next NPC message", () => {
  const { game, queue, history } = fixture();
  let value = 12;
  game.$gameVariables = { value: () => value };
  queue.setChoices(["Pay \\V[1]."]);
  value = 99;
  queue.onChoice(0);
  assert.equal(history.list()[0].text, "Pay 12.");
  queue.clear();
  queue._speakerName = "Marina";
  queue.add("Thank you.");
  assert.equal(history.list()[1].speaker, "Marina");
});

test("synchronous plugin callbacks cannot reverse dialogue order or resurrect cleared history", () => {
  const { queue, history } = fixture();
  queue.setChoices(["My response"]);
  queue._choiceCallback = () => {
    queue.clear();
    queue._speakerName = "Marina";
    queue.add("Her reply");
  };
  queue.onChoice(0);
  assert.deepEqual(
    history.list().map((row) => row.text),
    ["My response", "Her reply"],
  );
  queue.setChoices(["Before load"]);
  queue._choiceCallback = () => history.clear();
  queue.onChoice(0);
  assert.equal(history.list().length, 0);
});

test("a failing plugin callback does not leave a successful response in history", () => {
  const { queue, history } = fixture();
  queue.setChoices(["Try"]);
  queue._choiceCallback = () => {
    throw Error("failed");
  };
  assert.throws(() => queue.onChoice(0), /failed/);
  assert.equal(history.list().length, 0);
});
