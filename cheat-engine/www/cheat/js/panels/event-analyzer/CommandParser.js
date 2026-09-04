// @ts-check

import {
  CONTINUATION_CODES,
  BLOCK_END_CODES,
  formatBranchCondition,
  formatCommandLabel,
} from "./EventAnalyzerCommands.js";

// ─────────────────────────────────────────────────────────────────────────────
// CommandParser
//
// Converts the flat RPG Maker MV/MZ command list (an array of
// { code, indent, parameters } objects) into a structured tree of nodes:
//
//   { kind: 'command',  code, params, label }
//   { kind: 'branch',   condition, trueNodes, falseNodes }
//   { kind: 'choices',  options, branches: [{ label, nodes }] }
//   { kind: 'loop',     bodyNodes }
//
// The parser does NOT resolve inter-event references (Common Event calls,
// Battle Processing) — that is the SequenceTracer's job.
// ─────────────────────────────────────────────────────────────────────────────

export class CommandParser {
  /**
   * @param {any[]} commands - event page command list
   * @param {any | null} db  - EventDatabase (for label look-ups only)
   * @param {any | null} dataSystem - $dataSystem (for switch/var names)
   */
  constructor(commands, db, dataSystem) {
    this.commands = Array.isArray(commands) ? commands : [];
    this.db = db;
    this.dataSystem = dataSystem;
    this.i = 0;
  }

  /**
   * Parse the full command list and return the structured node array.
   * @returns {any[]}
   */
  parse() {
    this.i = 0;
    return this._parseBlock(/* parentIndent */ -1);
  }

  // ── Block parsing ──────────────────────────────────────────────────────────

  /**
   * Parse commands until we hit an indent ≤ parentIndent, or a block-end
   * code at that same indent level.
   *
   * @param {number} parentIndent  -1 means "top level; never stop early"
   * @returns {any[]}
   */
  _parseBlock(parentIndent) {
    const nodes = [];

    while (this.i < this.commands.length) {
      const cmd = this.commands[this.i];
      if (!cmd || cmd.code === 0) break;

      // Returned to a parent indent level — stop, let parent handle
      if (parentIndent >= 0 && cmd.indent <= parentIndent) break;

      const node = this._parseNextCommand();
      if (node !== null) nodes.push(node);
    }

    return nodes;
  }

  // ── Command dispatch ───────────────────────────────────────────────────────

  /**
   * Parse and consume the next command, returning a structured node
   * (or null for skipped codes).
   * @returns {any | null}
   */
  _parseNextCommand() {
    if (this.i >= this.commands.length) return null;
    const cmd = this.commands[this.i];

    if (!cmd || cmd.code === 0) return null;

    // Continuation lines — belong to the previous command, never standalone
    if (CONTINUATION_CODES.has(cmd.code)) {
      this.i++;
      return null;
    }

    // Block-end codes — the parent block will consume them, not us
    if (BLOCK_END_CODES.has(cmd.code)) {
      // Do NOT advance — parent needs to see this
      return null;
    }

    switch (cmd.code) {
      case 111:
        return this._parseConditionalBranch();
      case 112:
        return this._parseLoop();
      case 102:
        return this._parseShowChoices();
      case 101:
        return this._parseShowText(101, 401);
      case 105:
        return this._parseShowText(105, 405);
      case 108:
        return this._parseShowText(108, 408);
      default: {
        const cmdIndex = this.i;
        this.i++;
        return {
          kind: "command",
          code: cmd.code,
          commandIndex: cmdIndex,
          params: cmd.parameters || [],
          indent: cmd.indent,
          label: formatCommandLabel(cmd, this.db, this.dataSystem),
        };
      }
    }
  }

  // ── Structured blocks ──────────────────────────────────────────────────────

