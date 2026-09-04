// @ts-check

// ─────────────────────────────────────────────────────────────────────────────
// RPG Maker MV / MZ event command code registry
// ─────────────────────────────────────────────────────────────────────────────

/** Human-readable label for each RPG Maker event command code. */
export const COMMAND_LABELS = {
  0: "End",
  101: "Show Text",
  102: "Show Choices",
  103: "Input Number",
  104: "Select Item",
  105: "Show Scrolling Text",
  108: "Comment",
  111: "Conditional Branch",
  112: "Loop",
  113: "Break Loop",
  115: "Exit Event Processing",
  117: "Call Common Event",
  118: "Label",
  119: "Jump to Label",
  121: "Control Switches",
  122: "Control Variables",
  123: "Control Self Switch",
  124: "Control Timer",
  125: "Change Gold",
  126: "Change Items",
  127: "Change Weapons",
  128: "Change Armors",
  129: "Change Party Member",
  132: "Change Battle BGM",
  133: "Change Victory ME",
  134: "Change Save Access",
  135: "Change Menu Access",
  136: "Change Encounter",
  137: "Change Formation Access",
  138: "Change Window Color",
  139: "Change Defeat ME",
  140: "Change Vehicle BGM",
  201: "Transfer Player",
  202: "Set Vehicle Location",
  203: "Set Event Location",
  204: "Scroll Map",
  205: "Set Movement Route",
  206: "Get on/off Vehicle",
  211: "Change Transparency",
  212: "Show Animation",
  213: "Show Balloon Icon",
  214: "Erase Event",
  216: "Change Player Followers",
  217: "Gather Followers",
  218: "Fadeout Screen",
  219: "Fadein Screen",
  220: "Tint Screen",
  221: "Flash Screen",
  222: "Shake Screen",
  223: "Set Weather Effect",
  224: "Change Map Name Display",
  225: "Change Tileset",
  230: "Wait",
  231: "Show Picture",
  232: "Move Picture",
  233: "Rotate Picture",
  234: "Tint Picture",
  235: "Erase Picture",
  236: "Set Weather",
  241: "Play BGM",
  242: "Fadeout BGM",
  243: "Save BGM",
  244: "Resume BGM",
  245: "Play BGS",
  246: "Fadeout BGS",
  247: "Play ME",
  248: "Play SE",
  249: "Stop SE",
  250: "Play Movie",
  261: "Plugin Command (MV)",
  281: "Change Map Name Display",
  283: "Change Tileset",
  284: "Change Battle Back",
  285: "Change Parallax",
  286: "Get Location Info",
  301: "Battle Processing",
  302: "Shop Processing",
  303: "Name Input Processing",
  311: "Change HP",
  312: "Change MP",
  313: "Change TP",
  314: "Recover All",
  315: "Change EXP",
  316: "Change Level",
  317: "Change Parameter",
  318: "Change Skill",
  319: "Change Equipment",
  320: "Change Name",
  321: "Change Class",
  322: "Change Actor Images",
  323: "Change Vehicle Image",
  324: "Change Nickname",
  325: "Change Profile",
  326: "Change TP",
  331: "Change Enemy HP",
  332: "Change Enemy MP",
  333: "Change Enemy TP",
  334: "Change Enemy State",
  335: "Enemy Recover All",
  336: "Enemy Appear",
  337: "Enemy Transform",
  338: "Show Battle Animation",
  339: "Force Action",
  340: "Abort Battle",
  341: "Show Battle Animation (all)",
  351: "Open Menu Screen",
  352: "Open Save Screen",
  353: "Game Over",
  354: "Return to Title Screen",
  355: "Script",
  356: "Plugin Command",
  357: "Plugin Command (args)",
  // Structural codes (internal — not shown as standalone commands)
  401: "Show Text (cont.)",
  402: "When [Choice]",
  403: "When Cancel",
  404: "End Choices",
  405: "Show Scrolling Text (cont.)",
  408: "Comment (cont.)",
  411: "Else",
  412: "End Branch",
  413: "End Loop",
  505: "Movement Route Step",
};

