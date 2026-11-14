/** One tile-space viewport for rendering, hover and teleport hit testing. */
export function mapViewport(width, height, x, y, limited, maxSize) {
  const w = limited ? Math.min(width, maxSize) : width;
  const h = limited ? Math.min(height, maxSize) : height;
  const startX = limited
    ? Math.max(0, Math.min(width - w, Math.floor(x) - Math.floor(w / 2)))
    : 0;
  const startY = limited
    ? Math.max(0, Math.min(height - h, Math.floor(y) - Math.floor(h / 2)))
    : 0;
  return { startX, startY, endX: startX + w, endY: startY + h };
}

export function tileAtPointer(event, canvas, view) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;
  if (x < 0 || y < 0 || x >= 1 || y >= 1) return null;
  return {
    x: view.startX + Math.floor(x * (view.endX - view.startX)),
    y: view.startY + Math.floor(y * (view.endY - view.startY)),
  };
}
