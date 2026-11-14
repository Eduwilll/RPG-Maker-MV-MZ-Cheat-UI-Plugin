import { speakerPicture } from "./MessagePictures.js";
function actorRecord(game, id) {
  const live = game.$gameActors && game.$gameActors._data;
  return (live && live[id]) || (game.$dataActors && game.$dataActors[id]);
}

function actorName(game, id) {
  const actor = actorRecord(game, id);
  return actor
    ? String(
        typeof actor.name === "function"
          ? actor.name()
          : actor.name || actor._name || "",
      )
    : "";
}

function partyId(game, index) {
  const ids = game.$gameParty && game.$gameParty._actors;
  return ids ? ids[index - 1] : 0;
}

function faceOf(actor) {
  if (!actor) return { faceName: "", faceIndex: 0 };
  return {
    faceName: String(
      typeof actor.faceName === "function"
        ? actor.faceName()
        : actor.faceName || actor._faceName || "",
    ),
    faceIndex:
      Number(
        typeof actor.faceIndex === "function"
          ? actor.faceIndex()
          : actor.faceIndex || actor._faceIndex,
      ) || 0,
  };
}

export function playerMessageMetadata(game) {
  const id = Number(partyId(game, 1)) || 0;
  const actor = actorRecord(game, id);
  return Object.assign(
    {
      speaker: actor ? actorName(game, id) || "Player" : "Player",
      actorId: actor ? id : 0,
      speakerIcon: 0,
      pictureName: "",
    },
    faceOf(actor),
  );
}

/** Safe, bounded text-only conversion. Never invoke plugin escape evaluators. */
export function decodeMessage(game, raw, rendered) {
  const esc = "\x1b";
  const literal = "\ue000";
  const prepare = (value) =>
    String(value).replace(/\\\\/g, literal).replace(/\\/g, esc);
  // Window_Message already converted escapes; its remaining backslashes are literal.
  let text = rendered ? String(raw).replace(/\\/g, literal) : prepare(raw);
  if (!rendered) {
    for (let i = 0; i < 4; i++) {
      const next = text.replace(/\x1bV\[(\d+)\]/gi, (match, id) => {
        const vars = game.$gameVariables;
        return vars && typeof vars.value === "function"
          ? prepare(vars.value(Number(id)))
          : match;
      });
      if (next === text) break;
      text = next.slice(0, 100000);
    }
    text = text.replace(
      /\x1bN\[(\d+)\]/gi,
      (match, id) => actorName(game, Number(id)) || match,
    );
    text = text.replace(
      /\x1bP\[(\d+)\]/gi,
      (match, index) => actorName(game, partyId(game, Number(index))) || match,
    );
    text = text.replace(/\x1bG\b/gi, () =>
      game.$dataSystem ? String(game.$dataSystem.currencyUnit || "") : "G",
    );
  }
  let speaker = "",
    speakerDisplay = "",
    speakerIcon = 0,
    isHeading = false;
  // Termina uses an IconSet initial followed by the remaining name in a styled header.
  const heading = text.match(
    /^[ \t]*\x1b>\x1bI\[(\d+)\]\x1b\}([^\r\n]*?)\x1b\{\x1b<[ \t]*(?:\r?\n|$)/i,
  );
  if (heading) {
    isHeading = true;
    speakerIcon = Number(heading[1]);
    speaker = heading[2].trim();
    speakerDisplay = "[icon " + speakerIcon + "]" + speaker;
    text = text.slice(heading[0].length);
    const matches = [];
    (game.$dataActors || []).forEach((actor, id) => {
      if (!actor) return;
      const name = actorName(game, id).trim();
      if (
        speaker.length >= 3 &&
        name.slice(1).toLocaleUpperCase() === speaker.toLocaleUpperCase()
      )
        matches.push(name);
    });
    if (matches.length === 1) {
      speaker = matches[0];
      speakerIcon = 0;
    }
  }
  text = text.replace(
    /\x1bN(?:[DT])?(?:[1-5CR])?<([^>]*)>/gi,
    (match, name) => {
      speaker = name;
      return "";
    },
  );
  let face = null;
  text = text.replace(/\x1b([AP])F\[(\d+)\]/gi, (match, kind, id) => {
    face = faceOf(
      actorRecord(
        game,
        kind.toUpperCase() === "P" ? partyId(game, Number(id)) : Number(id),
      ),
    );
    return "";
  });
  const clean = (value) =>
    value
      .replace(/\x1b(?:C|FS|FN|OC|OW|PX|PY|S|W)\[[^\]]*\]/gi, "")
      .replace(/\x1bI\[(\d+)\]/gi, "[icon $1]")
      .replace(/\x1b[{}$.|!><^]/g, "")
      .replace(/<\/?(?:WordWrap|br)>/gi, (tag) => (/br/i.test(tag) ? "\n" : ""))
      .replace(/\x1b/g, "\\")
      .replace(/\ue000/g, "\\");
  return {
    text: clean(text),
    speaker: clean(speaker),
    speakerDisplay: clean(speakerDisplay),
    speakerIcon,
    isHeading,
    face,
  };
}

