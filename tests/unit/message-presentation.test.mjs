import test from "node:test";
import assert from "node:assert/strict";
import {
  decodeMessage,
  messageMetadata,
} from "../../cheat-engine/www/cheat/js/runtime/MessageText.js";
import { createMessageHistory } from "../../cheat-engine/www/cheat/js/runtime/MessageHistory.js";

test("decorative initials remain in display metadata while full actor names remain searchable", () => {
  const game = {
    $dataActors: [null, { name: "Marina", faceName: "Actor1", faceIndex: 2 }],
  };
  const decoded = decodeMessage(game, "\\>\\i[76]\\}ARINA\\{\\<");
  const metadata = messageMetadata(game, {}, decoded);
  assert.equal(metadata.speaker, "Marina");
  assert.equal(metadata.actorId, 1);
  assert.equal(metadata.speakerDisplay, "[icon 76]ARINA");
  assert.equal(
    messageMetadata(game, {}, decodeMessage(game, "Hello."), metadata)
      .speakerDisplay,
    "[icon 76]ARINA",
  );
  assert.equal(
    messageMetadata(
      game,
      { _speakerName: "Someone else" },
      decodeMessage(game, "Hello."),
      metadata,
    ).speakerDisplay,
    "",
  );
});

test("normal message rendering captures detached font, colors and outline for its entire batch", async () => {
  const { messageTextStyle } =
    await import("../../cheat-engine/www/cheat/js/runtime/MessagePresentation.js");
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
      this.contents = {
        fontFace: "GameFont",
        fontSize: 28,
        fontBold: false,
        fontItalic: false,
        textColor: "#ffffff",
        outlineColor: "rgba(0,0,0,0.8)",
        outlineWidth: 4,
      };
      this._textState = { text: "Hello.\nAgain." };
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
  game.$gameMessage.add("Hello.");
  game.$gameMessage.add("Again.");
  const window = new Window_Message();
  window.startMessage();
  const row = history.list()[0];
  assert.equal(typeof row.textStyle, "string");
  const style = messageTextStyle(row.textStyle);
  assert.equal(style.fontFamily, "GameFont");
  assert.equal(style.fontSize, "28px");
  assert.equal(style.color, "#ffffff");
  assert.equal(style.fontWeight, "400");
  assert.ok(style.textShadow.includes("rgba(0,0,0,0.8)"));
  window.contents.fontSize = 99;
  assert.equal(messageTextStyle(row.textStyle).fontSize, "28px");
  assert.equal(history.list().length, 1);
});

test("font style deserialization only accepts bounded primitive visual properties", async () => {
  const { messageTextStyle } =
    await import("../../cheat-engine/www/cheat/js/runtime/MessagePresentation.js");
  assert.deepEqual(messageTextStyle("broken"), {});
  const style = messageTextStyle(
    JSON.stringify({
      fontFace: "x; background:url(https://bad)",
      fontSize: 99999,
      textColor: "url(https://bad)",
      outlineColor: "red;display:none",
      outlineWidth: 1000000,
      fontItalic: true,
      position: "fixed",
    }),
  );
  assert.equal(style.fontFamily, undefined);
  assert.equal(style.color, undefined);
  assert.equal(style.position, undefined);
  assert.equal(style.fontSize, "40px");
  assert.equal(style.fontStyle, "italic");
  assert.equal(style.textShadow, undefined);
});
