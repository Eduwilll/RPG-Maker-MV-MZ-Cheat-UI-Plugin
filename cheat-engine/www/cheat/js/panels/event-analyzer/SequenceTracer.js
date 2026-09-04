// @ts-check

import { CommandParser } from "./CommandParser.js";

// ─────────────────────────────────────────────────────────────────────────────
// SequenceTracer
//
// Starting from a root event (map/common/battle), recursively resolves every
// reachable command.  Common Event calls are inlined; cycles are detected and
// represented as CycleRef nodes instead of recursing forever.
//
// Node shapes produced:
//   { kind: 'command',   code, params, label }
//   { kind: 'branch',    condition, trueNodes, falseNodes }
//   { kind: 'choices',   choiceTexts, branches: [{ label, nodes }] }
//   { kind: 'loop',      bodyNodes }
//   { kind: 'event-ref', ceId, name, label, resolved, nodes }
//   { kind: 'cycle-ref', ceId, name, label }
//   { kind: 'battle-ref', troopId, label }
//
// Root result shape:
//   {
//     kind: 'root',
//     eventKind: 'map' | 'common' | 'battle',
//     name, conditions?, trigger?, switchId?,
//     mapId?, eventId?, pageIndex?,
//     ceId?,
//     troopId?,
//     nodes: TraceNode[]
//   }
// ─────────────────────────────────────────────────────────────────────────────

export class SequenceTracer {
  /**
   * @param {import('./EventDatabase.js').EventDatabase} db
   * @param {any | null} dataSystem  $dataSystem (for condition formatting)
   */
  constructor(db, dataSystem) {
    this.db = db;
    this.dataSystem = dataSystem;
  }

  // ── Public entry points ────────────────────────────────────────────────────

  /**
   * @param {number} mapId
   * @param {number} eventId
   * @param {number} pageIndex
   * @returns {any | null}
   */
  traceMapEvent(mapId, eventId, pageIndex) {
    const event = this.db.getMapEvent(mapId, eventId);
    if (!event || !event.pages) return null;

    const page = event.pages[pageIndex];
    if (!page) return null;

    const rootKey = `map:${mapId}:${eventId}:${pageIndex}`;
    const stack = new Set([rootKey]);

    return {
      kind: "root",
      eventKind: "map",
      mapId,
      eventId,
      pageIndex,
      name: `Map Event [${eventId}: ${event.name || "Unnamed"}] / Page ${pageIndex + 1}`,
      conditions: page.conditions,
      nodes: this._traceList(page.list || [], stack, rootKey),
    };
  }

  /**
   * @param {number} ceId
   * @returns {any | null}
   */
  traceCommonEvent(ceId) {
    const ce = this.db.getCommonEvent(ceId);
    if (!ce) return null;

    const rootKey = `common:${ceId}`;
    const stack = new Set([rootKey]);

    return {
      kind: "root",
      eventKind: "common",
      ceId,
      name: `Common Event [${ceId}: ${ce.name || "Unnamed"}]`,
      trigger: ce.trigger,
      switchId: ce.switchId,
      nodes: this._traceList(ce.list || [], stack, rootKey),
    };
  }

  /**
   * @param {number} troopId
   * @param {number} pageIndex
   * @returns {any | null}
   */
  traceBattleEvent(troopId, pageIndex) {
    const troop = this.db.getBattleTroop(troopId);
    if (!troop || !troop.pages) return null;

    const page = troop.pages[pageIndex];
    if (!page) return null;

    const rootKey = `battle:${troopId}:${pageIndex}`;
    const stack = new Set([rootKey]);

    return {
      kind: "root",
      eventKind: "battle",
      troopId,
      pageIndex,
      name: `Battle Event [Troop ${troopId}: ${troop.name || "Unnamed"}] / Page ${pageIndex + 1}`,
      conditions: page.conditions,
      nodes: this._traceList(page.list || [], stack, rootKey),
    };
  }

  // ── Internal trace helpers ─────────────────────────────────────────────────

