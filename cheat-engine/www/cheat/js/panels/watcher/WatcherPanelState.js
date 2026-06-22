// @ts-check

const WATCHER_STORAGE_KEY = "cheat.variableSwitchWatcher.items";
const WATCHER_OVERLAY_STORAGE_KEY =
  "cheat.variableSwitchWatcher.overlayEnabled";

/**
 * @typedef {"variable" | "switch" | "selfSwitch"} WatchType
 * @typedef {{ type: "variable" | "switch", id: number }} WatchTarget
 * @typedef {{ type: WatchType, id: number, name: string, label: string, value: any, valueText: string, source?: string, distance?: number, mapId?: number, eventId?: number, selfSwitchKey?: string }} WatchRow
 */

export function readWatcherTargets() {
  try {
    const raw = localStorage.getItem(WATCHER_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isValidWatchTarget);
  } catch (error) {
    console.warn("[WatcherPanel] Failed to read watch list", error);
    return [];
  }
}

/**
 * @param {WatchTarget[]} targets
 */
export function writeWatcherTargets(targets) {
  localStorage.setItem(WATCHER_STORAGE_KEY, JSON.stringify(targets));
}

/**
 * @param {"variable" | "switch"} type
 * @param {number} id
 */
export function addWatcherTarget(type, id) {
  const targets = readWatcherTargets();
  const exists = targets.some(
    (target) => target.type === type && target.id === id,
  );

  if (!exists && id > 0) {
    targets.push({ type, id });
    writeWatcherTargets(targets);
  }

  return targets;
}

/**
 * @param {WatchType} type
 * @param {number} id
 */
export function removeWatcherTarget(type, id) {
  const targets = readWatcherTargets().filter(
    (target) => !(target.type === type && target.id === id),
  );
  writeWatcherTargets(targets);
  return targets;
}

/**
 * @param {number | null | undefined} actorId
 */
export function readWatcherPanelState(actorId = null) {
  const targets = readWatcherTargets();

  return {
    targets,
    overlayEnabled: readWatcherOverlayEnabled(),
    watchedRows: buildWatchRows(targets),
    variableRows: buildSourceRows("variable"),
    switchRows: buildSourceRows("switch"),
    context: readContextWatcherState(actorId),
  };
}

/**
 * @param {number | null | undefined} actorId
 */
export function readContextWatcherState(actorId = null) {
  const frontEvent = isMapContextReady() ? getFacingEvent() : null;

  return {
    currentMapId: getCurrentMapId(),
    mapReady: isMapContextReady(),
    facingEvent: formatFacingEvent(frontEvent),
    facingRows: frontEvent ? buildEventReferenceRows(frontEvent, "Facing") : [],
    mapRows: isMapContextReady() ? buildCurrentMapReferenceRows() : [],
    mapEventCount: getCurrentMapEventCount(),
  };
}

export function readWatcherOverlayRows() {
  return buildWatchRows(readWatcherTargets());
}

export function readWatcherOverlayEnabled() {
  return localStorage.getItem(WATCHER_OVERLAY_STORAGE_KEY) === "true";
}

/**
 * @param {boolean} enabled
 */
export function writeWatcherOverlayEnabled(enabled) {
  localStorage.setItem(WATCHER_OVERLAY_STORAGE_KEY, enabled ? "true" : "false");
}

/**
 * @param {WatchTarget[]} targets
 * @returns {WatchRow[]}
 */
export function buildWatchRows(targets) {
  return targets.map((target) => buildWatchRow(target.type, target.id));
}

/**
 * @param {WatchType} type
 * @returns {WatchRow[]}
 */
export function buildSourceRows(type) {
  const names = getSourceNames(type);

  return names
    .map((name, id) => buildWatchRow(type, id, name))
    .filter((row) => row.id > 0);
}

/**
 * @param {WatchType} type
 * @param {number} id
 * @param {string} [knownName]
 * @returns {WatchRow}
 */
export function buildWatchRow(type, id, knownName) {
  const name = knownName || getTargetName(type, id);
  const value = readTargetValue(type, id);

  return {
    type,
    id,
    name,
    label: formatTargetLabel(type, id, name),
    value,
    valueText: formatTargetValue(type, value),
  };
}

