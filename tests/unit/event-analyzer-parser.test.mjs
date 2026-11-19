import test from "node:test";
import assert from "node:assert/strict";
import { CommandParser } from "../../cheat-engine/www/cheat/js/panels/event-analyzer/CommandParser.js";

/**
 * Build an RPG Maker command list entry.
 *
 * @param {number} code
 * @param {number} indent
 * @param {any[]} [parameters]
 */
const cmd = (code, indent, parameters = []) => ({ code, indent, parameters });

/**
 * A labelled marker command. Code 108 is Comment, whose formatted label is
 * "Comment: <text>", so assertions read through `textOf`.
 */
const mark = (label, indent = 0) => cmd(108, indent, [label]);

const textOf = (node) => String(node.label).replace(/^Comment: /, "");

const parse = (commands, db = null, dataSystem = null) =>
  new CommandParser(commands, db, dataSystem).parse();

test("a flat list becomes command nodes in order", () => {
  const nodes = parse([mark("one"), mark("two")]);

  assert.equal(nodes.length, 2);
  assert.ok(nodes.every((n) => n.kind === "command"));
  assert.deepEqual(
    nodes.map((n) => n.code),
    [108, 108],
  );
  assert.deepEqual(
    nodes.map((n) => n.commandIndex),
    [0, 1],
  );
});

test("a code 0 terminator ends the list", () => {
  const nodes = parse([mark("a"), cmd(0, 0), mark("b")]);

  assert.equal(nodes.length, 1, "parsing stops at the terminator");
  assert.equal(textOf(nodes[0]), "a");
});

test("a Conditional Branch nests the indented block after it", () => {
  const nodes = parse([cmd(111, 0, [0, 1, 0]), mark("inside", 1), cmd(412, 0)]);

  assert.equal(nodes.length, 1);
  const branch = nodes[0];
  assert.equal(branch.kind, "branch");
  assert.equal(branch.trueNodes.length, 1);
  assert.equal(textOf(branch.trueNodes[0]), "inside");
  assert.deepEqual(branch.falseNodes, []);
});

test("an Else (411) splits the FALSE block", () => {
  const nodes = parse([
    cmd(111, 0, [0, 1, 0]),
    mark("when true", 1),
    cmd(411, 0),
    mark("when false", 1),
    cmd(412, 0),
  ]);

  const branch = nodes[0];
  assert.equal(branch.trueNodes.length, 1);
  assert.equal(branch.falseNodes.length, 1);
  assert.equal(textOf(branch.trueNodes[0]), "when true");
  assert.equal(textOf(branch.falseNodes[0]), "when false");
});

test("a nested branch inside a branch keeps both levels", () => {
  const nodes = parse([
    cmd(111, 0, [0, 1, 0]),
    cmd(111, 1, [0, 2, 0]),
    mark("inner", 2),
    cmd(412, 1),
    mark("outer", 1),
    cmd(412, 0),
  ]);

  const outer = nodes[0];
  assert.equal(outer.trueNodes.length, 2);
  assert.equal(outer.trueNodes[0].kind, "branch");
  assert.equal(textOf(outer.trueNodes[0].trueNodes[0]), "inner");
  assert.equal(textOf(outer.trueNodes[1]), "outer");
});

test("a Loop (112) nests its body and consumes the 413 terminator", () => {
  const nodes = parse([
    cmd(112, 0),
    mark("repeat", 1),
    cmd(413, 0),
    mark("after loop"),
  ]);

  assert.equal(nodes.length, 2, "the terminator is consumed, not emitted");
  assert.equal(nodes[0].kind, "loop");
  assert.equal(nodes[0].bodyNodes.length, 1);
  assert.equal(textOf(nodes[1]), "after loop");
});

test("Show Choices (102) builds one branch per 402/403 and stops at 404", () => {
  const nodes = parse([
    cmd(102, 0, [["Yes", "No"], 0]),
    cmd(402, 0, [0]),
    mark("yes path", 1),
    cmd(403, 0),
    mark("cancel path", 1),
    cmd(404, 0),
    mark("after"),
  ]);

  assert.equal(nodes.length, 2);
  const choices = nodes[0];
  assert.equal(choices.kind, "choices");
  assert.deepEqual(choices.choiceTexts, ["Yes", "No"]);
  assert.equal(choices.branches.length, 2);
  assert.equal(choices.branches[0].label, "Yes");
  assert.equal(choices.branches[1].label, "Cancel");
  assert.equal(textOf(nodes[1]), "after");
});

