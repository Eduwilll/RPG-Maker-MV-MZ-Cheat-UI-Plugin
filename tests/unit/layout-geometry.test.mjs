import test from "node:test";
import assert from "node:assert/strict";
test("overlay dimensions and minimap positions remain reachable on small viewports", async () => {
  const { boundedSize, boundedPosition } =
    await import("../../cheat-engine/www/cheat/js/ui/LayoutGeometry.js");
  assert.deepEqual(boundedSize(900, 900, 800, 600), {
    width: 800,
    height: 600,
  });
  assert.deepEqual(boundedSize(10, 10, 200, 150), { width: 200, height: 150 });
  assert.deepEqual(boundedPosition(-20, 900, 176, 800, 600), { x: 0, y: 424 });
  assert.deepEqual(boundedPosition(100, 100, 320, 200, 150), { x: 0, y: 0 });
});

test("released mouse buttons and focus loss end a drag and remove listeners", async () => {
  const { startPointerDrag } =
    await import("../../cheat-engine/www/cheat/js/ui/LayoutGeometry.js");
  const doc = new EventTarget();
  doc.defaultView = new EventTarget();
  let moved = 0,
    finished = 0;
  const start = () =>
    startPointerDrag(
      {
        button: 0,
        pointerId: 1,
        clientX: 0,
        clientY: 0,
        currentTarget: { ownerDocument: doc },
        preventDefault() {},
        stopPropagation() {},
      },
      () => moved++,
      () => finished++,
    );
  const move = (buttons) => {
    const event = new Event("pointermove", { cancelable: true });
    Object.assign(event, {
      pointerId: 1,
      pointerType: "mouse",
      buttons,
      clientX: 20,
      clientY: 20,
    });
    doc.dispatchEvent(event);
  };
  start();
  move(0);
  assert.equal(moved, 0);
  assert.equal(finished, 1);
  move(1);
  assert.equal(moved, 0);
  start();
  doc.defaultView.dispatchEvent(new Event("blur"));
  assert.equal(finished, 2);
  move(1);
  assert.equal(moved, 0);
});
