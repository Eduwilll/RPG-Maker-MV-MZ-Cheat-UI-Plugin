export function boundedSize(width, height, viewportWidth, viewportHeight) {
  const vw = Math.max(1, Number(viewportWidth) || 750),
    vh = Math.max(1, Number(viewportHeight) || 450);
  return {
    width: Math.round(
      Math.min(vw, Math.max(Math.min(320, vw), Number(width) || 750)),
    ),
    height: Math.round(
      Math.min(vh, Math.max(Math.min(240, vh), Number(height) || 450)),
    ),
  };
}
export function boundedPosition(x, y, size, width, height) {
  return {
    x: Math.round(
      Math.max(0, Math.min(Math.max(0, width - size), Number(x) || 0)),
    ),
    y: Math.round(
      Math.max(0, Math.min(Math.max(0, height - size), Number(y) || 0)),
    ),
  };
}
/** One pointer lifecycle shared by resize and minimap handles. No permanent input hooks. */
export function startPointerDrag(event, move, finish) {
  if (event.button !== undefined && event.button !== 0) return () => {};
  const doc = event.currentTarget.ownerDocument;
  const view = doc.defaultView;
  const target = event.currentTarget;
  let active = true;
  const id = event.pointerId;
  const stop = (e) => {
    if (e.cancelable) e.preventDefault();
    e.stopPropagation();
  };
  stop(event);
  const onMove = (e) => {
    if (!active) return;
    if (e.pointerId === id) {
      if (
        (e.pointerType === "mouse" || event.pointerType === "mouse") &&
        e.buttons === 0
      ) {
        endDrag();
        return;
      }
      stop(e);
      move(e.clientX - event.clientX, e.clientY - event.clientY);
    }
  };
  const cleanup = () => {
    active = false;
    doc.removeEventListener("pointermove", onMove, true);
    doc.removeEventListener("pointerup", onEnd, true);
    doc.removeEventListener("pointercancel", onEnd, true);
    doc.removeEventListener("visibilitychange", onVisibility, true);
    if (target.removeEventListener)
      target.removeEventListener("lostpointercapture", onEnd, true);
    if (view) view.removeEventListener("blur", endDrag, true);
  };
  const endDrag = () => {
    if (!active) return;
    cleanup();
    if (finish) finish();
  };
  const onVisibility = () => {
    if (doc.hidden) endDrag();
  };
  const onEnd = (e) => {
    if (!active) return;
    if (e.pointerId === id) {
      stop(e);
      endDrag();
    }
  };
  doc.addEventListener("pointermove", onMove, true);
  doc.addEventListener("pointerup", onEnd, true);
  doc.addEventListener("pointercancel", onEnd, true);
  doc.addEventListener("visibilitychange", onVisibility, true);
  if (target.addEventListener)
    target.addEventListener("lostpointercapture", onEnd, true);
  if (view) view.addEventListener("blur", endDrag, true);
  return cleanup;
}
