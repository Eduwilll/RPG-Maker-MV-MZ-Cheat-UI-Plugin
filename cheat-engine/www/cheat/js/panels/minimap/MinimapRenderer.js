// @ts-check

/**
 * Realistic minimap renderer.
 *
 * Draws actual map tile graphics (from the game's tileset images) into a
 * cached offscreen canvas, then blits a viewport + player/event markers.
 *
 * Tile-ID spec (RPG Maker MV/MZ Tilemap):
 *   B: 0-255, C: 256-511, D: 512-767, E: 768-1023,
 *   A5: 1536-2047, A1: 2048+, A2: 2816+, A3: 4352+, A4: 5888+
 * Map data layers 0-3 hold tiles ((z * h + y) * w + x); layer 4 is
 * shadows and layer 5 is regions, both skipped here.
 *
 * Autotiles are approximated by sampling their kind's texture block.
 * At minimap scale (a few px per tile) shapes are invisible anyway,
 * while colors/textures stay true to the map.
 */

var TILE_PX = 48;
var LAYER_COUNT = 4;
// Give tileset images this long to stream in before rendering without them.
var TILESET_LOAD_TIMEOUT_MS = 8000;

var bitmapCache = {};
var baseCache = { key: "", canvas: null };

// Last failure/stage info for the settings panel status line + diagnostics.
var lastStatus = { stage: "idle", detail: "" };

export function getMinimapStatus() {
  return {
    stage: lastStatus.stage,
    detail: lastStatus.detail,
    cacheKey: baseCache.key,
  };
}

function setStatus(stage, detail) {
  lastStatus.stage = stage;
  lastStatus.detail = detail || "";
}

function tilesetNames(tilesetId) {
  try {
    var tilesets = /** @type {any} */ (window["$dataTilesets"]);
    if (tilesets && tilesets[tilesetId]) {
      var entry = tilesets[tilesetId];
      // MV data uses tileset_names, MZ typings use tilesetNames - accept both.
      if (entry.tileset_names) {
        return entry.tileset_names;
      }
      if (entry.tilesetNames) {
        return entry.tilesetNames;
      }
    }
  } catch (e) {
    // ignore
  }
  return [];
}

function bitmapCanvas(bitmap) {
  if (!bitmap) {
    return null;
  }
  try {
    if (!bitmap.isReady()) {
      return null;
    }
  } catch (e) {
    return null;
  }
  try {
    return bitmap.canvas || bitmap._canvas || null;
  } catch (e) {
    return null;
  }
}

/**
 * Load (and cache) the 9 tileset canvases for a tileset.
 * Slots with no image name are marked empty and never block rendering.
 * @returns {{ bitmaps: Array, canvases: Array, hasImage: Array, allReady: boolean, createdAt: number }}
 */
export function loadTilesetCanvases(tilesetId) {
  var key = "ts" + tilesetId;
  if (bitmapCache[key]) {
    refreshTilesetEntry(bitmapCache[key]);
    return bitmapCache[key];
  }

  var entry = {
    bitmaps: [],
    canvases: [],
    hasImage: [],
    allReady: false,
    createdAt: Date.now(),
  };
  var names = tilesetNames(tilesetId);
  for (var n = 0; n < 9; n++) {
    var bitmap = null;
    var hasImage = !!(names[n] && String(names[n]).length > 0);
    try {
      if (hasImage && typeof ImageManager !== "undefined") {
        bitmap = ImageManager.loadTileset(names[n]);
      }
    } catch (e) {
      bitmap = null;
    }
    entry.bitmaps.push(bitmap);
    entry.hasImage.push(hasImage);
    entry.canvases.push(bitmapCanvas(bitmap));
  }
  refreshTilesetEntry(entry);
  bitmapCache[key] = entry;
  return entry;
}

function refreshTilesetEntry(entry) {
  var ready = true;
  for (var i = 0; i < entry.bitmaps.length; i++) {
    if (!entry.hasImage[i]) {
      entry.canvases[i] = null;
      continue;
    }
    var canvas = bitmapCanvas(entry.bitmaps[i]);
    entry.canvases[i] = canvas;
    if (!canvas) {
      ready = false;
    }
  }
  entry.allReady = ready;
}

function tileIdAt(data, w, h, x, y, z) {
  try {
    return data[(z * h + y) * w + x] || 0;
  } catch (e) {
    return 0;
  }
}

function topTileId(data, w, h, x, y) {
  for (var z = LAYER_COUNT - 1; z >= 0; z--) {
    var tileId = tileIdAt(data, w, h, x, y, z);
    if (tileId > 0 && tileId < 8192) {
      return tileId;
    }
  }
  return 0;
}

function normalTileSource(tileId) {
  var sx =
    (Math.floor(tileId / 128) % 2) * 8 * TILE_PX + (tileId % 8) * TILE_PX;
  var sy = (Math.floor((tileId % 256) / 8) % 16) * TILE_PX;
  return { sx: sx, sy: sy };
}