/**
 * Codes that are continuation lines of the *previous* command.
 * These are consumed by the previous command handler in the parser,
 * and never produce standalone nodes.
 */
export const CONTINUATION_CODES = new Set([401, 405, 408, 505]);

/**
 * Codes that close a structured block.
 * The parser stops the current block on these and lets the parent handle them.
 */
export const BLOCK_END_CODES = new Set([411, 412, 413, 404, 403]);

/** Material Design icon for each command code. */
const COMMAND_ICONS = {
  101: "mdi-message-text-outline",
  102: "mdi-format-list-bulleted",
  105: "mdi-message-text",
  108: "mdi-comment-outline",
  111: "mdi-source-branch",
  112: "mdi-repeat",
  113: "mdi-debug-step-out",
  115: "mdi-exit-run",
  117: "mdi-link-variant",
  118: "mdi-tag-outline",
  119: "mdi-arrow-right-bold",
  121: "mdi-toggle-switch",
  122: "mdi-variable",
  123: "mdi-toggle-switch-outline",
  124: "mdi-timer-outline",
  125: "mdi-cash",
  126: "mdi-flask-empty-plus",
  127: "mdi-sword",
  128: "mdi-shield-plus",
  129: "mdi-account-multiple-plus",
  201: "mdi-run-fast",
  203: "mdi-map-marker",
  205: "mdi-walk",
  212: "mdi-animation",
  213: "mdi-message-outline",
  214: "mdi-eraser",
  218: "mdi-weather-night",
  219: "mdi-white-balance-sunny",
  230: "mdi-timer-sand",
  231: "mdi-image",
  241: "mdi-music",
  247: "mdi-music-note",
  248: "mdi-volume-high",
  301: "mdi-sword-cross",
  302: "mdi-shopping",
  311: "mdi-heart",
  315: "mdi-star",
  316: "mdi-arrow-up-bold",
  318: "mdi-book-open-variant",
  319: "mdi-sword-cross",
  340: "mdi-cancel",
  351: "mdi-menu",
  352: "mdi-content-save",
  353: "mdi-skull",
  354: "mdi-home",
  355: "mdi-code-tags",
  356: "mdi-puzzle",
};

const DEFAULT_ICON = "mdi-chevron-right";

/**
 * @param {number} code
 * @returns {string}
 */
export function getCommandIcon(code) {
  return COMMAND_ICONS[code] || DEFAULT_ICON;
}

/**
 * @param {number} code
 * @returns {string}
 */
