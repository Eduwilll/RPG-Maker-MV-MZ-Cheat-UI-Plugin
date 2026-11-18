import { loadEncryptedBitmap } from "./EncryptedImage.js";
import { compositeSource, composeOptionalFace } from "./CompositeAssets.js";
const TABLES = {
  item: "$dataItems",
  weapon: "$dataWeapons",
  armor: "$dataArmors",
  skill: "$dataSkills",
  state: "$dataStates",
};
/** Read existing pixels without invoking MV's texture-changing lazy canvas getter. */
export function bitmapSource(bitmap) {
  if (!bitmap) return null;
  for (const key of ["__canvas", "_canvas", "_image", "canvas"]) {
    const own = Object.getOwnPropertyDescriptor(bitmap, key);
    if (own && Object.prototype.hasOwnProperty.call(own, "value") && own.value)
      return own.value;
  }
  return null;
}
function value(record, key, fallback) {
  if (!record) return fallback;
  return typeof record[key] === "function"
    ? record[key]()
    : record[key] === undefined
      ? fallback
      : record[key];
}
export function assetFrame(asset, image, manager) {
  if (asset.type === "face") {
    const w = asset.frameWidth || manager.faceWidth || 144,
      h = asset.frameHeight || manager.faceHeight || 144,
      i = Math.max(0, Math.min(7, Number(asset.index) || 0));
    return { x: (i % 4) * w, y: Math.floor(i / 4) * h, width: w, height: h };
  }
  if (asset.type === "icon") {
    const w = manager.iconWidth || 32,
      h = manager.iconHeight || 32,
      i = Math.max(0, Math.floor(Number(asset.index) || 0));
    return { x: (i % 16) * w, y: Math.floor(i / 16) * h, width: w, height: h };
  }
  if (asset.type === "character") {
    const big = manager.isBigCharacter
        ? manager.isBigCharacter(asset.name)
        : /^[!$]*\$/.test(asset.name),
      w = image.width / (big ? 3 : 12),
      h = image.height / (big ? 4 : 8),
      i = big ? 0 : Math.max(0, Math.min(7, Number(asset.index) || 0)),
      pattern =
        asset.pattern === undefined
          ? 1
          : Math.max(0, Math.min(2, Number(asset.pattern) || 0)),
      direction =
        [2, 4, 6, 8].indexOf(Number(asset.direction)) >= 0
          ? (Number(asset.direction) - 2) / 2
          : 0;
    return {
      x: ((i % 4) * 3 + pattern) * w,
      y: (Math.floor(i / 4) * 4 + direction) * h,
      width: w,
      height: h,
    };
  }
  return { x: 0, y: 0, width: image.width, height: image.height };
}

/** Private engine bitmaps support encryption without entering ImageManager's fatal-error cache. */
export function loadOptionalBitmap(game, asset) {
  return new Promise((resolve, reject) => {
    let timer;
    try {
      const folders = {
        face: "faces",
        character: "characters",
        enemy: asset.sideView ? "sv_enemies" : "enemies",
        icon: "system",
        tileset: "tilesets",
        picture: "pictures",
      };
      const name = asset.type === "icon" ? "IconSet" : asset.name;
      if (!name || /(^|\/)\.\.(\/|$)|[:\\]/.test(name) || !folders[asset.type])
        throw Error("Invalid asset name");
      const url = new URL(
        "img/" +
          folders[asset.type] +
          "/" +
          name.split("/").map(encodeURIComponent).join("/") +
          ".png",
        game.location.href,
      ).href;
      const mvEncrypted = !!(
        game.Decrypter &&
        game.Decrypter.hasEncryptedImages &&
        !game.Decrypter.checkImgIgnore(url)
      );
      const mzEncrypted = !!(
        game.Utils &&
        game.Utils.hasEncryptedImages &&
        game.Utils.hasEncryptedImages()
      );
      if (mvEncrypted || mzEncrypted) {
        loadEncryptedBitmap(game, url, mvEncrypted)
          .then((bitmap) => {
            if (asset.hue && bitmap.rotateHue) bitmap.rotateHue(asset.hue);
            return bitmap;
          })
          .then(resolve, reject);
        return;
      }
      let bitmap;
      if (game.Bitmap.prototype && game.Bitmap.prototype._requestImage) {
        bitmap = Object.create(game.Bitmap.prototype);
        bitmap._defer = true;
        bitmap.initialize();
        bitmap._decodeAfterRequest = true;
        bitmap._loader = () => bitmap._onError();
        bitmap._requestImage(url);
      } else bitmap = game.Bitmap.load(url);
      const start = Date.now();
      const check = () => {
        try {
          if (bitmap.isError && bitmap.isError())
            throw Error("Image unavailable");
          if (!bitmap.isReady || bitmap.isReady()) {
            if (asset.hue && bitmap.rotateHue) bitmap.rotateHue(asset.hue);
            clearInterval(timer);
            resolve(bitmap);
          } else if (Date.now() - start > 8000) throw Error("Image timed out");
        } catch (error) {
          clearInterval(timer);
          reject(error);
        }
      };
      timer = setInterval(check, 50);
      check();
    } catch (error) {
      clearInterval(timer);
      reject(error);
    }
  });
}