function normalTileSetNumber(tileId) {
  if (tileId >= 1536 && tileId < 2048) {
    return 4;
  }
  return 5 + Math.floor(tileId / 256);
}

function autotileSource(tileId) {
  var kind = Math.floor((tileId - 2048) / 48);
  if (kind < 0) {
    kind = 0;
  }
  var imgIndex = 0;
  var localKind = kind;
  if (kind >= 32) {
    imgIndex = 3;
    localKind = kind - 32;
  } else if (kind >= 16) {
    imgIndex = 2;
    localKind = kind - 16;
  } else if (kind >= 8) {
    imgIndex = 1;
    localKind = kind - 8;
  }
  // Each autotile kind occupies a 96x144 texture block (4 per row).
  return {
    imgIndex: imgIndex,
    sx: (localKind % 4) * 96,
    sy: Math.floor(localKind / 4) * 144,
    sw: 96,
    sh: 144,
  };
}

/**
 * Render (or reuse) the full-map base canvas at 1 tile = 4px.
 * Returns null while tileset graphics are still loading.
 */
export function renderBaseMap() {
  var dataMap = null;
  try {
    dataMap = window["$dataMap"];
  } catch (e) {
    dataMap = null;
  }
  if (!dataMap || !dataMap.data) {
    setStatus("no-datamap", "no map data loaded (title screen?)");
    return null;
  }

  var mapId = 0;
  var tilesetId = 0;
  try {
    mapId = $gameMap.mapId();
    tilesetId = $gameMap.tilesetId();
  } catch (e) {
    setStatus("no-gamemap", "game map object unavailable");
    return null;
  }

  var w = dataMap.width;
  var h = dataMap.height;
  var cacheKey = mapId + ":" + tilesetId + ":" + w + "x" + h;
  if (baseCache.key === cacheKey && baseCache.canvas) {
    setStatus("ok", "map " + mapId + " cached");
    return baseCache.canvas;
  }

  var entry = loadTilesetCanvases(tilesetId);
  if (!entry.allReady) {
    var missing = [];
    for (var m = 0; m < entry.canvases.length; m++) {
      if (entry.hasImage[m] && !entry.canvases[m]) {
        missing.push(m);
      }
    }
    if (missing.length === 0) {
      // Only empty slots are missing - safe to render without them.
      entry.allReady = true;
    } else if (Date.now() - entry.createdAt > TILESET_LOAD_TIMEOUT_MS) {
      // Images are stuck (slow/encrypted/custom pipeline) - render with
      // whatever loaded instead of hiding the minimap forever.
      setStatus(
        "tiles-partial",
        "rendering without tileset images [" + missing.join(",") + "]",
      );
    } else {
      setStatus(
        "tiles-loading",
        "waiting for tileset images [" + missing.join(",") + "]",
      );
      return null;
    }
  }

  var scale = 4;
  var canvas = null;
  try {
    canvas = document.createElement("canvas");
  } catch (e) {
    setStatus("no-context", "cannot create canvas");
    return null;
  }
  canvas.width = Math.max(1, w * scale);
  canvas.height = Math.max(1, h * scale);
  var ctx = canvas.getContext("2d");
  if (!ctx) {
    setStatus("no-context", "2d context unavailable");
    return null;
  }

  // Dark void background for empty tiles / out-of-map areas.
  ctx.fillStyle = "#0a0a12";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  var data = dataMap.data;
  for (var y = 0; y < h; y++) {
    for (var x = 0; x < w; x++) {
      var tileId = topTileId(data, w, h, x, y);
      if (!tileId) {
        continue;
      }
      try {
        if (tileId >= 2048) {
          var auto = autotileSource(tileId);
          var img = entry.canvases[auto.imgIndex];
          if (img) {
            ctx.drawImage(
              img,
              auto.sx,
              auto.sy,
              auto.sw,
              auto.sh,
              x * scale,
              y * scale,
              scale,
              scale,
            );
          }
        } else {
          var setNumber = normalTileSetNumber(tileId);
          var normalImg = entry.canvases[setNumber];
          if (normalImg) {
            var src = normalTileSource(tileId);
            ctx.drawImage(
              normalImg,
              src.sx,
              src.sy,
              TILE_PX,
              TILE_PX,
              x * scale,
              y * scale,
              scale,
              scale,
            );
          }
        }
      } catch (e) {
        // Skip unreadable tiles - lower layers stay visible.
      }
    }
  }

  baseCache.key = cacheKey;
  baseCache.canvas = canvas;
  setStatus("ok", "map " + mapId + " cached");
  return canvas;
}

export function clearMinimapCache() {
  baseCache.key = "";
  baseCache.canvas = null;
}

/**
 * Blit the viewport + markers onto the visible canvas.
 */