export function messageMetadata(game, queue, decoded, previous, displayedName) {
  const previousName =
    typeof previous === "string"
      ? previous
      : (previous && previous.speaker) || "";
  const explicit =
    displayedName !== undefined
      ? displayedName
      : typeof queue.speakerName === "function"
        ? queue.speakerName()
        : queue._speakerName;
  const name =
    typeof queue.faceName === "function" ? queue.faceName() : queue._faceName;
  const index =
    typeof queue.faceIndex === "function"
      ? queue.faceIndex()
      : queue._faceIndex;
  let face = decoded.face || {
    faceName: String(name || ""),
    faceIndex: Math.max(0, Math.min(7, Number(index) || 0)),
  };
  const explicitDecoded =
    explicit &&
    (typeof explicit === "object" ? explicit : decodeMessage(game, explicit));
  let speaker = explicitDecoded
    ? explicitDecoded.speaker || explicitDecoded.text
    : decoded.speaker || previousName;
  const speakerIcon = explicitDecoded
    ? explicitDecoded.speakerIcon || 0
    : decoded.speaker
      ? decoded.speakerIcon || 0
      : (previous && previous.speakerIcon) || 0;
  const actorMatches = [];
  (game.$dataActors || []).forEach((actor, id) => {
    if (!actor) return;
    const candidate = faceOf(actorRecord(game, id));
    if (
      speaker
        ? !speakerIcon &&
          actorName(game, id).trim().toLocaleUpperCase() ===
            speaker.trim().toLocaleUpperCase()
        : face.faceName &&
          candidate.faceName === face.faceName &&
          candidate.faceIndex === face.faceIndex
    )
      actorMatches.push(id);
  });
  if (!speaker && face.faceName) {
    const matches = [];
    (game.$dataActors || []).forEach((actor, id) => {
      if (!actor) return;
      const candidate = faceOf(actorRecord(game, id));
      if (
        candidate.faceName === face.faceName &&
        candidate.faceIndex === face.faceIndex
      )
        matches.push(actorName(game, id));
    });
    if (matches.length === 1) speaker = matches[0];
  }
  const actorId = actorMatches.length === 1 ? actorMatches[0] : 0;
  if (!face.faceName && actorId) face = faceOf(actorRecord(game, actorId));
  return {
    speaker: String(speaker),
    speakerDisplay:
      (explicitDecoded && explicitDecoded.speakerDisplay) ||
      (decoded.speaker === speaker && decoded.speakerDisplay) ||
      (previous && previous.speaker === speaker && previous.speakerDisplay) ||
      "",
    faceName: face.faceName,
    faceIndex: face.faceIndex,
    actorId,
    speakerIcon,
    pictureName: !face.faceName ? speakerPicture(game, speaker) : "",
  };
}
