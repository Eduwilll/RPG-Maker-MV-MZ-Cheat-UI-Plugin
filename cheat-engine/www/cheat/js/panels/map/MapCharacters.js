import {
  createGameAssets,
  assetFrame,
  bitmapSource,
} from "../../runtime/GameAssets.js";
import {
  getGameWindow,
  getFeatureRuntime,
} from "../../runtime/FeatureRuntime.js";

/** Game-owned sprite sources stay private, never in reactive panel state. */
export function createMapCharacters(game, assets) {
  let live = new Map();
  let currentScene;
  const fallback = new Map();
  function readySprite(sprite, marker) {
    if (!marker.characterName && !marker.tileId) return null;
    const bitmap = sprite && sprite.bitmap;
    if (!bitmap || (bitmap.isReady && !bitmap.isReady())) return null;
    const image = bitmapSource(bitmap);
    if (!image) return null;
    let frame = sprite._frame;
    // Bush sprites can clear the parent frame; use its current sheet pose then.
    if ((!frame || !frame.width || !frame.height) && !marker.characterName)
      return null;
    if (!frame || !frame.width || !frame.height)
      frame = assetFrame(
        {
          type: "character",
          name: marker.characterName,
          index: marker.characterIndex,
          direction: marker.direction,
          pattern: marker.pattern,
        },
        image,
        game.ImageManager || {},
      );
    return {
      image,
      x: frame.x,
      y: frame.y,
      width: frame.width,
      height: frame.height,
    };
  }
  function fallbackFrame(marker) {
    if (!marker.characterName || !assets || !assets.readCharacterFrame)
      return null;
    const asset = {
      type: "character",
      name: marker.characterName,
      index: marker.characterIndex || 0,
      direction: marker.direction || 2,
      pattern: marker.pattern === undefined ? 1 : marker.pattern,
    };
    const key = JSON.stringify(asset);
    let entry = fallback.get(key);
    if (!entry) {
      if (fallback.size >= 96) fallback.delete(fallback.keys().next().value);
      entry = { source: null, pending: false, time: 0 };
      fallback.set(key, entry);
    }
    if (
      !entry.pending &&
      (!entry.time || Date.now() - entry.time > (entry.source ? 500 : 2000))
    ) {
      entry.pending = true;
      Promise.resolve()
        .then(() => assets.readCharacterFrame(asset))
        .then((source) => {
          entry.source = source;
          entry.pending = false;
          entry.time = Date.now();
        })
        .catch(() => {
          entry.pending = false;
          entry.time = Date.now();
        });
    }
    return entry.source;
  }
  return {
    beginFrame() {
      live = new Map();
      const scene = game.SceneManager && game.SceneManager._scene;
      if (scene !== currentScene) {
        fallback.clear();
        currentScene = scene;
      }
      const sprites =
        (scene && scene._spriteset && scene._spriteset._characterSprites) || [];
      sprites.forEach((sprite) => {
        const character = sprite && sprite._character;
        if (character && character._eventId)
          live.set(Number(character._eventId), sprite);
      });
    },
    draw(ctx, marker, view) {
      try {
        const sprite = live.get(marker.id);
        if (
          marker.transparent ||
          marker.opacity === 0 ||
          (sprite && (sprite.visible === false || sprite.opacity === 0))
        )
          return true;
        const source = readySprite(sprite, marker) || fallbackFrame(marker);
        if (!source) return false;
        if (
          !(source.width > 0 && source.height > 0) ||
          source.x < 0 ||
          source.y < 0 ||
          source.x + source.width > source.image.width ||
          source.y + source.height > source.image.height
        )
          return false;
        const map = game.$gameMap;
        const tw = map && map.tileWidth ? map.tileWidth() : 48,
          th = map && map.tileHeight ? map.tileHeight() : 48;
        const scale = view.scale || 1,
          width = (source.width / tw) * view.unit * scale,
          height = (source.height / th) * view.unit * scale;
        const anchor = (sprite && sprite.anchor) || { x: 0.5, y: 1 };
        const opacity =
          sprite && Number.isFinite(sprite.opacity)
            ? sprite.opacity
            : marker.opacity === undefined
              ? 255
              : marker.opacity;
        ctx.save();
        try {
          ctx.globalAlpha *= Math.max(0, Math.min(1, opacity / 255));
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(
            source.image,
            source.x,
            source.y,
            source.width,
            source.height,
            view.ox + (marker.x + 0.5) * view.unit - width * anchor.x,
            view.oy +
              (marker.y +
                1 -
                (marker.shiftY || 0) / th -
                (marker.jumpHeight || 0) / th) *
                view.unit -
              height * anchor.y,
            width,
            height,
          );
        } finally {
          ctx.restore();
        }
        return true;
      } catch (error) {
        return false;
      }
    },
  };
}

export function getMapCharacters() {
  const game = getGameWindow();
  if (!game) return null;
  if (!game.__cheatMapCharacters) {
    const runtime = getFeatureRuntime();
    game.__cheatMapCharacters = createMapCharacters(
      game,
      (runtime && runtime.assets) || createGameAssets(game),
    );
  }
  return game.__cheatMapCharacters;
}