export function getCommandLabel(code) {
  return COMMAND_LABELS[code] || `Command ${code}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Condition formatters
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format a Conditional Branch condition (code 111) as a human-readable string.
 * @param {any[]} params
 * @param {any} [dataSystem]
 * @returns {string}
 */
export function formatBranchCondition(params, dataSystem) {
  const type = Number(params[0]);
  const sw = (id) =>
    (dataSystem && dataSystem.switches && dataSystem.switches[id]) ||
    `Switch ${id}`;
  const vr = (id) =>
    (dataSystem && dataSystem.variables && dataSystem.variables[id]) ||
    `Variable ${id}`;

  try {
    switch (type) {
      case 0: {
        const state = params[2] === 0 ? "ON" : "OFF";
        return `Switch [${params[1]}: ${sw(params[1])}] = ${state}`;
      }
      case 1: {
        const ops = ["==", ">=", "<=", ">", "<", "!="];
        const op = ops[params[2]] || "==";
        const rhs =
          params[3] === 0 ? params[4] : `Var[${params[4]}: ${vr(params[4])}]`;
        return `Variable [${params[1]}: ${vr(params[1])}] ${op} ${rhs}`;
      }
      case 2: {
        const state = params[2] === 0 ? "ON" : "OFF";
        return `Self Switch [${params[1]}] = ${state}`;
      }
      case 3:
        return `Timer ${params[2] === 0 ? ">=" : "<="} ${params[1]} sec`;
      case 4: {
        const conds = [
          "in party",
          "name ==",
          "class ==",
          "has skill",
          "has weapon",
          "has armor",
          "has state",
        ];
        return `Actor [${params[1]}]: ${conds[params[2]] || "condition " + params[2]}`;
      }
      case 5:
        return `Enemy [${params[1]}]: ${params[2] === 0 ? "appeared" : "has state " + params[3]}`;
      case 6:
        return `Character [${params[1]}] faces direction ${params[2]}`;
      case 7: {
        const ops = [">=", "<=", "<"];
        return `Gold ${ops[params[2]] || ">="} ${params[1]}`;
      }
      case 8:
        return `Item [${params[1]}] in inventory`;
      case 9:
        return `Weapon [${params[1]}] equipped`;
      case 10:
        return `Armor [${params[1]}] equipped`;
      case 11:
        return `Button [${params[1]}] is pressed`;
      case 12:
        return `Script: ${String(params[1] || "").substring(0, 50)}`;
      case 13:
        return `Vehicle [${params[1]}]: driving`;
      default:
        return `Condition type ${type}`;
    }
  } catch (_) {
    return `Condition type ${type}`;
  }
}

/**
 * Format page conditions into a list of human-readable strings.
 * @param {any} conditions
 * @param {any} [dataSystem]
 * @returns {string[]}
 */
export function formatPageConditions(conditions, dataSystem) {
  if (!conditions) return [];
  const lines = [];
  const sw = (id) =>
    (dataSystem && dataSystem.switches && dataSystem.switches[id]) ||
    `Switch ${id}`;
  const vr = (id) =>
    (dataSystem && dataSystem.variables && dataSystem.variables[id]) ||
    `Variable ${id}`;

  if (conditions.switch1Valid) {
    lines.push(
      `Switch [${conditions.switch1Id}: ${sw(conditions.switch1Id)}] = ON`,
    );
  }
  if (conditions.switch2Valid) {
    lines.push(
      `Switch [${conditions.switch2Id}: ${sw(conditions.switch2Id)}] = ON`,
    );
  }
  if (conditions.variableValid) {
    lines.push(
      `Variable [${conditions.variableId}: ${vr(conditions.variableId)}] >= ${conditions.variableValue}`,
    );
  }
  if (conditions.selfSwitchValid) {
    lines.push(`Self Switch [${conditions.selfSwitchCh}] = ON`);
  }
  if (conditions.itemValid) {
    lines.push(`Item [${conditions.itemId}] in inventory`);
  }
  if (conditions.actorValid) {
    lines.push(`Actor [${conditions.actorId}] in party`);
  }

  return lines;
}

/**
 * Format a command into a concise human-readable label.
 * @param {{ code: number, parameters: any[], textLines?: string[] }} cmd
 * @param {{ getCommonEvent?: (id: number) => any, getBattleTroop?: (id: number) => any } | null} db
 * @param {any} [dataSystem]
 * @returns {string}
 */
export function formatCommandLabel(cmd, db, dataSystem) {
  const p = cmd.parameters || [];
  const sw = (id) =>
    (dataSystem && dataSystem.switches && dataSystem.switches[id]) ||
    `Switch ${id}`;
  const vr = (id) =>
    (dataSystem && dataSystem.variables && dataSystem.variables[id]) ||
    `Variable ${id}`;

  try {
    switch (cmd.code) {
      case 101: {
        const speaker = p[4] || "";
        const lines = cmd.textLines || [];
        const preview = lines.join(" ").substring(0, 60);
        return speaker
          ? `Show Text [${speaker}]: "${preview}${preview.length >= 60 ? "…" : ""}"`
          : `Show Text: "${preview}${preview.length >= 60 ? "…" : ""}"`;
      }
      case 102:
        return `Show Choices: [${(p[0] || []).join(" / ")}]`;
      case 105:
        return "Show Scrolling Text";
      case 108:
        return `Comment: ${String(p[0] || "").substring(0, 60)}`;
      case 113:
        return "Break Loop";
      case 115:
        return "Exit Event Processing";
      case 117: {
        const ceId = p[0];
        const ce = db && db.getCommonEvent ? db.getCommonEvent(ceId) : null;
        return ce
          ? `Call Common Event [${ceId}: ${ce.name}]`
          : `Call Common Event [${ceId}]`;
      }
      case 118:
        return `Label: "${p[0]}"`;
      case 119:
        return `Jump to Label: "${p[0]}"`;
      case 121: {
        const range =
          p[0] === p[1] ? `[${p[0]}: ${sw(p[0])}]` : `[${p[0]}..${p[1]}]`;
        const op = p[2] === 0 ? "ON" : p[2] === 1 ? "OFF" : "Toggle";
        return `Control Switches ${range} = ${op}`;
      }
      case 122: {
        const range =
          p[0] === p[1] ? `[${p[0]}: ${vr(p[0])}]` : `[${p[0]}..${p[1]}]`;
        return `Control Variables ${range}`;
      }
      case 123:
        return `Control Self Switch [${p[0]}] = ${p[1] === 0 ? "ON" : "OFF"}`;
      case 124:
        return `Control Timer: ${p[0] === 0 ? "Start " + p[1] + "s" : "Stop"}`;
      case 125: {
        const ops = ["+=", "-="];
        return `Change Gold ${ops[p[0]] || "+="} ${p[1] === 0 ? p[2] : "Var[" + p[2] + "]"}`;
      }
      case 126:
        return `Change Items [${p[0]}] ${p[1] === 0 ? "+=" : "-="} ${p[3]}`;
      case 127:
        return `Change Weapons [${p[0]}] ${p[1] === 0 ? "+=" : "-="}`;
      case 128:
        return `Change Armors [${p[0]}] ${p[1] === 0 ? "+=" : "-="}`;
      case 201:
        return `Transfer Player → Map ${p[1]} (${p[2]}, ${p[3]})`;
      case 203:
        return `Set Event Location`;
      case 205:
        return `Set Movement Route`;
      case 212:
        return `Show Animation`;
      case 213:
        return `Show Balloon`;
      case 214:
        return "Erase Event";
      case 218:
        return "Fadeout Screen";
      case 219:
        return "Fadein Screen";
      case 230:
        return `Wait ${p[0]} frame${p[0] === 1 ? "" : "s"}`;
      case 231:
        return `Show Picture [${p[0]}]`;
      case 241:
        return `Play BGM: ${(p[0] && p[0].name) || ""}`;
      case 245:
        return `Play BGS: ${(p[0] && p[0].name) || ""}`;
      case 247:
        return `Play ME: ${(p[0] && p[0].name) || ""}`;
      case 248:
        return `Play SE: ${(p[0] && p[0].name) || ""}`;
      case 301: {
        if (p[0] === 0) {
          const troopId = p[1];
          const troop =
            db && db.getBattleTroop ? db.getBattleTroop(troopId) : null;
          return troop
            ? `Battle Processing → Troop [${troopId}: ${troop.name}]`
            : `Battle Processing → Troop [${troopId}]`;
        }
        return "Battle Processing (Random Encounter)";
      }
      case 302:
        return "Shop Processing";
      case 311:
        return "Change HP";
      case 312:
        return "Change MP";
      case 313:
        return "Change TP";
      case 314:
        return "Recover All";
      case 315:
        return "Change EXP";
      case 316:
        return "Change Level";
      case 317:
        return "Change Parameter";
      case 318:
        return "Change Skill";
      case 319:
        return "Change Equipment";
      case 320:
        return `Change Name [Actor ${p[0]}]`;
      case 321:
        return `Change Class [Actor ${p[0]}]`;
      case 331:
        return "Change Enemy HP";
      case 332:
        return "Change Enemy MP";
      case 334:
        return "Change Enemy State";
      case 337:
        return "Enemy Transform";
      case 338:
        return "Show Battle Animation";
      case 339:
        return "Force Action";
      case 340:
        return "Abort Battle";
      case 351:
        return "Open Menu Screen";
      case 352:
        return "Open Save Screen";
      case 353:
        return "Game Over";
      case 354:
        return "Return to Title Screen";
      case 355:
        return `Script: ${String(p[0] || "").substring(0, 60)}`;
      case 356:
        return `Plugin Command: ${String(p[0] || "").substring(0, 60)}`;
      default:
        return getCommandLabel(cmd.code);
    }
  } catch (_) {
    return getCommandLabel(cmd.code);
  }
}