/**
 * @param {WatchType} type
 * @param {number} id
 * @param {any} value
 */
export function writeTargetValue(type, id, value) {
  if (type === "selfSwitch") {
    return value;
  }

  if (type === "switch") {
    $gameSwitches.setValue(id, !!value);
    return $gameSwitches.value(id);
  }

  $gameVariables.setValue(id, coerceVariableValue(value));
  return $gameVariables.value(id);
}

/**
 * @param {WatchType} type
 * @param {number} id
 */
export function readTargetValue(type, id) {
  if (type === "selfSwitch") {
    return false;
  }

  if (type === "switch") {
    return $gameSwitches ? $gameSwitches.value(id) : false;
  }

  return $gameVariables ? $gameVariables.value(id) : 0;
}

/**
 * @param {WatchType} type
 * @param {number} id
 */
export function getTargetName(type, id) {
  const names = getSourceNames(type);
  return names[id] || formatFallbackName(type, id);
}

/**
 * @param {WatchType} type
 * @returns {string[]}
 */
function getSourceNames(type) {
  if (!$dataSystem) return [];
  return type === "switch"
    ? ($dataSystem.switches || []).slice()
    : ($dataSystem.variables || []).slice();
}

/**
 * @param {WatchType} type
 * @param {number} id
 * @param {string} name
 */
function formatTargetLabel(type, id, name) {
  return `${type === "switch" ? "Switch" : "Variable"} ${id}: ${
    name || formatFallbackName(type, id)
  }`;
}

/**
 * @param {WatchType} type
 * @param {number} id
 */
function formatFallbackName(type, id) {
  return `${type === "switch" ? "Switch" : "Variable"} ${id}`;
}

/**
 * @param {WatchType} type
 * @param {any} value
 */
function formatTargetValue(type, value) {
  if (type === "switch") return value ? "ON" : "OFF";
  return String(value);
}

/**
 * @param {any} value
 */
function coerceVariableValue(value) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  if (trimmed === "") return 0;

  const numeric = Number(trimmed);
  return Number.isNaN(numeric) ? value : numeric;
}

/**
 * @param {any} target
 * @returns {target is WatchTarget}
 */
function isValidWatchTarget(target) {
  return (
    target &&
    (target.type === "variable" || target.type === "switch") &&
    Number.isInteger(target.id) &&
    target.id > 0
  );
}

/**
 * @param {WatchRow} row
 * @param {any} value
 */
export function writeWatchRowValue(row, value) {
  if (row.type === "selfSwitch") {
    if (!row.mapId || !row.eventId || !row.selfSwitchKey) return false;
    const key = [row.mapId, row.eventId, row.selfSwitchKey];
    $gameSelfSwitches.setValue(/** @type {any} */ (key), !!value);
    return $gameSelfSwitches.value(/** @type {any} */ (key));
  }

  return writeTargetValue(row.type, row.id, value);
}

function getCurrentMapId() {
  return isMapContextReady() && typeof $gameMap.mapId === "function"
    ? $gameMap.mapId()
    : 0;
}

function isMapContextReady() {
  if (!$gameMap || !$gamePlayer || !$dataMap) return false;

  const rawDataMap = /** @type {any} */ ($dataMap);
  return (
    typeof rawDataMap.scrollType === "number" &&
    Array.isArray(rawDataMap.events)
  );
}

function getFacingEvent() {
  if (!isMapContextReady()) return null;

  try {
    const direction = $gamePlayer.direction();
    const x = $gameMap.roundXWithDirection($gamePlayer.x, direction);
    const y = $gameMap.roundYWithDirection($gamePlayer.y, direction);
    const events =
      typeof $gameMap.eventsXy === "function" ? $gameMap.eventsXy(x, y) : [];

    return events && events.length > 0 ? events[0] : null;
  } catch (error) {
    console.warn("[WatcherPanel] Map context not ready", error);
    return null;
  }
}

/**
 * @param {Game_Event | null} event
 */