  _traceList(list, stack, eventKey) {
    const parser = new CommandParser(list, this.db, this.dataSystem);
    const parsed = parser.parse();
    return this._resolveNodes(parsed, stack, eventKey);
  }

  /**
   * @param {any[]} nodes
   * @param {Set<string>} stack
   * @param {string} eventKey
   * @returns {any[]}
   */
  _resolveNodes(nodes, stack, eventKey) {
    return nodes
      .map((n) => this._resolveNode(n, stack, eventKey))
      .filter(Boolean);
  }

  /**
   * Resolve a single parsed node, following execution bridges.
   * @param {any} node
   * @param {Set<string>} stack
   * @param {string} eventKey
   * @returns {any | null}
   */
  _resolveNode(node, stack, eventKey) {
    if (!node) return null;

    let result = node;
    switch (node.kind) {
      case "command":
        result = this._resolveCommand(node, stack);
        break;

      case "branch":
        result = {
          ...node,
          trueNodes: this._resolveNodes(node.trueNodes, stack, eventKey),
          falseNodes: this._resolveNodes(node.falseNodes, stack, eventKey),
        };
        break;

      case "loop":
        result = {
          ...node,
          bodyNodes: this._resolveNodes(node.bodyNodes, stack, eventKey),
        };
        break;

      case "choices":
        result = {
          ...node,
          branches: node.branches.map((b) => ({
            ...b,
            nodes: this._resolveNodes(b.nodes, stack, eventKey),
          })),
        };
        break;
    }

    if (result) {
      result.eventKey = eventKey;
    }
    return result;
  }

  /**
   * Resolve a command node.  Execution bridges (Call CE, Battle Processing)
   * are turned into reference nodes; everything else passes through.
   * @param {any} node
   * @param {Set<string>} stack
   */
  _resolveCommand(node, stack) {
    // ── Call Common Event ──────────────────────────────────────────────────
    if (node.code === 117) {
      const ceId = Number(node.params[0]);
      return {
        ...this._resolveCommonEventCall(ceId, stack),
        commandIndex: node.commandIndex,
      };
    }

    // ── Battle Processing ──────────────────────────────────────────────────
    if (node.code === 301) {
      return {
        ...this._resolveBattleProcessing(node.params),
        commandIndex: node.commandIndex,
      };
    }

    return node;
  }

  /**
   * Inline a Common Event call, or emit a CycleRef if already on the stack.
   * @param {number} ceId
   * @param {Set<string>} stack
   */
  _resolveCommonEventCall(ceId, stack) {
    const key = `common:${ceId}`;
    const ce = this.db.getCommonEvent(ceId);
    const ceName = ce
      ? ce.name || `Common Event ${ceId}`
      : `Common Event ${ceId}`;

    // Cycle detected
    if (stack.has(key)) {
      return {
        kind: "cycle-ref",
        ceId,
        name: ceName,
        label: `⚠ CYCLE → Common Event [${ceId}: ${ceName}]`,
      };
    }

    // Event not loaded
    if (!ce) {
      return {
        kind: "event-ref",
        ceId,
        name: ceName,
        label: `Common Event [${ceId}] (not loaded)`,
        resolved: false,
        nodes: [],
      };
    }

    // Recurse
    stack.add(key);
    const nodes = this._traceList(ce.list || [], stack, key);
    stack.delete(key);

    return {
      kind: "event-ref",
      ceId,
      name: ceName,
      label: `Common Event [${ceId}: ${ceName}]`,
      resolved: true,
      nodes,
    };
  }

  /**
   * Represent a Battle Processing command as a battle-ref leaf node.
   * @param {any[]} params
   */
  _resolveBattleProcessing(params) {
    const type = params[0]; // 0 = direct troop, 1 = same as random
    const troopId = type === 0 ? Number(params[1]) : null;
    const troop = troopId ? this.db.getBattleTroop(troopId) : null;

    const label = troopId
      ? `Battle Processing → Troop [${troopId}${troop ? ": " + troop.name : ""}]`
      : "Battle Processing (Random Encounter)";

    return {
      kind: "battle-ref",
      troopId,
      label,
    };
  }
}
