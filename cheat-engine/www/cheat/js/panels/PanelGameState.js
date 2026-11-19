// @ts-check

/**
 * @param {number} actorId
 * @returns {Game_Actor | null}
 */
export function findPartyActorById(actorId) {
  const actor = $gameParty
    .members()
    .find((member) => /** @type {any} */ (member)._actorId === actorId);
  return /** @type {Game_Actor | null} */ (actor || null);
}

/**
 * @param {Game_Actor} actor
 * @returns {number[]}
 */
export function extractActorParamValues(actor) {
  const paramValues = [];
  const rawActor = /** @type {any} */ (actor);
  const paramSize = Array.isArray(rawActor._paramPlus)
    ? rawActor._paramPlus.length
    : 0;

  for (let paramId = 0; paramId < paramSize; paramId++) {
    paramValues.push(rawActor.param(paramId));
  }

  return paramValues;
}

/**
 * @param {string} search
 * @returns {string}
 */
export function normalizePanelSearch(search) {
  return String(search || "")
    .trim()
    .toLowerCase();
}

/**
 * @param {string} search
 * @param {Array<string | number | null | undefined>} values
 * @returns {boolean}
 */
export function matchesPanelSearch(search, values) {
  const normalizedSearch = normalizePanelSearch(search);
  if (!normalizedSearch) {
    return true;
  }

  return values.some((value) =>
    String(value || "")
      .toLowerCase()
      .includes(normalizedSearch),
  );
}

/**
 * @param {unknown} value
 * @param {{ fallback?: number, integer?: boolean, min?: number, max?: number }} [options]
 * @returns {number}
 */
export function coercePanelNumber(value, options = {}) {
  const {
    fallback = 0,
    integer = false,
    min = Number.NEGATIVE_INFINITY,
    max = Number.POSITIVE_INFINITY,
  } = options;

  let numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    numericValue = fallback;
  }

  if (integer) {
    numericValue = Math.trunc(numericValue);
  }

  if (numericValue < min) {
    numericValue = min;
  }

  if (numericValue > max) {
    numericValue = max;
  }

  return numericValue;
}

/**
 * Copy a panel state snapshot onto a reactive panel instance.
 *
 * Panels rebuild their local state by reading a snapshot from the game and
 * assigning it field by field, which is the most repeated block in the panel
 * layer. This does that copy in one call and skips assignments whose value did
 * not change, so a poll that produced identical data does not dirty the panel.
 *
 * Only keys present in the snapshot are touched; the panel's own extra state
 * (drafts, timers, flags) is left alone. `undefined` values are skipped so a
 * half-built snapshot cannot blank a field the panel already has.
 *
 * @template T
 * @param {T} target panel instance (or any object) that receives the values
 * @param {Record<string, any>} snapshot values read from the game
 * @returns {number} how many fields actually changed
 */
export function applyPanelSnapshot(target, snapshot) {
  if (!target || !snapshot) return 0;

  let changed = 0;
  for (const key of Object.keys(snapshot)) {
    const next = snapshot[key];
    if (next === undefined) continue;
    if (target[key] !== next) {
      target[key] = next;
      changed += 1;
    }
  }
  return changed;
}

/**
 * @param {{ initializeVariables?: () => any }} panel
 * @param {() => any} mutate
 * @returns {any}
 */
export function runPanelMutation(panel, mutate) {
  const result = mutate();
  if (panel && typeof panel.initializeVariables === "function") {
    panel.initializeVariables();
  }
  return result;
}

/**
 * @param {{ initializeVariables?: () => any }} panel
 * @param {() => void} [reset]
 * @returns {Promise<void>}
 */
export async function refreshPanelState(panel, reset) {
  if (typeof reset === "function") {
    reset();
  }

  if (panel && typeof panel.initializeVariables === "function") {
    await panel.initializeVariables();
  }
}

/**
 * @template T
 * @param {T} value
 * @returns {T}
 */
export function clonePanelState(value) {
  return JSON.parse(JSON.stringify(value));
}

/**
 * @param {Array<DataMapInfo | null> | undefined} dataMapInfos
 * @param {(name: string) => string} translateName
 * @returns {Array<{ id: number, name: string, fullPath: string[], fullPathJoin: string }>}
 */
export function buildMapRows(dataMapInfos, translateName) {
  if (!dataMapInfos) {
    return [];
  }

  const mapInfos = dataMapInfos.filter(Boolean);
  const mapNames = dataMapInfos.map((mapInfo) => {
    if (!mapInfo) {
      return "";
    }
    return translateName(mapInfo.name || "");
  });

  return mapInfos.map((mapInfo) => {
    const fullPathIds = getMapAncestorIds(dataMapInfos, mapInfo.id);
    const fullPath = fullPathIds.map((id) => mapNames[id] || "");

    return {
      id: mapInfo.id,
      name: mapNames[mapInfo.id] || "",
      fullPath,
      fullPathJoin: fullPath.join(" / "),
    };
  });
}

/**
 * @param {Array<DataMapInfo | null> | undefined} dataMapInfos
 * @param {number} mapId
 * @param {(name: string) => string} [translateName]
 * @returns {string}
 */
export function buildMapPathText(
  dataMapInfos,
  mapId,
  translateName = (name) => name,
) {
  if (!dataMapInfos || !mapId) {
    return "NULL";
  }

  const pathIds = getMapAncestorIds(dataMapInfos, mapId);
  if (pathIds.length === 0) {
    return "NULL";
  }

  const path = pathIds
    .map((id) => {
      const mapInfo = dataMapInfos[id];
      if (!mapInfo) {
        return "";
      }
      return translateName(mapInfo.name || "");
    })
    .filter(Boolean);

  return path.length > 0 ? path.join(" / ") : "NULL";
}

/**
 * @param {Array<DataMapInfo | null>} dataMapInfos
 * @param {number} mapId
 * @returns {number[]}
 */
function getMapAncestorIds(dataMapInfos, mapId) {
  const path = [];
  const visited = new Set();
  let currentId = mapId;

  while (currentId && !visited.has(currentId)) {
    const mapInfo = dataMapInfos[currentId];
    if (!mapInfo) {
      break;
    }

    visited.add(currentId);
    path.push(currentId);

    if (!mapInfo.parentId) {
      break;
    }

    currentId = mapInfo.parentId;
  }

  return path.reverse();
}
