// @ts-check
import { getGameWindow } from "../../runtime/FeatureRuntime.js";
import { createMapArtwork } from "./MapArtwork.js";
import { readMapLayers } from "../map/MapLayersState.js";
import { getMapCharacters } from "../map/MapCharacters.js";
import {
  readMapMarkers,
  markerVisible,
  drawMapGrid,
} from "../map/MapMarkers.js";

function artwork() {
  const game = /** @type {any} */ (getGameWindow());
  if (!game) return null;
  if (!game.__cheatMapArtwork) game.__cheatMapArtwork = createMapArtwork(game);
  return game.__cheatMapArtwork;
}

export function getMinimapStatus() {
  const renderer = artwork();
  return renderer
    ? renderer.status()
    : { stage: "idle", detail: "Game unavailable", cacheKey: "" };
}
export function loadTilesetCanvases(id) {
  const renderer = artwork();
  return renderer && renderer.load(id);
}
export function renderBaseMap() {
  const renderer = artwork();
  return renderer && renderer.render(undefined, undefined, readMapLayers());
}
export function clearMinimapCache() {
  const renderer = artwork();
  if (renderer) renderer.clear();
}

/** Source and marker coordinates use the actual cached canvas scale. */
export function drawMinimap(canvas, base, options) {
  const game = /** @type {any} */ (getGameWindow());
  const map = game && game.$dataMap;
  const layers = options.layers || readMapLayers();
  if (!map || (!base && layers.background !== false)) return;
  const size = options.size || 176;
  if (canvas.width !== size || canvas.height !== size) {
    canvas.width = size;
    canvas.height = size;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "#0a0a12";
  ctx.fillRect(0, 0, size, size);
  ctx.imageSmoothingEnabled = false;
  const zoom = Math.max(0.25, Math.min(8, Number(options.zoom) || 1));
  const px = Number(options.playerX) || 0,
    py = Number(options.playerY) || 0;
  const scale = base ? base.width / map.width : 1;
  let unit, ox, oy;
  if (options.mode === "full") {
    unit = Math.min(size / map.width, size / map.height) * zoom;
    const dw = map.width * unit,
      dh = map.height * unit;
    ox =
      dw <= size
        ? (size - dw) / 2
        : Math.max(size - dw, Math.min(0, size / 2 - (px + 0.5) * unit));
    oy =
      dh <= size
        ? (size - dh) / 2
        : Math.max(size - dh, Math.min(0, size / 2 - (py + 0.5) * unit));
  } else {
    unit = size / Math.max(5, Math.round(35 / zoom));
    ox = size / 2 - (px + 0.5) * unit;
    oy = size / 2 - (py + 0.5) * unit;
  }
  // Crop the source instead of stretching tiny maps or losing edge alignment.
  const sx = Math.max(0, -ox / unit),
    sy = Math.max(0, -oy / unit);
  const ex = Math.min(map.width, (size - ox) / unit),
    ey = Math.min(map.height, (size - oy) / unit);
  if (layers.background !== false && ex > sx && ey > sy)
    ctx.drawImage(
      base,
      sx * scale,
      sy * scale,
      (ex - sx) * scale,
      (ey - sy) * scale,
      ox + sx * unit,
      oy + sy * unit,
      (ex - sx) * unit,
      (ey - sy) * unit,
    );
  const dot = (x, y, color, radius) => {
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(
      ox + (x + 0.5) * unit,
      oy + (y + 0.5) * unit,
      radius,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  };
  if (layers.grid) drawMapGrid(ctx, map.width, map.height, unit, ox, oy);
  const markerScale = layers.markerScale || 1;
  const characters = layers.sprites !== false ? getMapCharacters() : null;
  if (characters) characters.beginFrame();
  (options.events || []).forEach((ev) => {
    if (!markerVisible(ev, layers)) return;
    const painted =
      characters &&
      characters.draw(ctx, ev, { unit, ox, oy, scale: markerScale });
    if (!painted)
      dot(
        ev.x,
        ev.y,
        ev.color || "#ff9800",
        Math.max(2, unit * 0.35) * markerScale,
      );
    if (layers.labels) {
      ctx.font = "11px sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "left";
      ctx.fillText(
        (ev.name || "Event") + " #" + ev.id,
        ox + (ev.x + 0.5) * unit + 4,
        oy + (ev.y + 0.5) * unit - 4,
      );
    }
  });
  if (layers.player !== false)
    dot(px, py, "#ffffff", Math.max(3, unit * 0.45) * markerScale);
}

export function readMinimapFrame() {
  const frame = { onMap: false, playerX: 0, playerY: 0, events: [] };
  const game = /** @type {any} */ (getGameWindow());
  try {
    if (
      !game.Scene_Map ||
      !(game.SceneManager._scene instanceof game.Scene_Map)
    )
      return frame;
    frame.onMap = true;
    const player = game.$gamePlayer;
    frame.playerX = Number.isFinite(player._realX) ? player._realX : player.x;
    frame.playerY = Number.isFinite(player._realY) ? player._realY : player.y;
    frame.events = readMapMarkers(game);
  } catch (error) {
    /* No active map yet. */
  }
  return frame;
}
