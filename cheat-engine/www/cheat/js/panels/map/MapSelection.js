import { markerVisible } from "./MapMarkers.js";

export function selectMapPoint(point, markers, layers, mapId, unit = 0) {
  const radius = Math.max(
    0.65,
    unit > 0 ? (10 * (layers.markerScale || 1)) / unit : 0,
  );
  let marker = null,
    nearest = Infinity;
  markers.forEach((row) => {
    if (!markerVisible(row, layers)) return;
    const dx = row.x + 0.5 - point.x,
      dy = row.y + 0.5 - point.y;
    const head =
      row.kind === "saved" && unit > 0
        ? dy - (12 * (layers.markerScale || 1)) / unit
        : dy;
    const distance = Math.min(dx * dx + dy * dy, dx * dx + head * head);
    if (distance <= radius * radius && distance < nearest) {
      marker = row;
      nearest = distance;
    }
  });
  const selected = {
    x: Math.floor(marker ? marker.x : point.x),
    y: Math.floor(marker ? marker.y : point.y),
    id: marker ? marker.id : 0,
    name: marker ? marker.name : "Selected location",
    kind: marker ? marker.kind : "location",
    mapId,
  };
  if (marker && marker.actorId) selected.actorId = marker.actorId;
  if (marker && marker.kind === "saved") selected.flags = marker.flags || [];
  return selected;
}

export function teleportMapSelection(game, selected) {
  if (
    !game ||
    !selected ||
    !game.Scene_Map ||
    !(game.SceneManager && game.SceneManager._scene instanceof game.Scene_Map)
  )
    return false;
  const player = game.$gamePlayer,
    map = game.$dataMap;
  if (
    !player ||
    !map ||
    !game.$gameMap ||
    game.$gameMap.mapId() !== selected.mapId
  )
    return false;
  const x = selected.x,
    y = selected.y;
  if (
    !Number.isInteger(x) ||
    !Number.isInteger(y) ||
    x < 0 ||
    y < 0 ||
    x >= map.width ||
    y >= map.height
  )
    return false;
  player.setPosition(x, y);
  if (player.center) player.center(x, y);
  if (player.makeEncounterCount) player.makeEncounterCount();
  return true;
}
