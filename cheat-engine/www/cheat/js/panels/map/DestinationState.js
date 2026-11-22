export function isDestinationValid(point, dimensions) {
  return !!(
    point &&
    dimensions &&
    point.mapId === dimensions.mapId &&
    Number.isInteger(point.x) &&
    Number.isInteger(point.y) &&
    point.x >= 0 &&
    point.y >= 0 &&
    point.x < dimensions.width &&
    point.y < dimensions.height
  );
}