/* Troops are drawn the way the engine draws them: one enemy image per member,
   anchored bottom-centre on the authored battle position. Compositing avoids
   games that split a single creature across torso/head/limb records, where any
   single record shows an incomplete silhouette. */
const TROOP_MAX_MEMBERS = 32;
const TROOP_HIDDEN_ALPHA = 0.4;
const TROOP_MAX_COMPOSITES = 24;
const TROOP_SIZES = [96, 160, 320];

function troopSize(width, height) {
  const longest = Math.max(Number(width) || 0, Number(height) || 0);
  for (const size of TROOP_SIZES) if (longest <= size) return size;
  return TROOP_SIZES[TROOP_SIZES.length - 1];
}

/** Bottom-centre anchoring mirrors Sprite_Enemy; fall back to a plain row. */
function placeTroopMembers(placed) {
  const positioned = placed.every(
    (entry) =>
      Number.isFinite(entry.member.x) && Number.isFinite(entry.member.y),
  );
  let cursor = 0;
  let tallest = 0;
  placed.forEach((entry) => {
    tallest = Math.max(tallest, entry.image.height);
    if (positioned) {
      entry.left = entry.member.x - entry.image.width / 2;
      entry.top = entry.member.y - entry.image.height;
    } else {
      entry.left = cursor;
      cursor += entry.image.width + 4;
    }
  });
  if (!positioned)
    placed.forEach((entry) => {
      entry.top = tallest - entry.image.height;
    });
  const left = Math.min.apply(
    null,
    placed.map((entry) => entry.left),
  );
  const top = Math.min.apply(
    null,
    placed.map((entry) => entry.top),
  );
  const right = Math.max.apply(
    null,
    placed.map((entry) => entry.left + entry.image.width),
  );
  const bottom = Math.max.apply(
    null,
    placed.map((entry) => entry.top + entry.image.height),
  );
  return {
    left,
    top,
    width: Math.max(1, Math.round(right - left)),
    height: Math.max(1, Math.round(bottom - top)),
  };
}