export function drawMinimap(canvas, baseCanvas, options) {
  var size = options.size || 176;
  var mode = options.mode || "follow";
  var zoom = Number(options.zoom) || 1;
  if (!(zoom >= 0.25)) {
    zoom = 0.25;
  }
  if (zoom > 8) {
    zoom = 8;
  }
  if (canvas.width !== size || canvas.height !== size) {
    canvas.width = size;
    canvas.height = size;
  }
  var ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  ctx.clearRect(0, 0, size, size);

  var baseScale = 4;
  var mapW = 0;
  var mapH = 0;
  try {
    mapW = $gameMap.width();
    mapH = $gameMap.height();
  } catch (e) {
    return;
  }

  var px = options.playerX || 0;
  var py = options.playerY || 0;

  if (mode === "full") {
    var fit = Math.min(size / Math.max(1, mapW), size / Math.max(1, mapH));
    // Screen px per base-canvas px. Zoom 1 = whole map fits; zoom in centers on player.
    var s = fit * zoom;
    var dw = mapW * baseScale * s;
    var dh = mapH * baseScale * s;
    var pbx = (px + 0.5) * baseScale;
    var pby = (py + 0.5) * baseScale;
    var ox = 0;
    var oy = 0;
    if (dw <= size) {
      ox = (size - dw) / 2;
    } else {
      ox = size / 2 - pbx * s;
      if (ox > 0) {
        ox = 0;
      }
      if (ox < size - dw) {
        ox = size - dw;
      }
    }
    if (dh <= size) {
      oy = (size - dh) / 2;
    } else {
      oy = size / 2 - pby * s;
      if (oy > 0) {
        oy = 0;
      }
      if (oy < size - dh) {
        oy = size - dh;
      }
    }
    ctx.drawImage(baseCanvas, ox, oy, dw, dh);
    var unit = baseScale * s;
    drawMarkers(
      ctx,
      options.events || [],
      function (tx, ty) {
        return { x: ox + (tx + 0.5) * unit, y: oy + (ty + 0.5) * unit };
      },
      Math.max(2, unit * 0.5),
    );
    drawPlayerDot(ctx, ox + pbx * s, oy + pby * s, Math.max(3, unit * 0.6));
  } else {
    // Follow mode: zoom 1 shows ~35 tiles across; zoom in to see fewer/bigger.
    var viewTiles = Math.max(5, Math.round(35 / zoom));
    var tilePx = size / viewTiles;
    var camX = (px + 0.5) * baseScale - size / 2 / (tilePx / baseScale);
    var camY = (py + 0.5) * baseScale - size / 2 / (tilePx / baseScale);
    var scale = tilePx / baseScale;
    // Source rect in base-canvas pixels.
    var sx = camX;
    var sy = camY;
    var sw = size / scale;
    var sh = size / scale;
    // Fill outside-map area with void color.
    ctx.fillStyle = "#0a0a12";
    ctx.fillRect(0, 0, size, size);
    try {
      ctx.drawImage(baseCanvas, sx, sy, sw, sh, 0, 0, size, size);
    } catch (e) {
      // Base smaller than viewport (tiny maps) - draw what fits.
      try {
        ctx.drawImage(baseCanvas, 0, 0, size, size);
      } catch (e2) {
        // ignore
      }
    }
    var toScreen = function (tx, ty) {
      return {
        x: (tx + 0.5) * baseScale * scale - sx * scale,
        y: (ty + 0.5) * baseScale * scale - sy * scale,
      };
    };
    drawMarkers(
      ctx,
      options.events || [],
      toScreen,
      Math.max(2, tilePx * 0.35),
    );
    drawPlayerDot(ctx, size / 2, size / 2, Math.max(3, tilePx * 0.45));
  }
}

function drawMarkers(ctx, events, toScreen, dotR) {
  for (var i = 0; i < events.length; i++) {
    var ev = events[i];
    if (!ev) {
      continue;
    }
    var pos = toScreen(ev.x, ev.y);
    ctx.beginPath();
    ctx.fillStyle = ev.color || "#ff9800";
    ctx.arc(pos.x, pos.y, dotR, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlayerDot(ctx, x, y, r) {
  ctx.beginPath();
  ctx.fillStyle = "#ffffff";
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.strokeStyle = "#4caf50";
  ctx.lineWidth = Math.max(1, r * 0.4);
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
}

/**
 * Snapshot of live map state for the overlay loop.
 */
export function readMinimapFrame() {
  var frame = { onMap: false, playerX: 0, playerY: 0, events: [] };
  try {
    var scene = null;
    if (typeof SceneManager !== "undefined") {
      scene = /** @type {any} */ (SceneManager)._scene;
    }
    var isMap = false;
    try {
      isMap = scene instanceof Scene_Map;
    } catch (e) {
      isMap = false;
    }
    if (!isMap) {
      setStatus("not-on-map", "open a save on the map (not title/menu)");
      return frame;
    }
    frame.onMap = true;
    frame.playerX = $gamePlayer.x;
    frame.playerY = $gamePlayer.y;
    var events = $gameMap.events();
    for (var i = 0; i < events.length; i++) {
      var ev = events[i];
      if (!ev) {
        continue;
      }
      frame.events.push({ x: ev.x, y: ev.y, color: "#ff9800" });
    }
  } catch (e) {
    // ignore - game globals unavailable
  }
  return frame;
}