test("Show Text (101) collects its 401 continuation lines into the node", () => {
  const nodes = parse([
    cmd(101, 0, ["Actor1", 0, 2, 2]),
    cmd(401, 1, ["Line one"]),
    cmd(401, 1, ["Line two"]),
    mark("after"),
  ]);

  assert.equal(nodes.length, 2);
  assert.equal(nodes[0].kind, "command");
  assert.equal(nodes[0].code, 101);
  assert.deepEqual(nodes[0].textLines, ["Line one", "Line two"]);
  assert.equal(textOf(nodes[1]), "after");
});

test("a standalone continuation line is dropped, not emitted as a node", () => {
  // 401 without a preceding 101: the parser skips it rather than rendering it.
  const nodes = parse([cmd(401, 1, ["orphan"]), mark("real")]);

  assert.equal(nodes.length, 1);
  assert.equal(textOf(nodes[0]), "real");
});

test("an unexpected block-end code does not stall the parser", () => {
  // 412 with no open branch. Before the guard this was an infinite loop that
  // froze the panel, because _parseNextCommand returns null without advancing.
  const nodes = parse([cmd(412, 0), mark("still parsed")]);

  assert.equal(nodes.length, 1, "the stray end code is skipped");
  assert.equal(textOf(nodes[0]), "still parsed");
});

test("every stray block-end code at top level is consumed", () => {
  for (const code of [411, 412, 413, 404, 403]) {
    const nodes = parse([cmd(code, 0), mark(`after ${code}`)]);
    assert.equal(nodes.length, 1, `code ${code} must not stall or emit a node`);
    assert.equal(textOf(nodes[0]), `after ${code}`);
  }
});

test("a malformed event list cannot spin the parser forever", () => {
  // Regression guard for the hang: a block-end at top level used to return
  // null without advancing, so _parseBlock looped on the same command.
  const started = Date.now();
  const nodes = parse([
    cmd(412, 0),
    cmd(412, 0),
    cmd(411, 0),
    cmd(404, 0),
    mark("recovered"),
  ]);

  assert.equal(nodes.length, 1);
  assert.equal(textOf(nodes[0]), "recovered");
  assert.ok(Date.now() - started < 2000, "parsing returned promptly");
});

test("a block-end deeper than the branch is not its terminator", () => {
  // _parseConditionalBranch only accepts 412 at its own indent, so a deep end
  // does not close the block. It is skipped and the branch keeps its body.
  const nodes = parse([
    cmd(111, 0, [0, 1, 0]),
    cmd(412, 2),
    mark("still inside", 1),
    cmd(412, 0),
  ]);

  assert.equal(nodes.length, 1, "only the branch, no stray top-level node");
  const branch = nodes[0];
  assert.equal(branch.kind, "branch");
  assert.equal(branch.trueNodes.length, 1, "the deep 412 did not end the block");
  assert.equal(textOf(branch.trueNodes[0]), "still inside");
});

test("an empty command list parses to no nodes", () => {
  assert.deepEqual(parse([]), []);
});

test("a non-array command list is tolerated", () => {
  assert.deepEqual(parse(null), []);
  assert.deepEqual(parse(undefined), []);
});

test("commandIndex refers to the position in the original list", () => {
  const commands = [
    cmd(111, 0, [0, 1, 0]),
    mark("body", 1),
    cmd(412, 0),
    mark("tail"),
  ];
  const nodes = parse(commands);

  assert.equal(nodes[0].commandIndex, 0, "the branch header");
  assert.equal(nodes[0].trueNodes[0].commandIndex, 1, "the body command");
  assert.equal(nodes[1].commandIndex, 3, "the tail after the terminator");
});

test("a branch node carries its condition string", () => {
  const dataSystem = { switches: ["", "Test Switch"] };
  const nodes = parse([cmd(111, 0, [0, 1, 0]), cmd(412, 0)], null, dataSystem);

  assert.match(nodes[0].condition, /Test Switch/);
});