export function createGameAssets(game, loader) {
  const cache = new Map();
  const troopCache = new Map();
  const pendingGenerated = new WeakMap();
  function readyGenerated(bitmap) {
    if (!bitmap.isReady || bitmap.isReady()) return Promise.resolve(bitmap);
    if (!pendingGenerated.has(bitmap))
      pendingGenerated.set(
        bitmap,
        new Promise((resolve) => {
          const start = Date.now();
          const timer = setInterval(() => {
            try {
              if (
                (bitmap.isError && bitmap.isError()) ||
                Date.now() - start > 8000
              ) {
                clearInterval(timer);
                resolve(null);
              } else if (bitmap.isReady()) {
                clearInterval(timer);
                resolve(bitmap);
              }
            } catch (error) {
              clearInterval(timer);
              resolve(null);
            }
          }, 50);
        }),
      );
    return pendingGenerated.get(bitmap);
  }
  async function readBitmap(asset, seen) {
    const virtual = compositeSource(game, asset);
    if (virtual) {
      if (virtual.bitmap) {
        if (virtual.bitmap.isError && virtual.bitmap.isError()) return null;
        return readyGenerated(virtual.bitmap);
      }
      if (asset.type !== "face") return null;
      const visited = new Set(seen || []);
      if (visited.has(asset.name) || visited.size >= 8) return null;
      visited.add(asset.name);
      const key =
        "composite:" +
        asset.type +
        ":" +
        asset.name +
        ":" +
        JSON.stringify(virtual.layers);
      if (!cache.has(key)) {
        if (cache.size >= 64) cache.delete(cache.keys().next().value);
        cache.set(
          key,
          composeOptionalFace(
            game,
            virtual,
            (name, ancestors) =>
              readBitmap({ type: "face", name }, ancestors).catch(() => null),
            visited,
          ).catch(() => null),
        );
      }
      return cache.get(key);
    }
    const key = [
      asset.type,
      asset.name || "IconSet",
      asset.hue || 0,
      asset.sideView || false,
    ].join(":");
    if (!cache.has(key)) {
      if (cache.size >= 64) cache.delete(cache.keys().next().value);
      cache.set(
        key,
        Promise.resolve()
          .then(() => (loader || loadOptionalBitmap)(game, asset))
          .catch(() => null),
      );
    }
    return cache.get(key);
  }
  function isSideView() {
    return !!(
      game.$gameSystem &&
      game.$gameSystem.isSideView &&
      game.$gameSystem.isSideView()
    );
  }
  function describe(kind, id) {
    id = Number(id);
    if (kind === "actor" || kind === "actorSprite") {
      const actor =
        (game.$gameActors &&
          game.$gameActors._data &&
          game.$gameActors._data[id]) ||
        (game.$dataActors && game.$dataActors[id]);
      if (!actor) return null;
      const face = value(actor, "faceName", actor._faceName || "");
      if (kind === "actor" && face)
        return {
          type: "face",
          name: String(face),
          index: Number(value(actor, "faceIndex", actor._faceIndex || 0)),
          actorId: id,
        };
      return {
        type: "character",
        name: String(value(actor, "characterName", actor._characterName || "")),
        index: Number(
          value(actor, "characterIndex", actor._characterIndex || 0),
        ),
        actorId: id,
      };
    }
    if (kind === "enemy") {
      const row = game.$dataEnemies && game.$dataEnemies[id];
      return row
        ? {
            type: "enemy",
            name: String(row.battlerName || ""),
            hue: Number(row.battlerHue) || 0,
            sideView: isSideView(),
          }
        : null;
    }
    if (kind === "troop") {
      const troop = game.$dataTroops && game.$dataTroops[id];
      if (!troop || !Array.isArray(troop.members)) return null;
      const members = [];
      for (const member of troop.members) {
        if (members.length >= TROOP_MAX_MEMBERS) break;
        if (!member) continue;
        const row = game.$dataEnemies && game.$dataEnemies[member.enemyId];
        const name = row ? String(row.battlerName || "") : "";
        if (!name) continue;
        members.push({
          name,
          hue: Number(row.battlerHue) || 0,
          x: Number(member.x),
          y: Number(member.y),
          hidden: !!member.hidden,
        });
      }
      return members.length
        ? { type: "troop", members, sideView: isSideView() }
        : null;
    }
    const row = TABLES[kind] && game[TABLES[kind]] && game[TABLES[kind]][id];
    return row ? { type: "icon", index: Number(row.iconIndex) || 0 } : null;
  }
  async function composeTroop(asset, size) {
    const members = asset.members.slice(0, TROOP_MAX_MEMBERS);
    const loaded = await Promise.all(
      members.map((member) =>
        readBitmap({
          type: "enemy",
          name: member.name,
          hue: member.hue,
          sideView: asset.sideView,
        }).catch(() => null),
      ),
    );
    const placed = [];
    loaded.forEach((bitmap, index) => {
      const image = bitmapSource(bitmap);
      if (!image || !image.width || !image.height) return;
      placed.push({ image, member: members[index] });
    });
    if (!placed.length) return null;
    const box = placeTroopMembers(placed);
    const scale = Math.min(1, size / Math.max(box.width, box.height));
    const canvas = game.document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(box.width * scale));
    canvas.height = Math.max(1, Math.round(box.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    placed.forEach((entry) => {
      ctx.globalAlpha = entry.member.hidden ? TROOP_HIDDEN_ALPHA : 1;
      ctx.drawImage(
        entry.image,
        Math.round((entry.left - box.left) * scale),
        Math.round((entry.top - box.top) * scale),
        Math.max(1, Math.round(entry.image.width * scale)),
        Math.max(1, Math.round(entry.image.height * scale)),
      );
    });
    ctx.globalAlpha = 1;
    return { canvas, width: canvas.width, height: canvas.height };
  }
  function troopBitmap(asset, width, height) {
    const size = troopSize(width, height);
    const key = [
      "troop",
      size,
      asset.sideView ? "sv" : "front",
      asset.members
        .map(
          (member) =>
            member.name +
            "@" +
            member.hue +
            "@" +
            member.x +
            "," +
            member.y +
            (member.hidden ? "?" : ""),
        )
        .join("|"),
    ].join(":");
    if (!troopCache.has(key)) {
      if (troopCache.size >= TROOP_MAX_COMPOSITES)
        troopCache.delete(troopCache.keys().next().value);
      troopCache.set(
        key,
        composeTroop(asset, size).catch(() => null),
      );
    }
    return troopCache.get(key);
  }
  async function paintTroop(canvas, asset, current) {
    const composed = await troopBitmap(
      asset,
      canvas.width,
      canvas.height,
    ).catch(() => null);
    if (!composed || (current && !current())) return false;
    try {
      const ctx = canvas.getContext("2d");
      if (!ctx) return false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const fit = Math.min(
        canvas.width / composed.width,
        canvas.height / composed.height,
      );
      const w = composed.width * fit,
        h = composed.height * fit;
      ctx.drawImage(
        composed.canvas,
        (canvas.width - w) / 2,
        (canvas.height - h) / 2,
        w,
        h,
      );
      return true;
    } catch (error) {
      return false;
    }
  }
  async function paint(canvas, asset, current) {
    if (!asset) return false;
    if (asset.type === "troop") return paintTroop(canvas, asset, current);
    if (!asset.name && asset.type !== "icon") return false;
    const bitmap = await readBitmap(asset).catch(() => null);
    if (!bitmap || (current && !current())) return false;
    try {
      const image = bitmapSource(bitmap);
      if (!image) return false;
      const frame =
        asset.type === "face" && compositeSource(game, asset)
          ? Object.assign({}, asset, {
              frameWidth: image.width / 4,
              frameHeight: image.height / 2,
            })
          : asset;
      const f = assetFrame(frame, image, game.ImageManager || {});
      if (
        !f.width ||
        !f.height ||
        f.x + f.width > image.width ||
        f.y + f.height > image.height
      )
        return false;
      const ctx = canvas.getContext("2d");
      if (!ctx) return false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const fit = Math.min(canvas.width / f.width, canvas.height / f.height);
      const w = f.width * fit,
        h = f.height * fit;
      if (ctx.save) ctx.save();
      if (asset.hue && !bitmap.rotateHue)
        ctx.filter = "hue-rotate(" + Number(asset.hue) + "deg)";
      ctx.drawImage(
        image,
        f.x,
        f.y,
        f.width,
        f.height,
        (canvas.width - w) / 2,
        (canvas.height - h) / 2,
        w,
        h,
      );
      if (ctx.restore) ctx.restore();
      return true;
    } catch (error) {
      return false;
    }
  }
  async function readCharacterFrame(asset) {
    if (!asset || asset.type !== "character" || !asset.name) return null;
    const bitmap = await readBitmap(asset).catch(() => null);
    const image = bitmapSource(bitmap);
    return image
      ? Object.assign(
          { image },
          assetFrame(asset, image, game.ImageManager || {}),
        )
      : null;
  }
  return { describe, paint, readCharacterFrame };
}
