import test from "node:test";
import assert from "node:assert/strict";

const path = "../../cheat-engine/www/cheat/components/VirtualList.js";

async function component() {
  return (await import(path)).default;
}

function mount(definition, values) {
  const vm = Object.assign(
    { itemSize: 48, height: 330, overscan: 5 },
    definition.data.call({}),
    values,
  );
  Object.keys(definition.methods || {}).forEach((key) => {
    vm[key] = definition.methods[key].bind(vm);
  });
  Object.keys(definition.computed).forEach((key) => {
    Object.defineProperty(vm, key, {
      configurable: true,
      get: () => definition.computed[key].call(vm),
    });
  });
  return vm;
}

test("virtual list renders only the visible window plus overscan", async () => {
  const definition = await component();
  const items = [];
  for (let i = 0; i < 2000; i++) items.push({ id: i });
  const vm = mount(definition, { items, scroll: 4800 });
  assert.equal(vm.count, 2000);
  assert.equal(vm.first, 95);
  assert.equal(vm.span, 17);
  assert.equal(vm.window.length, 17);
  assert.equal(vm.window[0].item.id, 95);
  assert.equal(vm.window[16].item.id, 111);
  assert.equal(vm.offset, 95 * 48);
  assert.equal(vm.total, 2000 * 48);
});

test("virtual list clamps the window at both ends", async () => {
  const definition = await component();
  const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
  const top = mount(definition, { items, scroll: 0 });
  assert.equal(top.first, 0);
  assert.deepEqual(
    top.window.map((row) => row.item.id),
    [1, 2, 3],
  );
  const bottom = mount(definition, { items, scroll: 99999 });
  assert.ok(bottom.first < items.length);
  assert.equal(
    bottom.window[bottom.window.length - 1].item.id,
    3,
    "the window never runs past the last item",
  );
  const empty = mount(definition, { items: [], scroll: 500 });
  assert.equal(empty.first, 0);
  assert.deepEqual(empty.window, []);
  assert.equal(empty.total, 0);
});

test("virtual list resets its scroll position when the items change", async () => {
  const definition = await component();
  const scroller = { scrollTop: 900 };
  const vm = mount(definition, { items: [], scroll: 900, $refs: { scroller } });
  definition.watch.items.call(vm);
  assert.equal(vm.scroll, 0);
  assert.equal(scroller.scrollTop, 0);
  vm.onScroll({ target: { scrollTop: 240 } });
  assert.equal(vm.scroll, 240);
  vm.onScroll({ target: {} });
  assert.equal(vm.scroll, 0, "a missing scrollTop never yields NaN");
});

test("skill lists can preserve scroll across learning and clamp after removal", async () => {
  const definition = await component(),
    scroller = { scrollTop: 480, clientHeight: 200 };
  const vm = mount(definition, {
    items: Array.from({ length: 40 }),
    scroll: 480,
    preserveScroll: true,
    $refs: { scroller },
  });
  definition.watch.items.call(vm);
  assert.equal(vm.scroll, 480);
  assert.equal(scroller.scrollTop, 480);
  vm.items = Array.from({ length: 5 });
  definition.watch.items.call(vm);
  assert.equal(vm.scroll, 40);
  assert.equal(scroller.scrollTop, 40);
});
