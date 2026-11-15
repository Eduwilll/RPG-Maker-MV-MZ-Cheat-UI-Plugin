/** RAF is naturally throttled by the host; no intervals or work after teardown. */
export function startMapFrames(host, draw) {
  let stopped = false;
  let id;
  const frame = (time) => {
    if (stopped) return;
    id = host.requestAnimationFrame(frame);
    if (!host.document || !host.document.hidden) draw(time);
  };
  id = host.requestAnimationFrame(frame);
  return () => {
    stopped = true;
    host.cancelAnimationFrame(id);
  };
}
