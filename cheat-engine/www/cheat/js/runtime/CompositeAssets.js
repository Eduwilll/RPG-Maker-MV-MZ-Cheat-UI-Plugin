/** Known virtual assets are not physical files; prefer the game's already generated bitmap. */
export function compositeSource(game, asset) {
  const kc = game.KCDev && game.KCDev.CompositeBitmaps;
  if (!kc) return null;
  const layers =
    asset.type === "face"
      ? kc.faceLayers
      : asset.type === "character"
        ? kc.tvCharLayers
        : asset.type === "picture"
          ? kc.picLayers
          : null;
  if (!layers || !layers[asset.name]) return null;
  const prefix =
    asset.type === "face"
      ? kc.FACE_PREFIX
      : asset.type === "character"
        ? kc.TOP_VIEW_PREFIX
        : kc.PICTURE_PREFIX;
  const entry = kc.cache && kc.cache.get(prefix + asset.name);
  return {
    layers: layers[asset.name],
    bitmap: entry && entry.bitmap,
    type: asset.type,
  };
}

export async function composeOptionalFace(game, source, loadLayer, seen) {
  const loaded = await Promise.all(
    source.layers.map(async (info) => ({
      info,
      bitmap: await loadLayer(info.filename, seen),
    })),
  );
  const fw = game.ImageManager.faceWidth || 144,
    fh = game.ImageManager.faceHeight || 144;
  let width = fw * 4,
    height = fh * 2;
  loaded.forEach(({ info, bitmap }) => {
    const image = bitmap && (bitmap.canvas || bitmap._canvas || bitmap._image);
    if (image && info.index < 0) {
      width = Math.max(width, image.width);
      height = Math.max(height, image.height);
    }
  });
  if (width * height > 8388608)
    throw Error("Composite face exceeds preview size limit.");
  const canvas = game.document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  let painted = false;
  loaded.forEach(({ info, bitmap }) => {
    const image = bitmap && (bitmap.canvas || bitmap._canvas || bitmap._image);
    if (!image) return;
    if (info.index < 0) ctx.drawImage(image, 0, 0);
    else {
      const index = Number(info.index) || 0;
      for (let y = 0; y < height; y += fh)
        for (let x = 0; x < width; x += fw)
          ctx.drawImage(
            image,
            (index % 4) * fw,
            Math.floor(index / 4) * fh,
            fw,
            fh,
            x,
            y,
            fw,
            fh,
          );
    }
    painted = true;
  });
  return painted ? { canvas, isReady: () => true } : null;
}