function formatFacingEvent(event) {
  if (!event) return null;

  const rawEvent = /** @type {any} */ (event);
  const dataEvent = event.event ? event.event() : null;
  const eventId = rawEvent._eventId || (dataEvent && dataEvent.id) || 0;
  const eventName = (dataEvent && dataEvent.name) || `Event ${eventId}`;

  return {
    id: eventId,
    name: eventName,
    x: rawEvent.x,
    y: rawEvent.y,
    label: `${eventName} (#${eventId})`,
  };
}

function buildCurrentMapReferenceRows() {
  if (!$dataMap || !$dataMap.events) return [];

  const rows = [];
  const events = buildCurrentMapEventDistanceRows();

  for (const eventInfo of events) {
    if (eventInfo.dataEvent) {
      const eventRows = buildDataEventReferenceRows(
        eventInfo.dataEvent,
        `Nearby ${eventInfo.distanceText}`,
        eventInfo.distance,
      );
      for (const row of eventRows) {
        rows.push(row);
      }
    }
  }

  return dedupeRows(rows);
}

function getCurrentMapEventCount() {
  if (!$dataMap || !$dataMap.events) return 0;
  return $dataMap.events.filter(Boolean).length;
}

/**
 * @param {Game_Event} gameEvent
 * @param {string} source
 */
function buildEventReferenceRows(gameEvent, source) {
  const dataEvent = gameEvent.event ? gameEvent.event() : null;
  const distance = getDistanceFromPlayer(
    /** @type {any} */ (gameEvent).x,
    /** @type {any} */ (gameEvent).y,
  );
  return dataEvent
    ? buildDataEventReferenceRows(dataEvent, source, distance)
    : [];
}

/**
 * @param {any} dataEvent
 * @param {string} source
 * @param {number | null} [distance]
 */
function buildDataEventReferenceRows(dataEvent, source, distance = null) {
  const rows = [];
  const mapId = getCurrentMapId();
  const eventId = dataEvent.id;
  const eventName = dataEvent.name || `Event ${eventId}`;
  const sourceText = formatEventSource(source, eventName, distance);

  for (const page of dataEvent.pages || []) {
    collectPageConditionRows(rows, page, mapId, eventId, sourceText, distance);

    for (const command of page.list || []) {
      collectCommandRows(rows, command, mapId, eventId, sourceText, distance);
    }
  }

  return dedupeRows(rows);
}

function collectPageConditionRows(
  rows,
  page,
  mapId,
  eventId,
  sourceText,
  distance,
) {
  const conditions = page.conditions;
  if (!conditions) return;

  if (conditions.switch1Valid) {
    rows.push(
      buildContextRow("switch", conditions.switch1Id, {
        source: `${sourceText} page condition`,
        distance,
      }),
    );
  }

  if (conditions.switch2Valid) {
    rows.push(
      buildContextRow("switch", conditions.switch2Id, {
        source: `${sourceText} page condition`,
        distance,
      }),
    );
  }

  if (conditions.variableValid) {
    rows.push(
      buildContextRow("variable", conditions.variableId, {
        source: `${sourceText} page condition >= ${conditions.variableValue}`,
        distance,
      }),
    );
  }

  if (conditions.selfSwitchValid) {
    rows.push(
      buildSelfSwitchRow(mapId, eventId, conditions.selfSwitchCh, {
        source: `${sourceText} page condition`,
        distance,
      }),
    );
  }
}

function collectCommandRows(
  rows,
  command,
  mapId,
  eventId,
  sourceText,
  distance,
) {
  const params = command.parameters || [];

  if (command.code === 121) {
    const start = Number(params[0] || 0);
    const end = Number(params[1] || start);
    for (let id = start; id <= end; id++) {
      rows.push(
        buildContextRow("switch", id, {
          source: `${sourceText} controls switch`,
          distance,
        }),
      );
    }
  }

  if (command.code === 122) {
    const start = Number(params[0] || 0);
    const end = Number(params[1] || start);
    for (let id = start; id <= end; id++) {
      rows.push(
        buildContextRow("variable", id, {
          source: `${sourceText} controls variable`,
          distance,
        }),
      );
    }
  }

  if (command.code === 123) {
    rows.push(
      buildSelfSwitchRow(mapId, eventId, String(params[0] || "A"), {
        source: `${sourceText} controls self switch`,
        distance,
      }),
    );
  }

  if (command.code === 111) {
    collectConditionalBranchRows(
      rows,
      params,
      mapId,
      eventId,
      sourceText,
      distance,
    );
  }
}