  /**
   * Parse code 101/105/108 + their continuation lines (401/405/408).
   * @param {number} headerCode
   * @param {number} continuationCode
   */
  _parseShowText(headerCode, continuationCode) {
    const cmdIndex = this.i;
    const cmd = this.commands[this.i];
    const headerParams = cmd.parameters || [];
    this.i++; // consume header

    const textLines = [];
    while (
      this.i < this.commands.length &&
      this.commands[this.i].code === continuationCode
    ) {
      textLines.push(String(this.commands[this.i].parameters[0] || ""));
      this.i++;
    }

    const enriched = { ...cmd, parameters: headerParams, textLines };
    return {
      kind: "command",
      code: headerCode,
      commandIndex: cmdIndex,
      params: headerParams,
      textLines,
      indent: cmd.indent,
      label: formatCommandLabel(enriched, this.db, this.dataSystem),
    };
  }

  /**
   * Parse a Conditional Branch (111) with TRUE and optional FALSE block.
   * @returns {any}
   */
  _parseConditionalBranch() {
    const cmdIndex = this.i;
    const cmd = this.commands[this.i];
    const branchIndent = cmd.indent;
    const condition = formatBranchCondition(
      cmd.parameters || [],
      this.dataSystem,
    );
    this.i++; // consume 111

    // TRUE block — commands at indent > branchIndent, until 411/412
    const trueNodes = this._parseBlock(branchIndent);

    // Optional FALSE block (preceded by 411 Else at branchIndent)
    let falseNodes = [];
    if (
      this.i < this.commands.length &&
      this.commands[this.i].code === 411 &&
      this.commands[this.i].indent === branchIndent
    ) {
      this.i++; // consume 411
      falseNodes = this._parseBlock(branchIndent);
    }

    // Consume 412 End at branchIndent
    if (
      this.i < this.commands.length &&
      this.commands[this.i].code === 412 &&
      this.commands[this.i].indent === branchIndent
    ) {
      this.i++;
    }

    return {
      kind: "branch",
      commandIndex: cmdIndex,
      condition,
      trueNodes,
      falseNodes,
      indent: branchIndent,
    };
  }

  /**
   * Parse a Loop (112) with its body commands.
   * @returns {any}
   */
  _parseLoop() {
    const cmdIndex = this.i;
    const cmd = this.commands[this.i];
    const loopIndent = cmd.indent;
    this.i++; // consume 112

    const bodyNodes = this._parseBlock(loopIndent);

    // Consume 413 End Loop
    if (
      this.i < this.commands.length &&
      this.commands[this.i].code === 413 &&
      this.commands[this.i].indent === loopIndent
    ) {
      this.i++;
    }

    return {
      kind: "loop",
      commandIndex: cmdIndex,
      bodyNodes,
      indent: loopIndent,
    };
  }

  /**
   * Parse Show Choices (102) with each choice branch (402/403) and end (404).
   * @returns {any}
   */
  _parseShowChoices() {
    const cmdIndex = this.i;
    const cmd = this.commands[this.i];
    const choiceIndent = cmd.indent;
    const choiceTexts = cmd.parameters[0] || [];
    const cancelType = cmd.parameters[1]; // -2=branch, -1=disallow, ≥0=choice idx
    this.i++; // consume 102

    const branches = [];

    while (this.i < this.commands.length) {
      const c = this.commands[this.i];

      // End of choices
      if (c.code === 404 && c.indent === choiceIndent) {
        this.i++;
        break;
      }

      // When [choice idx] branch
      if (c.code === 402 && c.indent === choiceIndent) {
        const choiceIdx = c.parameters[0];
        const choiceLabel = choiceTexts[choiceIdx] || `Choice ${choiceIdx + 1}`;
        this.i++; // consume 402
        const nodes = this._parseBlock(choiceIndent);
        branches.push({ label: choiceLabel, nodes });
        continue;
      }

      // When Cancel branch
      if (c.code === 403 && c.indent === choiceIndent) {
        this.i++; // consume 403
        const nodes = this._parseBlock(choiceIndent);
        branches.push({ label: "Cancel", nodes });
        continue;
      }

      // Unexpected — skip
      this.i++;
    }

    return {
      kind: "choices",
      commandIndex: cmdIndex,
      choiceTexts,
      cancelType,
      branches,
      indent: choiceIndent,
    };
  }
}
