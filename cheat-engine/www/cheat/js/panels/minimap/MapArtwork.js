function bitmapImage(bitmap) {
  try {
    if (!bitmap || (bitmap.isReady && !bitmap.isReady())) return null;
    return bitmap.canvas || bitmap._canvas || bitmap._image || null;
  } catch (error) {
    return null;
  }
}

/** Canvas adapter for MV Bitmap and MZ Tilemap.Layer drawing contracts. */
function tilePainter(game, entry, ctx, scale, data, detached, layers) {
  const proto = game.Tilemap && game.Tilemap.prototype;
  if (!proto || (!proto._drawTile && !proto._addTile)) return null;
  const painter = Object.create(proto);
  const map = game.$gameMap;
  const tw = detached
    ? Number(
        data.tileWidth || (game.$dataSystem && game.$dataSystem.tileSize),
      ) || 48
    : map.tileWidth
      ? map.tileWidth()
      : 48;
  const th = detached
    ? Number(
        data.tileHeight || (game.$dataSystem && game.$dataSystem.tileSize),
      ) || 48
    : map.tileHeight
      ? map.tileHeight()
      : 48;
  Object.defineProperties(painter, {
    tileWidth: { value: tw },
    tileHeight: { value: th },
    _tileWidth: { value: tw },
    _tileHeight: { value: th },
  });
  painter.bitmaps = entry.bitmaps;
  painter.flags = entry.flags || [];
  const fill = (x, y, w, h, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(
      (x * scale) / tw,
      (y * scale) / th,
      (w * scale) / tw,
      (h * scale) / th,
    );
  };
  const blit = (source, sx, sy, sw, sh, dx, dy, dw, dh) => {
    const image = bitmapImage(source);
    if (image)
      ctx.drawImage(
        image,
        sx,
        sy,
        sw,
        sh,
        (dx * scale) / tw,
        (dy * scale) / th,
        (dw * scale) / tw,
        (dh * scale) / th,
      );
  };
  const target = {
    bltImage: blit,
    blt: blit,
    fillRect: fill,
    addRect(set, sx, sy, dx, dy, w, h) {
      if (set < 0) fill(dx, dy, w, h, "rgba(0,0,0,0.5)");
      else blit(entry.bitmaps[set], sx, sy, w, h, dx, dy, w, h);
    },
  };
  const draw = (methodMV, methodMZ, value, dx, dy) => {
    const method = painter[methodMV] || painter[methodMZ];
    if (method) method.call(painter, target, value, dx, dy);
  };
  return {
    cell(dataMap, x, y, frame) {
      painter.animationFrame = frame;
      const w = dataMap.width,
        h = dataMap.height;
      const read = (z, yy) => {
        if (yy < 0)
          yy =
            dataMap.scrollType === 1 || dataMap.scrollType === 3 ? h - 1 : -1;
        return yy < 0 ? 0 : dataMap.data[(z * h + yy) * w + x] || 0;
      };
      const ids = [read(0, y), read(1, y), read(2, y), read(3, y)];
      const upper = [];
      const dx = x * tw,
        dy = y * th;
      const tile = (id) => {
        if (painter.flags[id] & 0x10) upper.push(id);
        else draw("_drawTile", "_addTile", id, dx, dy);
      };
      ctx.clearRect(x * scale, y * scale, scale, scale);
      fill(dx, dy, tw, th, "#0a0a12");
      tile(ids[0]);
      tile(ids[1]);
      if (layers.shadows !== false)
        draw("_drawShadow", "_addShadow", read(4, y), dx, dy);
      const above = read(1, y - 1);
      if (
        painter.flags[above] & 0x80 &&
        !(painter.flags[ids[1]] & 0x80) &&
        !(game.Tilemap.isShadowingTile && game.Tilemap.isShadowingTile(ids[0]))
      ) {
        draw("_drawTableEdge", "_addTableEdge", above, dx, dy);
      }
      tile(ids[2]);
      tile(ids[3]);
      if (layers.upperTiles !== false)
        upper.forEach((id) => draw("_drawTile", "_addTile", id, dx, dy));
      return ids.some((id) => id >= 2048 && id < 2816);
    },
  };
}

