import { markerVisible } from "./MapMarkers.js";

export function selectMapPoint(point, markers, layers, mapId) {
  const marker = markers.find(
    (row) =>
      markerVisible(row, layers) &&
      Math.abs(row.x + 0.5 - point.x) <= 0.65 &&
      Math.abs(row.y + 0.5 - point.y) <= 0.65,
  );
  return {
    x: Math.floor(marker ? marker.x : point.x),
    y: Math.floor(marker ? marker.y : point.y),
    id: marker ? marker.id : 0,
    name: marker ? marker.name : "Selected location",
    kind: marker ? marker.kind : "location",
    mapId,
  };
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