function collectConditionalBranchRows(
  rows,
  params,
  mapId,
  eventId,
  sourceText,
  distance,
) {
  const branchType = Number(params[0]);

  if (branchType === 0) {
    rows.push(
      buildContextRow("switch", Number(params[1] || 0), {
        source: `${sourceText} conditional branch`,
        distance,
      }),
    );
  }

  if (branchType === 1) {
    rows.push(
      buildContextRow("variable", Number(params[1] || 0), {
        source: `${sourceText} conditional branch`,
        distance,
      }),
    );
  }

  if (branchType === 2) {
    rows.push(
      buildSelfSwitchRow(mapId, eventId, String(params[1] || "A"), {
        source: `${sourceText} conditional branch`,
        distance,
      }),
    );
  }
}

function buildContextRow(type, id, options = {}) {
  const row = buildWatchRow(type, id);
  row.source = options.source || "";
  row.distance = options.distance;
  return row;
}

function buildSelfSwitchRow(mapId, eventId, selfSwitchKey, options = {}) {
  const key = [mapId, eventId, selfSwitchKey];
  const value = $gameSelfSwitches.value(/** @type {any} */ (key));
  return {
    type: "selfSwitch",
    id: eventId,
    mapId,
    eventId,
    selfSwitchKey,
    name: `Self Switch ${selfSwitchKey}`,
    label: `Self Switch ${selfSwitchKey} (Event ${eventId})`,
    value,
    valueText: formatTargetValue("switch", value),
    source: options.source || "",
    distance: options.distance,
  };
}

function buildCurrentMapEventDistanceRows() {
  const rows = [];
  if (!$dataMap || !$dataMap.events || !$gameMap || !$gamePlayer) return rows;

  for (const dataEvent of $dataMap.events) {
    if (!dataEvent || !dataEvent.id) continue;

    const gameEvent =
      typeof $gameMap.event === "function"
        ? $gameMap.event(dataEvent.id)
        : null;
    const rawEvent = /** @type {any} */ (gameEvent);
    const eventX =
      rawEvent && typeof rawEvent.x === "number" ? rawEvent.x : dataEvent.x;
    const eventY =
      rawEvent && typeof rawEvent.y === "number" ? rawEvent.y : dataEvent.y;
    const distance = getDistanceFromPlayer(eventX, eventY);

    rows.push({
      dataEvent,
      distance,
      distanceText: formatDistance(distance),
    });
  }

  rows.sort((a, b) => a.distance - b.distance);
  return rows;
}

function getDistanceFromPlayer(x, y) {
  if (!$gamePlayer || typeof x !== "number" || typeof y !== "number") {
    return Number.POSITIVE_INFINITY;
  }

  return Math.abs($gamePlayer.x - x) + Math.abs($gamePlayer.y - y);
}

function formatDistance(distance) {
  return Number.isFinite(distance)
    ? `${distance} tile${distance === 1 ? "" : "s"}`
    : "? tiles";
}

function formatEventSource(source, eventName, distance) {
  const distanceText =
    distance === null ? "" : ` (${formatDistance(distance)})`;
  return `${source}${distanceText}: ${eventName}`;
}

/**
 * @param {WatchRow[]} rows
 */
function dedupeRows(rows) {
  const seen = new Set();
  const ret = [];

  for (const row of rows) {
    const key =
      row.type === "selfSwitch"
        ? `${row.type}:${row.mapId}:${row.eventId}:${row.selfSwitchKey}`
        : `${row.type}:${row.id}`;

    if (!seen.has(key)) {
      seen.add(key);
      ret.push(row);
    }
  }

  return ret;
}