/** One bounded map canvas per game, shared by the overlay and separate window. */
export function createMapArtwork(game, optionalLoader) {
  let assets = null;
  let cache = null;
  let lastStatus = { stage: "idle", detail: "", cacheKey: "" };
  const status = (stage, detail, key) => {
    lastStatus = { stage, detail, cacheKey: key || "" };
  };
  function load(tilesetId) {
    const row = game.$dataTilesets && game.$dataTilesets[tilesetId];
    const names = row ? row.tilesetNames || row.tileset_names || [] : [];
    const key = tilesetId + ":" + names.join("|");
    if (!assets || assets.key !== key || assets.row !== row) {
      const bitmaps = [];
      for (let i = 0; i < 9; i++) {
        let bitmap = null;
        try {
          if (names[i]) {
            if (optionalLoader)
              Promise.resolve(optionalLoader(names[i]))
                .then((loaded) => {
                  bitmaps[i] = loaded;
                })
                .catch(() => {});
            else bitmap = game.ImageManager.loadTileset(names[i]);
          }
        } catch (error) {
          /* Report unavailable slots below. */
        }
        bitmaps.push(bitmap);
      }
      assets = {
        key,
        row,
        bitmaps,
        names: names.slice(),
        flags: row ? row.flags : [],
        createdAt: Date.now(),
      };
    }
    assets.canvases = assets.bitmaps.map(bitmapImage);
    assets.flags = row ? row.flags : [];
    assets.hasImage = assets.names.map(Boolean);
    assets.allReady = assets.names.every(
      (name, i) => !name || !!assets.canvases[i],
    );
    return assets;
  }
  function render(mapData, mapId, layers = {}) {
    const data = mapData || game.$dataMap,
      map = game.$gameMap;
    if (!data || !data.data || !map || !data.width || !data.height) {
      status("no-datamap", "No map is loaded.");
      return null;
    }
    const entry = load(
      mapData
        ? data.tilesetId
        : map.tilesetId
          ? map.tilesetId()
          : data.tilesetId,
    );
    if (!entry.allReady && Date.now() - entry.createdAt < 8000) {
      status("tiles-loading", "Loading map artwork; radar shown temporarily.");
      return null;
    }
    if (!entry.canvases.some(Boolean)) {
      status("tiles-unavailable", "Tileset images unavailable; radar shown.");
      return null;
    }
    const w = data.width,
      h = data.height;
    const scale = Math.max(
      1,
      Math.min(
        16,
        Math.floor(4096 / Math.max(w, h)),
        Math.floor(Math.sqrt(8388608 / (w * h))),
      ),
    );
    if (
      w * scale > 4096 ||
      h * scale > 4096 ||
      w * h * scale * scale > 8388608
    ) {
      status("map-too-large", "Map exceeds artwork memory limit; radar shown.");
      return null;
    }
    const key =
      (mapData ? mapId : map.mapId()) +
      ":" +
      entry.key +
      ":" +
      w +
      "x" +
      h +
      ":" +
      entry.canvases.map(Boolean).join() +
      ":" +
      (layers.shadows !== false) +
      ":" +
      (layers.upperTiles !== false);
    const frame = Math.floor(
      ((game.Graphics && game.Graphics.frameCount) || 0) / 30,
    );
    try {
      if (
        !cache ||
        cache.key !== key ||
        cache.map !== data ||
        cache.tiles !== data.data ||
        cache.flags !== entry.flags
      ) {
        const canvas = game.document.createElement("canvas");
        canvas.width = w * scale;
        canvas.height = h * scale;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas 2D unavailable");
        ctx.imageSmoothingEnabled = false;
        const painter = tilePainter(
          game,
          entry,
          ctx,
          scale,
          data,
          !!mapData,
          layers,
        );
        if (!painter)
          throw new Error("Game Tilemap drawing methods unavailable");
        const animated = [];
        for (let y = 0; y < h; y++)
          for (let x = 0; x < w; x++) {
            if (painter.cell(data, x, y, frame)) animated.push({ x, y });
          }
        cache = {
          key,
          map: data,
          tiles: data.data,
          flags: entry.flags,
          canvas,
          painter,
          animated,
          frame,
        };
      } else if (cache.frame !== frame) {
        cache.animated.forEach((cell) =>
          cache.painter.cell(data, cell.x, cell.y, frame),
        );
        cache.frame = frame;
      }
      status(
        entry.allReady ? "ok" : "tiles-partial",
        entry.allReady
          ? "Live map artwork"
          : "Some tileset images are unavailable.",
        key,
      );
      return cache.canvas;
    } catch (error) {
      cache = null;
      status(
        "render-unavailable",
        String(error.message || error) + "; radar shown.",
      );
      return null;
    }
  }
  return {
    load,
    render,
    status: () => Object.assign({}, lastStatus),
    clear() {
      cache = null;
      assets = null;
    },
  };
}
