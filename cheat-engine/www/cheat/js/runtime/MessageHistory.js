import { decodeMessage, messageMetadata } from "./MessageText.js";
import { createMessageChoices } from "./MessageChoices.js";
import { captureMessageStyle } from "./MessagePresentation.js";

/** Capture queue delivery once, independently of which cheat view is open. */
export function createMessageHistory(game) {
  const entries = [];
  let nextId = 1;
  let installed = false;
  let rendererInstalled = false;
  let lastQueue = null;
  let lastId = null;
  let session = 0;
  const speakers = new WeakMap();
  const batches = new WeakMap();
  const choiceCapture = createMessageChoices(game, (queue, selected) => {
    const capturedSession = session;
    const row = append(queue, selected.raw, "choice", selected);
    // Reserve order and metadata before the callback; commit only if it succeeds.
    return () => {
      if (row && capturedSession === session) insert(row);
    };
  });
  function insert(row) {
    const index = entries.findIndex((entry) => entry.id > row.id);
    if (index < 0) entries.push(row);
    else entries.splice(index, 0, row);
    if (entries.length > 1000) entries.splice(0, entries.length - 1000);
  }
  function append(queue, text, type, selected) {
    let mapId = 0;
    let mapName = "";
    let decoded = { text: String(text), speaker: "", face: null };
    let metadata = { speaker: "", faceName: "", faceIndex: 0 };
    try {
      mapId = game.$gameMap && game.$gameMap.mapId ? game.$gameMap.mapId() : 0;
      mapName =
        game.$gameMap && game.$gameMap.displayName
          ? game.$gameMap.displayName()
          : "";
      if (!mapName)
        mapName =
          game.$dataMapInfos && game.$dataMapInfos[mapId]
            ? game.$dataMapInfos[mapId].name
            : "";
      decoded = selected ? selected.decoded : decodeMessage(game, text);
      metadata = selected
        ? selected.metadata
        : messageMetadata(game, queue, decoded, speakers.get(queue));
      if (!selected) speakers.set(queue, metadata);
    } catch (error) {
      /* Metadata must never interrupt message delivery. */
    }
    if (decoded.isHeading && !decoded.text.trim()) return;
    const row = {
      id: nextId++,
      text: decoded.text,
      rawText: String(text),
      type: type || "message",
      speaker: metadata.speaker,
      speakerDisplay: metadata.speakerDisplay || "",
      textStyle: (selected && selected.textStyle) || "",
      faceName: metadata.faceName,
      faceIndex: metadata.faceIndex,
      actorId: metadata.actorId || 0,
      speakerIcon: metadata.speakerIcon || 0,
      pictureName: metadata.pictureName || "",
      mapId: Number(mapId) || 0,
      mapName: String(mapName || ""),
      timestamp: new (game.Date || Date)().toISOString(),
    };
    if (selected) return row;
    insert(row);
    if (!batches.has(queue)) batches.set(queue, []);
    batches.get(queue).push(row);
    lastQueue = queue;
    lastId = row.id;
  }
  function install() {
    if (installed || !game.Game_Message) return;
    installed = true;
    const proto = game.Game_Message.prototype;
    const clearQueue = proto.clear;
    if (typeof clearQueue === "function")
      proto.clear = function () {
        const result = clearQueue.apply(this, arguments);
        speakers.delete(this);
        batches.delete(this);
        choiceCapture.clear(this);
        if (lastQueue === this) {
          lastQueue = null;
          lastId = null;
        }
        return result;
      };
    const add = proto.add;
    if (typeof add === "function")
      proto.add = function (text) {
        installRenderer();
        const before = this._texts ? this._texts.length : 0;
        const result = add.apply(this, arguments);
        if (before === 0) {
          speakers.delete(this);
          batches.delete(this);
          lastQueue = null;
          lastId = null;
        }
        if (!game.$gameMessage || this === game.$gameMessage) {
          const delivered = this._texts ? this._texts.slice(before) : [text];
          delivered.forEach((line) =>
            append(
              this,
              line,
              (this.scrollMode ? this.scrollMode() : this._scrollMode)
                ? "scroll"
                : "message",
            ),
          );
        }
        return result;
      };
    const newPage = proto.newPage;
    if (typeof newPage === "function")
      proto.newPage = function () {
        const result = newPage.apply(this, arguments);
        const row = entries.length ? entries[entries.length - 1] : null;
        if (
          lastQueue === this &&
          row &&
          row.id === lastId &&
          this._texts &&
          this._texts.length
        ) {
          const last = String(this._texts[this._texts.length - 1]);
          const joined = this._texts.join("\n");
          const raw = joined.indexOf(row.rawText) === 0 ? joined : last;
          // newPage appends a separator; do not re-resolve historical variables.
          if (raw.indexOf(row.rawText) === 0)
            row.text += raw.slice(row.rawText.length);
          row.rawText = raw;
        }
        return result;
      };
    choiceCapture.install(proto);
    installRenderer();
  }
  function installRenderer() {
    if (rendererInstalled) return;
    const windowProto = game.Window_Message && game.Window_Message.prototype;
    const start = windowProto && windowProto.startMessage;
    if (typeof start === "function") {
      rendererInstalled = true;
      windowProto.startMessage = function () {
        const result = start.apply(this, arguments);
        captureDisplayed(this);
        return result;
      };
    }
  }
  function captureDisplayed(messageWindow) {
    const queue = game.$gameMessage;
    const batch = queue && batches.get(queue);
    const state = messageWindow && messageWindow._textState;
    if (!batch || !batch.length || !state || typeof state.text !== "string")
      return;
    try {
      const decoded = decodeMessage(game, state.text, true);
      const metadata = messageMetadata(
        game,
        queue,
        decoded,
        speakers.get(queue),
      );
      const nameWindow =
        messageWindow._nameBoxWindow || messageWindow._nameWindow;
      const shownName =
        nameWindow && (nameWindow._name || nameWindow._lastNameText);
      const nameVisible =
        !nameWindow ||
        typeof nameWindow.isOpen !== "function" ||
        nameWindow.isOpen();
      if (
        !decoded.isHeading &&
        nameVisible &&
        typeof shownName === "string" &&
        shownName.trim()
      ) {
        Object.assign(
          metadata,
          messageMetadata(
            game,
            queue,
            decoded,
            metadata,
            decodeMessage(game, shownName),
          ),
        );
      }
      const first = batch[0];
      if (entries.indexOf(first) < 0) return;
      first.text = decoded.text;
      first.rawText = (queue._texts || []).join("\n");
      first.textStyle = captureMessageStyle(messageWindow);
      Object.assign(first, metadata);
      speakers.set(queue, metadata);
      for (let i = entries.length - 1; i >= 0; i--)
        if (entries[i] !== first && batch.indexOf(entries[i]) >= 0)
          entries.splice(i, 1);
      batches.set(queue, [first]);
      lastQueue = queue;
      lastId = first.id;
    } catch (error) {
      /* Observe the normal rendering pipeline; never rerun plugin evaluators. */
    }
  }
  function list(query) {
    const words = String(query || "")
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    return entries
      .filter((row) => {
        const text = [row.text, row.speaker, row.mapName, row.mapId]
          .join(" ")
          .toLowerCase();
        return words.every((word) => text.includes(word));
      })
      .map((row) => Object.assign({}, row));
  }
  return {
    install,
    list,
    clear() {
      session++;
      entries.length = 0;
      lastQueue = null;
      lastId = null;
      if (game.$gameMessage) speakers.delete(game.$gameMessage);
      if (game.$gameMessage) batches.delete(game.$gameMessage);
      choiceCapture.clear(game.$gameMessage);
    },
    exportText() {
      return entries
        .map(
          (row) =>
            "[" +
            row.timestamp +
            "] " +
            row.mapName +
            " (#" +
            row.mapId +
            ")" +
            (row.speaker
              ? " - " +
                (row.speakerIcon ? "[icon " + row.speakerIcon + "]" : "") +
                row.speaker
              : "") +
            "\n" +
            (row.type === "choice" ? "[Chosen response] " : "") +
            row.text.replace(/\f/g, "\n--- page ---\n"),
        )
        .join("\n\n");
    },
  };
}
