const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const finite = (value, fallback) => (Number.isFinite(value) ? value : fallback);

/** One pixel/tile transform for drawing, navigation and selection. */
export function mapCamera(options) {
  const mapWidth = Math.max(1, finite(options.mapWidth, 1));
  const mapHeight = Math.max(1, finite(options.mapHeight, 1));
  const width = Math.max(1, finite(options.width, 1));
  const height = Math.max(1, finite(options.height, 1));
  const zoom = clamp(finite(options.zoom, 1), 1, 64);
  const unit = Math.min(width / mapWidth, height / mapHeight) * zoom;
  const bound = (point, total, span) =>
    span >= total ? total / 2 : clamp(point, span / 2, total - span / 2);
  const x = bound(finite(options.x, mapWidth / 2), mapWidth, width / unit);
  const y = bound(finite(options.y, mapHeight / 2), mapHeight, height / unit);
  return {
    mapWidth,
    mapHeight,
    width,
    height,
    zoom,
    x,
    y,
    unit,
    ox: width / 2 - x * unit,
    oy: height / 2 - y * unit,
  };
}

export function worldAtPoint(view, x, y) {
  if (x < 0 || y < 0 || x >= view.width || y >= view.height) return null;
  const point = { x: (x - view.ox) / view.unit, y: (y - view.oy) / view.unit };
  return point.x >= 0 &&
    point.y >= 0 &&
    point.x < view.mapWidth &&
    point.y < view.mapHeight
    ? point
    : null;
}

export function panCamera(view, dx, dy) {
  return mapCamera(
    Object.assign({}, view, {
      x: view.x - dx / view.unit,
      y: view.y - dy / view.unit,
    }),
  );
}

export function zoomCamera(view, factor, point) {
  const pivot = point || { x: view.width / 2, y: view.height / 2 };
  const before = {
    x: (pivot.x - view.ox) / view.unit,
    y: (pivot.y - view.oy) / view.unit,
  };
  const next = mapCamera(Object.assign({}, view, { zoom: view.zoom * factor }));
  return mapCamera(
    Object.assign({}, next, {
      x: before.x - (pivot.x - view.width / 2) / next.unit,
      y: before.y - (pivot.y - view.height / 2) / next.unit,
    }),
  );
}
