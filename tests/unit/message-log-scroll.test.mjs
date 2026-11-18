import test from "node:test";
import assert from "node:assert/strict";
import {
  bottomScrollTop,
  isNearBottom,
  readMessageLogViewState,
  recordMessageLogScroll,
  resetMessageLogViewState,
  resolveMessageLogScrollTop,
  writeMessageLogViewState,
} from "../../cheat-engine/www/cheat/js/panels/history/MessageLogScroll.js";

test.afterEach(() => resetMessageLogViewState());

test("a log that fits without scrolling always counts as at the bottom", () => {
  assert.equal(
    isNearBottom({ scrollTop: 0, clientHeight: 400, scrollHeight: 400 }),
    true,
  );
});

test("the tail counts as the bottom only within the threshold", () => {
  const long = { clientHeight: 400, scrollHeight: 1400 };
  assert.equal(isNearBottom({ ...long, scrollTop: 1000 }), true);
  assert.equal(isNearBottom({ ...long, scrollTop: 975 }), true);
  assert.equal(isNearBottom({ ...long, scrollTop: 900 }), false);
});

test("bottomScrollTop pins the newest entry", () => {
  assert.equal(
    bottomScrollTop({ scrollTop: 0, clientHeight: 400, scrollHeight: 1400 }),
    1000,
  );
  assert.equal(
    bottomScrollTop({ scrollTop: 0, clientHeight: 400, scrollHeight: 200 }),
    0,
  );
});

test("a first visit follows the newest message", () => {
  assert.equal(readMessageLogViewState().known, false);
  const metrics = { scrollTop: 0, clientHeight: 400, scrollHeight: 1400 };
  assert.equal(resolveMessageLogScrollTop(readMessageLogViewState(), metrics), 1000);
});

test("scrolling up stops following and remembers the reading position", () => {
  const reading = { scrollTop: 250, clientHeight: 400, scrollHeight: 1400 };
  recordMessageLogScroll(reading);

  const state = readMessageLogViewState();
  assert.equal(state.followLatest, false);
  assert.equal(state.scrollTop, 250);

  // Switching panels and back must not yank the reader to the tail.
  assert.equal(resolveMessageLogScrollTop(state, reading), 250);
});

test("a reader who was at the tail comes back to the tail", () => {
  recordMessageLogScroll({ scrollTop: 1000, clientHeight: 400, scrollHeight: 1400 });
  const state = readMessageLogViewState();
  assert.equal(state.followLatest, true);

  // New messages arrived while the panel was closed.
  assert.equal(
    resolveMessageLogScrollTop(state, {
      scrollTop: 1000,
      clientHeight: 400,
      scrollHeight: 1800,
    }),
    1400,
  );
});

test("explicit view state overrides the remembered offset", () => {
  writeMessageLogViewState({ scrollTop: 40, followLatest: false });
  const state = readMessageLogViewState();
  assert.equal(state.known, true);
  assert.deepEqual(
    { scrollTop: state.scrollTop, followLatest: state.followLatest },
    { scrollTop: 40, followLatest: false },
  );
});

test("negative or missing offsets never produce a negative scroll", () => {
  assert.equal(
    resolveMessageLogScrollTop(
      { scrollTop: -50, followLatest: false, known: true },
      { clientHeight: 400, scrollHeight: 1400 },
    ),
    0,
  );
  assert.equal(
    recordMessageLogScroll({ scrollTop: undefined, clientHeight: 0, scrollHeight: 0 })
      .scrollTop,
    0,
  );
});
