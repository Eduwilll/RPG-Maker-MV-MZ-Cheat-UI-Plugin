export function previewViewport(width, height, mapWidth, mapHeight) {
  const unit = Math.min(width / mapWidth, height / mapHeight);
  return {
    ox: (width - mapWidth * unit) / 2,
    oy: (height - mapHeight * unit) / 2,
    unit,
    mapWidth,
    mapHeight,
  };
}
export function previewTile(view, x, y) {
  if (!view || !(view.unit > 0)) return null;
  const tx = Math.floor((x - view.ox) / view.unit),
    ty = Math.floor((y - view.oy) / view.unit);
  return tx >= 0 && ty >= 0 && tx < view.mapWidth && ty < view.mapHeight
    ? { x: tx, y: ty }
    : null;
}
